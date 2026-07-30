import assert from "node:assert/strict";
import { test } from "node:test";
import { filterBrewerCollection, orderBrewers } from "./brewerLibrary.ts";

const brewers = [
	{
		id: 2,
		name: "Moka at home",
		brand: "Bialetti",
		model: "Venus",
		type: "Moka pot",
	},
	{
		id: 1,
		name: "Morning espresso",
		brand: "Linea",
		model: "Mini",
		type: "Espresso machine",
	},
	{
		id: 3,
		name: "Weekend pour-over",
		brand: "Hario",
		model: "V60",
		type: "Pour-over",
	},
	{
		id: 4,
		name: "Pinned press",
		brand: "Espro",
		model: "P7",
		type: "French press",
		pinned: true,
	},
	{
		id: 5,
		name: "Archived favorite",
		brand: "Old",
		model: "Retired",
		type: "French press",
		pinned: true,
		archived: true,
	},
];

test("Brewer collection search and filters combine and keep alphabetical order", () => {
	assert.deepEqual(
		filterBrewerCollection(brewers, {
			search: "moka",
			categories: ["MOKA POT"],
			brands: ["bialetti"],
		}).map((brewer) => brewer.id),
		[2],
	);

	assert.deepEqual(
		filterBrewerCollection(brewers, {}).map((brewer) => brewer.name),
		[
			"Pinned press",
			"Moka at home",
			"Morning espresso",
			"Weekend pour-over",
			"Archived favorite",
		],
	);
});

test("Brewer collection search matches model and category identity", () => {
	assert.deepEqual(
		filterBrewerCollection(brewers, { search: "v60" }).map((brewer) => brewer.id),
		[3],
	);
	assert.deepEqual(
		filterBrewerCollection(brewers, { categories: ["Pour-over"] }).map(
			(brewer) => brewer.id,
		),
		[3],
	);
});

test("pinned Brewers appear first wherever the Brew selector uses the order", () => {
	assert.deepEqual(
		orderBrewers(brewers).map((brewer) => brewer.id),
		[4, 2, 1, 3, 5],
	);
});
