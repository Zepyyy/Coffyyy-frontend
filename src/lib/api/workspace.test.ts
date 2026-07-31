import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import {
	replaceLocalSnapshot,
	snapshotHash,
	validateSnapshot,
	type WorkspaceSnapshot,
} from "./workspace";

const snapshot: WorkspaceSnapshot = {
	schemaVersion: 1,
	beans: [
		{
			localId: "bean-1",
			name: "Ethiopia",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 3,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		},
	],
	machines: [
		{
			localId: "machine-1",
			name: "Linea Mini",
			brand: "La Marzocco",
			type: "Espresso",
			purchaseDate: "",
			model: "",
			grindRange: "",
			capacity: "",
		},
	],
	brews: [
		{
			localId: "brew-1",
			beanLocalId: "bean-1",
			machineLocalId: "machine-1",
			beanWeight: 18,
			espressoWeight: 36,
			extractionTime: "30s",
			flow: "Perfect",
			overallRating: 4,
			tasteScore: 1,
			strengthScore: 0,
			grindSize: 12,
			date: "2026-07-31T00:00:00.000Z",
		},
	],
};

describe("workspace snapshot seam", () => {
	beforeEach(async () => {
		await db.open();
		await Promise.all([
			db.Beans.clear(),
			db.Machines.clear(),
			db.Brews.clear(),
		]);
	});

	it("replaces all local records and remaps brew relationships transactionally", async () => {
		await db.Beans.add({ ...snapshot.beans[0], id: 99 });
		await db.Machines.add({ ...snapshot.machines[0], id: 99 });
		await db.Brews.add({
			...snapshot.brews[0],
			id: 99,
			beanId: 99,
			machineId: 99,
			date: new Date(snapshot.brews[0].date),
		});
		await replaceLocalSnapshot(snapshot);

		const bean = await db.Beans.toArray();
		const machine = await db.Machines.toArray();
		const brew = await db.Brews.toArray();
		expect(bean).toHaveLength(1);
		expect(machine).toHaveLength(1);
		expect(brew).toHaveLength(1);
		expect(bean[0].localId).toBe("bean-1");
		expect(machine[0].localId).toBe("machine-1");
		expect(brew[0].beanId).toBe(bean[0].id);
		expect(brew[0].machineId).toBe(machine[0].id);
	});

	it("deletes local records absent from the replacement", async () => {
		await db.Beans.bulkAdd([
			{ ...snapshot.beans[0], id: 1 },
			{ ...snapshot.beans[0], id: 2, localId: "bean-2", name: "Kenya" },
		]);
		await replaceLocalSnapshot(snapshot);

		expect(await db.Beans.toArray()).toHaveLength(1);
		expect(await db.Beans.get({ localId: "bean-2" })).toBeUndefined();
	});

	it("rejects relationships that do not exist before writing", async () => {
		const invalid = {
			...snapshot,
			brews: [{ ...snapshot.brews[0], beanLocalId: "missing" }],
		};
		expect(() => validateSnapshot(invalid)).toThrow("invalid relationships");
		expect(await db.Beans.count()).toBe(0);
	});

	it("rejects empty and duplicate brew IDs before replacing data", async () => {
		const invalid = {
			...snapshot,
			brews: [
				{ ...snapshot.brews[0], localId: "" },
				{
					...snapshot.brews[0],
					beanLocalId: undefined,
					machineLocalId: undefined,
				},
			],
		};

		expect(() => validateSnapshot(invalid)).toThrow("duplicate IDs");
		await db.Beans.add({ ...snapshot.beans[0], id: 7 });
		expect(await db.Beans.get(7)).toBeDefined();
	});

	it("hashes the same content independent of record order", () => {
		const reordered = {
			...snapshot,
			beans: [...snapshot.beans].reverse(),
			machines: [...snapshot.machines].reverse(),
			brews: [...snapshot.brews].reverse(),
		};
		expect(snapshotHash(snapshot)).toBe(snapshotHash(reordered));
	});
});
