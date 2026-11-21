import { Link } from "react-router";
import { BrewLedgerRow } from "./BrewLedgerRow";
import { getColorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";

/**
 * One bean's brews in the history ledger. Its best brew is tinted and
 * keeps its repeat shortcut in view.
 */
export function BeanChapter({
	bean,
	brews,
	machineNames,
	recipes,
	showMethod = false,
}: {
	bean: Beans | undefined;
	brews: Brews[];
	machineNames: Map<number | undefined, string>;
	recipes?: Map<number, Recipes>;
	/** Label each brew's method (the journal has more than one). */
	showMethod?: boolean;
}) {
	const swatch = getColorSwatch(bean?.dominantNote);
	// The highest-rated brew (most recent on ties), once it earns 4★.
	const best = brews.reduce<Brews | null>(
		(top, b) =>
			(Number(b.overallRating) || 0) > (Number(top?.overallRating) || 0)
				? b
				: top,
		null,
	);
	const bestId =
		best && (Number(best.overallRating) || 0) >= 4 ? best.id : undefined;
	const beanName = bean?.name ?? "Unknown bean";
	const detailTo = bean?.id != null ? `/beans/${bean.id}` : undefined;

	return (
		<section className="rounded-xl border border-line bg-paper-raised shadow-card">
			<header className="flex items-center gap-3 border-b border-line/60 px-3 py-2.5 sm:px-4">
				<span className={`size-3 shrink-0 ${swatch.stripe}`} aria-hidden />
				{detailTo ? (
					<Link
						to={detailTo}
						className="tap truncate font-display text-xl italic tracking-tight text-foreground hover:underline sm:min-h-0"
					>
						{beanName}
					</Link>
				) : (
					<span className="truncate font-display text-xl italic tracking-tight text-foreground">
						{beanName}
					</span>
				)}
			</header>

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
						bean={bean ?? null}
						recipe={
							brew.recipeId != null ? recipes?.get(brew.recipeId) : undefined
						}
						showMethod={showMethod}
						highlight={brew.id === bestId}
					/>
				))}
			</div>
		</section>
	);
}
