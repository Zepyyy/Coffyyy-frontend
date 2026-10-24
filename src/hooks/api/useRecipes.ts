import { useLiveQuery } from "dexie-react-hooks";
import * as recipeApi from "@/lib/data";
import type { BrewMethod } from "@/types/BrewTypes";

/** All recipes, by name. Empty while loading. */
export const useRecipes = () => {
	return useLiveQuery(() => recipeApi.getAllRecipes(), []) ?? [];
};

/** One recipe; undefined while loading or when missing. */
export const useRecipe = (recipeId: number | undefined) => {
	return useLiveQuery(() => recipeApi.getRecipe(recipeId), [recipeId]);
};

/** Recipes a brew of `method` (with `beanId` selected) can follow. */
export const useRecipesForMethod = (
	method: BrewMethod | undefined,
	beanId?: number,
) => {
	return (
		useLiveQuery(
			() => recipeApi.getRecipesForMethod(method, beanId),
			[method, beanId],
		) ?? []
	);
};

export const useRecipeCount = () => {
	return useLiveQuery(() => recipeApi.getRecipeCount(), []) ?? 0;
};
