import {
	Cloud,
	CloudCheck,
	CloudOff,
	CloudUpload,
	LoaderCircle,
	Pause,
	TriangleAlert,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import SyncPanel from "./SyncPanel";

export default function SyncControl() {
	const location = useLocation();
	return <SyncPopover key={location.key} />;
}

function SyncPopover() {
	const auth = useAuth();
	const [open, setOpen] = useState(false);
	const [openedAt, setOpenedAt] = useState(0);
	const needsAttention =
		auth.status === "conflict" || auth.status === "disconnected";
	const label = auth.isBusy
		? "Saving…"
		: auth.status === "conflict"
			? "Choose which changes to keep"
			: auth.status === "paused"
				? "Sync paused"
				: auth.status === "disconnected"
					? "Saved here · cloud unavailable"
					: auth.status === "active"
						? auth.hasPendingChanges
							? "Saved here · cloud save queued"
							: "Saved to cloud"
						: auth.status === "loading"
							? "Connecting…"
							: "Cloud sync";
	const Icon =
		auth.isBusy || auth.status === "loading"
			? LoaderCircle
			: auth.status === "conflict"
				? TriangleAlert
				: auth.status === "paused"
					? Pause
					: auth.status === "disconnected"
						? CloudOff
						: auth.status === "active"
							? auth.hasPendingChanges
								? CloudUpload
								: CloudCheck
							: Cloud;

	useEffect(() => {
		// Give successful saves a moment to land, then get out of the way.
		if (
			!open ||
			auth.isBusy ||
			auth.hasPendingChanges ||
			auth.lastError ||
			auth.status !== "active" ||
			!auth.lastSyncedAt ||
			auth.lastSyncedAt <= openedAt
		)
			return;
		const timer = window.setTimeout(() => setOpen(false), 1_800);
		return () => window.clearTimeout(timer);
	}, [
		open,
		openedAt,
		auth.isBusy,
		auth.hasPendingChanges,
		auth.lastError,
		auth.status,
		auth.lastSyncedAt,
	]);

	return (
		<Popover.Root
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) {
					setOpenedAt(Date.now());
				}
			}}
		>
			<Popover.Trigger asChild>
				<button
					type="button"
					aria-label={label}
					title={label}
					className={cn(
						"relative flex h-8 w-8 items-center justify-center transition-colors hover:bg-paper-sunken hover:text-foreground",
						needsAttention ? "text-crema" : "text-ink-faint",
					)}
				>
					<Icon
						size={16}
						className={cn(
							(auth.isBusy || auth.status === "loading") &&
								"motion-safe:animate-spin",
						)}
					/>
					{needsAttention && (
						<span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-crema" />
					)}
				</button>
			</Popover.Trigger>
			<span role="status" className="sr-only">
				{label}
			</span>
			<Popover.Portal>
				<Popover.Content
					align="end"
					sideOffset={12}
					collisionPadding={16}
					aria-label="Cloud sync"
					className="z-50 w-[min(25rem,calc(100vw-2rem))] max-h-[calc(100dvh-6rem)] overflow-y-auto border border-line bg-paper-raised p-5 shadow-lift outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-top-1"
				>
					<SyncPanel />
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
