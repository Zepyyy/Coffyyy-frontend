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

type ModalState = {
	isOpen: boolean;
	type: "bean" | "brew" | "machine";
	mode: "POST" | "PATCH" | "DELETE";
	id?: string;
};

type Endpoint = {
	label: string;
	method: "GET" | "POST" | "PATCH" | "DELETE";
	run: (body?: unknown, id?: string) => Promise<unknown>;
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
				label: "POST /bean",
				method: "POST",
				run: (body?: unknown) => api.post("/bean", body).then((r) => r.data),
			},
			{
				label: "PATCH /bean/:id",
				method: "PATCH",
				run: (body?: unknown, id?: string) =>
					api.patch(`/bean/${id}`, body).then((r) => r.data),
			},
			{
				label: "DELETE /bean/:id",
				method: "DELETE",
				run: (_?: unknown, id?: string) =>
					api.delete(`/bean/${id}`).then((r) => r.data),
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
			{
				label: "POST /brew",
				method: "POST",
				run: (body?: unknown) => api.post("/brew", body).then((r) => r.data),
			},
			{
				label: "PATCH /brew/:id",
				method: "PATCH",
				run: (body?: unknown, id?: string) =>
					api.patch(`/brew/${id}`, body).then((r) => r.data),
			},
			{
				label: "DELETE /brew/:id",
				method: "DELETE",
				run: (_?: unknown, id?: string) =>
					api.delete(`/brew/${id}`).then((r) => r.data),
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
			{
				label: "POST /machine",
				method: "POST",
				run: (body?: unknown) => api.post("/machine", body).then((r) => r.data),
			},
			{
				label: "PATCH /machine/:id",
				method: "PATCH",
				run: (body?: unknown, id?: string) =>
					api.patch(`/machine/${id}`, body).then((r) => r.data),
			},
			{
				label: "DELETE /machine/:id",
				method: "DELETE",
				run: (_?: unknown, id?: string) =>
					api.delete(`/machine/${id}`).then((r) => r.data),
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
	const [modal, setModal] = useState<ModalState>({
		isOpen: false,
		type: "bean",
		mode: "POST",
	});
	const [selectedId, setSelectedId] = useState<string>("");
	const [jsonBody, setJsonBody] = useState<string>("");

	function switchEnv(next: BackendEnv) {
		localStorage.setItem(API_ENV_KEY, next);
		setEnvState(next);
	}

	function openModal(
		type: ModalState["type"],
		mode: ModalState["mode"],
		id?: string,
	) {
		setModal({ isOpen: true, type, mode, id });
		if (id) setSelectedId(id);
		if (mode === "POST") {
			setJsonBody("");
		}
	}

	function closeModal() {
		setModal({ isOpen: false, type: "bean", mode: "POST" });
		setSelectedId("");
		setJsonBody("");
	}

	function getDataForType() {
		try {
			return jsonBody ? JSON.parse(jsonBody) : {};
		} catch {
			return {};
		}
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
		if (endpoint.method !== "GET" && !modal.isOpen) {
			const type = endpoint.label.includes("brew")
				? "brew"
				: endpoint.label.includes("machine")
					? "machine"
					: "bean";
			const mode = endpoint.method as ModalState["mode"];
			openModal(type, mode);
			return;
		}

		setResult({ status: "loading", data: null, label: endpoint.label });
		closeModal();
		try {
			const body = getDataForType();
			const id =
				endpoint.method === "GET" ? undefined : selectedId || undefined;
			const data = await endpoint.run(body, id);
			setResult({ status: "success", data, label: endpoint.label });
			setSelectedId("");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Unknown error";
			setResult({ status: "error", data: message, label: endpoint.label });
		}
	}

	function renderModal() {
		if (!modal.isOpen) return null;

		const isDelete = modal.mode === "DELETE";
		const typeLabel = modal.type.charAt(0).toUpperCase() + modal.type.slice(1);

		return (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
				<div className="bg-background border border-border max-w-2xl w-full rounded-lg shadow-lg">
					<div className="p-4 border-b border-border flex items-center justify-between">
						<h3 className="font-News text-lg">
							{modal.mode} {typeLabel}
							{modal.mode !== "POST" && modal.id && ` #${modal.id}`}
						</h3>
						<p className="font-Mono text-[10px] text-muted-foreground">
							{isDelete
								? `Are you sure you want to delete this ${modal.type}?`
								: `Enter the details for the ${modal.type} ${modal.mode.toLowerCase()}`}
						</p>
						<button
							onClick={closeModal}
							className="text-muted-foreground hover:text-foreground text-xl"
						>
							×
						</button>
					</div>

					<div className="p-4 space-y-4">
						{modal.mode !== "DELETE" && (
							<div className="space-y-2">
								<label
									htmlFor="json-body"
									className="font-Mono text-[10px] uppercase tracking-[0.12em] block"
								>
									Request Body (JSON)
								</label>
								<textarea
									id="json-body"
									value={jsonBody}
									onChange={(e) => setJsonBody(e.target.value)}
									className="w-full font-Mono text-xs p-3 bg-muted/20 border border-border rounded-md min-h-32"
									placeholder="{}"
								/>
							</div>
						)}

						<div className="space-y-2">
							<label
								htmlFor="id"
								className="font-Mono text-[10px] uppercase tracking-[0.12em] block"
							>
								{modal.mode === "POST"
									? "ID (leave empty for auto-generate)"
									: "ID"}
							</label>
							<input
								id="id"
								value={selectedId}
								disabled={modal.mode === "POST"}
								onChange={(e) => setSelectedId(e.target.value)}
								className="w-full font-Mono text-xs p-2 bg-muted/20 border border-border rounded-md disabled:opacity-50"
							/>
						</div>
					</div>

					<div className="p-4 border-t border-border flex justify-end gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={closeModal}
							className="font-Mono text-[10px]"
						>
							Cancel
						</Button>
						<Button
							size="sm"
							className="font-Mono text-[10px]"
							disabled={isDelete && !selectedId}
							onClick={() => {
								const endpoint = ENDPOINTS.flatMap((s) => s.items).find(
									(e) =>
										e.method === modal.mode && e.label.includes(modal.type),
								);
								if (endpoint) {
									void run(endpoint);
								}
							}}
						>
							{modal.mode}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full mx-auto max-w-4xl px-6 py-8 space-y-8">
			{renderModal()}
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
									{ep.method !== "GET" && (
										<span className="ml-auto text-muted-foreground/50">
											...
										</span>
									)}
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
