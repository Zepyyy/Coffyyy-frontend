import { BookmarkPlus, ChevronDown, Repeat, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import BrewFeedback from "@/components/feedback/BrewFeedback";
import { deleteBrewById } from "@/lib/data";
import {
	brewVsRecipe,
	flowClass,
	formatRecipeDelta,
	recipeLine,
	scoreClass,
	strengthLabel,
	tasteLabel,
} from "@/lib/brewFormat";
import { formatRatio, methodConfig } from "@/lib/brewMethods";
import { cn, formatExtractionTime } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";

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

function RowTag({ label, className }: { label: string; className?: string }) {
	return (
		<span
			className={cn(
				"border border-current/20 px-1.5 py-0.5 font-data text-[9px] uppercase tracking-[0.1em]",
				className,
			)}
		>
			{label}
		</span>
	);
}

export function BrewLedgerRow({
	brew,
	machineName,
	bean,
	recipe,
	showMethod = false,
	showBean = false,
}: {
	brew: Brews;
	machineName: string | undefined;
	bean?: { id: number; name?: string; status?: Beans["status"] } | null;
	/** The recipe this brew followed, when linked. */
	recipe?: Recipes | null;
	/** Show the method label (when the journal has more than one method). */
	showMethod?: boolean;
	showBean?: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const taste = tasteLabel(brew.tasteScore);
	const strength = strengthLabel(brew.strengthScore);
	const time = formatExtractionTime(brew.extractionTime);
	const ratio = formatRatio(brew.beanWeight, brew.brewWeight);
	const config = methodConfig(brew.method);
	const needsNotes = brew.overallRating == null;
	const deltas = recipe ? brewVsRecipe(brew, recipe) : [];
	const temp =
		config.waterTemp && brew.waterTemp != null ? `${brew.waterTemp}°C` : null;
	const heat = config.heat && brew.heat ? `${brew.heat} heat` : null;

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
				className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-left transition-colors hover:bg-paper-sunken/60"
			>
				<span className="w-11 shrink-0 font-data text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
					{formatDate(brew.date)}
				</span>
				<span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-1">
					{showMethod && (
						<span className="w-16 shrink-0 font-data text-[9px] uppercase tracking-[0.14em] text-ink-soft">
							{config.label}
						</span>
					)}
					{showBean && (
						<span className="w-full break-words font-display text-lg italic text-foreground">
							{bean?.name ?? "Unknown bean"}
						</span>
					)}
					{/* The dial decision, front and center */}
					<span className="inline-flex items-baseline gap-1.5">
						<span className="font-data text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
							grind
						</span>
						<span className="font-data text-lg font-bold leading-none text-foreground">
							{brew.grindSize ?? "—"}
						</span>
					</span>
					<span className="font-data text-xs text-foreground/80">
						{[ratio, time, temp, heat].filter(Boolean).join(" · ") ||
							recipeLine(brew)}
					</span>
					{recipe && (
						<span className="max-w-40 truncate font-data text-[9px] uppercase tracking-[0.1em] text-crema-deep dark:text-crema">
							↳ {recipe.name}
						</span>
					)}
					{config.flow && brew.flow ? (
						<RowTag
							label={brew.flow.toLowerCase()}
							className={flowClass(brew.flow)}
						/>
					) : null}
					{taste ? (
						<RowTag label={taste} className={scoreClass(brew.tasteScore)} />
					) : null}
					{strength ? (
						<RowTag
							label={strength}
							className={scoreClass(brew.strengthScore)}
						/>
					) : null}
					{needsNotes && (
						<span className="border border-dashed border-line-strong px-1.5 py-0.5 font-data text-[9px] uppercase tracking-[0.1em] text-ink-faint">
							needs notes
						</span>
					)}
				</span>
				<span className="ml-auto flex items-center justify-end gap-2">
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
				<div className="rise space-y-4 border-t border-line/40 bg-paper-sunken/40 px-4 py-4">
					<BrewFeedback brew={brew} bean={bean ?? null} bare />

					{recipe && (
						<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-crema pl-3">
							<span className="font-data text-[9px] font-semibold uppercase tracking-[0.16em] text-crema-deep dark:text-crema">
								Recipe
							</span>
							<span className="font-sans text-sm text-foreground">
								{recipe.name}
							</span>
							<span className="font-data text-xs text-ink-soft">
								{deltas.length > 0
									? deltas.map(formatRecipeDelta).join(" · ")
									: "on target"}
							</span>
						</div>
					)}

					<div className="flex flex-wrap gap-x-8 gap-y-2">
						{[
							[
								`Dose → ${config.brewWeight.label}`,
								brew.beanWeight != null
									? `${brew.beanWeight}g → ${brew.brewWeight ?? "?"}g`
									: null,
							],
							[config.time.label, time],
							["Flow", config.flow ? (brew.flow ?? null) : null],
							["Water temp", temp],
							["Heat", config.heat ? (brew.heat ?? null) : null],
							["Method", showMethod ? config.label : null],
							["Brewer", machineName ?? null],
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

					{brew.notes?.trim() && (
						<div>
							<p className="font-data text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
								Notes
							</p>
							<p className="whitespace-pre-line font-sans text-sm text-foreground">
								{brew.notes}
							</p>
						</div>
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
							<div className="flex items-center gap-1">
								<Link
									to={`/log/brew?fromBrew=${brew.id}`}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
								>
									<Repeat className="size-3" />
									Repeat
								</Link>
								{config.hasRecipes && (
									<Link
										to={`/log/recipe?fromBrew=${brew.id}`}
										className="inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
									>
										<BookmarkPlus className="size-3" />
										Save as recipe
									</Link>
								)}
								<button
									type="button"
									onClick={() => setConfirmDelete(true)}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-destructive"
								>
									<Trash2 className="size-3" />
									Delete
								</button>
							</div>
						)}
					</div>
				</div>
			)}
		</article>
	);
}
