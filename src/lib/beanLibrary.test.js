import assert from "node:assert/strict";
import { test } from "node:test";
import { filterBeanCollection, orderBeans } from "./beanLibrary.ts";

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
	{
		id: 4,
		name: "Pinned bean",
		brand: "Small Batch",
		origin: ["Brazil"],
		dominantNote: "Sweet",
		pinned: true,
	},
	{
		id: 5,
		name: "Archived bean",
		brand: "Old Batch",
		origin: ["Peru"],
		dominantNote: "Roasted",
		pinned: true,
		archived: true,
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
		["Pinned bean", "Alba", "Mora", "Zola", "Archived bean"],
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

test("pinned active Beans appear first and archived pinned state stays suppressed", () => {
	assert.deepEqual(
		orderBeans(beans).map((bean) => bean.id),
		[4, 1, 3, 2, 5],
	);
});
