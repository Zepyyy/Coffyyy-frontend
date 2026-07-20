import { api } from "@/lib/axios";

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
};

export type PairResponse = {
	connected: true;
	workspaceId: number;
	expiresAt: string;
};

export type RotatedSyncCode = {
	syncCode: string;
	expiresAt: string;
};

export async function bootstrapCsrf() {
	await api.get<{ csrfRequired: true }>("/auth/sync/csrf");
}

export async function getSession() {
	const response = await api.get<SessionState>("/auth/sync/session");
	return response.data;
}

export async function enableSync() {
	await bootstrapCsrf();
	const response = await api.post<EnableSyncResponse>("/auth/sync/enable");
	return response.data;
}

export async function pairSyncCode(code: string) {
	await bootstrapCsrf();
	const response = await api.post<PairResponse>("/auth/sync/pair", { code });
	return response.data;
}

export async function logout() {
	await api.post<void>("/auth/sync/logout");
}

export async function revokeSessions() {
	await api.post<void>("/auth/sync/sessions/revoke");
}

export async function rotateSyncCode() {
	const response = await api.post<RotatedSyncCode>("/auth/sync/code/rotate");
	return response.data;
}
