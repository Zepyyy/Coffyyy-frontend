/**
 * Pure logic behind the Recipe form and Recipe cards: defaults, prefill from
 * a brew (promote) or a recipe (edit), save payloads and the one-line summary.
 */
import {
	DEFAULT_GRIND_SIZE,
	formatRatio,
	isRecipeMethod,
	methodConfig,
} from "@/lib/brewMethods";
import { formatExtractionTime, parseExtractionTime } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type {
	NewRecipe,
	RecipeChanges,
	RecipeMethod,
	Recipes,
} from "@/types/RecipeTypes";

export type RecipeFormState = {
	name: string;
	method: RecipeMethod;
	beanId: number | undefined;
	beanWeight: number;
	brewWeight: number;
	grindSize: number;
	/** Seconds as typed; empty = no target time. */
	extractionTime: string;
	/** °C; only used for methods with a water temperature. */
	waterTemp: number;
	notes: string;
};

/** A fresh form for `method`, every number from the method config. */
export function emptyRecipeForm(method: RecipeMethod): RecipeFormState {
	const config = methodConfig(method);
	return {
		name: "",
		method,
		beanId: undefined,
		beanWeight: config.dose.default,
		brewWeight: config.brewWeight.default,
		grindSize: DEFAULT_GRIND_SIZE,
		extractionTime: "",
		waterTemp: config.waterTemp?.default ?? 0,
		notes: "",
	};
}

/**
 * Switches a new recipe to another method: dial values reset to that
 * method's defaults, name / bean / grind / notes are kept.
 */
export function switchRecipeMethod(
	form: RecipeFormState,
	method: RecipeMethod,
): RecipeFormState {
	if (form.method === method) return form;
	const fresh = emptyRecipeForm(method);
	return {
		...fresh,
		name: form.name,
		beanId: form.beanId,
		grindSize: form.grindSize,
		notes: form.notes,
	};
}

/** Default name for a promoted brew: `"<bean name> · 1:<ratio>"`. */
export function defaultPromoteName(
	beanName: string | null | undefined,
	beanWeight: number | null | undefined,
	brewWeight: number | null | undefined,
	method: RecipeMethod,
): string {
	const lead = beanName?.trim() || methodConfig(method).label;
	const ratio = formatRatio(beanWeight, brewWeight);
	return ratio ? `${lead} · ${ratio}` : lead;
}

/**
 * Prefill for promoting a brew: its actuals, method and bean (tie on).
 * Only `bean` (the brew's bean, when it still exists) is tied: brews keep
 * the id of a deleted bean. Null when the brew's method has no recipes (moka).
 */
export function recipeFormFromBrew(
	brew: Brews,
	bean?: Pick<Beans, "id" | "name"> | null,
): RecipeFormState | null {
	if (!isRecipeMethod(brew.method)) return null;
	const base = emptyRecipeForm(brew.method);
	const seconds = parseExtractionTime(brew.extractionTime);
	return {
		...base,
		name: defaultPromoteName(
			bean?.name,
			brew.beanWeight,
			brew.brewWeight,
			brew.method,
		),
		beanId: bean?.id,
		beanWeight: brew.beanWeight || base.beanWeight,
		brewWeight: brew.brewWeight || base.brewWeight,
		grindSize: brew.grindSize ?? base.grindSize,
		extractionTime: seconds != null ? String(seconds) : "",
		waterTemp: brew.waterTemp ?? base.waterTemp,
		notes: brew.notes ?? "",
	};
}

/** Edit form for an existing recipe. */
export function recipeFormFromRecipe(recipe: Recipes): RecipeFormState {
	const base = emptyRecipeForm(recipe.method);
	const seconds = parseExtractionTime(recipe.extractionTime);
	return {
		name: recipe.name,
		method: recipe.method,
		beanId: recipe.beanId,
		beanWeight: recipe.beanWeight,
		brewWeight: recipe.brewWeight,
		grindSize: recipe.grindSize ?? base.grindSize,
		extractionTime: seconds != null ? String(seconds) : "",
		waterTemp: recipe.waterTemp ?? base.waterTemp,
		notes: recipe.notes ?? "",
	};
}

/** Fields shared by create and edit; optional ones are omitted when empty. */
function recipeFields(form: RecipeFormState) {
	const seconds = parseExtractionTime(form.extractionTime);
	const notes = form.notes.trim();
	const hasTemp = methodConfig(form.method).waterTemp != null;
	return {
		name: form.name.trim(),
		beanId: form.beanId,
		beanWeight: form.beanWeight,
		brewWeight: form.brewWeight,
		grindSize: form.grindSize,
		extractionTime: seconds != null ? String(seconds) : undefined,
		waterTemp: hasTemp ? form.waterTemp : undefined,
		notes: notes || undefined,
	};
}

/** Payload for addRecipe. */
export function toNewRecipe(form: RecipeFormState): NewRecipe {
	return { ...recipeFields(form), method: form.method };
}

/**
 * Payload for updateRecipeById. Cleared optional fields are sent as
 * `undefined` so Dexie removes them; method is immutable and left out.
 */
export function toRecipeChanges(form: RecipeFormState): RecipeChanges {
	return recipeFields(form);
}

/** Card line: `18g → 36g · 1:2 · 28s` / `15g → 250g · 1:16.7 · 3:00 · 93°C`. */
export function recipeSummaryLine(
	recipe: Pick<
		Recipes,
		"beanWeight" | "brewWeight" | "extractionTime" | "waterTemp" | "method"
	>,
): string {
	const hasTemp = methodConfig(recipe.method).waterTemp != null;
	return [
		`${recipe.beanWeight}g → ${recipe.brewWeight}g`,
		formatRatio(recipe.beanWeight, recipe.brewWeight),
		formatExtractionTime(recipe.extractionTime),
		hasTemp && recipe.waterTemp != null ? `${recipe.waterTemp}°C` : null,
	]
		.filter(Boolean)
		.join(" · ");
}
