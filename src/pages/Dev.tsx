import { useState } from "react";
import {
	api,
	AUTH_TOKEN_KEY,
	API_ENV_KEY,
	BACKENDS,
	type BackendEnv,
} from "@/lib/axios";
import { Button } from "@/components/ui/button";

type RequestState = {
	status: "idle" | "loading" | "success" | "error";
	data: unknown;
	label: string;
};

const IDLE: RequestState = { status: "idle", data: null, label: "" };

type Endpoint = {
	label: string;
	method: "GET" | "POST" | "PATCH" | "DELETE";
	run: () => Promise<unknown>;
};

const ENDPOINTS: { section: string; items: Endpoint[] }[] = [
	{
		section: "Beans",
		items: [
			{
				label: "GET /bean",
				method: "GET",
				run: () => api.get("/bean").then((r) => r.data),
			},
			{
				label: "POST /bean (sample)",
				method: "POST",
				run: () =>
					api
						.post("/bean", {
							name: "Dev Test Bean",
							flavors: ["Apricot"],
							rating: 1,
							roastLevel: 4,
							countries: ["Colombia"],
							cities: ["Bogotà"],
							botanic: "ARABICA",
							varieties: ["Castillo"],
							brands: ["TANAT"],
							status: "EXCELLENT",
							dominantNote: "FRUITY",
							designation: "PURE_ORIGIN",
							finished: false,
						})
						.then((r) => r.data),
			},
			{
				label: "PATCH /bean/1",
				method: "PATCH",
				run: () =>
					api
						.patch("/bean/1", { name: "Test Bean from frontend" })
						.then((r) => r.data),
			},
		],
	},
	{
		section: "Brews",
		items: [
			{
				label: "GET /brew",
				method: "GET",
				run: () => api.get("/brew").then((r) => r.data),
			},
		],
	},
	{
		section: "Machines",
		items: [
			{
				label: "GET /machine",
				method: "GET",
				run: () => api.get("/machine").then((r) => r.data),
			},
		],
	},
];

const METHOD_COLOR: Record<string, string> = {
	GET: "text-emerald-400",
	POST: "text-blue-400",
	PATCH: "text-amber-400",
	DELETE: "text-red-400",
};

function readEnv(): BackendEnv {
	return (localStorage.getItem(API_ENV_KEY) ?? "staging") as BackendEnv;
}

function readToken(): string | null {
	return localStorage.getItem(AUTH_TOKEN_KEY);
}

