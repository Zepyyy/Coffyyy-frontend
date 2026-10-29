import { describe, expect, it } from "vitest";
import { methodConfig } from "@/lib/brewMethods";
import type { Brews } from "@/types/BrewTypes";
import type { RepeatSourceRows } from "@/lib/api/repeatSource";
import type { Recipes } from "@/types/RecipeTypes";
import {
	type BrewLogForm,
	brewWeightForRatio,
	dialsForRepeat,
	dialsFromBrew,
	dialsFromRecipe,
	methodDefaults,
	recipeFitsBean,
	repeatNotices,
	repeatStart,
	toNewBrew,
} from "./brewForm";

function brew(overrides: Partial<Brews>): Brews {
	return {
		id: 1,
		method: "espresso",
		beanId: 1,
		machineId: 1,
		date: new Date(),
		grindSize: 11,
		beanWeight: 18,
		brewWeight: 40,
		...overrides,
	};
}

function recipe(overrides: Partial<Recipes>): Recipes {
	return {
		id: 7,
		name: "Bright",
		method: "pour-over",
		beanWeight: 15,
		brewWeight: 250,
		createdAt: new Date(),
		...overrides,
	};
}

describe("methodDefaults", () => {
	it("takes every number and visible extra from the method config", () => {
		const pourOver = methodConfig("pour-over");
		expect(methodDefaults("pour-over")).toEqual({
			grindSize: methodConfig("pour-over").grind.default,
			beanWeight: pourOver.dose.default,
			brewWeight: pourOver.brewWeight.default,
			extractionTime: "",
			flow: "",
			waterTemp: pourOver.waterTemp?.default,
			heat: undefined,
			notes: "",
		});
		expect(methodDefaults("moka").heat).toBe("medium");
		expect(methodDefaults("espresso").waterTemp).toBeUndefined();
	});
});

describe("dialsFromBrew", () => {
	it("picks up the brew's dials, time normalised to seconds", () => {
		const dials = dialsFromBrew(
			brew({ extractionTime: "0:28", flow: "Even" }),
			"espresso",
		);
		expect(dials).toMatchObject({
			grindSize: 11,
			beanWeight: 18,
			brewWeight: 40,
			extractionTime: "28",
			flow: "Even",
			notes: "",
		});
	});

	it("only carries extras the method shows", () => {
		const moka = dialsFromBrew(
			brew({ method: "moka", brewWeight: 100, flow: "Even", heat: "low" }),
			"moka",
		);
		expect(moka.flow).toBe("");
		expect(moka.heat).toBe("low");
		expect(moka.waterTemp).toBeUndefined();

		const pourOver = dialsFromBrew(
			brew({ method: "pour-over", brewWeight: 250 }),
			"pour-over",
		);
		expect(pourOver.waterTemp).toBe(
			methodConfig("pour-over").waterTemp?.default,
		);
	});

	it("clamps weights to the method's dial range", () => {
		const dials = dialsFromBrew(
			brew({ beanWeight: 40, brewWeight: 5 }),
			"espresso",
		);
		const { dose, brewWeight } = methodConfig("espresso");
		expect(dials.beanWeight).toBe(dose.max);
		expect(dials.brewWeight).toBe(brewWeight.min);
	});
});

describe("dialsFromRecipe", () => {
	it("sets the recipe's targets and keeps the grind it leaves open", () => {
		const current = {
			...methodDefaults("pour-over"),
			grindSize: 22,
			flow: "x",
		};
		const dials = dialsFromRecipe(
			recipe({ extractionTime: "180", waterTemp: 94, notes: "50g bloom" }),
			current,
			"pour-over",
		);
		expect(dials).toEqual({
			...methodDefaults("pour-over"),
			grindSize: 22,
			beanWeight: 15,
			brewWeight: 250,
			extractionTime: "180",
			waterTemp: 94,
			notes: "50g bloom",
		});
	});

	it("uses the recipe grind when it has one", () => {
		const dials = dialsFromRecipe(
			recipe({ grindSize: 18 }),
			methodDefaults("pour-over"),
			"pour-over",
		);
		expect(dials.grindSize).toBe(18);
		expect(dials.extractionTime).toBe("");
	});
});

describe("brewWeightForRatio", () => {
	it("multiplies the dose and stays on the dial", () => {
		expect(brewWeightForRatio(18, 2, "espresso")).toBe(36);
		expect(brewWeightForRatio(15, 16, "pour-over")).toBe(240);
		expect(brewWeightForRatio(24, 2.5, "espresso")).toBe(
			methodConfig("espresso").brewWeight.max,
		);
	});
});

