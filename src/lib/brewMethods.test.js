import assert from "node:assert/strict";
import { test } from "node:test";
import {
	applyLastUsedBrew,
	buildBrewSummary,
	findLastUsedBrew,
	isolateMethodMeasurements,
} from "./brewMethods.ts";

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

const baseForm = {
	beanId: 7,
	brewerId: 3,
	method: "Espresso",
	beanWeight: undefined,
	espressoWeight: undefined,
	yieldWeight: undefined,
	extractionTime: "",
	flow: "",
	waterAmount: undefined,
	heatLevel: undefined,
	brewTime: "",
	grindSize: undefined,
	date: new Date("2026-01-01T08:00:00Z"),
};

function brew(overrides = {}) {
	return {
		id: 1,
		beanId: 7,
		method: "Espresso",
		date: new Date("2026-01-01T08:00:00Z"),
		...overrides,
	};
}

test("Last used prefers the selected Brewer, then falls back to Bean and method", () => {
	const generic = brew({
		id: 1,
		brewerId: 8,
		overallRating: 5,
		date: new Date("2026-01-05T08:00:00Z"),
	});
	const selectedBrewer = brew({
		id: 2,
		brewerId: 3,
		overallRating: 1,
		date: new Date("2026-01-02T08:00:00Z"),
	});

	assert.equal(findLastUsedBrew([generic, selectedBrewer], 7, "Espresso", 3)?.id, 2);
	assert.equal(findLastUsedBrew([generic, selectedBrewer], 7, "Espresso", 99)?.id, 1);
	assert.equal(findLastUsedBrew([generic, selectedBrewer], 7, "Moka Pot"), null);
});

test("applying Last used fills only blank fields and keeps method-specific values isolated", () => {
	const form = {
		...baseForm,
		beanWeight: 19,
		flow: "Perfect",
	};
	const result = applyLastUsedBrew(form, brew({
		grindSize: 12,
		beanWeight: 18,
		espressoWeight: 36,
		extractionTime: "00:30",
		flow: "Even",
		waterAmount: 300,
		heatLevel: "High",
		brewTime: "04:30",
	}));

	assert.equal(result.grindSize, 12);
	assert.equal(result.beanWeight, 19);
	assert.equal(result.flow, "Perfect");
	assert.equal(result.espressoWeight, 36);
	assert.equal(result.extractionTime, "00:30");
	assert.equal(result.waterAmount, undefined);
	assert.equal(result.heatLevel, undefined);
	assert.equal(result.brewTime, "");
});

test("applying an incomplete Last used setup keeps empty form fields valid", () => {
	const result = applyLastUsedBrew(baseForm, brew({ grindSize: 12 }));

	assert.equal(result.grindSize, 12);
	assert.equal(result.extractionTime, "");
	assert.equal(result.flow, "");
});

test("summary leads with method, bean, and explicit optional Brewer", () => {
	const rows = buildBrewSummary(
		{ ...baseForm, method: "Moka Pot", beanWeight: 20, waterAmount: 300 },
		"Rwanda Natural",
		undefined,
	);

	assert.deepEqual(rows.slice(0, 3), [
		{ label: "Brew method", value: "Moka Pot" },
		{ label: "Bean", value: "Rwanda Natural" },
		{ label: "Brewer", value: "No brewer recorded" },
	]);
	assert.deepEqual(rows.slice(3).map(({ label }) => label), [
		"Grind size",
		"Coffee dose",
		"Yield",
		"Water amount",
		"Heat level",
		"Total brew time",
	]);
});
