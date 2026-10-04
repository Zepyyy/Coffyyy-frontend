import {
	CloudDownload,
	CloudLightning,
	CloudOff,
	CloudUpload,
	CopyIcon,
	RefreshCcw,
	ShieldAlert,
	ShieldCheck,
	ShieldCogCorner,
	ShieldMinus,
	ShieldQuestionMark,
	Unlink,
	X,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthStatus } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/useAuth";
import { exportLocalSnapshot, importLocalSnapshot } from "@/lib/api/backup";

function statusLabel(status: AuthStatus) {
	return status === "active"
		? "Cloud sync"
		: status === "conflict"
			? "Sync conflict"
			: status === "paused"
				? "Sync paused"
				: status === "disconnected"
					? "Sync disconnected"
					: "Local only";
}

function statusIcon(status: AuthStatus) {
	const className = "shrink-0 text-primary";
	return status === "active" ? (
		<ShieldCheck className={className} size={18} />
	) : status === "conflict" ? (
		<ShieldCogCorner className={className} size={18} />
	) : status === "paused" ? (
		<ShieldMinus className={className} size={18} />
	) : status === "disconnected" ? (
		<ShieldAlert className={className} size={18} />
	) : status === "local" ? (
		<CloudOff className={className} size={17} />
	) : status === "loading" ? (
		<div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
	) : (
		<ShieldQuestionMark className={className} size={18} />
	);
}

function BackupActions({
	fileInput,
	onChooseFile,
	onImportFile,
	onExport,
}: {
	fileInput: React.RefObject<HTMLInputElement | null>;
	onChooseFile: () => void;
	onImportFile: (file: File) => void;
	onExport: () => void;
}) {
	return (
		<div className="flex items-center justify-between gap-3">
			<div>
				<p className="font-data text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
					Local backup
				</p>
				<p className="mt-0.5 text-xs text-muted-foreground/75">
					Save or restore this browser's workspace.
				</p>
			</div>
			<div className="flex shrink-0 gap-1">
				<Button variant="ghost" size="sm" onClick={onChooseFile}>
					Import
				</Button>
				<Button variant="ghost" size="sm" onClick={onExport}>
					Export
				</Button>
			</div>
			<input
				ref={fileInput}
				type="file"
				accept="application/json"
				hidden
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) onImportFile(file);
					event.target.value = "";
				}}
			/>
		</div>
	);
}

