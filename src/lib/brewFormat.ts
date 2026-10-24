import { formatRatio, methodConfig } from "@/lib/brewMethods";
import { formatExtractionTime, parseExtractionTime } from "@/lib/utils";
import type { Brews } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";

export function tasteLabel(value: number | undefined | null): string | null {
	if (value == null) return null;
	if (value === 0) return "Balanced";
	return value < 0 ? `Sour ${value}` : `Bitter +${value}`;
}

export function strengthLabel(value: number | undefined | null): string | null {
	if (value == null) return null;
	if (value === 0) return "Balanced";
	return value < 0 ? `Weak ${value}` : `Strong +${value}`;
}

export function scoreClass(value: number | undefined | null): string {
	if (value == null) return "text-muted-foreground";
	if (value === 0) return "text-primary";
	return value < 0 ? "text-tag-teal-500" : "text-tag-orange-500";
}

/**
 * Extraction behavior color: how the shot ran, independent of how it
 * tasted. Struggling means the puck choked up; uneven means channeling.
 */
export function flowClass(flow: string | undefined | null): string {
	if (!flow) return "text-muted-foreground";
	const normalized = flow.toLowerCase();
	if (normalized === "struggling") return "text-destructive";
	if (normalized === "uneven") return "text-tag-orange-500";
	if (normalized === "perfect" || normalized === "even") return "text-primary";
	return "text-foreground/80";
}

/**
 * One-line recipe, method-aware:
 * espresso  "grind 12 · 18g → 36g · 1:2 · 28s · even"
 * pour-over "grind 20 · 15g → 250g · 1:16.7 · 3:00 · 93°C"
 * moka      "grind 8 · 15g → 100g · 1:6.7 · 4:00 · medium heat"
 */
export function recipeLine(
	brew: Pick<
		Brews,
		| "method"
		| "grindSize"
		| "beanWeight"
		| "brewWeight"
		| "extractionTime"
		| "flow"
		| "waterTemp"
		| "heat"
	>,
): string {
	return [
		brew.grindSize != null ? `grind ${brew.grindSize}` : null,
		brew.beanWeight != null
			? `${brew.beanWeight}g → ${brew.brewWeight ?? "?"}g`
			: null,
		formatRatio(brew.beanWeight, brew.brewWeight),
		formatExtractionTime(brew.extractionTime),
		...methodExtras(brew),
	]
		.filter(Boolean)
		.join(" · ");
}

/**
 * The method's own extra field, formatted for a recipe line: flow
 * (espresso), water temp (pour-over), heat (moka). Empty when unset.
 */
export function methodExtras(
	brew: Pick<Brews, "method" | "flow" | "waterTemp" | "heat">,
): string[] {
	const config = methodConfig(brew.method);
	const extras: string[] = [];
	if (config.flow && brew.flow) extras.push(brew.flow.toLowerCase());
	if (config.waterTemp && brew.waterTemp != null)
		extras.push(`${brew.waterTemp}°C`);
	if (config.heat && brew.heat) extras.push(`${brew.heat} heat`);
	return extras;
}

export type RecipeDeltaField =
	| "beanWeight"
	| "brewWeight"
	| "grindSize"
	| "extractionTime"
	| "waterTemp";

export type RecipeDelta = {
	field: RecipeDeltaField;
	/** Lowercase, method-aware: "dose", "yield"/"water"/"output", "grind", "time", "temp". */
	label: string;
	/** Actual minus target, rounded to one decimal. Never 0. */
	delta: number;
	unit: "g" | "s" | "°C" | "";
};

type RecipeTargets = Pick<
	Recipes,
	"beanWeight" | "brewWeight" | "grindSize" | "extractionTime" | "waterTemp"
>;

/**
 * Actuals vs the recipe a brew followed: one entry per field that differs,
 * skipping fields either side leaves blank. Water temp only for methods that
 * show it.
 */
export function brewVsRecipe(
	brew: Pick<
		Brews,
		| "method"
		| "beanWeight"
		| "brewWeight"
		| "grindSize"
		| "extractionTime"
		| "waterTemp"
	>,
	recipe: RecipeTargets,
): RecipeDelta[] {
	const config = methodConfig(brew.method);
	const rows: Array<
		[
			RecipeDeltaField,
			string,
			RecipeDelta["unit"],
			number | null,
			number | null,
		]
	> = [
		["beanWeight", "dose", "g", brew.beanWeight, recipe.beanWeight],
		[
			"brewWeight",
			config.brewWeight.label.toLowerCase(),
			"g",
			brew.brewWeight,
			recipe.brewWeight,
		],
		["grindSize", "grind", "", brew.grindSize, recipe.grindSize ?? null],
		[
			"extractionTime",
			"time",
			"s",
			parseExtractionTime(brew.extractionTime),
			parseExtractionTime(recipe.extractionTime),
		],
	];
	if (config.waterTemp) {
		rows.push([
			"waterTemp",
			"temp",
			"°C",
			brew.waterTemp ?? null,
			recipe.waterTemp ?? null,
		]);
	}

	const deltas: RecipeDelta[] = [];
	for (const [field, label, unit, actual, target] of rows) {
		if (actual == null || target == null) continue;
		if (!Number.isFinite(actual) || !Number.isFinite(target)) continue;
		const delta = Number((actual - target).toFixed(1));
		if (delta === 0) continue;
		deltas.push({ field, label, delta, unit });
	}
	return deltas;
}

/** "yield +2g", "time −4s", "grind −1" (true minus sign). */
export function formatRecipeDelta({ label, delta, unit }: RecipeDelta): string {
	const sign = delta > 0 ? "+" : "−";
	return `${label} ${sign}${Math.abs(delta)}${unit}`;
}
