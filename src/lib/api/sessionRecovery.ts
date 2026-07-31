import { ApiError } from "@/lib/axios";

type SessionApi<TSession> = {
	bootstrapCsrf: () => Promise<unknown>;
	getSession: () => Promise<TSession>;
	pairSync: (code: string) => Promise<unknown>;
};

export async function restoreSession<TSession>(
	code: string,
	api: SessionApi<TSession>,
) {
	await api.bootstrapCsrf();
	try {
		return await api.getSession();
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 401) throw error;
		await api.pairSync(code);
		return api.getSession();
	}
}

export async function retryAfterSessionExpiry<T>(
	operation: () => Promise<T>,
	restore: () => Promise<unknown>,
) {
	try {
		return await operation();
	} catch (error) {
		if (!(error instanceof ApiError) || error.status !== 401) throw error;
		await restore();
		return operation();
	}
}
