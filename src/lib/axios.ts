import type { AxiosInstance } from "axios";
import axios from "axios";

export const BACKENDS = {
	staging: "https://coffyyy-backend-staging.up.railway.app/api",
	dev: "http://localhost:3000/api",
	production: "https://coffyyy-backend-production.up.railway.app/api",
} as const;

export type BackendEnv = keyof typeof BACKENDS;

export const AUTH_TOKEN_KEY = "auth_token";
export const API_ENV_KEY = "api_env";

export const api: AxiosInstance = axios.create({
	headers: { "Content-Type": "application/json" },
	timeout: 5000,
});

api.interceptors.request.use((config) => {
	const env = (localStorage.getItem(API_ENV_KEY) ?? "staging") as BackendEnv;
	config.baseURL = BACKENDS[env] ?? BACKENDS.staging;

	const token = localStorage.getItem(AUTH_TOKEN_KEY);
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});
