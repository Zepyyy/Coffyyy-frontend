import "fake-indexeddb/auto";
import { Dexie } from "dexie";
import { afterAll, describe, expect, it } from "vitest";
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
