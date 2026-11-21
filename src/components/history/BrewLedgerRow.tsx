import { BookmarkPlus, ChevronDown, Repeat, Trash2, X } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { Link } from "react-router";
import BrewFeedback from "@/components/feedback/BrewFeedback";
import { deleteBrewById } from "@/lib/data";
import {
	brewVsRecipe,
	formatRecipeDelta,
	strengthLabel,
	tasteLabel,
} from "@/lib/brewFormat";
import { formatRatio, methodConfig } from "@/lib/brewMethods";
import { MethodIcon } from "@/components/method/MethodMarks";
import { methodInkClass } from "@/lib/methodIdentity";
import { cn, formatExtractionTime, getColorSwatch } from "@/lib/utils";
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
			className="flex shrink-0 gap-px sm:gap-0.5"
			role="img"
			aria-label={value == null ? "Unrated" : `Rating ${n} out of 5`}
		>
			{[1, 2, 3, 4, 5].map((i) => (
				<svg
					key={i}
					viewBox="0 0 20 20"
					className={cn(
						"size-2.5 sm:size-3",
						i <= n ? "fill-crema" : "fill-line-strong",
					)}
					aria-hidden
				>
					<path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
				</svg>
			))}
		</span>
	);
}

type LedgerLayout = { showMethod?: boolean; showBean?: boolean };

/**
 * Column tracks shared by the header and every row, so values line up
 * across chapters. Phones drop time, temp and the repeat shortcut (all
 * in the details), and give the bean its own line.
 */
function ledgerColumns({ showMethod, showBean }: LedgerLayout) {
	const lead = showBean ? [] : ["3rem"];
	const method = showMethod ? ["1rem"] : [];
	// … grind · ratio · [time · temp] · spacer · taste · rating · chevron [· repeat]
	const tail = ["1.25rem", "auto", "0.875rem"];
	return {
		// Phones let the ratio column take the slack instead of a spacer.
		"--ledger-cols": [
			...lead,
			...method,
			"1.5rem",
			"minmax(max-content,1fr)",
			...tail,
		].join(" "),
		"--ledger-cols-sm": [
			showBean ? "minmax(0,13rem)" : "3.5rem",
			...method,
			"1.75rem",
			"3.75rem",
			"2.75rem",
			"3.5rem",
			"minmax(0,1fr)",
			...tail,
			"1rem",
		].join(" "),
	} as CSSProperties;
}

const LEDGER_GRID =
	"grid grid-cols-(--ledger-cols) items-center gap-x-1.5 px-3 sm:grid-cols-(--ledger-cols-sm) sm:gap-x-3 sm:px-4";

/** One quiet label row above a ledger; the only place the columns are named. */
export function LedgerHeader(layout: LedgerLayout) {
	return (
		<div
			aria-hidden
			style={ledgerColumns(layout)}
			className={cn(
				LEDGER_GRID,
				"border-x border-transparent pb-1.5 font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint",
			)}
		>
			<span className={cn(layout.showBean && "hidden sm:block")}>
				{layout.showBean ? "Bean" : ""}
			</span>
			{layout.showMethod && <span />}
			<span className="flex justify-end">Grind</span>
			<span>Ratio</span>
			<span className="hidden sm:block">Time</span>
			<span className="hidden sm:block">Temp</span>
			<span className="text-right sm:col-span-2">Taste</span>
		</div>
	);
}

/**
 * Taste and strength as one dot on a tiny brewing compass: left sour,
 * right bitter, up strong, down weak, centre balanced. An axis left
 * unrated draws as a line, so nothing reads as "balanced" by default.
 */
export function TasteMark({
	taste,
	strength,
}: {
	taste: number | null | undefined;
	strength: number | null | undefined;
}) {
	if (taste == null && strength == null) return <span />;
	const label = [tasteLabel(taste), strengthLabel(strength)]
		.filter(Boolean)
		.join(" · ");
	const at = (v: number) => 10 + Math.max(-5, Math.min(5, v)) * 1.7;
	const x = taste != null ? at(taste) : null;
	const y = strength != null ? at(-strength) : null;
	return (
		<svg viewBox="0 0 20 20" className="size-5" role="img" aria-label={label}>
			<title>{label}</title>
			<path
				d="M10 1v18M1 10h18"
				className="stroke-line-strong"
				strokeWidth={1}
			/>
			{x != null && y != null ? (
				<circle
					cx={x}
					cy={y}
					r={2.5}
					className="fill-crema-deep dark:fill-crema"
				/>
			) : x != null ? (
				<path
					d={`M${x} 4v12`}
					className="stroke-crema-deep dark:stroke-crema"
					strokeWidth={2}
					strokeLinecap="round"
				/>
			) : (
				<path
					d={`M4 ${y}h12`}
					className="stroke-crema-deep dark:stroke-crema"
					strokeWidth={2}
					strokeLinecap="round"
				/>
			)}
		</svg>
	);
}