export default function SyncPanel() {
	const auth = useAuth();
	const fileInput = useRef<HTMLInputElement>(null);
	const [codeVisible, setCodeVisible] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [pairCode, setPairCode] = useState("");

	async function downloadExport() {
		const blob = new Blob([await exportLocalSnapshot()], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "coffyyy-workspace.json";
		link.click();
		URL.revokeObjectURL(url);
	}

	async function importFile(file: File) {
		if (
			!window.confirm(
				auth.status === "active"
					? "Replace this browser's workspace with this backup? It will also save to the cloud."
					: "Replace this browser's local workspace with the imported snapshot?",
			)
		)
			return;
		try {
			await importLocalSnapshot(await file.text());
			setMessage(
				"Workspace restored. Changes save automatically when sync is active.",
			);
		} catch {
			setMessage(
				"Could not restore this file. Choose a Coffyyy workspace backup.",
			);
		}
	}

	async function reconnect() {
		try {
			await auth.reconnect();
			setMessage("Sync reconnected.");
		} catch {
			setMessage("Reconnect failed. Sync is disconnected.");
		}
	}

	async function push() {
		try {
			await auth.pushLocal();
			setMessage("Cloud snapshot replaced.");
		} catch {
			setMessage(
				auth.status === "conflict"
					? "Cloud changed. Choose Pull or Push again."
					: "Push failed.",
			);
		}
	}

	async function pull() {
		if (
			!window.confirm(
				"Replace this browser's local workspace with the cloud snapshot?",
			)
		)
			return;
		try {
			await auth.pullCloud();
			setMessage("Cloud snapshot pulled.");
		} catch {
			setMessage("Pull failed.");
		}
	}

	const isLocal = auth.status === "local";
	const isConflict = auth.status === "conflict";

	return (
		<section>
			<div className="space-y-5">
				<header className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 items-start gap-2.5">
						<div className="mt-0.5">{statusIcon(auth.status)}</div>
						<div className="min-w-0">
							<h2 className="font-display text-xl leading-none">
								{statusLabel(auth.status)}
							</h2>
							<p className="mt-1 text-xs text-muted-foreground">
								{auth.enrollment
									? "Your coffee journal, across your devices."
									: "Your data stays on this browser"}
							</p>
						</div>
					</div>
					<Popover.Close asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Close cloud sync"
						>
							<X size={16} />
						</Button>
					</Popover.Close>
				</header>

				{isLocal && (
					<div className="space-y-3">
						<div>
							<p className="text-sm font-medium">
								Connect an existing workspace
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								This replaces local data after confirmation.
							</p>
						</div>
						<div className="flex gap-2">
							<input
								id="sync-code"
								className="min-w-0 flex-1 rounded-lg border border-line-strong bg-paper-sunken px-3 py-2 font-data text-xs outline-none focus:ring-1 focus:ring-crema/60"
								value={pairCode}
								onChange={(event) => setPairCode(event.target.value)}
								placeholder="Paste sync code"
							/>
							<Button
								size="sm"
								onClick={() => {
									if (
										window.confirm(
											"Replace this browser's local workspace with the connected cloud snapshot?",
										)
									)
										void auth.pairSyncCode(pairCode).catch(() => undefined);
								}}
								disabled={!pairCode.trim() || auth.isBusy}
							>
								Connect
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Or enable sync to start a new cloud workspace.
						</p>
						<Button
							className="w-full"
							onClick={() => void auth.enableSync().catch(() => undefined)}
							disabled={auth.isBusy}
						>
							Enable sync
						</Button>
					</div>
				)}

				{!isLocal && (
					<div className="space-y-3">
						{isConflict ? (
							<>
								<div>
									<p className="text-sm font-medium">
										Choose which snapshot to keep
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Pull replaces local data. Push replaces the cloud snapshot.
									</p>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<Button
										variant="outline"
										disabled={auth.isBusy}
										onClick={() => void pull()}
									>
										<CloudDownload /> Pull cloud
									</Button>
									<Button disabled={auth.isBusy} onClick={() => void push()}>
										<CloudUpload /> Push local
									</Button>
								</div>
							</>
						) : auth.status === "disconnected" ? (
							<Button
								className="w-full"
								onClick={() => void reconnect()}
								disabled={auth.isBusy}
							>
								Reconnect
							</Button>
						) : auth.status === "paused" ? (
							<Button
								className="w-full"
								onClick={() => void auth.resumeSync().catch(() => undefined)}
								disabled={auth.isBusy}
							>
								Resume sync
							</Button>
						) : (
							<div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper-sunken p-3">
								<div className="min-w-0">
									<p className="font-data text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
										{auth.isBusy
											? "Saving to cloud…"
											: auth.hasPendingChanges
												? "Saved on this browser"
												: "Everything saved"}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{auth.hasPendingChanges
											? "Your changes will reach the cloud shortly."
											: "Changes save automatically. Go make a coffee."}
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									disabled={auth.isBusy}
									onClick={() => void reconnect()}
								>
									<RefreshCcw /> Sync now
								</Button>
							</div>
						)}
					</div>
				)}

				{auth.enrollment && (
					<div className="space-y-3 border-t border-border pt-4">
						<div className="min-w-0">
							<p className="font-data text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
								Connect another device
							</p>
							<div className="flex items-center justify-between gap-3">
								<p className="mt-1 truncate font-data text-xs tracking-widest bg-primary/10 px-1 py-0.5 rounded">
									{codeVisible
										? auth.enrollment.syncCode
										: "••••••••••••••••••••••••••••"}
								</p>
								<div className="flex shrink-0 gap-1 ">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setCodeVisible((visible) => !visible)}
									>
										{codeVisible ? "Hide" : "Show"}
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Copy sync code"
										onClick={() =>
											void navigator.clipboard.writeText(
												auth.enrollment!.syncCode,
											)
										}
									>
										<CopyIcon />
									</Button>
									{auth.status !== "paused" && (
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label="Replace sync code"
											disabled={auth.isBusy}
											onClick={() =>
												void auth
													.replaceSyncCode()
													.catch(() =>
														setMessage("Could not replace sync code."),
													)
											}
										>
											<RefreshCcw />
										</Button>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center justify-between gap-3">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => void auth.pauseSync()}
								disabled={auth.status !== "active" || auth.isBusy}
							>
								<CloudLightning /> Pause sync
							</Button>
							<Button
								variant="subtle-destructive"
								size="sm"
								disabled={auth.isBusy}
								onClick={() => {
									if (
										window.confirm(
											"Forget sync enrollment on this browser? Cloud data and local app data stay intact.",
										)
									)
										void auth.forgetEnrollment();
								}}
							>
								<Unlink /> Forget
							</Button>
						</div>
					</div>
				)}

				<div className="border-t border-border pt-4">
					<BackupActions
						fileInput={fileInput}
						onChooseFile={() => fileInput.current?.click()}
						onImportFile={(file) => void importFile(file)}
						onExport={() => void downloadExport()}
					/>
				</div>

				{(auth.lastError || message) && (
					<p className="border-l-2 border-crema pl-3 text-xs text-ink-soft">
						{auth.lastError ?? message}
					</p>
				)}
			</div>
		</section>
	);
}
