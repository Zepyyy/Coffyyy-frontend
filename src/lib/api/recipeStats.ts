import { db } from "@/db/db";
import type { Brews } from "@/types/BrewTypes";

export type RecipeBrewStats = {
	/** Brews linked to the recipe. */
	brewCount: number;
	/** Mean overall rating of the linked, rated brews; null when none rated. */
	averageRating: number | null;
};

/** Linked brew count + average rating, keyed by recipe id. */
export async function getRecipeBrewStats(): Promise<
	Record<number, RecipeBrewStats>
> {
	// Unlinked brews have no recipeId and are left out of the index.
	const brews = await db.Brews.where("recipeId").above(0).toArray();
	return summarizeRecipeBrews(brews);
}

/** Pure half of getRecipeBrewStats. */
export function summarizeRecipeBrews(
	brews: Array<Pick<Brews, "recipeId" | "overallRating">>,
): Record<number, RecipeBrewStats> {
	const totals = new Map<
		number,
		{ count: number; ratingSum: number; rated: number }
	>();
	for (const brew of brews) {
		if (brew.recipeId == null) continue;
		const entry = totals.get(brew.recipeId) ?? {
			count: 0,
			ratingSum: 0,
			rated: 0,
		};
		entry.count += 1;
		if (brew.overallRating != null) {
			entry.ratingSum += brew.overallRating;
			entry.rated += 1;
		}
		totals.set(brew.recipeId, entry);
	}
	const stats: Record<number, RecipeBrewStats> = {};
	for (const [recipeId, entry] of totals) {
		stats[recipeId] = {
			brewCount: entry.count,
			averageRating: entry.rated > 0 ? entry.ratingSum / entry.rated : null,
		};
	}
	return stats;
}

export type PromotionSource = {
	brew: Brews;
	beanName: string | null;
};

/**
 * The brew a recipe is promoted from, with its bean's name for the default
 * recipe name. Null when the brew is missing.
 */
export async function getPromotionSource(
	brewId: number | undefined,
): Promise<PromotionSource | null> {
	if (!brewId) return null;
	const brew = await db.Brews.get(brewId);
	if (!brew) return null;
	const bean = brew.beanId ? await db.Beans.get(brew.beanId) : undefined;
	return { brew, beanName: bean?.name ?? null };
}
