import "fake-indexeddb/auto";
import { Dexie } from "dexie";
import { afterAll, describe, expect, it } from "vitest";
import {
	snapshotHash,
	type WorkspaceSnapshotV2,
} from "@/lib/api/snapshotSchema";
import { db } from "./db";

describe("Dexie version 12 upgrade", () => {
	afterAll(() => db.close());

	it("maps machine type to method and brew espressoWeight to brewWeight", async () => {
		db.close();
		await Dexie.delete("Coffyyy");
		const legacy = new Dexie("Coffyyy");
		legacy.version(11).stores({
			Beans:
				"++id, localId, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
			Machines: "++id, localId, name",
			Brews:
				"++id, localId, bean, machine, overallRating, tasteScore, strengthScore, grindSize, date",
			Enrollment: "&id, workspaceId, paused",
		});
		await legacy.open();
		const [espresso, v60, moka] = await Promise.all(
			["Espresso", "Pour over", "moka pot"].map((type, index) =>
				legacy
					.table("Machines")
					.add({ localId: `m${index}`, name: type, type }),
			),
		);
		await legacy.table("Brews").bulkAdd([
			{ localId: "b1", machineId: espresso, espressoWeight: 36 },
			{ localId: "b2", machineId: v60, espressoWeight: 250 },
			{ localId: "b3", machineId: moka, espressoWeight: 100 },
			{ localId: "b4", machineId: undefined, espressoWeight: 40 },
			{ localId: "b5", machineId: 999, espressoWeight: 38 },
		]);
		legacy.close();

		await db.open();

		const machines = await db.Machines.orderBy("localId").toArray();
		expect(machines.map((m) => m.method)).toEqual([
			"espresso",
			"pour-over",
			"moka",
		]);
		expect(machines[0]).not.toHaveProperty("type");
		const brews = await db.Brews.orderBy("localId").toArray();
		expect(brews.map((b) => [b.method, b.brewWeight])).toEqual([
			["espresso", 36],
			["pour-over", 250],
			["moka", 100],
			["espresso", 40],
			["espresso", 38],
		]);
		expect(brews[0]).not.toHaveProperty("espressoWeight");
		expect(await db.Recipes.count()).toBe(0);
		expect(await db.Brews.where("method").equals("pour-over").count()).toBe(1);
	});
});

describe("Dexie version 13 upgrade", () => {
	afterAll(() => db.close());

	it("keeps local recipes and updates the stored merge base and hash", async () => {
		db.close();
		await Dexie.delete("Coffyyy");
		const legacy = new Dexie("Coffyyy");
		legacy.version(12).stores({
			Beans:
				"++id, localId, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
			Machines: "++id, localId, name, method",
			Brews:
				"++id, localId, bean, machine, beanId, machineId, recipeId, method, overallRating, tasteScore, strengthScore, grindSize, date",
			Recipes: "++id, localId, method, beanId",
			Enrollment: "&id, workspaceId, paused",
		});
		await legacy.open();
		const recipe = {
			localId: "flat-v60",
			method: "pour-over" as const,
			name: "V60",
			beanWeight: 15,
			brewWeight: 250,
			createdAt: "2026-01-01T00:00:00.000Z",
		};
		await legacy.table("Recipes").add({
			...recipe,
			name: "Local edit",
			createdAt: new Date(recipe.createdAt),
		});
		const baseSnapshot: WorkspaceSnapshotV2 = {
			schemaVersion: 2,
			beans: [],
			machines: [],
			brews: [],
			recipes: [recipe],
		};
		await legacy.table("Enrollment").add({
			id: "current",
			baseSnapshot,
			lastSyncedHash: "v2 hash",
			cloudVersion: 7,
		});
		legacy.close();

		await db.open();
		const updatedBase = { ...baseSnapshot, schemaVersion: 3 as const };
		expect(await db.Enrollment.get("current")).toMatchObject({
			baseSnapshot: updatedBase,
			lastSyncedHash: snapshotHash(updatedBase),
			cloudVersion: 7,
		});
		const [localRecipe] = await db.Recipes.toArray();
		expect(localRecipe.name).toBe("Local edit");
		expect(localRecipe.pours).toBeUndefined();
	});
});
