import { useQueryClient } from "@tanstack/react-query";
import { liveQuery } from "dexie";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	claimAutoSync,
	forgetEnrollment,
	getEnrollment,
	saveEnrollment,
	updateEnrollment,
} from "@/db/sync/enrollment";
import { ApiError, AUTH_UNAUTHORIZED_EVENT } from "@/lib/axios";
import * as authApi from "@/lib/api/auth";
import {
	restoreSession,
	retryAfterSessionExpiry,
} from "@/lib/api/sessionRecovery";
import { mergeSnapshots } from "@/db/sync/merge";
import { createSyncScheduler, SYNC_COOLDOWN_MS } from "@/db/sync/scheduler";
import {
	getWorkspaceSnapshot,
	putWorkspaceSnapshot,
	readLocalSnapshot,
	replaceLocalSnapshot,
	snapshotHash,
	type WorkspaceResponse,
	type WorkspaceSnapshot,
} from "@/lib/api/workspace";
import {
	AuthContext,
	type AuthContextValue,
	type AuthStatus,
} from "./auth-context";

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Sync request failed";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const queryClient = useQueryClient();
	const [status, setStatusState] = useState<AuthStatus>("loading");
	const [session, setSession] = useState<authApi.SessionState | null>(null);
	const [enrollment, setEnrollment] =
		useState<Awaited<ReturnType<typeof getEnrollment>>>(undefined);
	const [conflictSnapshot, setConflictSnapshot] =
		useState<WorkspaceSnapshot | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);
	const [hasPendingChanges, setHasPendingChanges] = useState(false);
	const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
	const busy = useRef(false);
	const currentStatus = useRef<AuthStatus>("loading");
	const scheduler = useRef<ReturnType<typeof createSyncScheduler> | null>(null);
	const reconnecting = useRef<Promise<void> | null>(null);
	const channel = useRef<BroadcastChannel | null>(null);
	const setStatus = useCallback((value: AuthStatus) => {
		currentStatus.current = value;
		setStatusState(value);
		scheduler.current?.resume();
	}, []);
	const setBusy = useCallback((value: boolean) => {
		busy.current = value;
		setIsBusy(value);
		if (!value) scheduler.current?.resume();
	}, []);

	const broadcast = useCallback((type: string, workspaceId: number) => {
		channel.current?.postMessage({ type, workspaceId });
	}, []);

	const invalidate = useCallback(
		() => void queryClient.invalidateQueries(),
		[queryClient],
	);
	const syncRemote = useCallback(
		async (remote: WorkspaceResponse, expectedHash?: string) => {
			if (!(await replaceLocalSnapshot(remote.snapshot, expectedHash))) {
				scheduler.current?.changed();
				return;
			}
			const hash = snapshotHash(remote.snapshot);
			await updateEnrollment({
				cloudVersion: remote.version,
				conflictVersion: undefined,
				lastSyncedHash: hash,
				baseSnapshot: remote.snapshot,
				lastSyncedAt: Date.now(),
			});
			setConflictSnapshot(null);
			setLastError(null);
			broadcast("snapshot-updated", (await getEnrollment())?.workspaceId ?? 0);
			invalidate();
		},
		[broadcast, invalidate],
	);

	const pushSnapshot = useCallback(
		async (expectedVersion: number, snapshot?: WorkspaceSnapshot) => {
			const local = snapshot ?? (await readLocalSnapshot());
			const response = await putWorkspaceSnapshot(local, expectedVersion);
			await updateEnrollment({
				cloudVersion: response.version,
				conflictVersion: undefined,
				lastSyncedHash: snapshotHash(response.snapshot),
				baseSnapshot: response.snapshot,
				lastSyncedAt: Date.now(),
			});
			setConflictSnapshot(null);
			setLastError(null);
			setStatus("active");
			broadcast("snapshot-updated", (await getEnrollment())?.workspaceId ?? 0);
			invalidate();
		},
		[broadcast, invalidate, setStatus],
	);

	// Both sides changed since the last sync: merge per entity and push, or
	// surface a conflict when the same entity changed on both sides.
	const reconcile = useCallback(
		async (local: WorkspaceSnapshot, remote: WorkspaceResponse) => {
			const base = (await getEnrollment())?.baseSnapshot;
			const merged = base && mergeSnapshots(base, local, remote.snapshot);
			if (!merged || merged.conflicts.length > 0) {
				await updateEnrollment({ conflictVersion: remote.version });
				setConflictSnapshot(remote.snapshot);
				setStatus("conflict");
				return;
			}
			if (!(await replaceLocalSnapshot(merged.snapshot, snapshotHash(local)))) {
				scheduler.current?.changed();
				return;
			}
			await pushSnapshot(remote.version, merged.snapshot);
		},
		[pushSnapshot, setStatus],
	);

	const reconnect = useCallback(async () => {
		if (reconnecting.current) return reconnecting.current;
		if (busy.current) return;
		const run = (async () => {
			const current = await getEnrollment();
			if (!current || current.paused) return;
			setBusy(true);
			setLastError(null);
			try {
				const restore = () => restoreSession(current.syncCode, authApi);
				const nextSession = await restore();
				setSession(nextSession);
				const [local, remote] = await Promise.all([
					readLocalSnapshot(),
					retryAfterSessionExpiry(getWorkspaceSnapshot, restore),
				]);
				const localChanged = snapshotHash(local) !== current.lastSyncedHash;
				const cloudChanged = remote.version !== current.cloudVersion;
				if (localChanged && cloudChanged) {
					await reconcile(local, remote);
					return;
				}
				if (localChanged) await pushSnapshot(remote.version, local);
				else if (cloudChanged) await syncRemote(remote, snapshotHash(local));
				else await updateEnrollment({ lastSyncedAt: Date.now() });
				setStatus("active");
			} catch (error) {
				setStatus("disconnected");
				setLastError(errorMessage(error));
				throw error;
			} finally {
				setBusy(false);
			}
		})();
		reconnecting.current = run;
		try {
			await run;
		} finally {
			reconnecting.current = null;
		}
	}, [pushSnapshot, reconcile, syncRemote, setBusy, setStatus]);

	const enableSync = useCallback(async () => {
		const existing = await getEnrollment();
		if (existing) return reconnect();
		setBusy(true);
		setLastError(null);
		try {
			const result = await authApi.enableSync();
			await saveEnrollment({
				workspaceId: result.workspaceId,
				syncCode: result.syncCode,
				paused: false,
				cloudVersion: 0,
				lastSyncedHash: "",
			});
			setEnrollment(await getEnrollment());
			setSession(await authApi.getSession());
			await pushSnapshot(0);
			setStatus("active");
		} catch (error) {
			setStatus("disconnected");
			setLastError(errorMessage(error));
			throw error;
		} finally {
			setBusy(false);
		}
	}, [pushSnapshot, reconnect, setBusy, setStatus]);

	const pairSyncCode = useCallback(
		async (code: string) => {
			setBusy(true);
			setLastError(null);
			try {
				const result = await authApi.pairSync(code.trim());
				await saveEnrollment({
					workspaceId: result.workspaceId,
					syncCode: code.trim(),
					paused: false,
					cloudVersion: 0,
					lastSyncedHash: "",
				});
				setEnrollment(await getEnrollment());
				setSession(await authApi.getSession());
				await syncRemote(await getWorkspaceSnapshot());
				setStatus("active");
			} catch (error) {
				setStatus("disconnected");
				setLastError(errorMessage(error));
				throw error;
			} finally {
				setBusy(false);
			}
		},
		[syncRemote, setBusy, setStatus],
	);

	const pauseSync = useCallback(async () => {
		await updateEnrollment({ paused: true });
		setEnrollment(await getEnrollment());
		setStatus("paused");
	}, [setStatus]);

	const resumeSync = useCallback(async () => {
		await updateEnrollment({ paused: false });
		setEnrollment(await getEnrollment());
		await reconnect();
	}, [reconnect]);

	const pushLocal = useCallback(async () => {
		const current = await getEnrollment();
		if (!current) throw new Error("Sync is not enrolled");
		setBusy(true);
		try {
			await retryAfterSessionExpiry(
				() => pushSnapshot(current.conflictVersion ?? current.cloudVersion),
				async () => setSession(await restoreSession(current.syncCode, authApi)),
			);
		} catch (error) {
			if (error instanceof ApiError && error.status === 409) {
				try {
					const remote = await getWorkspaceSnapshot();
					await updateEnrollment({ conflictVersion: remote.version });
					setConflictSnapshot(remote.snapshot);
				} catch {
					/* keep the conflict state */
				}
				setStatus("conflict");
			} else setStatus("disconnected");
			setLastError(errorMessage(error));
			throw error;
		} finally {
			setBusy(false);
		}
	}, [pushSnapshot, setBusy, setStatus]);

	const pullCloud = useCallback(async () => {
		const current = await getEnrollment();
		if (!current) throw new Error("Sync is not enrolled");
		setBusy(true);
		try {
			await syncRemote(
				await retryAfterSessionExpiry(getWorkspaceSnapshot, async () =>
					setSession(await restoreSession(current.syncCode, authApi)),
				),
			);
			setStatus("active");
		} catch (error) {
			setLastError(errorMessage(error));
			throw error;
		} finally {
			setBusy(false);
		}
	}, [syncRemote, setBusy, setStatus]);

	const forget = useCallback(async () => {
		await forgetEnrollment();
		setEnrollment(undefined);
		setSession(null);
		setConflictSnapshot(null);
		setStatus("local");
	}, [setStatus]);

	const replaceSyncCode = useCallback(async () => {
		const result = await authApi.rotateSyncCode();
		await updateEnrollment({ syncCode: result.syncCode });
		setEnrollment(await getEnrollment());
		return result.syncCode;
	}, []);

	const autoSync = useCallback(
		async (checkCloud: boolean) => {
			const run = async () => {
				const current = await getEnrollment();
				if (!current || current.paused || busy.current) return false;
				if (
					currentStatus.current === "conflict" ||
					currentStatus.current === "local"
				)
					return false;
				const local = await readLocalSnapshot();
				const dirty = snapshotHash(local) !== current.lastSyncedHash;
				if (!dirty && !checkCloud && currentStatus.current !== "disconnected")
					return false;
				if (!(await claimAutoSync(SYNC_COOLDOWN_MS))) {
					scheduler.current?.defer(checkCloud);
					return false;
				}
				if (
					busy.current ||
					!navigator.onLine ||
					document.visibilityState !== "visible" ||
					(currentStatus.current !== "active" &&
						currentStatus.current !== "disconnected")
				) {
					scheduler.current?.defer(checkCloud);
					return false;
				}
				if (currentStatus.current === "disconnected") {
					await reconnect();
					return true;
				}
				setBusy(true);
				setLastError(null);
				const restore = async () =>
					setSession(await restoreSession(current.syncCode, authApi));
				try {
					if (dirty) {
						try {
							await retryAfterSessionExpiry(
								() => pushSnapshot(current.cloudVersion, local),
								restore,
							);
							return true;
						} catch (error) {
							if (!(error instanceof ApiError) || error.status !== 409)
								throw error;
						}
					}
					const remote = await retryAfterSessionExpiry(
						getWorkspaceSnapshot,
						restore,
					);
					// Re-read after the request: the user may have saved another brew.
					const latest = await readLocalSnapshot();
					const hash = snapshotHash(latest);
					if (hash !== current.lastSyncedHash) await reconcile(latest, remote);
					else if (remote.version !== current.cloudVersion)
						await syncRemote(remote, hash);
					return true;
				} catch (error) {
					setStatus("disconnected");
					setLastError(errorMessage(error));
					throw error;
				} finally {
					setBusy(false);
				}
			};
			if (navigator.locks) {
				return navigator.locks.request(
					"coffyyy:automatic-sync",
					{ ifAvailable: true },
					async (lock) => {
						if (lock) return run();
						scheduler.current?.defer(checkCloud);
						return false;
					},
				);
			} else return run();
		},
		[pushSnapshot, reconcile, reconnect, setBusy, syncRemote, setStatus],
	);

	useEffect(() => {
		const next = createSyncScheduler({
			canRun: () =>
				!busy.current &&
				navigator.onLine &&
				document.visibilityState === "visible" &&
				(currentStatus.current === "active" ||
					currentStatus.current === "disconnected"),
			run: autoSync,
		});
		scheduler.current = next;
		const subscription = liveQuery(async () => ({
			current: await getEnrollment(),
			hash: snapshotHash(await readLocalSnapshot()),
		})).subscribe({
			next: ({ current, hash }) => {
				setEnrollment(current);
				setLastSyncedAt(current?.lastSyncedAt ?? null);
				const dirty = !!current && hash !== current.lastSyncedHash;
				setHasPendingChanges(dirty);
				if (!current && currentStatus.current !== "loading") setStatus("local");
				else if (current?.paused) setStatus("paused");
				else if (current?.conflictVersion !== undefined) setStatus("conflict");
				else if (
					current &&
					!busy.current &&
					(currentStatus.current === "paused" ||
						currentStatus.current === "local")
				) {
					setStatus("disconnected");
					next.wake();
				}
				if (dirty) next.changed();
			},
			error: (error: unknown) => setLastError(errorMessage(error)),
		});
		const wake = () => {
			if (document.visibilityState === "visible" && navigator.onLine)
				next.wake();
		};
		window.addEventListener("focus", wake);
		window.addEventListener("online", wake);
		document.addEventListener("visibilitychange", wake);
		return () => {
			next.stop();
			subscription.unsubscribe();
			window.removeEventListener("focus", wake);
			window.removeEventListener("online", wake);
			document.removeEventListener("visibilitychange", wake);
			scheduler.current = null;
		};
	}, [autoSync, setStatus]);

	useEffect(() => {
		if (typeof BroadcastChannel === "undefined") return;
		const next = new BroadcastChannel("coffyyy:workspace-sync");
		channel.current = next;
		next.onmessage = (event) => {
			if (event.data?.workspaceId !== enrollment?.workspaceId) return;
			if (event.data.type === "snapshot-updated") invalidate();
		};
		return () => {
			next.close();
			channel.current = null;
		};
	}, [enrollment?.workspaceId, invalidate]);

	useEffect(() => {
		let active = true;
		void getEnrollment().then((current) => {
			if (!active) return;
			setEnrollment(current);
			if (!current) {
				setStatus("local");
				return;
			}
			if (current.paused) {
				setStatus("paused");
				return;
			}
			if (current.conflictVersion !== undefined) {
				setStatus("conflict");
				return;
			}
			setStatus("disconnected");
			scheduler.current?.wake();
		});
		return () => {
			active = false;
		};
	}, [setStatus]);

	useEffect(() => {
		const onUnauthorized = () => {
			if (enrollment && status === "active" && !busy.current) {
				setStatus("disconnected");
				scheduler.current?.changed();
			}
		};
		window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
		return () => {
			window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
		};
	}, [enrollment, status, setStatus]);

	const value = useMemo<AuthContextValue>(
		() => ({
			status,
			session,
			enrollment: enrollment
				? { workspaceId: enrollment.workspaceId, syncCode: enrollment.syncCode }
				: null,
			isBusy,
			hasPendingChanges,
			lastSyncedAt,
			lastError,
			conflictSnapshot,
			enableSync,
			pairSyncCode,
			reconnect,
			pauseSync,
			resumeSync,
			pushLocal,
			pullCloud,
			forgetEnrollment: forget,
			replaceSyncCode,
			clearError: () => setLastError(null),
		}),
		[
			status,
			session,
			enrollment,
			isBusy,
			hasPendingChanges,
			lastSyncedAt,
			lastError,
			conflictSnapshot,
			enableSync,
			pairSyncCode,
			reconnect,
			pauseSync,
			resumeSync,
			pushLocal,
			pullCloud,
			forget,
			replaceSyncCode,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
