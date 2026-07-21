import { LogOut, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDatabaseCounts } from "@/hooks/api/useDatabase";

function formatExpiry(value: string | null) {
	if (!value) return "";
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

export default function SyncPanel() {
	const {
		status,
		syncCode,
		syncCodeExpiresAt,
		isBusy,
		lastError,
		enableSync,
		pairSyncCode,
		rotateSyncCode,
		logout,
	} = useAuth();
	const counts = useDatabaseCounts();
	const [open, setOpen] = useState(false);
	const [code, setCode] = useState("");
	const [copied, setCopied] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const isLoading = status === "loading";

	async function copyCode() {
		if (!syncCode) return;
		await navigator.clipboard.writeText(syncCode);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	}

	async function handleEnable() {
		setMessage(null);
		try {
			await enableSync();
			setMessage("Sync enabled. Copy the code to pair another device.");
		} catch {
			// AuthProvider exposes the normalized error below.
		}
	}

	async function handlePair() {
		if (!code.trim()) return;
		if (
			(counts.beans > 0 || counts.machines > 0 || counts.brews > 0) &&
			!window.confirm(
				"Replace this browser's local data with the connected workspace?",
			)
		)
			return;
		setMessage(null);
		try {
			await pairSyncCode(code);
			setCode("");
			setMessage("Workspace connected.");
		} catch {
			// AuthProvider exposes the normalized error below.
		}
	}

	async function handleRotate() {
		setMessage(null);
		try {
			await rotateSyncCode();
			setMessage("New code generated. The previous code is no longer valid.");
		} catch {
			// AuthProvider exposes the normalized error below.
		}
	}

	return (
		<div className="relative">
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setOpen((value) => !value)}
				disabled={isLoading}
				className="gap-2 font-Mono text-[10px] uppercase tracking-[0.12em]"
			>
				<Wifi size={14} />
				{isLoading ? "Checking…" : status === "synced" ? "Synced" : "Local"}
			</Button>

			{open && (
				<div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] border border-border bg-background p-4 shadow-xl">
					<div className="flex items-start gap-3">
						<ShieldCheck className="mt-0.5 shrink-0 text-primary" size={18} />
						<div>
							<p className="font-News text-lg">
								{status === "synced" ? "Cloud sync" : "Local workspace"}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Local use stays available without an account. Sync uses a secure
								browser session.
							</p>
						</div>
					</div>

					{status !== "synced" ? (
						<div className="mt-4 space-y-4">
							<div className="border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
								<p className="font-Mono text-[10px] uppercase tracking-[0.12em]">
									Local data preview
								</p>
								<p className="mt-2">
									{counts.beans} beans · {counts.machines} machines ·{" "}
									{counts.brews} brews
								</p>
								<p className="mt-1">
									Bean origins → countries · varieties → varieties · brand →
									brands
								</p>
							</div>
							<Button
								type="button"
								onClick={() => void handleEnable()}
								disabled={isBusy || isLoading}
								className="w-full font-Mono text-[10px] uppercase tracking-[0.12em]"
							>
								{isBusy ? "Enabling…" : "Enable sync"}
							</Button>
							<div className="border-t border-border pt-4">
								<label
									className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
									htmlFor="sync-code"
								>
									Connect existing data
								</label>
								<div className="mt-2 flex gap-2">
									<input
										id="sync-code"
										value={code}
										onChange={(event) => setCode(event.target.value)}
										placeholder="Paste sync code"
										className="min-w-0 flex-1 border border-border bg-muted/20 px-3 py-2 font-Mono text-xs outline-none focus:ring-1 focus:ring-primary"
									/>
									<Button
										type="button"
										size="sm"
										onClick={() => void handlePair()}
										disabled={isBusy || !code.trim()}
										className="font-Mono text-[10px]"
									>
										Connect
									</Button>
								</div>
							</div>
						</div>
					) : (
						<div className="mt-4 space-y-3">
							{syncCode && (
								<div className="border border-primary/30 bg-primary/5 p-3">
									<p className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
										Pair another device before
									</p>
									<code className="mt-2 block break-all text-xs">
										{syncCode}
									</code>
									<p className="mt-2 text-[11px] text-muted-foreground">
										Expires {formatExpiry(syncCodeExpiresAt)}
									</p>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => void copyCode()}
										className="mt-3 w-full font-Mono text-[10px]"
									>
										{copied ? "Copied" : "Copy sync code"}
									</Button>
								</div>
							)}
							<div className="flex gap-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => void handleRotate()}
									disabled={isBusy}
									className="flex-1 gap-2 font-Mono text-[10px]"
								>
									<RefreshCw size={13} /> Rotate code
								</Button>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => void logout()}
									disabled={isBusy}
									className="gap-2 font-Mono text-[10px]"
								>
									<LogOut size={13} /> Log out
								</Button>
							</div>
						</div>
					)}

					{(message || lastError) && (
						<p
							className={`mt-3 text-xs ${lastError ? "text-destructive" : "text-muted-foreground"}`}
						>
							{lastError ?? message}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
