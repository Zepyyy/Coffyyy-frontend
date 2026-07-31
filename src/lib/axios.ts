import axios, {
	type AxiosError,
	AxiosHeaders,
	type AxiosInstance,
	// type AxiosRequestConfig,
} from "axios";
import { getCsrfToken, setCsrfToken } from "./csrf";

export const BACKENDS = {
	staging: "https://coffyyy-backend-staging.up.railway.app/api",
	dev: "http://localhost:3000/api",
	production: "https://coffyyy-backend-production.up.railway.app/api",
} as const;

export type BackendEnv = keyof typeof BACKENDS;

export const API_ENV_KEY = "api_env";
export const AUTH_UNAUTHORIZED_EVENT = "coffyyy:auth-unauthorized";

export class ApiError extends Error {
	readonly status?: number;
	readonly details: unknown;

	constructor(message: string, status?: number, details?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.details = details;
	}
}

// function isMutating(config: AxiosRequestConfig) {
// 	return ["post", "put", "patch", "delete"].includes(
// 		(config.method ?? "get").toLowerCase(),
// 	);
// }

function normalizeError(error: AxiosError<unknown>) {
	const data = error.response?.data;
	const message =
		typeof data === "object" && data !== null && "message" in data
			? String(data.message)
			: error.message || "Request failed";
	return new ApiError(message, error.response?.status, data);
}

export const api: AxiosInstance = axios.create({
	headers: {
		"Content-Type": "application/json",
	},
	timeout: 5000,
	withCredentials: true,
});

type RetriableRequest = Parameters<AxiosInstance["request"]>[0] & {
	_csrfRetried?: boolean;
};

api.interceptors.request.use((config) => {
	const env = (localStorage.getItem(API_ENV_KEY) ?? "staging") as BackendEnv;
	config.baseURL = BACKENDS[env] ?? BACKENDS.staging;
	config.headers = AxiosHeaders.from(config.headers);

	// if (isMutating(config)) {
	const csrfToken = getCsrfToken();

	if (csrfToken) {
		config.headers.set("X-CSRF-TOKEN", csrfToken);
	}
	// }

	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error: AxiosError<unknown>) => {
		const config = error.config as RetriableRequest | undefined;
		if (
			error.response?.status === 403 &&
			config &&
			!config._csrfRetried &&
			!config.url?.endsWith("/auth/sync/csrf")
		) {
			config._csrfRetried = true;
			return api
				.get<{ csrfToken: string }>("/auth/sync/csrf")
				.then((response) => {
					setCsrfToken(response.data.csrfToken);
					return api.request(config);
				});
		}
		if (error.response?.status === 401 && typeof window !== "undefined") {
			window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
		}
		return Promise.reject(normalizeError(error));
	},
);
