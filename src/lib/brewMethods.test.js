import assert from "node:assert/strict";
import { test } from "node:test";
import { isolateMethodMeasurements } from "./brewMethods.ts";

const mixedMeasurements = {
	espressoWeight: 36,
	yieldWeight: 42,
	extractionTime: "00:30",
	flow: "Even",
	waterAmount: 300,
	heatLevel: "High",
	brewTime: "04:30",
};

test("Espresso keeps espresso measurements and clears Moka Pot measurements", () => {
	assert.deepEqual(isolateMethodMeasurements("Espresso", mixedMeasurements), {
		espressoWeight: 36,
		extractionTime: "00:30",
		flow: "Even",
		yieldWeight: undefined,
		waterAmount: undefined,
		heatLevel: undefined,
		brewTime: undefined,
	});
});

test("Moka Pot keeps Moka Pot measurements and clears espresso measurements", () => {
	assert.deepEqual(isolateMethodMeasurements("Moka Pot", mixedMeasurements), {
		espressoWeight: undefined,
		yieldWeight: 42,
		extractionTime: undefined,
		flow: undefined,
		waterAmount: 300,
		heatLevel: "High",
		brewTime: "04:30",
	});
});
