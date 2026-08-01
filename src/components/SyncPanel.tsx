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
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthStatus } from "@/contexts/auth-context";
import { useAuth } from "@/hooks/useAuth";
import { exportLocalSnapshot, importLocalSnapshot } from "@/lib/api/backup";

function statusLabel(status: AuthStatus) {
	return status === "active"
		? "Sync active"
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
				<p className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
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
				"Replace this browser's local workspace with the imported snapshot?",
			)
		)
			return;
		await importLocalSnapshot(await file.text());
		setMessage("Snapshot imported. Push local when ready.");
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
		<section className="absolute top-18 right-2 z-50 w-[min(25rem,calc(100vw-2rem))] border border-border bg-background p-5 shadow-md">
			<div className="space-y-5">
				<header className="flex items-start justify-between gap-4">
					<div className="flex min-w-0 items-start gap-2.5">
						<div className="mt-0.5">{statusIcon(auth.status)}</div>
						<div className="min-w-0">
							<h2 className="font-News text-xl leading-none">
								{statusLabel(auth.status)}
							</h2>
							<p className="mt-1 truncate font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
								{auth.enrollment
									? `Workspace ${auth.enrollment.workspaceId}`
									: "Your data stays on this browser"}
							</p>
						</div>
					</div>
					{auth.isBusy && (
						<span className="font-Mono text-[10px] uppercase text-muted-foreground">
							Working…
						</span>
					)}
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
								className="min-w-0 flex-1 border border-border bg-muted/20 px-3 py-2 font-Mono text-xs outline-none focus:ring-1 focus:ring-primary"
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
										void auth.pairSyncCode(pairCode);
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
							onClick={() => void auth.enableSync()}
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
									<Button variant="outline" onClick={() => void pull()}>
										<CloudDownload /> Pull cloud
									</Button>
									<Button onClick={() => void push()}>
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
								onClick={() => void auth.resumeSync()}
								disabled={auth.isBusy}
							>
								Resume sync
							</Button>
						) : (
							<div className="flex items-center justify-between gap-3 rounded-sm border border-border bg-muted/20 p-3">
								<div className="min-w-0">
									<p className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
										Cloud workspace
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										Ready for an explicit snapshot push.
									</p>
								</div>
								<Button variant="outline" size="sm" onClick={() => void push()}>
									<CloudUpload /> Push local
								</Button>
							</div>
						)}
					</div>
				)}

				{auth.enrollment && (
					<div className="space-y-3 border-t border-border pt-4">
						<div className="min-w-0">
							<p className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
								Sync code qsd
							</p>
							<div className="flex items-center justify-between gap-3">
								<p className="mt-1 truncate font-Mono text-xs tracking-widest bg-primary/10 px-1 py-0.5 rounded">
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
											onClick={() => void auth.replaceSyncCode()}
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
								disabled={auth.status !== "active"}
							>
								<CloudLightning /> Pause sync
							</Button>
							<Button
								variant="subtle-destructive"
								size="sm"
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
					<p className="border-l-2 border-primary pl-3 text-xs text-muted-foreground">
						{message ?? auth.lastError}
					</p>
				)}
			</div>
		</section>
	);
}
