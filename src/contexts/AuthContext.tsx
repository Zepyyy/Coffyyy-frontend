import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	listUnresolvedOperations,
	markOperationsReconciled,
} from "@/db/sync/outbox";
import { SyncCoordinator } from "@/db/sync/coordinator";
import * as authApi from "@/lib/api/auth";
import {
	assertCanonicalWorkspace,
	assertRemoteWorkspace,
	fetchRemoteWorkspace,
	importLocalData,
	PendingOutboxError,
	replaceWithRemoteData,
	restoreLocalData,
	snapshotLocalData,
} from "@/lib/api/migration";
import { ApiError, AUTH_UNAUTHORIZED_EVENT } from "@/lib/axios";
import { pullRemoteChanges, pushPendingOperations } from "@/lib/api/sync";
import {
	AuthContext,
	type AuthContextValue,
	type AuthStatus,
} from "./auth-context";

function errorMessage(error: unknown) {
	if (error instanceof ApiError) return error.message;
	if (error instanceof Error) return error.message;
	return "Sync request failed";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const queryClient = useQueryClient();
	const [coordinator] = useState(() => new SyncCoordinator());
	const [status, setStatus] = useState<AuthStatus>("loading");
	const [session, setSession] = useState<authApi.SessionState | null>(null);
	const [syncCode, setSyncCode] = useState<string | null>(null);
	const [syncCodeExpiresAt, setSyncCodeExpiresAt] = useState<string | null>(
		null,
	);
	const [isBusy, setIsBusy] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);
	const workspaceIdRef = useRef<number | undefined>(undefined);
	workspaceIdRef.current = session?.workspaceId;

	const setLocal = useCallback(() => {
		setStatus("local");
		setSession(null);
		setSyncCode(null);
		setSyncCodeExpiresAt(null);
	}, []);

	const pauseSession = useCallback(() => {
		if (workspaceIdRef.current !== undefined)
			coordinator.broadcast("session-paused", workspaceIdRef.current);
		setLocal();
	}, [coordinator, setLocal]);

	useEffect(() => {
		return () => {
			coordinator.close();
		};
	}, [coordinator]);

	useEffect(() => {
		return coordinator.subscribe((signal) => {
			if (signal.type === "cache-invalidated" || signal.type === "sync-completed") {
				void queryClient.invalidateQueries();
				return;
			}
			if (signal.type === "sync-failed") {
				if (status === "synced") setLastError(signal.message ?? "Sync failed");
				return;
			}
			if (signal.type === "session-paused") {
				if (session?.workspaceId === signal.workspaceId) setLocal();
				return;
			}
			if (!navigator.onLine) return;
			void authApi
				.bootstrapCsrf()
				.then(() => authApi.getSession())
				.then((nextSession) => {
					if (nextSession.workspaceId !== signal.workspaceId) return;
					setSession(nextSession);
					setStatus("synced");
					setLastError(null);
				})
				.catch((error: unknown) => {
					if (!(error instanceof ApiError) || error.status !== 401)
						setLastError(errorMessage(error));
				});
		});
	}, [coordinator, queryClient, session?.workspaceId, setLocal, status]);

	useEffect(() => {
		let active = true;
		const handleUnauthorized = () => {
			if (active) pauseSession();
		};
		window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

		void authApi
			.bootstrapCsrf()
			.then(() => authApi.getSession())
			.then((nextSession) => {
				if (!active) return;
				setSession(nextSession);
				setStatus("synced");
				coordinator.broadcast("session-resumed", nextSession.workspaceId);
			})
			.catch((error: unknown) => {
				if (!active) return;
				if (!(error instanceof ApiError) || error.status !== 401) {
					setLastError(errorMessage(error));
				}
				setLocal();
			});

		return () => {
			active = false;
			window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
		};
	}, [coordinator, pauseSession, setLocal]);

	useEffect(() => {
		if (status !== "synced" || session?.workspaceId === undefined) return;
		let inFlight: Promise<void> | null = null;
		const sync = () => {
			if (!navigator.onLine || inFlight) return;
			inFlight = (async () => {
				await coordinator.run(session.workspaceId, async (assertLease) => {
					await pushPendingOperations(assertLease);
					await pullRemoteChanges(100, assertLease);
					await queryClient.invalidateQueries();
				});
			})()
				.catch((error: unknown) => {
					if (!(error instanceof ApiError) || error.status !== 401) {
						setLastError(errorMessage(error));
					}
				})
				.finally(() => {
					inFlight = null;
				});
		};
		window.addEventListener("online", sync);
		const interval = window.setInterval(sync, 30_000);
		sync();
		return () => {
			window.removeEventListener("online", sync);
			window.clearInterval(interval);
		};
	}, [coordinator, queryClient, session?.workspaceId, status]);

	const enableSync = useCallback(async () => {
		setIsBusy(true);
		setLastError(null);
		let snapshot: Awaited<ReturnType<typeof snapshotLocalData>> | null = null;
		let localDataReplaced = false;
		let workspaceId: number | undefined;
		let ownsWorkspaceLease = false;
		try {
			snapshot = await snapshotLocalData();
			const importedOperationIds = snapshot.outbox.map(
				(operation) => operation.operationId,
			);
			const idempotencyKey = crypto.randomUUID();
			const result = await authApi.enableSync();
			workspaceId = result.workspaceId;
			const localSnapshot = snapshot;
			const coordinated = await coordinator.run(
				result.workspaceId,
				async (assertLease) => {
					await assertLease();
					await importLocalData(localSnapshot, idempotencyKey);
					await assertLease();
					const remote = await fetchRemoteWorkspace();
					await assertLease();
					assertCanonicalWorkspace(localSnapshot, remote);
					const nextSession = await authApi.getSession();
					await markOperationsReconciled(importedOperationIds);
					await replaceWithRemoteData(remote, {
						removeOutboxOperationIds: importedOperationIds,
					});
					return nextSession;
				},
			);
			ownsWorkspaceLease = coordinated.acquired;
			if (!coordinated.acquired)
				throw new Error("Another tab is syncing this workspace");
			localDataReplaced = true;
			setSession(coordinated.value);
			setStatus("synced");
			setSyncCode(result.syncCode);
			setSyncCodeExpiresAt(result.syncCodeExpiresAt);
			coordinator.broadcast("session-resumed", result.workspaceId);
			coordinator.broadcast("cache-invalidated", result.workspaceId);
			await queryClient.invalidateQueries();
			return result;
		} catch (error) {
			if (workspaceId !== undefined && ownsWorkspaceLease)
				coordinator.broadcast("session-paused", workspaceId);
			if (localDataReplaced && snapshot) {
				await restoreLocalData(snapshot).catch(() => undefined);
			}
			if (ownsWorkspaceLease) await authApi.logout().catch(() => undefined);
			setLocal();
			setLastError(errorMessage(error));
			throw error;
		} finally {
			setIsBusy(false);
		}
	}, [coordinator, queryClient, setLocal]);

	const pairSyncCode = useCallback(
		async (code: string) => {
			setIsBusy(true);
			setLastError(null);
			let snapshot: Awaited<ReturnType<typeof snapshotLocalData>> | null = null;
			let ownsWorkspaceLease = false;
			let localDataReplaced = false;
			try {
				snapshot = await snapshotLocalData();
				const result = await authApi.pairSync(code.trim());
				const coordinated = await coordinator.run(
					result.workspaceId,
					async (assertLease) => {
						await assertLease();
						const nextSession = await authApi.getSession();
						const remote = await fetchRemoteWorkspace();
						await assertLease();
						assertRemoteWorkspace(remote);
						await replaceWithRemoteData(remote, { discardOutbox: true });
						return nextSession;
					},
				);
				ownsWorkspaceLease = coordinated.acquired;
				if (!coordinated.acquired)
					throw new Error("Another tab is syncing this workspace");
				localDataReplaced = true;
				setSession(coordinated.value);
				setStatus("synced");
				setSyncCode(null);
				setSyncCodeExpiresAt(null);
				coordinator.broadcast("session-resumed", result.workspaceId);
				coordinator.broadcast("cache-invalidated", result.workspaceId);
				await queryClient.invalidateQueries();
				return result;
			} catch (error) {
				if (ownsWorkspaceLease) await authApi.logout().catch(() => undefined);
				if (localDataReplaced && snapshot)
					await restoreLocalData(snapshot).catch(() => undefined);
				setLocal();
				setLastError(errorMessage(error));
				throw error;
			} finally {
				setIsBusy(false);
			}
		},
		[coordinator, queryClient, setLocal],
	);

	const reconcile = useCallback(
		async (discardOutbox = false) => {
			setIsBusy(true);
			setLastError(null);
			try {
				if (session?.workspaceId === undefined)
					throw new Error("Sync session is not active");
				const result = await coordinator.run(
					session.workspaceId,
					async (assertLease) => {
						await pushPendingOperations(assertLease);
						const unresolved = await listUnresolvedOperations();
						if (unresolved.length && !discardOutbox) {
							throw new PendingOutboxError(unresolved);
						}
						const remote = await fetchRemoteWorkspace();
						await assertLease();
						assertRemoteWorkspace(remote);
						await replaceWithRemoteData(remote, { discardOutbox });
					},
				);
				if (!result.acquired)
					throw new Error("Another tab is syncing this workspace");
				await queryClient.invalidateQueries();
			} catch (error) {
				setLastError(errorMessage(error));
				throw error;
			} finally {
				setIsBusy(false);
			}
		},
		[coordinator, queryClient, session?.workspaceId],
	);

	const rotateSyncCode = useCallback(async () => {
		setIsBusy(true);
		setLastError(null);
		try {
			const result = await authApi.rotateSyncCode();
			setSyncCode(result.syncCode);
			setSyncCodeExpiresAt(result.expiresAt);
			return result;
		} catch (error) {
			setLastError(errorMessage(error));
			throw error;
		} finally {
			setIsBusy(false);
		}
	}, []);

	const logout = useCallback(async () => {
		setIsBusy(true);
		setLastError(null);
		try {
			await authApi.logout();
		} catch (error) {
			if (!(error instanceof ApiError) || error.status !== 401) {
				setLastError(errorMessage(error));
			}
		} finally {
			pauseSession();
			setIsBusy(false);
		}
	}, [pauseSession]);

	const revokeSessions = useCallback(async () => {
		setIsBusy(true);
		setLastError(null);
		try {
			await authApi.revokeSessions();
		} catch (error) {
			setLastError(errorMessage(error));
			throw error;
		} finally {
			pauseSession();
			setIsBusy(false);
		}
	}, [pauseSession]);

	const value = useMemo<AuthContextValue>(
		() => ({
			status,
			session,
			syncCode,
			syncCodeExpiresAt,
			isBusy,
			lastError,
			enableSync,
			pairSyncCode,
			reconcile,
			rotateSyncCode,
			logout,
			revokeSessions,
			clearError: () => setLastError(null),
		}),
		[
			status,
			session,
			syncCode,
			syncCodeExpiresAt,
			isBusy,
			lastError,
			enableSync,
			pairSyncCode,
			reconcile,
			rotateSyncCode,
			logout,
			revokeSessions,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
