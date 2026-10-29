import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { getRepeatSource } from "./repeatSource";

describe("getRepeatSource", () => {
	beforeEach(async () => {
		await db.open();
		await Promise.all([
			db.Beans.clear(),
			db.Machines.clear(),
			db.Brews.clear(),
			db.Recipes.clear(),
		]);
	});

	const addBrew = (fields: Record<string, unknown>) =>
		db.Brews.add({
			method: "pour-over",
			beanWeight: 15,
			brewWeight: 250,
			grindSize: 20,
			date: new Date(),
			...fields,
		} as never);

	it("returns the exact brew with its bean, Brewer and recipe", async () => {
		const beanId = await db.Beans.add({ name: "Kenya" } as never);
		const machineId = await db.Machines.add({
			name: "V60",
			method: "pour-over",
		} as never);
		const recipeId = await db.Recipes.add({
			name: "Bright",
			method: "pour-over",
		} as never);
		const older = await addBrew({ beanId, machineId, recipeId, grindSize: 18 });
		await addBrew({ beanId, machineId, grindSize: 25 });

		const source = await getRepeatSource(older);
		expect(source?.brew.grindSize).toBe(18);
		expect(source?.bean).toEqual({ id: beanId });
		expect(source?.machine).toEqual({ id: machineId, method: "pour-over" });
		expect(source?.recipe?.id).toBe(recipeId);
	});

	it("nulls what was deleted and returns null for a missing brew", async () => {
		const id = await addBrew({ beanId: 404, machineId: 405, recipeId: 406 });
		const source = await getRepeatSource(id);
		expect(source?.brew.id).toBe(id);
		expect(source).toMatchObject({ bean: null, machine: null, recipe: null });
		expect(await getRepeatSource(9999)).toBeNull();
		expect(await getRepeatSource(undefined)).toBeNull();
	});
});
