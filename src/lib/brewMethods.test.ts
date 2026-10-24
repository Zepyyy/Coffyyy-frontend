import { describe, expect, it } from "vitest";
import {
	BREW_METHODS,
	formatRatio,
	isRecipeMethod,
	methodConfig,
	methodFromMachineType,
	RECIPE_METHODS,
	ratioValue,
} from "./brewMethods";

describe("brewMethods", () => {
	it("lists the fixed methods and the ones with recipes", () => {
		expect(BREW_METHODS).toEqual(["espresso", "pour-over", "moka"]);
		expect(RECIPE_METHODS).toEqual(["espresso", "pour-over"]);
		expect(isRecipeMethod("moka")).toBe(false);
		expect(isRecipeMethod("pour-over")).toBe(true);
		expect(isRecipeMethod("french-press")).toBe(false);
	});

	it("keeps the espresso values the log form always used", () => {
		const espresso = methodConfig("espresso");
		expect(espresso.dose).toEqual({ min: 12, max: 24, default: 18 });
		expect(espresso.brewWeight).toMatchObject({
			min: 12,
			max: 48,
			default: 36,
		});
		expect(espresso.brewWeight.label).toBe("Yield");
		expect(espresso.time.presets).toEqual([25, 28, 30, 32, 36]);
		expect(espresso.flow).toBe(true);
		expect(espresso.waterTemp).toBeNull();
		expect(espresso.heat).toBeNull();
	});

	it("shows per-method extras", () => {
		expect(methodConfig("pour-over")).toMatchObject({
			label: "Pour-over",
			brewWeight: { label: "Water", min: 150, max: 500, default: 250 },
			time: { label: "Total time" },
			ratioPresets: [15, 16, 17],
			flow: false,
			waterTemp: { min: 85, max: 100, default: 93 },
			heat: null,
		});
		expect(methodConfig("moka")).toMatchObject({
			label: "Moka",
			brewWeight: { label: "Output", default: 100 },
			ratioPresets: [],
			heat: { options: ["low", "medium", "high"], default: "medium" },
			hasRecipes: false,
		});
	});

	it("reads unknown methods as espresso", () => {
		expect(methodConfig(undefined).method).toBe("espresso");
		expect(methodConfig("siphon" as never).method).toBe("espresso");
	});

	it("maps legacy machine types case-insensitively", () => {
		expect(methodFromMachineType("Manual Espresso")).toBe("espresso");
		expect(methodFromMachineType("Pour over")).toBe("pour-over");
		expect(methodFromMachineType("V60 POUR-OVER")).toBe("pour-over");
		expect(methodFromMachineType("Bialetti moka pot")).toBe("moka");
		expect(methodFromMachineType("Lever")).toBe("espresso");
		expect(methodFromMachineType(undefined)).toBe("espresso");
	});

	it.each([
		["Hario V60", "pour-over"],
		["Chemex 6-cup", "pour-over"],
		["Kalita Wave", "pour-over"],
		["Filter", "pour-over"],
		["Drip brewer", "pour-over"],
		["Origami dripper", "pour-over"],
		["Bialetti Venus", "moka"],
		["Stovetop", "moka"],
		["Stovetop drip", "moka"],
		["Espresso / V60", "espresso"],
		["Stovetop espresso maker", "espresso"],
		["French press", "espresso"],
	])("maps legacy machine type %p to %p", (type, method) => {
		expect(methodFromMachineType(type)).toBe(method);
	});

	it("formats ratios as 1:x", () => {
		expect(formatRatio(18, 36)).toBe("1:2");
		expect(formatRatio(15, 250)).toBe("1:16.7");
		expect(formatRatio(18, 45)).toBe("1:2.5");
		expect(formatRatio(0, 36)).toBeNull();
		expect(formatRatio(18, undefined)).toBeNull();
		expect(ratioValue(15, 100)).toBeCloseTo(6.667, 3);
	});
});
