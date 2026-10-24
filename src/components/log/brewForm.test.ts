import { describe, expect, it } from "vitest";
import { DEFAULT_GRIND_SIZE, methodConfig } from "@/lib/brewMethods";
import type { Brews } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";
import {
	type BrewLogForm,
	brewWeightForRatio,
	dialsFromBrew,
	dialsFromRecipe,
	methodDefaults,
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
			grindSize: DEFAULT_GRIND_SIZE,
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
			grindSize: DEFAULT_GRIND_SIZE,
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
