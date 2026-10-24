import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { saveEnrollment } from "@/db/sync/enrollment";
import { exportLocalSnapshot, importLocalSnapshot } from "./backup";

describe("local snapshot backup", () => {
	beforeEach(async () => {
		await db.open();
		await Promise.all([
			db.Beans.clear(),
			db.Machines.clear(),
			db.Brews.clear(),
			db.Recipes.clear(),
			db.Enrollment.clear(),
		]);
	});

	it("exports workspace data without enrollment credentials", async () => {
		await db.Beans.add({
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
		});
		await saveEnrollment({
			workspaceId: 42,
			syncCode: "secret-code",
			paused: false,
			cloudVersion: 1,
			lastSyncedHash: "hash",
		});

		const exported = await exportLocalSnapshot();
		expect(exported).toContain("bean-1");
		expect(exported).not.toContain("secret-code");
	});

	it("rejects invalid import without replacing local data", async () => {
		await db.Beans.add({
			localId: "bean-1",
			name: "Existing",
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
		});

		await expect(
			importLocalSnapshot(
				JSON.stringify({
					schemaVersion: 1,
					beans: [],
					machines: [],
					brews: [{ localId: "brew-1", beanLocalId: "missing" }],
				}),
			),
		).rejects.toThrow("invalid relationships");
		expect((await db.Beans.toArray())[0].name).toBe("Existing");
	});

	it("imports an old v1 backup file, upgrading it", async () => {
		await importLocalSnapshot(
			JSON.stringify({
				schemaVersion: 1,
				beans: [],
				machines: [
					{
						localId: "machine-1",
						name: "Moka",
						brand: "Bialetti",
						type: "Moka pot",
						purchaseDate: "",
						model: "",
						grindRange: "",
						capacity: "",
					},
				],
				brews: [
					{
						localId: "brew-1",
						machineLocalId: "machine-1",
						beanWeight: 15,
						espressoWeight: 100,
						grindSize: 9,
						date: "2026-07-31T00:00:00.000Z",
					},
				],
			}),
		);

		expect((await db.Machines.toArray())[0]).toMatchObject({ method: "moka" });
		expect((await db.Machines.toArray())[0]).not.toHaveProperty("type");
		const [brew] = await db.Brews.toArray();
		expect(brew).toMatchObject({ method: "moka", brewWeight: 100 });
		expect(brew).not.toHaveProperty("espressoWeight");
		expect(JSON.parse(await exportLocalSnapshot()).schemaVersion).toBe(2);
	});
});
