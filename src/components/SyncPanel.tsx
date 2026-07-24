import { Download, LogOut, RefreshCw, ShieldCheck, Wifi } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDatabaseCounts } from "@/hooks/api/useDatabase";
import { useAuth } from "@/hooks/useAuth";
import {
	countFailedOperations,
	countOutboxOperations,
	exportFailedOperations,
	exportOutboxOperations,
	retryFailedOperations,
} from "@/lib/data";
import {
	getRemoteHistory,
	restoreRemoteVersion,
} from "@/lib/api/sync";
import type { RecoveryHistoryEntry } from "@/db/sync/types";

function formatExpiry(value: string | null) {
	if (!value) return "";
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function downloadJson(filename: string, value: unknown) {
	const url = URL.createObjectURL(
		new Blob([JSON.stringify(value, null, 2)], {
			type: "application/json",
		}),
	);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
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
		reconcile,
		rotateSyncCode,
		logout,
	} = useAuth();
	const counts = useDatabaseCounts();
	const [open, setOpen] = useState(false);
	const [code, setCode] = useState("");
	const [copied, setCopied] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [recoveryHistory, setRecoveryHistory] = useState<
		RecoveryHistoryEntry[] | null
	>(null);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);
	const [restoringRevision, setRestoringRevision] = useState<number | null>(
		null,
	);
	const pendingCount = useLiveQuery(countOutboxOperations, [], 0);
	const failedCount = useLiveQuery(countFailedOperations, [], 0);
	const latestFailure = useLiveQuery(
		async () => {
			const failures = await exportFailedOperations();
			return failures.sort((a, b) => b.updatedAt - a.updatedAt)[0]?.lastError;
		},
		[],
		null,
	);
	const isLoading = status === "loading";

	async function retryFailures() {
		await retryFailedOperations();
		setMessage("Failed operations queued for retry.");
	}

	async function downloadFailures() {
		const failed = await exportFailedOperations();
		downloadJson("coffyyy-sync-failures.json", failed);
	}

	async function downloadOutbox() {
		const operations = await exportOutboxOperations();
		downloadJson("coffyyy-sync-operations.json", operations);
	}

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
			(counts.beans > 0 ||
				counts.machines > 0 ||
				counts.brews > 0 ||
				pendingCount > 0) &&
			!window.confirm(
				`Replace this browser's local data with the connected workspace?${pendingCount > 0 ? ` This discards ${pendingCount} pending sync operation${pendingCount === 1 ? "" : "s"}.` : ""}`,
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

	async function handleReconcile(discardOutbox = false) {
		setMessage(null);
		try {
			await reconcile(discardOutbox);
			setMessage("Workspace reconciled.");
		} catch {
			// AuthProvider exposes the normalized error below.
		}
	}

	async function loadRecoveryHistory() {
		setIsLoadingHistory(true);
		setMessage(null);
		try {
			const result = await getRemoteHistory();
			const losingVersions = result.changes.filter((entry) => !entry.accepted);
			setRecoveryHistory(losingVersions);
			setMessage(
				losingVersions.length
					? "Recovery history loaded."
					: "No retained losing versions in the seven-day window.",
			);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "History load failed");
		} finally {
			setIsLoadingHistory(false);
		}
	}

	async function restoreVersion(entry: RecoveryHistoryEntry) {
		setRestoringRevision(entry.revision);
		setMessage(null);
		try {
			const result = await restoreRemoteVersion(entry);
			setMessage(
				result.recreated
					? "Deleted version queued as a new record."
					: `Revision ${entry.revision} queued. It will be checked against the current server revision.`,
			);
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Restore failed");
		} finally {
			setRestoringRevision(null);
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
								{pendingCount > 0 && (
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => void downloadOutbox()}
										className="mt-2 gap-1 font-Mono text-[10px]"
									>
										<Download size={12} /> Export local changes
									</Button>
								)}
							</div>
						</div>
					) : (
						<div className="mt-4 space-y-3">
							<div className="border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
								<div className="flex items-center justify-between gap-2">
									<div>
										<p className="font-Mono text-[10px] uppercase tracking-[0.12em]">
											Recovery history
										</p>
										<p className="mt-1">
											Inspect retained record versions from the last seven days.
										</p>
									</div>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => void loadRecoveryHistory()}
										disabled={isBusy || isLoadingHistory}
										className="shrink-0 font-Mono text-[10px]"
									>
										{isLoadingHistory ? "Loading…" : "Load"}
									</Button>
								</div>
								{recoveryHistory && recoveryHistory.length > 0 && (
									<div className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-border pt-3">
										{recoveryHistory.map((entry) => (
											<div
												key={`${entry.entityType}-${entry.serverId}-${entry.revision}`}
												className="flex items-center justify-between gap-2"
											>
												<span>
													{entry.entityType} #{entry.serverId} · rev. {entry.revision}
													{entry.accepted ? "" : " · losing"}
												</span>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={() => void restoreVersion(entry)}
													disabled={restoringRevision !== null}
													className="font-Mono text-[10px]"
												>
													{restoringRevision === entry.revision
														? "Queuing…"
														: "Restore"}
												</Button>
											</div>
										))}
									</div>
								)}
							</div>
							{(lastError?.includes("history expired") ||
								lastError?.includes("unresolved sync operation")) && (
								<div className="border border-destructive/30 bg-destructive/5 p-3 text-[11px] text-muted-foreground">
									<p>Remote history expired. Reconcile before continuing.</p>
									<div className="mt-2 flex gap-2">
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => void handleReconcile()}
											disabled={isBusy}
											className="flex-1 font-Mono text-[10px]"
										>
											Reconcile
										</Button>
										{pendingCount > 0 && (
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => {
													if (
														window.confirm(
															"Discard unresolved local sync operations and replace this workspace?",
														)
													)
														void handleReconcile(true);
												}}
												disabled={isBusy}
												className="font-Mono text-[10px]"
											>
												Discard & resync
											</Button>
										)}
									</div>
								</div>
							)}
							{pendingCount > 0 && (
								<div className="border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
									{pendingCount} operation{pendingCount === 1 ? "" : "s"}{" "}
									awaiting sync.
									{latestFailure && (
										<p className="mt-1 text-destructive">{latestFailure}</p>
									)}
									{failedCount > 0 && (
										<div className="mt-2 flex gap-2">
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => void retryFailures()}
												className="flex-1 font-Mono text-[10px]"
											>
												Retry {failedCount}
											</Button>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() => void downloadFailures()}
												className="gap-1 font-Mono text-[10px]"
											>
												<Download size={12} /> Export
											</Button>
										</div>
									)}
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => void downloadOutbox()}
										className="gap-1 font-Mono text-[10px]"
									>
										<Download size={12} /> Export all
									</Button>
								</div>
							)}
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