describe("toNewBrew", () => {
	const form: BrewLogForm & { machineId: number } = {
		beanId: 3,
		machineId: 2,
		recipeId: 7,
		...methodDefaults("pour-over"),
		flow: "Even",
		heat: "high",
		notes: "  slow pours ",
	};
	const date = new Date("2026-10-24T08:00:00Z");

	it("keeps only the method's extras, trimmed notes and the recipe link", () => {
		const payload = toNewBrew(form, "pour-over", date);
		expect(payload).toEqual({
			beanId: 3,
			machineId: 2,
			date,
			beanWeight: 15,
			brewWeight: 250,
			grindSize: methodConfig("pour-over").grind.default,
			extractionTime: "",
			waterTemp: 93,
			notes: "slow pours",
			recipeId: 7,
		});
	});

	it("never links a recipe for moka and drops empty notes", () => {
		const payload = toNewBrew(
			{ ...form, notes: " ", heat: "low" },
			"moka",
			date,
		);
		expect(payload.recipeId).toBeUndefined();
		expect(payload.notes).toBeUndefined();
		expect(payload.heat).toBe("low");
		expect(payload.waterTemp).toBeUndefined();
		expect(payload.flow).toBeUndefined();
	});
});

describe("dialsForRepeat", () => {
	it("keeps the settings and blanks time, flow and notes", () => {
		const dials = dialsForRepeat(
			brew({ grindSize: 9, extractionTime: "0:30", flow: "Even", notes: "x" }),
			"espresso",
		);
		expect(dials).toMatchObject({
			grindSize: 9,
			beanWeight: 18,
			brewWeight: 40,
			extractionTime: "",
			flow: "",
			notes: "",
		});
	});

	it("keeps pour-over temp and moka heat", () => {
		expect(
			dialsForRepeat(
				brew({ method: "pour-over", brewWeight: 250, waterTemp: 92 }),
				"pour-over",
			).waterTemp,
		).toBe(92);
		expect(
			dialsForRepeat(
				brew({ method: "moka", brewWeight: 100, heat: "low" }),
				"moka",
			).heat,
		).toBe("low");
	});
});

function source(overrides: Partial<RepeatSourceRows>): RepeatSourceRows {
	return {
		brew: brew({
			method: "pour-over",
			brewWeight: 250,
			beanId: 3,
			machineId: 5,
		}),
		bean: { id: 3 },
		machine: { id: 5, method: "pour-over" },
		recipe: null,
		...overrides,
	};
}

describe("repeatStart", () => {
	it("starts from the exact source with its bean, Brewer and method", () => {
		const start = repeatStart(source({}));
		expect(start).toMatchObject({
			method: "pour-over",
			beanId: 3,
			machineId: 5,
			recipe: null,
			missing: [],
		});
		expect(repeatNotices(start)).toEqual([]);
	});

	it("never swaps in another method's Brewer", () => {
		const start = repeatStart(
			source({ machine: { id: 8, method: "espresso" } }),
		);
		expect(start.method).toBe("pour-over");
		expect(start.machineId).toBeUndefined();
		expect(start.missing).toEqual(["brewer"]);
		expect(repeatNotices(start)[0]).toMatch(/pour-over brewer/);
	});

	it("flags a deleted Brewer and bean", () => {
		const start = repeatStart(source({ machine: null, bean: null }));
		expect(start.missing).toEqual(["bean", "brewer"]);
		expect(repeatNotices(start)).toHaveLength(2);
		// Dials are still the source's, ready for a compatible Brewer.
		expect(start.dials.brewWeight).toBe(250);
	});

	it("keeps a recipe that still fits", () => {
		const r = recipe({ id: 7, beanId: 3 });
		expect(repeatStart(source({ recipe: r })).recipe).toBe(r);
		expect(
			repeatStart(source({ recipe: recipe({ beanId: undefined }) })).recipe,
		).not.toBeNull();
	});

	it("drops a recipe tied to another bean, of another method, or missing the bean", () => {
		expect(
			repeatStart(source({ recipe: recipe({ beanId: 9 }) })).recipe,
		).toBeNull();
		expect(
			repeatStart(source({ recipe: recipe({ method: "espresso" }) })).recipe,
		).toBeNull();
		expect(
			repeatStart(source({ bean: null, recipe: recipe({ beanId: 3 }) })).recipe,
		).toBeNull();
	});

	it("never links a recipe on a recipe-free method", () => {
		const moka = repeatStart(
			source({
				brew: brew({ method: "moka", brewWeight: 100, machineId: 5 }),
				machine: { id: 5, method: "moka" },
				// Stale data: recipes have no moka method.
				recipe: recipe({ method: "moka" as never }),
			}),
		);
		expect(moka.recipe).toBeNull();
	});
});

describe("recipeFitsBean", () => {
	it("allows untied recipes and the tied bean only", () => {
		expect(recipeFitsBean(recipe({ beanId: undefined }), 1)).toBe(true);
		expect(recipeFitsBean(recipe({ beanId: 1 }), 1)).toBe(true);
		expect(recipeFitsBean(recipe({ beanId: 2 }), 1)).toBe(false);
		expect(recipeFitsBean(null, 1)).toBe(false);
	});
});
