import { describe, expect, it } from "vitest";
import { brewVsRecipe, formatRecipeDelta, recipeLine } from "@/lib/brewFormat";
import type { Brews } from "@/types/BrewTypes";

function brew(overrides: Partial<Brews>): Brews {
	return {
		id: 1,
		method: "espresso",
		beanId: undefined,
		machineId: undefined,
		beanWeight: 18,
		brewWeight: 36,
		grindSize: 12,
		date: new Date(),
		...overrides,
	} as Brews;
}

describe("recipeLine", () => {
	it("espresso: flow, short seconds", () => {
		expect(
			recipeLine(brew({ extractionTime: "28", flow: "Even", waterTemp: 90 })),
		).toBe("grind 12 · 18g → 36g · 1:2 · 28s · even");
	});

	it("pour-over: m:ss time and water temp, no flow", () => {
		expect(
			recipeLine(
				brew({
					method: "pour-over",
					grindSize: 20,
					beanWeight: 15,
					brewWeight: 250,
					extractionTime: "180",
					waterTemp: 93,
					flow: "even",
				}),
			),
		).toBe("grind 20 · 15g → 250g · 1:16.7 · 3:00 · 93°C");
	});

	it("moka: heat", () => {
		expect(
			recipeLine(
				brew({
					method: "moka",
					grindSize: 8,
					beanWeight: 15,
					brewWeight: 100,
					extractionTime: "240",
					heat: "medium",
				}),
			),
		).toBe("grind 8 · 15g → 100g · 1:6.7 · 4:00 · medium heat");
	});

	it("skips missing parts", () => {
		expect(recipeLine(brew({ extractionTime: undefined }))).toBe(
			"grind 12 · 18g → 36g · 1:2",
		);
	});
});

describe("brewVsRecipe", () => {
	const recipe = {
		beanWeight: 18,
		brewWeight: 36,
		grindSize: 12,
		extractionTime: "30",
		waterTemp: 93,
	};

	it("lists only differing fields with method labels", () => {
		const deltas = brewVsRecipe(
			brew({ brewWeight: 38, extractionTime: "26", grindSize: 12 }),
			recipe,
		);
		expect(deltas).toEqual([
			{ field: "brewWeight", label: "yield", delta: 2, unit: "g" },
			{ field: "extractionTime", label: "time", delta: -4, unit: "s" },
		]);
		expect(deltas.map(formatRecipeDelta)).toEqual(["yield +2g", "time −4s"]);
	});

	it("is empty when the brew matches", () => {
		expect(brewVsRecipe(brew({ extractionTime: "0:30" }), recipe)).toEqual([]);
	});

	it("pour-over compares water and temp", () => {
		const deltas = brewVsRecipe(
			brew({
				method: "pour-over",
				beanWeight: 15,
				brewWeight: 260,
				grindSize: 21,
				extractionTime: "185",
				waterTemp: 92,
			}),
			{
				beanWeight: 15,
				brewWeight: 250,
				grindSize: 20,
				extractionTime: "180",
				waterTemp: 93,
			},
		);
		expect(deltas.map(formatRecipeDelta)).toEqual([
			"water +10g",
			"grind +1",
			"time +5s",
			"temp −1°C",
		]);
	});

	it("skips fields the recipe leaves blank and ignores temp for espresso", () => {
		const deltas = brewVsRecipe(
			brew({ grindSize: 14, extractionTime: "40", waterTemp: 80 }),
			{ beanWeight: 18.5, brewWeight: 36 },
		);
		expect(deltas.map(formatRecipeDelta)).toEqual(["dose −0.5g"]);
	});
});
