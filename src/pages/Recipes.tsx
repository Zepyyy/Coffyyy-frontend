import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import JournalPage from "@/components/layout/JournalPage";
import RecipeCard from "@/components/library/RecipeCard";
import { MethodIcon, MethodTag } from "@/components/method/MethodMarks";
import { db } from "@/db/db";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useRecipeBrewStats } from "@/hooks/api/useRecipeStats";
import { useRecipes } from "@/hooks/api/useRecipes";
import {
	isRecipeMethod,
	methodConfig,
	RECIPE_METHODS,
} from "@/lib/brewMethods";
import { methodInkClass } from "@/lib/methodIdentity";
import { fmtRatio } from "@/lib/ratioHistory";
import { cn, formatRelativeDay } from "@/lib/utils";

/** Your best unsaved brews: 4★+, of a method with recipes, not yet a recipe. */
function useBestBrews(limit = 4) {
	return (
		useLiveQuery(async () => {
			const rated = await db.Brews.where("overallRating")
				.aboveOrEqual(4)
				.toArray();
			return rated
				.filter((b) => isRecipeMethod(b.method) && b.recipeId == null)
				.sort(
					(a, b) =>
						(b.overallRating ?? 0) - (a.overallRating ?? 0) ||
						new Date(b.date).getTime() - new Date(a.date).getTime(),
				)
				.slice(0, limit);
		}, [limit]) ?? []
	);
}

/** `/recipes`: every recipe by method, ways to start one, and brew shortcuts. */
export default function Recipes() {
	const recipes = useRecipes();
	const stats = useRecipeBrewStats();
	const beans = useAllBeans();
	const best = useBestBrews();
	const beanNames = useMemo(
		() => new Map(beans.map((b) => [b.id, b.name])),
		[beans],
	);
	const groups = RECIPE_METHODS.map((method) => ({
		method,
		items: recipes.filter((r) => r.method === method),
	})).filter((g) => g.items.length > 0);

	return (
		<JournalPage>
			<div className="space-y-10">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div className="border-l-4 border-crema pl-5" data-grain-quiet>
						<h1 className="font-display text-4xl italic tracking-tight text-foreground/90">
							Recipes
						</h1>
						<p className="mt-1 font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">
							Targets worth repeating
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{RECIPE_METHODS.map((method) => (
							<Link
								key={method}
								to={`/recipes/new?method=${method}`}
								className={cn(
									methodInkClass(method),
									"inline-flex h-11 items-center gap-2 border border-line-strong bg-paper-raised px-3 font-data text-[11px] uppercase tracking-[0.12em] transition-colors hover:border-[var(--method)]",
								)}
							>
								<Plus className="size-3 text-ink-faint" aria-hidden />
								<MethodIcon method={method} label={false} className="size-5" />
								New {methodConfig(method).label.toLowerCase()}
							</Link>
						))}
					</div>
				</div>

				{best.length > 0 && (
					<section className="space-y-3" aria-labelledby="best-brews">
						<h2
							id="best-brews"
							className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
						>
							Your best brews, not saved yet
						</h2>
						<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
							{best.map((brew) => (
								<Link
									key={brew.id}
									to={`/recipes/new?fromBrew=${brew.id}`}
									className={cn(
										methodInkClass(brew.method),
										"flex shrink-0 items-center gap-3 border border-line bg-paper-raised px-3 py-2.5 transition-colors hover:border-[var(--method)]",
									)}
								>
									<MethodIcon method={brew.method} className="size-5" />
									<span className="min-w-0">
										<span className="block font-display text-base italic leading-tight">
											{(brew.beanId && beanNames.get(brew.beanId)) ||
												"Unknown bean"}
										</span>
										<span className="block font-data text-[10px] text-muted-foreground">
											<span className="method-ink font-semibold">
												1:{fmtRatio(brew.brewWeight / brew.beanWeight)}
											</span>{" "}
											· {brew.overallRating}★ · {formatRelativeDay(brew.date)}
										</span>
									</span>
									<span className="font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
										Save →
									</span>
								</Link>
							))}
						</div>
					</section>
				)}

				{groups.length === 0 ? (
					<div className="space-y-3 border border-dashed border-line-strong bg-paper-raised/50 p-12 text-center">
						<p className="font-display text-2xl text-foreground/60">
							No recipes yet
						</p>
						<p className="font-sans text-sm text-muted-foreground">
							Start from the V60 starter, or save a brew that worked.
						</p>
						<Link
							to="/recipes/new?starter=v60"
							className="inline-flex h-10 items-center bg-ink px-4 font-data text-[11px] uppercase tracking-[0.12em] text-paper hover:bg-ink/85"
						>
							Use the V60 starter
						</Link>
					</div>
				) : (
					groups.map(({ method, items }) => (
						<section key={method} className="space-y-4">
							<MethodTag method={method} className="text-[11px]" />
							<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-x-4 gap-y-6 pt-2">
								{items.map((recipe) => (
									<RecipeCard
										key={recipe.id}
										recipe={recipe}
										beanName={
											recipe.beanId ? beanNames.get(recipe.beanId) : undefined
										}
										stats={stats[recipe.id]}
									/>
								))}
							</div>
						</section>
					))
				)}
			</div>
		</JournalPage>
	);
}
