import { ChevronDown, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deleteBrewById } from "@/lib/data";
import {
	recipeLine,
	scoreClass,
	strengthLabel,
	tasteLabel,
} from "@/lib/brewFormat";
import { cn, formatExtractionTime } from "@/lib/utils";
import type { Brews } from "@/types/BrewTypes";

function formatDate(date: Date | string | undefined): string {
	if (!date) return "—";
	try {
		return new Date(date).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	} catch {
		return String(date);
	}
}

export function RatingStars({ value }: { value: number | null | undefined }) {
	const n = Math.min(5, Math.max(0, Math.round(Number(value) || 0)));
	return (
		<span
			className="flex shrink-0 gap-0.5"
			role="img"
			aria-label={value == null ? "Unrated" : `Rating ${n} out of 5`}
		>
			{[1, 2, 3, 4, 5].map((i) => (
				<svg
					key={i}
					viewBox="0 0 20 20"
					className={cn("size-3", i <= n ? "fill-crema" : "fill-line-strong")}
					aria-hidden
				>
					<path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
				</svg>
			))}
		</span>
	);
}

export function BrewLedgerRow({
	brew,
	machineName,
}: {
	brew: Brews;
	machineName: string | undefined;
}) {
	const [expanded, setExpanded] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const taste = tasteLabel(brew.tasteScore);
	const strength = strengthLabel(brew.strengthScore);
	const time = formatExtractionTime(brew.extractionTime);

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
		<article className="border-b border-border/60 last:border-b-0">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				aria-expanded={expanded}
				className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left transition-colors hover:bg-paper-sunken/60 sm:grid-cols-[5rem_minmax(0,1fr)_auto_auto]"
			>
				<span className="font-data text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
					{formatDate(brew.date)}
				</span>
				<span className="truncate font-data text-xs text-foreground/80">
					{recipeLine(brew) || "No recipe saved"}
				</span>
				<span className="hidden items-center justify-end gap-1.5 sm:flex">
					{taste && (
						<span
							className={cn(
								"border border-current/20 px-1.5 py-0.5 font-data text-[9px] uppercase tracking-[0.1em]",
								scoreClass(brew.tasteScore),
							)}
						>
							{taste}
						</span>
					)}
					{strength && (
						<span
							className={cn(
								"border border-current/20 px-1.5 py-0.5 font-data text-[9px] uppercase tracking-[0.1em]",
								scoreClass(brew.strengthScore),
							)}
						>
							{strength}
						</span>
					)}
				</span>
				<span className="flex items-center justify-end gap-2">
					<RatingStars value={brew.overallRating} />
					<ChevronDown
						className={cn(
							"size-3.5 shrink-0 text-muted-foreground transition-transform",
							expanded && "rotate-180",
						)}
						aria-hidden
					/>
				</span>
			</button>

			{expanded && (
				<div className="rise space-y-3 border-t border-line/40 bg-paper-sunken/40 px-4 py-4">
					<div className="flex flex-wrap gap-x-8 gap-y-2">
						{[
							[
								"Dose",
								brew.beanWeight != null
									? `${brew.beanWeight}g in → ${brew.espressoWeight ?? "?"}g out`
									: null,
							],
							["Grind", brew.grindSize != null ? String(brew.grindSize) : null],
							["Extraction", time],
							["Flow", brew.flow ?? null],
							["Machine", machineName ?? null],
							[
								"Logged",
								new Date(brew.date).toLocaleString(undefined, {
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								}),
							],
						].map(([label, value]) =>
							value ? (
								<div key={label as string}>
									<p className="font-data text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
										{label}
									</p>
									<p className="font-sans text-sm text-foreground">{value}</p>
								</div>
							) : null,
						)}
					</div>

					{(taste || strength) && (
						<p className="font-sans text-xs text-muted-foreground">
							{taste && brew.tasteScore !== 0
								? `${taste.startsWith("Sour") ? "Sour side: go finer or run longer" : "Bitter side: go coarser or cut the shot"}.`
								: taste
									? "Taste balanced."
									: "Taste not rated yet."}{" "}
							{strength && brew.strengthScore !== 0
								? `${strength.startsWith("Weak") ? "Weak: raise dose or lower yield" : "Strong: lower dose or raise yield"}.`
								: strength
									? "Strength balanced."
									: "Strength not rated yet."}
						</p>
					)}

					<div className="flex justify-end">
						{confirmDelete ? (
							<div className="flex items-center gap-2">
								<span className="font-sans text-xs text-muted-foreground">
									Delete this brew?
								</span>
								<button
									type="button"
									onClick={handleDelete}
									disabled={isDeleting}
									className="inline-flex items-center gap-1.5 bg-destructive px-3 py-1.5 font-sans text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
								>
									<Trash2 className="size-3" />
									{isDeleting ? "Deleting…" : "Delete"}
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 font-sans text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									<X className="size-3" />
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmDelete(true)}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-destructive"
							>
								<Trash2 className="size-3" />
								Delete
							</button>
						)}
					</div>
				</div>
			)}
		</article>
	);
}
