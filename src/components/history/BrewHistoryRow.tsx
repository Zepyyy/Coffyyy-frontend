import {
	CalendarDays,
	ChevronDown,
	Coffee,
	Gauge,
	Scale,
	Star,
	Timer,
	Trash2,
	Waves,
	X,
} from "lucide-react";
import { useState } from "react";
import { deleteBrewById } from "@/db/crud/delete";
import { cn } from "@/lib/utils";
import type { Brews } from "@/types/BrewTypes";

function formatDate(date: Date | string | undefined): string {
	if (!date) return "—";
	try {
		return new Date(date).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return String(date);
	}
}

function formatTime(date: Date | string | undefined): string {
	if (!date) return "";
	try {
		return new Date(date).toLocaleTimeString(undefined, {
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "";
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
						i <= n ? "fill-primary text-primary" : "text-muted-foreground/25",
					)}
				/>
			))}
		</div>
	);
}

function axisLabel(
	value: number | undefined,
	negativeLabel: string,
	positiveLabel: string,
) {
	if (value == null) return "Unrated";
	if (value === 0) return "Balanced";
	return value < 0 ? `${negativeLabel} ${value}` : `${positiveLabel} +${value}`;
}

function axisClass(value: number | undefined) {
	if (value == null) return "text-muted-foreground";
	if (value < 0) return "text-tag-teal-400";
	if (value > 0) return "text-tag-orange-400";
	return "text-primary";
}

function DetailItem({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: React.ReactNode;
}) {
	return (
		<div className="flex items-start gap-3 border border-border/70 bg-background/70 p-3">
			<div className="mt-0.5 text-primary/60">{icon}</div>
			<div className="min-w-0">
				<p className="font-Mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
					{label}
				</p>
				<p className="mt-0.5 truncate font-Recursive text-sm text-foreground">
					{value}
				</p>
			</div>
		</div>
	);
}

export function BrewHistoryRow({
	brew,
	beanName,
	machineName,
}: {
	brew: Brews;
	beanName: string;
	machineName: string;
}) {
	const [expanded, setExpanded] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const ratio =
		brew.beanWeight && brew.espressoWeight
			? (brew.espressoWeight / brew.beanWeight).toFixed(1)
			: null;

	const date = formatDate(brew.date);
	const time = formatTime(brew.date);
	const taste = axisLabel(brew.tasteScore, "Sour", "Bitter");
	const strength = axisLabel(brew.strengthScore, "Weak", "Strong");
	const recipeLine = [
		brew.grindSize != null ? `Grind ${brew.grindSize}` : null,
		brew.beanWeight != null ? `${brew.beanWeight}g in` : null,
		brew.espressoWeight != null ? `${brew.espressoWeight}g out` : null,
		ratio ? `1:${ratio}` : null,
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
		<article className="border border-border bg-background transition-colors hover:border-primary/30">
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				className="grid w-full gap-4 px-4 py-4 text-left sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]"
			>
				<div className="flex items-center gap-3 sm:block">
					<div className="flex size-10 items-center justify-center border border-primary/20 bg-primary-700/10 text-primary">
						<CalendarDays className="size-4" />
					</div>
					<div className="sm:mt-2">
						<p className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
							{date}
						</p>
						{time && (
							<p className="font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
								{time}
							</p>
						)}
					</div>
				</div>

				<div className="min-w-0 space-y-2">
					<div className="min-w-0">
						<p className="truncate font-News text-xl leading-tight text-foreground/90">
							{beanName}
						</p>
						<p className="mt-0.5 truncate font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
							{machineName}
						</p>
					</div>
					<p className="truncate font-Recursive text-xs text-muted-foreground">
						{recipeLine || "No recipe details saved"}
					</p>
					<div className="flex flex-wrap gap-2">
						<span
							className={cn(
								"border border-current/20 bg-background/70 px-2 py-1 font-Mono text-[9px] uppercase tracking-[0.14em]",
								axisClass(brew.tasteScore),
							)}
						>
							{taste}
						</span>
						<span
							className={cn(
								"border border-current/20 bg-background/70 px-2 py-1 font-Mono text-[9px] uppercase tracking-[0.14em]",
								axisClass(brew.strengthScore),
							)}
						>
							{strength}
						</span>
					</div>
				</div>

				<div className="flex items-center justify-between gap-4 sm:justify-end">
					<div className="text-left sm:text-right">
						<RatingStars value={brew.overallRating ?? 0} />
						<p className="mt-1 font-Mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
							{brew.overallRating != null
								? `${brew.overallRating}/5`
								: "Unrated"}
						</p>
					</div>
					<ChevronDown
						className={cn(
							"size-4 shrink-0 text-muted-foreground transition-transform",
							expanded && "rotate-180",
						)}
						aria-hidden
					/>
				</div>
			</button>

			{expanded && (
				<div className="space-y-4 border-t border-border/70 bg-muted/10 px-4 py-4">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<DetailItem
							icon={<Scale className="size-4" />}
							label="Dose"
							value={
								brew.beanWeight != null && brew.espressoWeight != null
									? `${brew.beanWeight}g -> ${brew.espressoWeight}g`
									: "Not saved"
							}
						/>
						<DetailItem
							icon={<Gauge className="size-4" />}
							label="Grind"
							value={brew.grindSize != null ? brew.grindSize : "Not saved"}
						/>
						<DetailItem
							icon={<Timer className="size-4" />}
							label="Extraction"
							value={brew.extractionTime || "Not saved"}
						/>
						<DetailItem
							icon={<Waves className="size-4" />}
							label="Flow"
							value={brew.flow || "Not saved"}
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div className="border border-border/70 bg-background/70 p-4">
							<p className="font-Mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
								Taste read
							</p>
							<p
								className={cn(
									"mt-1 font-News text-2xl leading-none",
									axisClass(brew.tasteScore),
								)}
							>
								{taste}
							</p>
							<p className="mt-2 font-Recursive text-xs text-muted-foreground">
								Negative means sour or under-extracted. Positive means bitter or
								over-extracted.
							</p>
						</div>
						<div className="border border-border/70 bg-background/70 p-4">
							<p className="font-Mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
								Strength read
							</p>
							<p
								className={cn(
									"mt-1 font-News text-2xl leading-none",
									axisClass(brew.strengthScore),
								)}
							>
								{strength}
							</p>
							<p className="mt-2 font-Recursive text-xs text-muted-foreground">
								Negative means weak. Positive means strong. Balanced is the
								target.
							</p>
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-between gap-3 pt-1">
						<div className="flex items-center gap-2 font-Mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
							<Coffee className="size-3.5" />
							<span>Brew #{brew.id}</span>
						</div>
						{confirmDelete ? (
							<div className="flex flex-wrap items-center gap-2">
								<span className="font-Recursive text-xs text-muted-foreground">
									Delete this brew?
								</span>
								<button
									type="button"
									onClick={handleDelete}
									disabled={isDeleting}
									className="inline-flex items-center gap-1.5 bg-destructive px-3 py-1.5 font-Recursive text-xs font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
								>
									<Trash2 className="size-3" />
									{isDeleting ? "Deleting..." : "Delete"}
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 font-Recursive text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									<X className="size-3" />
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmDelete(true)}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 font-Recursive text-xs text-muted-foreground transition-colors hover:text-destructive"
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
