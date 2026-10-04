import { AxiosError, AxiosHeaders, type AxiosAdapter } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enableSync, getSession, pairSync } from "./api/auth";
import { api, API_ENV_KEY, BACKENDS } from "./axios";
import { clearCsrfToken } from "./csrf";
import vercelConfig from "../../vercel.json";

describe("fresh-browser sync transport", () => {
	const origin = "https://coffyyy.quentinstubecki.fr";
	const originalAdapter = api.defaults.adapter;
	let storage: Map<string, string>;
	let requests: string[];

	beforeEach(() => {
		clearCsrfToken();
		storage = new Map();
		requests = [];
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => storage.get(key) ?? null,
		});
		const cookies = new Map<string, string>();
		const adapter: AxiosAdapter = async (config) => {
			const url = new URL(api.getUri(config), origin);
			requests.push(url.pathname);
			// Model a browser accepting first-party cookies and blocking third-party cookies.
			const acceptsCookies = url.origin === origin && config.withCredentials;
			const reply = (data: unknown, status = 200) => ({
				data,
				status,
				statusText: String(status),
				headers: new AxiosHeaders(),
				config,
			});
			const reject = (status: number) => {
				throw new AxiosError(
					status === 403 ? "CSRF validation failed" : "Session required",
					AxiosError.ERR_BAD_REQUEST,
					config,
					undefined,
					reply({}, status),
				);
			};
			if (url.pathname.endsWith("/csrf")) {
				if (acceptsCookies) cookies.set("csrf", "bootstrap-token");
				return reply({ csrfRequired: true, csrfToken: "bootstrap-token" });
			}
			if (url.pathname.endsWith("/session")) {
				if (!acceptsCookies || !cookies.has("session")) reject(401);
				return reply({ authenticated: true, workspaceId: 7 });
			}
			if (
				!acceptsCookies ||
				cookies.get("csrf") !== config.headers.get("X-CSRF-TOKEN")
			)
				reject(403);
			if (url.pathname.endsWith("/pair")) {
				expect(JSON.parse(config.data as string)).toEqual({
					code: "pc-sync-code",
				});
			}
			cookies.set("session", "session-token");
			cookies.set("csrf", "session-csrf");
			return reply(
				{
					workspaceId: 7,
					syncCode: "new-sync-code",
					connected: true,
					csrfToken: "session-csrf",
				},
				201,
			);
		};
		api.defaults.adapter = adapter;
	});

	afterEach(() => {
		api.defaults.adapter = originalAdapter;
		clearCsrfToken();
		vi.unstubAllGlobals();
	});

	it("enables production sync and retains a session with third-party cookies blocked", async () => {
		await expect(enableSync()).resolves.toMatchObject({ workspaceId: 7 });
		await expect(getSession()).resolves.toMatchObject({ authenticated: true });
		expect(requests).toEqual([
			"/api/auth/sync/csrf",
			"/api/auth/sync/enable",
			"/api/auth/sync/session",
		]);
	});

	it("pairs a PC sync code in a fresh browser", async () => {
		storage.set(API_ENV_KEY, "production");
		await expect(pairSync("pc-sync-code")).resolves.toMatchObject({
			workspaceId: 7,
		});
		await expect(getSession()).resolves.toMatchObject({ authenticated: true });
	});

	it("falls back to production for an invalid saved environment", async () => {
		storage.set(API_ENV_KEY, "unknown");
		await expect(enableSync()).resolves.toMatchObject({ workspaceId: 7 });
	});

	it("proxies production API routes before the SPA fallback", () => {
		const url = new URL(BACKENDS.production, origin);
		expect(url.origin).toBe(origin);
		const route = vercelConfig.routes.find((route) =>
			new RegExp(`^${route.src}$`).test(`${url.pathname}/auth/sync/csrf`),
		);
		expect(route?.dest).toBe(
			"https://coffyyy-backend-production.up.railway.app/api/$1",
		);
	});
});
