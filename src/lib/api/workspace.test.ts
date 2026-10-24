import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import {
	readLocalSnapshot,
	replaceLocalSnapshot,
	snapshotHash,
	validateSnapshot,
	upgradeSnapshot,
	type WorkspaceSnapshot,
	type WorkspaceSnapshotV1,
} from "./workspace";

const snapshot: WorkspaceSnapshot = {
	schemaVersion: 2,
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
			method: "espresso",
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
			method: "espresso",
			beanWeight: 18,
			brewWeight: 36,
			extractionTime: "30s",
			flow: "Perfect",
			overallRating: 4,
			tasteScore: 1,
			strengthScore: 0,
			grindSize: 12,
			date: "2026-07-31T00:00:00.000Z",
		},
	],
	recipes: [],
};

const withRecipe: WorkspaceSnapshot = {
	...snapshot,
	machines: [
		...snapshot.machines,
		{ ...snapshot.machines[0], localId: "v60", method: "pour-over" },
	],
	brews: [
		...snapshot.brews,
		{
			localId: "brew-2",
			beanLocalId: "bean-1",
			machineLocalId: "v60",
			recipeLocalId: "recipe-1",
			method: "pour-over",
			beanWeight: 15,
			brewWeight: 250,
			grindSize: 20,
			waterTemp: 93,
			notes: "bloom 45s",
			date: "2026-08-01T00:00:00.000Z",
		},
	],
	recipes: [
		{
			localId: "recipe-1",
			name: "Morning V60",
			method: "pour-over",
			beanLocalId: "bean-1",
			beanWeight: 15,
			brewWeight: 240,
			waterTemp: 93,
			createdAt: "2026-07-30T00:00:00.000Z",
		},
	],
};

const v1: WorkspaceSnapshotV1 = {
	schemaVersion: 1,
	beans: snapshot.beans,
	machines: [
		{ ...snapshot.machines[0], localId: "m-espresso", type: "Espresso" },
		{ ...snapshot.machines[0], localId: "m-v60", type: "Hario Pour Over" },
		{ ...snapshot.machines[0], localId: "m-moka", type: "MOKA pot" },
		{ ...snapshot.machines[0], localId: "m-other", type: "Lever" },
	],
	brews: [
		{
			localId: "b-v60",
			beanLocalId: "bean-1",
			machineLocalId: "m-v60",
			beanWeight: 15,
			espressoWeight: 250,
			grindSize: 20,
			date: "2026-07-31T00:00:00.000Z",
		},
		{
			localId: "b-none",
			beanWeight: 18,
			espressoWeight: 36,
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
			db.Recipes.clear(),
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

	it("hashes the same content independent of key order", () => {
		const reordered = {
			...snapshot,
			beans: snapshot.beans.map(
				(bean) =>
					Object.fromEntries(
						Object.entries(bean).reverse(),
					) as (typeof snapshot.beans)[number],
			),
		};
		expect(snapshotHash(snapshot)).toBe(snapshotHash(reordered));
	});

	it("reads only contract fields and normalizes legacy enum values", async () => {
		await db.Beans.add({
			...snapshot.beans[0],
			id: 1,
			botanic: "?",
			designation: "Pure origin",
			serverRevision: 4,
		} as never);

		const [bean] = (await readLocalSnapshot()).beans;

		expect(bean).not.toHaveProperty("serverRevision");
		expect(bean.botanic).toBe("");
		expect(bean.designation).toBe("Pure Origin");
	});

	it("preserves an edit made while an automatic pull was in flight", async () => {
		await replaceLocalSnapshot(snapshot);
		const expectedHash = snapshotHash(await readLocalSnapshot());
		await db.Beans.toCollection().modify({ name: "Edited during sync" });
		const applied = await replaceLocalSnapshot(snapshot, expectedHash);
		expect(applied).toBe(false);
		expect((await readLocalSnapshot()).beans[0].name).toBe(
			"Edited during sync",
		);
	});

	it("applies an automatic pull when its local snapshot is still current", async () => {
		await replaceLocalSnapshot(snapshot);
		const expectedHash = snapshotHash(await readLocalSnapshot());
		const next = {
			...snapshot,
			beans: snapshot.beans.map((bean) => ({ ...bean, name: "Cloud edit" })),
		};
		expect(await replaceLocalSnapshot(next, expectedHash)).toBe(true);
		expect((await readLocalSnapshot()).beans[0].name).toBe("Cloud edit");
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

	it("round-trips recipes and remaps brew and recipe relationships", async () => {
		await replaceLocalSnapshot(withRecipe);

		const [recipe] = await db.Recipes.toArray();
		const bean = await db.Beans.get({ localId: "bean-1" });
		const brew = await db.Brews.get({ localId: "brew-2" });
		expect(recipe.beanId).toBe(bean?.id);
		expect(recipe.createdAt).toBeInstanceOf(Date);
		expect(brew?.recipeId).toBe(recipe.id);
		expect(brew).not.toHaveProperty("recipeLocalId");
		expect(snapshotHash(await readLocalSnapshot())).toBe(
			snapshotHash(withRecipe),
		);
	});

	it("rejects moka recipes, dangling recipe links and method mismatches", () => {
		const recipe = withRecipe.recipes[0];
		expect(() =>
			validateSnapshot({
				...withRecipe,
				recipes: [{ ...recipe, method: "moka" as never }],
			}),
		).toThrow("invalid methods");
		expect(() =>
			validateSnapshot({
				...withRecipe,
				recipes: [{ ...recipe, beanLocalId: "missing" }],
			}),
		).toThrow("invalid relationships");
		expect(() => validateSnapshot({ ...withRecipe, recipes: [] })).toThrow(
			"invalid relationships",
		);
		expect(() =>
			validateSnapshot({
				...withRecipe,
				recipes: [{ ...recipe, method: "espresso" }],
			}),
		).toThrow("differs from its recipe");
		expect(() =>
			validateSnapshot({ ...snapshot, schemaVersion: 1 } as never),
		).toThrow("invalid");
	});

	it("upgrades v1 snapshots non-destructively", () => {
		const upgraded = upgradeSnapshot(v1);
		validateSnapshot(upgraded);
		expect(upgraded.schemaVersion).toBe(2);
		expect(upgraded.recipes).toEqual([]);
		expect(upgraded.machines.map((m) => m.method)).toEqual([
			"espresso",
			"pour-over",
			"moka",
			"espresso",
		]);
		expect(upgraded.machines[0]).not.toHaveProperty("type");
		expect(upgraded.brews[0]).toMatchObject({
			method: "pour-over",
			brewWeight: 250,
		});
		expect(upgraded.brews[0]).not.toHaveProperty("espressoWeight");
		expect(upgraded.brews[1]).toMatchObject({
			method: "espresso",
			brewWeight: 36,
		});
		expect(upgradeSnapshot(snapshot)).toBe(snapshot);
	});

	it("replaces local data from a v1 snapshot", async () => {
		await replaceLocalSnapshot(v1);
		const brew = await db.Brews.get({ localId: "b-v60" });
		expect(brew).toMatchObject({ method: "pour-over", brewWeight: 250 });
		expect((await readLocalSnapshot()).schemaVersion).toBe(2);
	});
});
