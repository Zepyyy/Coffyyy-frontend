import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeBrewerUsage } from "./brewerUsage.ts";

test("Brewer usage keeps the newest date, count, and distinct methods", () => {
	const usage = summarizeBrewerUsage([
		{
			id: 1,
			brewerId: 7,
			beanId: 2,
			method: "Moka Pot",
			date: new Date("2026-07-01T08:00:00Z"),
		},
		{
			id: 2,
			brewerId: 7,
			beanId: 2,
			method: "Moka Pot",
			date: new Date("2026-07-04T08:00:00Z"),
		},
		{
			id: 3,
			brewerId: 7,
			beanId: 2,
			date: new Date("2026-07-03T08:00:00Z"),
		},
	]);

	assert.deepEqual(usage.get(7), {
		lastUsed: "2026-07-04T08:00:00.000Z",
		brewCount: 3,
		methods: ["Moka Pot", "Unknown"],
	});
});
