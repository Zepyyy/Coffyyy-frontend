import { api } from "@/lib/axios";
import { clearCsrfToken, setCsrfToken } from "../csrf";

export type SessionState = {
	authenticated: true;
	workspaceId: number;
	expiresAt: string;
	absoluteExpiresAt: string;
};

export type EnableSyncResponse = {
	workspaceId: number;
	syncCode: string;
	syncCodeExpiresAt: string;
	csrfToken: string | undefined;
};

export type PairResponse = {
	connected: true;
	workspaceId: number;
	expiresAt: string;
	csrfToken: string | undefined;
};

export type RotatedSyncCode = {
	syncCode: string;
	expiresAt: string;
};

type BootstrapCsrfResponse = {
	csrfRequired: true;
	csrfToken: string;
};

export async function bootstrapCsrf() {
	const response = await api.get<BootstrapCsrfResponse>("/auth/sync/csrf");
	setCsrfToken(response.data.csrfToken);
	return response.data;
}

export async function getSession() {
	const response = await api.get<SessionState>("/auth/sync/session");
	return response.data;
}

export async function enableSync() {
	await bootstrapCsrf();
	const response = await api.post<EnableSyncResponse>(`/auth/sync/enable`);
	setCsrfToken(response.data.csrfToken);
	return response.data;
}

export async function pairSync(code: string) {
	await bootstrapCsrf();
	const response = await api.post<PairResponse>("/auth/sync/pair", { code });
	setCsrfToken(response.data.csrfToken);
	return response.data;
}

export async function logout() {
	try {
		await api.post("/auth/sync/logout");
	} finally {
		clearCsrfToken();
	}
}

export async function revokeSessions() {
	await api.post("/auth/sync/sessions/revoke");
}

export async function rotateSyncCode() {
	const response = await api.post<RotatedSyncCode>("/auth/sync/code/rotate");
	return response.data;
}
