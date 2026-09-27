import { Link } from "react-router";
import { BrewLedgerRow, RatingStars } from "./BrewLedgerRow";
import { recipeLine } from "@/lib/brewFormat";
import { getColorSwatch, formatRelativeDay } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";

/**
 * One bean's story in the history ledger: the recipe worth repeating,
 * then every shot of that bean beneath it.
 */
export function BeanChapter({
	bean,
	brews,
	machineNames,
}: {
	bean: Beans | undefined;
	brews: Brews[];
	machineNames: Map<number | undefined, string>;
}) {
	const swatch = getColorSwatch(bean?.dominantNote);
	const rated = brews.filter((b) => b.overallRating != null);
	const avg =
		rated.length > 0
			? rated.reduce((s, b) => s + (Number(b.overallRating) || 0), 0) /
				rated.length
			: null;
	const best = rated.length
		? rated.reduce((a, b) =>
				(Number(b.overallRating) || 0) > (Number(a.overallRating) || 0) ? b : a,
			)
		: null;
	const lastBrew = brews[0];
	const beanName = bean?.name ?? "Unknown bean";
	const detailTo = bean?.id != null ? `/beans/${bean.id}` : undefined;

	return (
		<section className="border border-border bg-background">
			<header
				className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/60 px-4 py-3 ${swatch.secondaryBg}`}
			>
				<div className="flex items-baseline gap-3 min-w-0">
					<span
						className={`h-4 w-1 self-center shrink-0 ${swatch.stripe}`}
						aria-hidden
					/>
					{detailTo ? (
						<Link
							to={detailTo}
							className={`truncate font-News text-xl italic tracking-tight hover:underline ${swatch.text}`}
						>
							{beanName}
						</Link>
					) : (
						<span
							className={`truncate font-News text-xl italic tracking-tight ${swatch.text}`}
						>
							{beanName}
						</span>
					)}
					<span className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
						{brews.length} shot{brews.length === 1 ? "" : "s"}
						{avg != null ? ` · avg ${avg.toFixed(1)}★` : ""}
					</span>
				</div>
				{lastBrew && (
					<span className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
						last {formatRelativeDay(lastBrew.date).toLowerCase()}
					</span>
				)}
			</header>

			{best && (Number(best.overallRating) || 0) >= 4 && (
				<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-border/60 bg-primary-700/5 px-4 py-2.5">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
						<span className="font-Mono text-[9px] uppercase tracking-[0.16em] text-primary/80">
							Repeat this
						</span>
						<span className="font-Mono text-xs font-semibold text-foreground/90">
							{recipeLine(best)}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<RatingStars value={best.overallRating} />
						<span className="font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
							{new Date(best.date).toLocaleDateString(undefined, {
								month: "short",
								day: "numeric",
							})}
						</span>
					</div>
				</div>
			)}

			<div>
				{brews.map((brew) => (
					<BrewLedgerRow
						key={brew.id}
						brew={brew}
						machineName={
							brew.machineId != null
								? machineNames.get(brew.machineId)
								: undefined
						}
					/>
				))}
			</div>
		</section>
	);
}