export default function Dev() {
	const [result, setResult] = useState<RequestState>(IDLE);
	const [env, setEnvState] = useState<BackendEnv>(readEnv);
	const [token, setTokenState] = useState<string | null>(readToken);
	const [authLoading, setAuthLoading] = useState(false);
	const [username, setUsername] = useState("qsd");
	const [password, setPassword] = useState("qsd");

	function switchEnv(next: BackendEnv) {
		localStorage.setItem(API_ENV_KEY, next);
		setEnvState(next);
	}

	async function login() {
		setAuthLoading(true);
		try {
			const res = await api.post("/auth/login", {
				username,
				password,
			});
			const jwt: string = res.data?.token ?? res.data?.access_token ?? res.data;
			localStorage.setItem(AUTH_TOKEN_KEY, jwt);
			setTokenState(jwt);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Login failed";
			setResult({ status: "error", data: msg, label: "POST /auth/login" });
		} finally {
			setAuthLoading(false);
		}
	}

	function logout() {
		localStorage.removeItem(AUTH_TOKEN_KEY);
		setTokenState(null);
	}

	async function run(endpoint: Endpoint) {
		setResult({ status: "loading", data: null, label: endpoint.label });
		try {
			const data = await endpoint.run();
			setResult({ status: "success", data, label: endpoint.label });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unknown error";
			setResult({ status: "error", data: message, label: endpoint.label });
		}
	}

	return (
		<div className="w-full mx-auto max-w-4xl px-6 py-8 space-y-8">
			{/* Header */}
			<div>
				<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
					Dev only
				</p>
				<h1 className="font-News text-3xl text-foreground/90 mt-1">
					API Playground
				</h1>
			</div>

			{/* Controls row */}
			<div className="flex flex-wrap items-center gap-6 border border-border px-4 py-3">
				{/* Env switcher */}
				<div className="flex items-center gap-2">
					<span className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Backend
					</span>
					<div className="flex border border-border">
						{(Object.keys(BACKENDS) as BackendEnv[]).map((e) => (
							<button
								key={e}
								type="button"
								onClick={() => switchEnv(e)}
								className={`px-3 py-1 font-Mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
									env === e
										? "bg-primary/20 text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{e}
							</button>
						))}
					</div>
					<span className="font-Mono text-[10px] text-muted-foreground/60 hidden sm:block">
						{BACKENDS[env]}
					</span>
				</div>

				{/* Auth */}
				<div className="flex items-center gap-3 ml-auto">
					{token ? (
						<>
							<span className="font-Mono text-[10px] text-emerald-400">
								authenticated
							</span>
							<button
								type="button"
								onClick={logout}
								className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors"
							>
								Logout
							</button>
						</>
					) : (
						<div className="flex flex-col gap-2">
							<span className="font-Mono text-[10px] text-muted-foreground">
								not authenticated
							</span>
							<input
								type="text"
								placeholder="Username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								className="font-Mono text-[10px] uppercase tracking-[0.12em] border border-border px-3 py-1 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
							/>
							<input
								type="password"
								placeholder="Password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="font-Mono text-[10px] uppercase tracking-[0.12em] border border-border px-3 py-1 bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary"
							/>
							<button
								type="button"
								onClick={login}
								disabled={authLoading}
								className="font-Mono text-[10px] uppercase tracking-[0.12em] border border-border px-3 py-1 hover:bg-muted/40 transition-colors disabled:opacity-50"
							>
								{authLoading ? "logging in…" : "Login"}
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Endpoint grid */}
			<div className="grid gap-6 md:grid-cols-2">
				{ENDPOINTS.map(({ section, items }) => (
					<div key={section} className="space-y-2">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
							{section}
						</p>
						<div className="border border-border divide-y divide-border">
							{items.map((ep) => (
								<button
									key={ep.label}
									type="button"
									onClick={() => run(ep)}
									disabled={result.status === "loading"}
									className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors disabled:opacity-50"
								>
									<span
										className={`font-Mono text-[10px] font-bold w-12 shrink-0 ${METHOD_COLOR[ep.method] ?? "text-foreground"}`}
									>
										{ep.method}
									</span>
									<span className="font-Mono text-xs text-foreground/80">
										{ep.label.replace(/^(GET|POST|PATCH|DELETE) /, "")}
									</span>
								</button>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Response panel */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Response
						{result.label && (
							<span className="ml-2 normal-case text-foreground/50">
								— {result.label}
							</span>
						)}
					</p>
					{result.status === "loading" && (
						<span className="font-Mono text-[10px] text-amber-400 animate-pulse">
							loading…
						</span>
					)}
					{result.status === "success" && (
						<span className="font-Mono text-[10px] text-emerald-400">
							200 OK
						</span>
					)}
					{result.status === "error" && (
						<span className="font-Mono text-[10px] text-red-400">error</span>
					)}
				</div>
				<pre className="border border-border bg-muted/20 p-4 text-xs font-Mono text-foreground/80 overflow-auto max-h-96 min-h-24 whitespace-pre-wrap break-all">
					{result.status === "idle" ? (
						<span className="text-muted-foreground">
							Hit an endpoint above to see the response here.
						</span>
					) : (
						JSON.stringify(result.data, null, 2)
					)}
				</pre>
				{result.status !== "idle" && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setResult(IDLE)}
						className="font-Mono text-[10px]"
					>
						Clear
					</Button>
				)}
			</div>
		</div>
	);
}
