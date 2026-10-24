import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import {
	getPromotionSource,
	getRecipeBrewStats,
	summarizeRecipeBrews,
} from "./recipeStats";

describe("summarizeRecipeBrews", () => {
	it("counts linked brews and averages rated ones", () => {
		expect(
			summarizeRecipeBrews([
				{ recipeId: 1, overallRating: 4 },
				{ recipeId: 1, overallRating: 5 },
				{ recipeId: 1, overallRating: undefined },
				{ recipeId: 2, overallRating: undefined },
				{ recipeId: undefined, overallRating: 3 },
			]),
		).toEqual({
			1: { brewCount: 3, averageRating: 4.5 },
			2: { brewCount: 1, averageRating: null },
		});
	});
});

describe("recipe queries", () => {
	beforeEach(async () => {
		await db.open();
		await Promise.all([db.Beans.clear(), db.Brews.clear()]);
	});

	async function addBrew(fields: Record<string, unknown>) {
		return db.Brews.add({
			method: "espresso",
			beanWeight: 18,
			brewWeight: 36,
			grindSize: 12,
			date: new Date(),
			beanId: undefined,
			machineId: undefined,
			...fields,
		} as never);
	}

	it("getRecipeBrewStats only reads linked brews", async () => {
		await addBrew({ recipeId: 5, overallRating: 3 });
		await addBrew({ recipeId: 5, overallRating: 4 });
		await addBrew({ overallRating: 1 });
		expect(await getRecipeBrewStats()).toEqual({
			5: { brewCount: 2, averageRating: 3.5 },
		});
	});

	it("getPromotionSource returns the brew with its bean name", async () => {
		const beanId = await db.Beans.add({ name: "Kenya AA" } as never);
		const brewId = await addBrew({ beanId });
		const source = await getPromotionSource(brewId);
		expect(source?.brew.id).toBe(brewId);
		expect(source?.bean).toEqual({ id: beanId, name: "Kenya AA" });
		expect(await getPromotionSource(9999)).toBeNull();
		expect(await getPromotionSource(undefined)).toBeNull();
	});

	it("getPromotionSource drops a deleted bean", async () => {
		const brewId = await addBrew({ beanId: 4242 });
		const source = await getPromotionSource(brewId);
		expect(source?.brew.beanId).toBe(4242);
		expect(source?.bean).toBeNull();
	});
});
