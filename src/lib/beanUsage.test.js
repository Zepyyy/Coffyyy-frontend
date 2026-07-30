import assert from "node:assert/strict";
import test from "node:test";
import { summarizeBeanUsage } from "./beanUsage.ts";

test("Bean usage keeps the newest date and method while counting all brews", () => {
	const usage = summarizeBeanUsage([
		{ id: 1, beanId: 7, method: "Espresso", date: new Date("2026-07-01") },
		{ id: 2, beanId: 7, method: "Moka Pot", date: new Date("2026-07-04") },
		{ id: 3, beanId: 7, date: new Date("2026-07-05") },
	]);

	assert.deepEqual(usage.get(7), {
		lastUsed: "2026-07-05T00:00:00.000Z",
		lastMethod: "Unknown",
		brewCount: 3,
	});
});
