import assert from "node:assert/strict";
import { test } from "node:test";
import { filterBeanCollection } from "./beanLibrary.ts";

const beans = [
	{
		id: 2,
		name: "Zola",
		brand: "Roast House",
		origin: ["Colombia"],
		dominantNote: "Fruity",
	},
	{
		id: 1,
		name: "Alba",
		brand: "North Star",
		origin: ["Ethiopia", "Kenya"],
		dominantNote: "Floral",
	},
	{
		id: 3,
		name: "Mora",
		brand: "Roast House",
		origin: ["Ethiopia"],
		dominantNote: "Nutty",
	},
];

test("Bean collection search and filters combine and keep alphabetical order", () => {
	assert.deepEqual(
		filterBeanCollection(beans, {
			search: "ethi",
			origins: ["Ethiopia"],
			brands: ["Roast House"],
		}).map((bean) => bean.id),
		[3],
	);

	assert.deepEqual(
		filterBeanCollection(beans, {}).map((bean) => bean.name),
		["Alba", "Mora", "Zola"],
	);
});

test("Bean collection filters match searchable identity fields", () => {
	assert.deepEqual(
		filterBeanCollection(beans, { search: "north star" }).map((bean) => bean.id),
		[1],
	);
	assert.deepEqual(
		filterBeanCollection(beans, { origins: ["Kenya"] }).map((bean) => bean.id),
		[1],
	);
});
