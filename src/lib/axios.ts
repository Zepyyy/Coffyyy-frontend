import axios, {
	type AxiosError,
	type AxiosInstance,
	type AxiosRequestConfig,
} from "axios";

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

function readCsrfToken() {
	if (typeof document === "undefined") return undefined;
	const value = document.cookie
		.split(";")
		.map((cookie) => cookie.trim())
		.find((cookie) => cookie.startsWith("coffyyy_csrf="));
	return value
		? decodeURIComponent(value.slice("coffyyy_csrf=".length))
		: undefined;
}

function isMutating(config: AxiosRequestConfig) {
	return ["post", "put", "patch", "delete"].includes(
		(config.method ?? "get").toLowerCase(),
	);
}

function normalizeError(error: AxiosError<unknown>) {
	const data = error.response?.data;
	const message =
		typeof data === "object" && data !== null && "message" in data
			? String(data.message)
			: error.message || "Request failed";
	return new ApiError(message, error.response?.status, data);
}

export const api: AxiosInstance = axios.create({
	headers: { "Content-Type": "application/json" },
	timeout: 5000,
	withCredentials: true,
});

api.interceptors.request.use((config) => {
	const env = (localStorage.getItem(API_ENV_KEY) ?? "staging") as BackendEnv;
	config.baseURL = BACKENDS[env] ?? BACKENDS.staging;
	if (isMutating(config)) {
		const csrfToken = readCsrfToken();
		if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error: AxiosError<unknown>) => {
		if (error.response?.status === 401 && typeof window !== "undefined") {
			window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
		}
		return Promise.reject(normalizeError(error));
	},
);
