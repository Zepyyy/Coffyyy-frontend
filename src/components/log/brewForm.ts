/**
 * Pure logic behind the brew log form: per-method dial defaults, prefill
 * from the last brew or a recipe, and the save payload. Every number comes
 * from the method config.
 */
import { type BrewMethod, methodConfig } from "@/lib/brewMethods";
import { clampWeight, parseExtractionTime } from "@/lib/utils";
import type { BrewHeat, Brews, NewBrew } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";

/** The values a brew is dialed with; what prefill and resets replace. */
export type BrewDials = {
	grindSize: number;
	beanWeight: number;
	brewWeight: number;
	/** Seconds as typed; empty = not timed. */
	extractionTime: string;
	/** Espresso only; empty = not judged. */
	flow: string;
	/** °C; only for methods with a water temperature. */
	waterTemp: number | undefined;
	/** Only for methods with a heat setting. */
	heat: BrewHeat | undefined;
	notes: string;
};

export type BrewLogForm = BrewDials & {
	beanId: number | undefined;
	machineId: number | undefined;
	/** Recipe followed; kept when dials are edited after picking it. */
	recipeId: number | undefined;
};

const round1 = (value: number) => Number(value.toFixed(1));

function clampDose(value: number, method: BrewMethod) {
	const { min, max } = methodConfig(method).dose;
	return round1(clampWeight({ value, min, max }));
}

function clampBrewWeight(value: number, method: BrewMethod) {
	const { min, max } = methodConfig(method).brewWeight;
	return round1(clampWeight({ value, min, max }));
}

function clampWaterTemp(value: number | undefined, method: BrewMethod) {
	const range = methodConfig(method).waterTemp;
	if (!range) return undefined;
	if (value == null || !Number.isFinite(value)) return range.default;
	return clampWeight({ value, min: range.min, max: range.max });
}

function secondsText(raw: string | null | undefined) {
	const seconds = parseExtractionTime(raw);
	return seconds != null ? String(seconds) : "";
}

/** Fresh dials for a method: config defaults, no time, no notes. */
export function methodDefaults(method: BrewMethod): BrewDials {
	const config = methodConfig(method);
	return {
		grindSize: config.grind.default,
		beanWeight: config.dose.default,
		brewWeight: config.brewWeight.default,
		extractionTime: "",
		flow: "",
		waterTemp: config.waterTemp?.default,
		heat: config.heat?.default,
		notes: "",
	};
}

/**
 * Dials picked up from a previous brew of the same method. Weights are
 * clamped to the method's dial range; notes stay with the old brew.
 */
export function dialsFromBrew(brew: Brews, method: BrewMethod): BrewDials {
	const config = methodConfig(method);
	const base = methodDefaults(method);
	return {
		grindSize: brew.grindSize ?? base.grindSize,
		beanWeight: clampDose(brew.beanWeight ?? base.beanWeight, method),
		brewWeight: clampBrewWeight(brew.brewWeight ?? base.brewWeight, method),
		extractionTime: secondsText(brew.extractionTime),
		flow: config.flow ? (brew.flow ?? "") : "",
		waterTemp: clampWaterTemp(brew.waterTemp, method),
		heat: config.heat ? (brew.heat ?? config.heat.default) : undefined,
		notes: "",
	};
}

/**
 * Dials set to a recipe's targets. Fields the recipe leaves open keep the
 * current grind, and fall back to defaults elsewhere.
 */
export function dialsFromRecipe(
	recipe: Recipes,
	current: BrewDials,
	method: BrewMethod,
): BrewDials {
	return {
		...methodDefaults(method),
		grindSize: recipe.grindSize ?? current.grindSize,
		beanWeight: clampDose(recipe.beanWeight, method),
		brewWeight: clampBrewWeight(recipe.brewWeight, method),
		extractionTime: secondsText(recipe.extractionTime),
		waterTemp: clampWaterTemp(recipe.waterTemp, method),
		notes: recipe.notes ?? "",
	};
}

/** Liquid weight for a `1:ratio` preset at the current dose, kept on the dial. */
export function brewWeightForRatio(
	beanWeight: number,
	ratio: number,
	method: BrewMethod,
): number {
	return clampBrewWeight(beanWeight * ratio, method);
}

/**
 * The addBrew payload: only the extras the method shows, notes trimmed,
 * the recipe link only where the method has recipes.
 */
export function toNewBrew(
	form: BrewLogForm & { machineId: number },
	method: BrewMethod,
	date: Date,
): NewBrew {
	const config = methodConfig(method);
	const notes = form.notes.trim();
	return {
		beanId: form.beanId,
		machineId: form.machineId,
		date,
		beanWeight: form.beanWeight,
		brewWeight: form.brewWeight,
		grindSize: form.grindSize,
		extractionTime: form.extractionTime,
		...(config.flow && { flow: form.flow }),
		...(config.waterTemp &&
			form.waterTemp != null && { waterTemp: form.waterTemp }),
		...(config.heat && form.heat && { heat: form.heat }),
		...(notes && { notes }),
		...(config.hasRecipes &&
			form.recipeId != null && { recipeId: form.recipeId }),
	};
}
