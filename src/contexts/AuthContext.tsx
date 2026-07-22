import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "@/lib/api/auth";
import {
	assertCanonicalWorkspace,
	assertRemoteWorkspace,
	fetchRemoteWorkspace,
	importLocalData,
	replaceWithRemoteData,
	restoreLocalData,
	snapshotLocalData,
} from "@/lib/api/migration";
import { ApiError, AUTH_UNAUTHORIZED_EVENT } from "@/lib/axios";
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
	const [status, setStatus] = useState<AuthStatus>("loading");
	const [session, setSession] = useState<authApi.SessionState | null>(null);
	const [syncCode, setSyncCode] = useState<string | null>(null);
	const [syncCodeExpiresAt, setSyncCodeExpiresAt] = useState<string | null>(
		null,
	);
	const [isBusy, setIsBusy] = useState(false);
	const [lastError, setLastError] = useState<string | null>(null);

	const setLocal = useCallback(() => {
		setStatus("local");
		setSession(null);
		setSyncCode(null);
		setSyncCodeExpiresAt(null);
	}, []);

	useEffect(() => {
		let active = true;
		const handleUnauthorized = () => {
			if (active) setLocal();
		};
		window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

		void authApi
			.getSession()
			.then((nextSession) => {
				if (!active) return;
				setSession(nextSession);
				setStatus("synced");
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
	}, [setLocal]);

	const enableSync = useCallback(async () => {
		setIsBusy(true);
		setLastError(null);
		let snapshot: Awaited<ReturnType<typeof snapshotLocalData>> | null = null;
		let localDataReplaced = false;
		try {
			snapshot = await snapshotLocalData();
			const idempotencyKey = crypto.randomUUID();
			const result = await authApi.enableSync();
			await importLocalData(snapshot, idempotencyKey);
			const remote = await fetchRemoteWorkspace();
			assertCanonicalWorkspace(snapshot, remote);
			const nextSession = await authApi.getSession();
			localDataReplaced = true;
			await replaceWithRemoteData(remote);
			setSession(nextSession);
			setStatus("synced");
			setSyncCode(result.syncCode);
			setSyncCodeExpiresAt(result.syncCodeExpiresAt);
			await queryClient.invalidateQueries();
			return result;
		} catch (error) {
			if (localDataReplaced && snapshot) {
				await restoreLocalData(snapshot).catch(() => undefined);
			}
			await authApi.logout().catch(() => undefined);
			setLocal();
			setLastError(errorMessage(error));
			throw error;
		} finally {
			setIsBusy(false);
		}
	}, [queryClient, setLocal]);

	const pairSyncCode = useCallback(
		async (code: string) => {
			setIsBusy(true);
			setLastError(null);
			let snapshot: Awaited<ReturnType<typeof snapshotLocalData>> | null = null;
			try {
				snapshot = await snapshotLocalData();
				const result = await authApi.pairSync(code.trim());
				const nextSession = await authApi.getSession();
				const remote = await fetchRemoteWorkspace();
				assertRemoteWorkspace(remote);
				await replaceWithRemoteData(remote);
				setSession(nextSession);
				setStatus("synced");
				setSyncCode(null);
				setSyncCodeExpiresAt(null);
				await queryClient.invalidateQueries();
				return result;
			} catch (error) {
				await authApi.logout().catch(() => undefined);
				if (snapshot) await restoreLocalData(snapshot).catch(() => undefined);
				setLocal();
				setLastError(errorMessage(error));
				throw error;
			} finally {
				setIsBusy(false);
			}
		},
		[queryClient, setLocal],
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
			setLocal();
			setIsBusy(false);
		}
	}, [setLocal]);

	const revokeSessions = useCallback(async () => {
		setIsBusy(true);
		setLastError(null);
		try {
			await authApi.revokeSessions();
		} catch (error) {
			setLastError(errorMessage(error));
			throw error;
		} finally {
			setLocal();
			setIsBusy(false);
		}
	}, [setLocal]);

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
			rotateSyncCode,
			logout,
			revokeSessions,
		],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
