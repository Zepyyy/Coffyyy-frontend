/**
 * Per-method brewing config: the single source for labels, ranges, defaults,
 * presets and which extra fields a Brew method shows. UI reads from here and
 * never hard-codes per-method numbers.
 */
import { brewHeatValues, brewMethodValues } from "@/lib/api/schema.gen";
import type { BrewHeat, BrewMethod } from "@/types/BrewTypes";
import type { RecipeMethod } from "@/types/RecipeTypes";

export type { BrewHeat, BrewMethod, RecipeMethod };

export type NumberRange = { min: number; max: number; default: number };

export type BrewMethodConfig = {
	method: BrewMethod;
	label: string;
	/** Dose (g). Label "Dose" for every method. */
	dose: NumberRange;
	/** The liquid weight (g) the ratio is computed from. */
	brewWeight: NumberRange & { label: string };
	/** Ratio presets as x in 1:x. Empty = no presets shown. */
	ratioPresets: readonly number[];
	/** Extraction time; presets in seconds. */
	time: { label: string; presets: readonly number[] };
	/** Show the flow chips (espresso only). */
	flow: boolean;
	/** Water temperature (°C); null = field not shown. */
	waterTemp: NumberRange | null;
	/** Heat setting; null = field not shown. */
	heat: { options: readonly BrewHeat[]; default: BrewHeat } | null;
	/** Whether this method supports Recipes. */
	hasRecipes: boolean;
};

export const BREW_METHODS: readonly BrewMethod[] = brewMethodValues;
export const BREW_HEATS: readonly BrewHeat[] = brewHeatValues;

/** Grind presets stay shared across methods: they are grinder settings. */
export const GRIND_PRESETS: readonly number[] = [
	8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];
export const DEFAULT_GRIND_SIZE = 12;

const CONFIG: Record<BrewMethod, BrewMethodConfig> = {
	espresso: {
		method: "espresso",
		label: "Espresso",
		dose: { min: 12, max: 24, default: 18 },
		brewWeight: { label: "Yield", min: 12, max: 48, default: 36 },
		ratioPresets: [1.5, 2, 2.5],
		time: { label: "Time", presets: [25, 28, 30, 32, 36] },
		flow: true,
		waterTemp: null,
		heat: null,
		hasRecipes: true,
	},
	"pour-over": {
		method: "pour-over",
		label: "Pour-over",
		dose: { min: 10, max: 30, default: 15 },
		brewWeight: { label: "Water", min: 150, max: 500, default: 250 },
		ratioPresets: [15, 16, 17],
		time: { label: "Total time", presets: [150, 180, 210, 240] },
		flow: false,
		waterTemp: { min: 85, max: 100, default: 93 },
		heat: null,
		hasRecipes: true,
	},
	moka: {
		method: "moka",
		label: "Moka",
		dose: { min: 7, max: 30, default: 15 },
		brewWeight: { label: "Output", min: 30, max: 300, default: 100 },
		ratioPresets: [],
		time: { label: "Time", presets: [180, 240, 300, 360] },
		flow: false,
		waterTemp: null,
		heat: { options: brewHeatValues, default: "medium" },
		hasRecipes: false,
	},
};

/** Config for a method; unknown values (legacy data) read as espresso. */
export function methodConfig(method: BrewMethod | undefined): BrewMethodConfig {
	return (method && CONFIG[method]) || CONFIG.espresso;
}

export function isBrewMethod(value: unknown): value is BrewMethod {
	return BREW_METHODS.includes(value as BrewMethod);
}

export function isRecipeMethod(value: unknown): value is RecipeMethod {
	return isBrewMethod(value) && CONFIG[value].hasRecipes;
}

/** Methods that support Recipes (espresso, pour-over). */
export const RECIPE_METHODS: readonly RecipeMethod[] =
	BREW_METHODS.filter(isRecipeMethod);

/**
 * Legacy free-text Machine.type -> Brew method (case-insensitive contains).
 * Unknown text reads as espresso. Mirrors the backend snapshot upgrade.
 */
export function methodFromMachineType(type: unknown): BrewMethod {
	const text = typeof type === "string" ? type.toLowerCase() : "";
	if (text.includes("espresso")) return "espresso";
	if (text.includes("pour")) return "pour-over";
	if (text.includes("moka")) return "moka";
	return "espresso";
}

/** brewWeight / beanWeight, or null when either is missing or zero. */
export function ratioValue(
	beanWeight: number | null | undefined,
	brewWeight: number | null | undefined,
): number | null {
	return beanWeight && brewWeight ? brewWeight / beanWeight : null;
}

/** Ratio shown as `1:x`, one decimal, trailing `.0` dropped (1:2, 1:16.7). */
export function formatRatio(
	beanWeight: number | null | undefined,
	brewWeight: number | null | undefined,
): string | null {
	const ratio = ratioValue(beanWeight, brewWeight);
	return ratio == null ? null : `1:${Number(ratio.toFixed(1))}`;
}
