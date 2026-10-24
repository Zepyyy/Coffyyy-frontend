import { describe, expect, it } from "vitest";
import type { Brews } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";
import {
	defaultPromoteName,
	emptyRecipeForm,
	recipeFormFromBrew,
	recipeFormFromRecipe,
	recipeSummaryLine,
	switchRecipeMethod,
	toNewRecipe,
	toRecipeChanges,
} from "./recipeForm";

function brew(overrides: Partial<Brews> = {}): Brews {
	return {
		id: 7,
		method: "espresso",
		beanId: 3,
		machineId: 1,
		beanWeight: 18,
		brewWeight: 36,
		grindSize: 11,
		extractionTime: "0:28",
		flow: "Even",
		date: new Date("2026-10-01"),
		...overrides,
	} as Brews;
}

describe("defaultPromoteName", () => {
	it("is `<bean name> · 1:<ratio>`", () => {
		expect(defaultPromoteName("Kenya AA", 18, 36, "espresso")).toBe(
			"Kenya AA · 1:2",
		);
		expect(defaultPromoteName("Gesha", 15, 250, "pour-over")).toBe(
			"Gesha · 1:16.7",
		);
	});

	it("falls back to the method label without a bean", () => {
		expect(defaultPromoteName(null, 15, 240, "pour-over")).toBe(
			"Pour-over · 1:16",
		);
		expect(defaultPromoteName("  ", 18, 36, "espresso")).toBe("Espresso · 1:2");
	});

	it("drops the ratio when weights are missing", () => {
		expect(defaultPromoteName("Kenya AA", 0, 36, "espresso")).toBe("Kenya AA");
	});
});

describe("recipeFormFromBrew", () => {
	it("prefills actuals, method and bean tie", () => {
		expect(recipeFormFromBrew(brew(), { id: 3, name: "Kenya AA" })).toEqual({
			name: "Kenya AA · 1:2",
			method: "espresso",
			beanId: 3,
			beanWeight: 18,
			brewWeight: 36,
			grindSize: 11,
			extractionTime: "28",
			waterTemp: 0,
			notes: "",
		});
	});

	it("carries pour-over water temp and notes", () => {
		const form = recipeFormFromBrew(
			brew({
				method: "pour-over",
				beanWeight: 15,
				brewWeight: 250,
				extractionTime: "180",
				waterTemp: 94,
				notes: "50g bloom",
			}),
			{ id: 3, name: "Gesha" },
		);
		expect(form).toMatchObject({
			method: "pour-over",
			waterTemp: 94,
			notes: "50g bloom",
			extractionTime: "180",
		});
	});

	it("uses method defaults for missing pour-over temp", () => {
		const form = recipeFormFromBrew(brew({ method: "pour-over" }));
		expect(form?.waterTemp).toBe(93);
	});

	it("leaves the bean untied when the brew's bean is gone", () => {
		const form = recipeFormFromBrew(brew({ beanId: 3 }), null);
		expect(form?.beanId).toBeUndefined();
		expect(form?.name).toBe("Espresso · 1:2");
	});

	it("rejects moka brews", () => {
		expect(
			recipeFormFromBrew(brew({ method: "moka" }), { id: 3, name: "Kenya" }),
		).toBeNull();
	});
});

describe("form <-> recipe", () => {
	const recipe: Recipes = {
		id: 4,
		name: "Morning V60",
		method: "pour-over",
		beanId: undefined,
		beanWeight: 15,
		brewWeight: 250,
		grindSize: 20,
		extractionTime: "180",
		waterTemp: 92,
		notes: "three pours",
		createdAt: new Date(),
	};

	it("round-trips a recipe through the edit form", () => {
		const changes = toRecipeChanges(recipeFormFromRecipe(recipe));
		expect(changes).toEqual({
			name: "Morning V60",
			beanId: undefined,
			beanWeight: 15,
			brewWeight: 250,
			grindSize: 20,
			extractionTime: "180",
			waterTemp: 92,
			notes: "three pours",
		});
		expect(changes).not.toHaveProperty("method");
	});

	it("trims, normalises time and clears empty optionals", () => {
		const form = {
			...emptyRecipeForm("espresso"),
			name: "  House shot ",
			extractionTime: "0:30",
			notes: "   ",
		};
		expect(toNewRecipe(form)).toEqual({
			name: "House shot",
			method: "espresso",
			beanId: undefined,
			beanWeight: 18,
			brewWeight: 36,
			grindSize: 12,
			extractionTime: "30",
			waterTemp: undefined,
			notes: undefined,
		});
		expect(toNewRecipe({ ...form, extractionTime: "" }).extractionTime).toBe(
			undefined,
		);
	});
});

describe("switchRecipeMethod", () => {
	it("resets dial values to the new method, keeps name/bean/notes", () => {
		const form = {
			...emptyRecipeForm("espresso"),
			name: "Mine",
			beanId: 2,
			notes: "n",
		};
		expect(switchRecipeMethod(form, "pour-over")).toMatchObject({
			name: "Mine",
			beanId: 2,
			notes: "n",
			method: "pour-over",
			beanWeight: 15,
			brewWeight: 250,
			waterTemp: 93,
		});
	});
});

describe("recipeSummaryLine", () => {
	it("espresso: dose → yield · ratio · time", () => {
		expect(
			recipeSummaryLine({
				method: "espresso",
				beanWeight: 18,
				brewWeight: 36,
				extractionTime: "28",
				waterTemp: undefined,
			}),
		).toBe("18g → 36g · 1:2 · 28s");
	});

	it("pour-over adds temp", () => {
		expect(
			recipeSummaryLine({
				method: "pour-over",
				beanWeight: 15,
				brewWeight: 250,
				extractionTime: "180",
				waterTemp: 93,
			}),
		).toBe("15g → 250g · 1:16.7 · 3:00 · 93°C");
	});

	it("skips a missing time", () => {
		expect(
			recipeSummaryLine({
				method: "pour-over",
				beanWeight: 15,
				brewWeight: 250,
				extractionTime: undefined,
				waterTemp: undefined,
			}),
		).toBe("15g → 250g · 1:16.7");
	});
});
