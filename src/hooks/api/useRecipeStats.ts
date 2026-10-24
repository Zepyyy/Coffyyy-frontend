import { useLiveQuery } from "dexie-react-hooks";
import {
	getPromotionSource,
	getRecipeBrewStats,
	type RecipeBrewStats,
} from "@/lib/data";

const EMPTY: Record<number, RecipeBrewStats> = {};

/** Linked brew count + average rating per recipe id. Empty while loading. */
export const useRecipeBrewStats = () => {
	return useLiveQuery(() => getRecipeBrewStats(), []) ?? EMPTY;
};

/**
 * The brew a recipe is promoted from: undefined while loading, null when
 * there is no such brew.
 */
export const usePromotionSource = (brewId: number | undefined) => {
	return useLiveQuery(() => getPromotionSource(brewId), [brewId]);
};
