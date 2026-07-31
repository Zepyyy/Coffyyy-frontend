import { useState } from "react";
import DatabaseWorkbench from "@/components/dev/DatabaseWorkbench";
import { API_ENV_KEY, BACKENDS, type BackendEnv } from "@/lib/axios";

export default function Dev() {
	const [env, setEnvState] = useState<BackendEnv>(readEnv);

	function readEnv(): BackendEnv {
		return (localStorage.getItem(API_ENV_KEY) ?? "staging") as BackendEnv;
	}

	function switchEnv(next: BackendEnv) {
		localStorage.setItem(API_ENV_KEY, next);
		setEnvState(next);
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
			</div>
			<DatabaseWorkbench />
		</div>
	);
}
