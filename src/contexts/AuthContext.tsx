import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forgetEnrollment, getEnrollment, saveEnrollment, updateEnrollment } from "@/db/sync/enrollment";
import { ApiError, AUTH_UNAUTHORIZED_EVENT } from "@/lib/axios";
import * as authApi from "@/lib/api/auth";
import { restoreSession, retryAfterSessionExpiry } from "@/lib/api/sessionRecovery";
import {
	getWorkspaceSnapshot,
	putWorkspaceSnapshot,
	readLocalSnapshot,
	replaceLocalSnapshot,
	snapshotHash,
	type WorkspaceResponse,
	type WorkspaceSnapshot,
} from "@/lib/api/workspace";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Sync request failed";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<AuthStatus>("loading");
	const [session, setSession] = useState<authApi.SessionState | null>(null);
	const [enrollment, setEnrollment] = useState<Awaited<ReturnType<typeof getEnrollment>>>(undefined);
	const [conflictSnapshot, setConflictSnapshot] = useState<WorkspaceSnapshot | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);
	const reconnecting = useRef<Promise<void> | null>(null);
	const channel = useRef<BroadcastChannel | null>(null);

	const broadcast = useCallback((type: string, workspaceId: number) => {
		channel.current?.postMessage({ type, workspaceId });
	}, []);

	const invalidate = useCallback(() => void queryClient.invalidateQueries(), [queryClient]);
	const syncRemote = useCallback(async (remote: WorkspaceResponse) => {
		await replaceLocalSnapshot(remote.snapshot);
		const hash = snapshotHash(remote.snapshot);
		await updateEnrollment({ cloudVersion: remote.version, lastSyncedHash: hash });
		setConflictSnapshot(null);
		broadcast("snapshot-updated", (await getEnrollment())?.workspaceId ?? 0);
		invalidate();
	}, [broadcast, invalidate]);

	const pushSnapshot = useCallback(async (expectedVersion: number) => {
		const local = await readLocalSnapshot();
		const response = await putWorkspaceSnapshot(local, expectedVersion);
		await updateEnrollment({ cloudVersion: response.version, lastSyncedHash: snapshotHash(response.snapshot) });
		setConflictSnapshot(null);
		setStatus("active");
		broadcast("snapshot-updated", (await getEnrollment())?.workspaceId ?? 0);
		invalidate();
	}, [broadcast, invalidate]);

	const reconnect = useCallback(async () => {
		if (reconnecting.current) return reconnecting.current;
		const run = (async () => {
			const current = await getEnrollment();
			if (!current || current.paused) return;
			setIsBusy(true);
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
			await updateEnrollment({ cloudVersion: remote.version });
			setConflictSnapshot(remote.snapshot);
					setStatus("conflict");
					return;
				}
				if (localChanged) await pushSnapshot(remote.version);
				else await syncRemote(remote);
				setStatus("active");
			} catch (error) {
				setStatus("disconnected");
				setLastError(errorMessage(error));
				throw error;
			} finally {
				setIsBusy(false);
			}
		})();
		reconnecting.current = run;
		try { await run; } finally { reconnecting.current = null; }
	}, [pushSnapshot, syncRemote]);

	const enableSync = useCallback(async () => {
		const existing = await getEnrollment();
		if (existing) return reconnect();
		setIsBusy(true);
		setLastError(null);
		try {
			await authApi.bootstrapCsrf();
			const result = await authApi.enableSync();
			await saveEnrollment({ workspaceId: result.workspaceId, syncCode: result.syncCode, paused: false, cloudVersion: 0, lastSyncedHash: "" });
			setEnrollment(await getEnrollment());
			setSession(await authApi.getSession());
			await pushSnapshot(0);
			setStatus("active");
		} catch (error) {
			setStatus("disconnected");
			setLastError(errorMessage(error));
			throw error;
		} finally { setIsBusy(false); }
	}, [pushSnapshot, reconnect]);

	const pairSyncCode = useCallback(async (code: string) => {
		setIsBusy(true);
		setLastError(null);
		try {
			const result = await authApi.pairSync(code.trim());
			await saveEnrollment({ workspaceId: result.workspaceId, syncCode: code.trim(), paused: false, cloudVersion: 0, lastSyncedHash: "" });
			setEnrollment(await getEnrollment());
			setSession(await authApi.getSession());
			await syncRemote(await getWorkspaceSnapshot());
			setStatus("active");
		} catch (error) {
			setStatus("disconnected");
			setLastError(errorMessage(error));
			throw error;
		} finally { setIsBusy(false); }
	}, [syncRemote]);

	const pauseSync = useCallback(async () => {
		await updateEnrollment({ paused: true });
		setEnrollment(await getEnrollment());
		setStatus("paused");
	}, []);

	const resumeSync = useCallback(async () => {
		await updateEnrollment({ paused: false });
		setEnrollment(await getEnrollment());
		await reconnect();
	}, [reconnect]);

	const pushLocal = useCallback(async () => {
		const current = await getEnrollment();
		if (!current) throw new Error("Sync is not enrolled");
		setIsBusy(true);
		try { await pushSnapshot(current.cloudVersion); }
		catch (error) {
			if (error instanceof ApiError && error.status === 409) {
				try { setConflictSnapshot((await getWorkspaceSnapshot()).snapshot); } catch { /* keep the conflict state */ }
				setStatus("conflict");
			} else setStatus("disconnected");
			setLastError(errorMessage(error));
			throw error;
		}
		finally { setIsBusy(false); }
	}, [pushSnapshot]);

	const pullCloud = useCallback(async () => {
		setIsBusy(true);
		try { await syncRemote(await getWorkspaceSnapshot()); setStatus("active"); }
		catch (error) { setLastError(errorMessage(error)); throw error; }
		finally { setIsBusy(false); }
	}, [syncRemote]);

	const forget = useCallback(async () => {
		await forgetEnrollment();
		setEnrollment(undefined);
		setSession(null);
		setConflictSnapshot(null);
		setStatus("local");
	}, []);

	const replaceSyncCode = useCallback(async () => {
		const result = await authApi.rotateSyncCode();
		await updateEnrollment({ syncCode: result.syncCode });
		setEnrollment(await getEnrollment());
		return result.syncCode;
	}, []);

	useEffect(() => {
		if (typeof BroadcastChannel === "undefined") return;
		const next = new BroadcastChannel("coffyyy:workspace-sync");
		channel.current = next;
		next.onmessage = (event) => {
			if (event.data?.workspaceId !== enrollment?.workspaceId) return;
			if (event.data.type === "snapshot-updated") invalidate();
		};
		return () => { next.close(); channel.current = null; };
	}, [enrollment?.workspaceId, invalidate]);

	useEffect(() => {
		let active = true;
		void getEnrollment().then((current) => {
			if (!active) return;
			setEnrollment(current);
			if (!current) { setStatus("local"); return; }
			if (current.paused) { setStatus("paused"); return; }
			void reconnect().catch(() => undefined);
		});
		return () => { active = false; };
	}, [reconnect]);

	useEffect(() => {
		const onUnauthorized = () => { if (enrollment && status === "active") void reconnect().catch(() => undefined); };
		const onOnline = () => { if (enrollment && status === "active") void reconnect().catch(() => undefined); };
		window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
		window.addEventListener("online", onOnline);
		return () => { window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized); window.removeEventListener("online", onOnline); };
	}, [enrollment, reconnect, status]);

	const value = useMemo<AuthContextValue>(() => ({
		status,
		session,
		enrollment: enrollment ? { workspaceId: enrollment.workspaceId, syncCode: enrollment.syncCode } : null,
		isBusy,
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
	}), [status, session, enrollment, isBusy, lastError, conflictSnapshot, enableSync, pairSyncCode, reconnect, pauseSync, resumeSync, pushLocal, pullCloud, forget, replaceSyncCode]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
