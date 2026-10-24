import { ArrowRight, Pencil } from "lucide-react";
import { Link } from "react-router";
import type { RecipeBrewStats } from "@/lib/api/recipeStats";
import { methodConfig } from "@/lib/brewMethods";
import { recipeSummaryLine } from "@/lib/recipeForm";
import type { Recipes } from "@/types/RecipeTypes";

function brewCountLabel(stats: RecipeBrewStats | undefined) {
	const count = stats?.brewCount ?? 0;
	if (count === 0) return "Not brewed yet";
	const brews = `${count} brew${count === 1 ? "" : "s"}`;
	return stats?.averageRating != null
		? `${brews} · avg ${stats.averageRating.toFixed(1)}★`
		: brews;
}

/** Recipe card: the target read like a recipe card's spec line. */
export default function RecipeCard({
	recipe,
	beanName,
	stats,
}: {
	recipe: Recipes;
	beanName?: string;
	stats?: RecipeBrewStats;
}) {
	return (
		<div className="hover-line relative flex h-full w-full flex-col rounded-xl border border-line bg-paper-raised shadow-card">
			<article className="relative border-b border-line/60 p-5">
				<div className="font-display text-xl font-semibold leading-tight tracking-tight text-foreground">
					{recipe.name}
				</div>
				<div className="mt-1 font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
					{methodConfig(recipe.method).label}
					{` · ${beanName ?? "Any bean"}`}
				</div>
			</article>

			<article className="flex flex-1 flex-col gap-3 p-5">
				<p className="font-data text-xs text-foreground/90">
					{recipeSummaryLine(recipe)}
				</p>
				{recipe.grindSize != null && (
					<div className="flex items-baseline gap-2">
						<span className="eyebrow shrink-0">Grind</span>
						<span
							className="mx-1 h-px flex-1 border-b border-dotted border-line-strong"
							aria-hidden
						/>
						<span className="font-data text-xs text-foreground/90">
							{recipe.grindSize}
						</span>
					</div>
				)}
				<p className="font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
					{brewCountLabel(stats)}
				</p>
			</article>

			<div className="mt-auto flex items-center justify-between gap-2 px-5 pb-3">
				<Link
					to={`/log/recipe?id=${recipe.id}`}
					className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs text-ink-faint transition-colors hover:text-foreground"
				>
					<Pencil className="size-3" aria-hidden />
					Edit
				</Link>
				<Link
					to={`/log/brew?recipe=${recipe.id}`}
					className="group inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-data text-[11px] uppercase tracking-[0.12em] text-foreground transition-colors hover:text-crema-deep"
				>
					Brew this
					<ArrowRight
						className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-1"
						aria-hidden
					/>
				</Link>
			</div>
		</div>
	);
}
