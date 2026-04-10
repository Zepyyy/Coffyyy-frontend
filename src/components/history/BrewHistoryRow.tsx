import { ChevronDown, Star } from "lucide-react";
import { useState } from "react";
import { deleteBrewById } from "@/db/crud/delete";
import { cn } from "@/lib/utils";
import type { Brews } from "@/types/BrewTypes";

function formatDate(date: Date | string | undefined): string {
	if (!date) return "—";
	try {
		return new Date(date).toLocaleDateString(undefined, {
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return String(date);
	}
}

function RatingStars({ value }: { value: number }) {
	const n = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
	return (
		<div
			className="flex shrink-0 gap-0.5"
			role="img"
			aria-label={`Rating ${n} out of 5`}
		>
			{[1, 2, 3, 4, 5].map((i) => (
				<Star
					key={i}
					className={cn(
						"size-3.5",
						i < n ? "fill-primary text-primary" : "text-muted-foreground/25",
					)}
				/>
			))}
		</div>
	);
}

export function BrewHistoryRow({
	brew,
	dotBgClass,
}: {
	brew: Brews;
	dotBgClass: string;
}) {
	const [expanded, setExpanded] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const ratio =
		brew.beanWeight && brew.espressoWeight
			? (brew.espressoWeight / brew.beanWeight).toFixed(1)
			: null;

	const metaLine = [
		brew.machineId,
		brew.grindSize && `Grind ${brew.grindSize}`,
		ratio && `1:${ratio}`,
		brew.extractionTime,
	]
		.filter(Boolean)
		.join(" · ");

	async function handleDelete() {
		if (typeof brew.id !== "number") return;
		setIsDeleting(true);
		try {
			await deleteBrewById(brew.id);
		} finally {
			setIsDeleting(false);
			setConfirmDelete(false);
		}
	}

	return (
		<div className="border border-border bg-background transition-colors hover:border-primary/30">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				className="flex w-full items-center gap-3 px-4 py-3 text-left"
			>
				<div
					className={cn(
						"flex size-8 shrink-0 items-center justify-center rounded-full",
						dotBgClass,
					)}
				>
					<span className="font-News text-xs text-white/90">
						{brew.overallRating ?? "?"}
					</span>
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-Recursive text-sm font-medium">
						{brew.beanId ?? "Unknown bean"}
					</p>
					<p className="truncate font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
						{metaLine || "—"}
					</p>
				</div>
				<RatingStars value={brew.overallRating ?? 0} />
				<span className="hidden shrink-0 font-Mono text-[10px] text-muted-foreground/80 sm:block">
					{formatDate(brew.date)}
				</span>
				<ChevronDown
					className={cn(
						"size-4 shrink-0 text-muted-foreground transition-transform",
						expanded && "rotate-180",
					)}
					aria-hidden
				/>
			</button>

			{expanded && (
				<div className="space-y-3 border-t border-border/70 px-4 py-3">
					<div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
						{[
							[
								"Bean dose",
								brew.beanWeight != null ? `${brew.beanWeight} g` : null,
							],
							[
								"Espresso out",
								brew.espressoWeight != null ? `${brew.espressoWeight} g` : null,
							],
							["Ratio", ratio ? `1:${ratio}` : null],
							["Grind", brew.grindSize || null],
							["Extraction", brew.extractionTime || null],
							["Flow", brew.flow || null],
							["Rating", brew.overallRating || null],
							["Machine", brew.machineId || null],
							["Date", formatDate(brew.date)],
						]
							.filter(([, v]) => v)
							.map(([label, value]) => (
								<div key={label}>
									<span className="text-xs text-muted-foreground">{label}</span>
									<p className="mt-0.5 text-xs">{value}</p>
								</div>
							))}
					</div>

					<div className="flex flex-wrap items-center justify-end gap-2 pt-1">
						{confirmDelete ? (
							<>
								<span className="text-xs text-muted-foreground">
									Delete this brew?
								</span>
								<button
									type="button"
									onClick={handleDelete}
									disabled={isDeleting}
									className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
								>
									{isDeleting ? "…" : "Delete"}
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									Cancel
								</button>
							</>
						) : (
							<button
								type="button"
								onClick={() => setConfirmDelete(true)}
								className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-destructive"
							>
								Delete
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
