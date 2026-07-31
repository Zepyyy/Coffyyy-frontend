import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { exportLocalSnapshot, importLocalSnapshot } from "@/lib/api/migration";

function statusLabel(status: string) {
	return status === "active"
		? "Sync active"
		: status === "conflict"
			? "Sync conflict"
			: status === "paused"
				? "Sync paused"
				: status === "disconnected"
					? "Sync disconnected"
					: "Local";
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
		setMessage("Local snapshot imported. Push local when ready.");
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
					? "Cloud changed. Pull cloud or choose Push again."
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

	return (
		<section className="absolute top-20 right-5 mx-auto w-full max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold">{statusLabel(auth.status)}</h2>
					<p className="text-sm text-muted-foreground">
						Local data stays available without sync.
					</p>
				</div>
				{auth.status === "local" && (
					<Button onClick={() => void auth.enableSync()} disabled={auth.isBusy}>
						Enable sync
					</Button>
				)}
				{auth.status === "disconnected" && (
					<Button onClick={() => void reconnect()} disabled={auth.isBusy}>
						Reconnect
					</Button>
				)}
				{auth.status === "paused" && (
					<Button onClick={() => void auth.resumeSync()} disabled={auth.isBusy}>
						Resume sync
					</Button>
				)}
			</div>

			{auth.status === "local" && (
				<div className="mt-4 flex gap-2">
					<input
						className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
						value={pairCode}
						onChange={(event) => setPairCode(event.target.value)}
						placeholder="Paste sync code"
					/>
					<Button
						variant="outline"
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
					<Button variant="outline" onClick={() => fileInput.current?.click()}>
						Import JSON
					</Button>
					<Button variant="outline" onClick={() => void downloadExport()}>
						Export JSON
					</Button>
					<input
						ref={fileInput}
						type="file"
						accept="application/json"
						hidden
						onChange={(event) => {
							const file = event.target.files?.[0];
							if (file) void importFile(file);
							event.target.value = "";
						}}
					/>
				</div>
			)}

			{auth.enrollment && (
				<div className="mt-4 space-y-3">
					<p className="text-sm">Workspace {auth.enrollment.workspaceId}</p>
					<div className="flex flex-wrap gap-2">
						{auth.status === "active" && (
							<Button variant="outline" onClick={() => void auth.pauseSync()}>
								Pause sync
							</Button>
						)}
						{auth.status === "active" && (
							<Button variant="outline" onClick={() => void push()}>
								Push local
							</Button>
						)}
						{auth.status === "conflict" && (
							<>
								<Button variant="outline" onClick={() => void pull()}>
									Pull cloud
								</Button>
								<Button variant="outline" onClick={() => void push()}>
									Push local
								</Button>
							</>
						)}
						<Button variant="outline" onClick={() => void downloadExport()}>
							Export JSON
						</Button>
						<Button
							variant="outline"
							onClick={() => fileInput.current?.click()}
						>
							Import JSON
						</Button>
						<input
							ref={fileInput}
							type="file"
							accept="application/json"
							hidden
							onChange={(event) => {
								const file = event.target.files?.[0];
								if (file) void importFile(file);
								event.target.value = "";
							}}
						/>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span>
							{codeVisible ? auth.enrollment.syncCode : "••••••••••••"}
						</span>
						<Button
							variant="ghost"
							onClick={() => setCodeVisible((visible) => !visible)}
						>
							{codeVisible ? "Hide code" : "Show code"}
						</Button>
						<Button
							variant="ghost"
							onClick={() =>
								void navigator.clipboard.writeText(auth.enrollment!.syncCode)
							}
						>
							Copy code
						</Button>
					</div>
					{auth.status !== "paused" && (
						<Button variant="ghost" onClick={() => void auth.replaceSyncCode()}>
							Replace sync code
						</Button>
					)}
					<Button
						variant="ghost"
						onClick={() => {
							if (
								window.confirm(
									"Forget sync enrollment on this browser? Cloud data and local app data stay intact.",
								)
							)
								void auth.forgetEnrollment();
						}}
					>
						Forget enrollment
					</Button>
				</div>
			)}

			{(auth.lastError || message) && (
				<p className="mt-4 text-sm text-muted-foreground">
					{message ?? auth.lastError}
				</p>
			)}
		</section>
	);
}
