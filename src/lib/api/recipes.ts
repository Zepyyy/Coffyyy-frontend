import { db } from "@/db/db";
import type { BrewMethod } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";

const byName = (a: Recipes, b: Recipes) => a.name.localeCompare(b.name);

export async function getAllRecipes(): Promise<Recipes[]> {
	return (await db.Recipes.toArray()).sort(byName);
}

export async function getRecipe(
	recipeId: number | undefined,
): Promise<Recipes | undefined> {
	if (!recipeId) return undefined;
	return db.Recipes.get(recipeId);
}

/**
 * Recipes a brew of `method` can follow: bean-less ones, plus those tied to
 * `beanId` when a bean is selected. Moka has none.
 */
export async function getRecipesForMethod(
	method: BrewMethod | undefined,
	beanId?: number,
): Promise<Recipes[]> {
	if (!method) return [];
	const recipes = await db.Recipes.where("method").equals(method).toArray();
	return recipes
		.filter((recipe) => recipe.beanId === undefined || recipe.beanId === beanId)
		.sort(byName);
}

export async function getRecipeCount(): Promise<number> {
	return db.Recipes.count();
}