export function BrewLedgerRow({
	brew,
	machineName,
	bean,
	recipe,
	showMethod = false,
	showBean = false,
	highlight = false,
}: {
	brew: Brews;
	machineName: string | undefined;
	bean?: {
		id: number;
		name?: string;
		status?: Beans["status"];
		dominantNote?: Beans["dominantNote"];
	} | null;
	/** The recipe this brew followed, when linked. */
	recipe?: Recipes | null;
	/** Show the method glyph (when the journal has more than one method). */
	showMethod?: boolean;
	/** Lead with the bean instead of the date (timeline view). */
	showBean?: boolean;
	/** The brew worth repeating: tinted, with its repeat shortcut always shown. */
	highlight?: boolean;
}) {
	const [expanded, setExpanded] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const time = formatExtractionTime(brew.extractionTime);
	const ratio = formatRatio(brew.beanWeight, brew.brewWeight);
	const config = methodConfig(brew.method);
	const deltas = recipe ? brewVsRecipe(brew, recipe) : [];
	const temp =
		config.waterTemp && brew.waterTemp != null ? `${brew.waterTemp}°C` : null;
	const heat = config.heat && brew.heat ? brew.heat : null;

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
		<article
			style={ledgerColumns({ showMethod, showBean })}
			className={cn(
				LEDGER_GRID,
				"group border-b border-border/60 font-data text-xs text-foreground/80 transition-colors last:border-b-0 has-[>button:hover]:bg-paper-sunken/60",
				highlight && "bg-crema-tint/50",
			)}
		>
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				aria-expanded={expanded}
				className="col-span-full grid grid-cols-subgrid items-center gap-y-1.5 py-2.5 text-left sm:col-[1/-2]"
			>
				{showBean ? (
					<span className="col-span-full flex min-w-0 items-center gap-2 font-sans text-sm text-foreground sm:col-span-1">
						<span
							className={cn(
								"size-2.5 shrink-0",
								getColorSwatch(bean?.dominantNote).stripe,
							)}
							aria-hidden
						/>
						<span className="truncate">{bean?.name ?? "Unknown bean"}</span>
					</span>
				) : (
					<span className="whitespace-nowrap text-ink-soft">
						{formatDate(brew.date)}
					</span>
				)}
				{showMethod && <MethodIcon method={brew.method} />}
				<span className="text-right">{brew.grindSize ?? "—"}</span>
				<span
					className={cn(
						methodInkClass(brew.method),
						"method-ink whitespace-nowrap font-semibold",
					)}
				>
					{ratio ?? "—"}
				</span>
				<span className="hidden sm:block">{time ?? ""}</span>
				<span className="hidden sm:block">{temp ?? heat ?? ""}</span>
				<span aria-hidden className="hidden sm:block" />
				<TasteMark taste={brew.tasteScore} strength={brew.strengthScore} />
				<RatingStars value={brew.overallRating} />
				<ChevronDown
					className={cn(
						"size-3.5 text-muted-foreground transition-transform",
						expanded && "rotate-180",
					)}
					aria-hidden
				/>
			</button>
			<Link
				to={`/log/brew?fromBrew=${brew.id}`}
				aria-label="Repeat this brew"
				title="Repeat this brew"
				className={cn(
					"hidden h-full items-center justify-end transition-opacity focus-visible:opacity-100 sm:flex",
					highlight
						? "text-crema-deep dark:text-crema"
						: "text-muted-foreground opacity-0 group-hover:opacity-100",
				)}
			>
				<Repeat className="size-3.5" aria-hidden />
			</Link>

			{expanded && (
				<div className="rise col-span-full -mx-3 space-y-4 border-t border-line/40 bg-paper-sunken/40 px-3 py-4 font-sans text-sm text-foreground sm:-mx-4 sm:px-4">
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
									className="tap inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 font-sans text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									<X className="size-3" />
									Cancel
								</button>
							</div>
						) : (
							<div className="flex items-center gap-1">
								<Link
									to={`/log/brew?fromBrew=${brew.id}`}
									className="tap inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
								>
									<Repeat className="size-3" />
									Repeat
								</Link>
								{config.hasRecipes && (
									<Link
										to={`/recipes/new?fromBrew=${brew.id}`}
										className="tap inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
									>
										<BookmarkPlus className="size-3" />
										Save as recipe
									</Link>
								)}
								<button
									type="button"
									onClick={() => setConfirmDelete(true)}
									className="tap inline-flex items-center gap-1.5 px-3 py-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-destructive"
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
