import { describe, expect, it } from "vitest";
import type {
	WorkspaceSnapshot,
	WorkspaceSnapshotV1,
} from "@/lib/api/workspace";
import { mergeSnapshots } from "./merge";

const bean = (localId: string, name = localId) => ({
	localId,
	name,
	rating: 0,
	status: "New" as const,
	dominantNote: "Fruity" as const,
	roastLevel: 3,
	origin: [],
	process: [],
	variety: [],
	brand: "",
	botanic: "Arabica" as const,
	designation: "Pure Origin" as const,
	flavors: [],
	finished: false,
});

const brew = (
	localId: string,
	beanLocalId?: string,
	grindSize = 12,
	recipeLocalId?: string,
): WorkspaceSnapshot["brews"][number] => ({
	localId,
	beanLocalId,
	recipeLocalId,
	method: "espresso",
	beanWeight: 18,
	brewWeight: 36,
	grindSize,
	date: "2026-07-31T00:00:00.000Z",
});

const recipe = (
	localId: string,
	beanLocalId?: string,
): WorkspaceSnapshot["recipes"][number] => ({
	localId,
	beanLocalId,
	name: localId,
	method: "espresso",
	beanWeight: 18,
	brewWeight: 36,
	createdAt: "2026-07-30T00:00:00.000Z",
});

const snapshot = (
	beans: WorkspaceSnapshot["beans"],
	brews: WorkspaceSnapshot["brews"] = [],
	recipes: WorkspaceSnapshot["recipes"] = [],
): WorkspaceSnapshot => ({
	schemaVersion: 2,
	beans,
	machines: [],
	brews,
	recipes,
});

const ids = (rows: Array<{ localId: string }>) =>
	rows.map((row) => row.localId).sort();

describe("mergeSnapshots", () => {
	const base = snapshot([bean("a"), bean("b")], [brew("x", "a")]);

	it("combines independent additions, edits and deletions", () => {
		const local = snapshot(
			[bean("a", "A local"), bean("b"), bean("c")],
			[brew("x", "a")],
		);
		const remote = snapshot([bean("a")], [brew("x", "a", 14), brew("y")]);

		const { snapshot: merged, conflicts } = mergeSnapshots(base, local, remote);

		expect(conflicts).toEqual([]);
		expect(ids(merged.beans)).toEqual(["a", "c"]);
		expect(merged.beans.find((row) => row.localId === "a")?.name).toBe(
			"A local",
		);
		expect(merged.brews.find((row) => row.localId === "x")?.grindSize).toBe(14);
		expect(ids(merged.brews)).toEqual(["x", "y"]);
	});

	it("treats identical changes on both sides as no conflict", () => {
		const changed = snapshot([bean("a", "same"), bean("b")], [brew("x", "a")]);
		expect(mergeSnapshots(base, changed, changed).conflicts).toEqual([]);
	});

	it("reports entities changed differently on both sides", () => {
		const local = snapshot([bean("a", "local"), bean("b")], [brew("x", "a")]);
		const remote = snapshot([bean("a", "remote")], [brew("x", "a")]);

		expect(mergeSnapshots(base, local, remote).conflicts).toEqual([
			{ collection: "beans", localId: "a" },
		]);
	});

	it("reports an edit against a deletion", () => {
		const local = snapshot([bean("a"), bean("b", "edited")], [brew("x", "a")]);
		const remote = snapshot([bean("a")], [brew("x", "a")]);

		expect(mergeSnapshots(base, local, remote).conflicts).toEqual([
			{ collection: "beans", localId: "b" },
		]);
	});

	it("keeps a bean deleted remotely when a new local brew uses it", () => {
		const local = snapshot(
			[bean("a"), bean("b")],
			[brew("x", "a"), brew("z", "b")],
		);
		const remote = snapshot([bean("a")], [brew("x", "a")]);

		const { snapshot: merged, conflicts } = mergeSnapshots(base, local, remote);

		expect(conflicts).toEqual([]);
		expect(ids(merged.beans)).toEqual(["a", "b"]);
		expect(ids(merged.brews)).toEqual(["x", "z"]);
	});

	it("merges recipes and keeps ones a new brew follows", () => {
		const recipeBase = snapshot(
			[bean("a"), bean("b")],
			[],
			[recipe("r1"), recipe("r2", "b")],
		);
		// Local logs a brew following r2; remote deleted r2 and its bean b.
		const local = snapshot(
			[bean("a"), bean("b")],
			[brew("z", "a", 12, "r2")],
			[recipe("r1"), recipe("r2", "b")],
		);
		const remote = snapshot([bean("a")], [], [recipe("r1", "a")]);

		const { snapshot: merged, conflicts } = mergeSnapshots(
			recipeBase,
			local,
			remote,
		);

		expect(conflicts).toEqual([]);
		expect(merged.schemaVersion).toBe(2);
		expect(ids(merged.recipes)).toEqual(["r1", "r2"]);
		expect(merged.recipes.find((r) => r.localId === "r1")?.beanLocalId).toBe(
			"a",
		);
		// r2 survives for brew z, and keeps the bean it is tied to.
		expect(ids(merged.beans)).toEqual(["a", "b"]);
	});

	it("reports recipes changed differently on both sides", () => {
		const recipeBase = snapshot([], [], [recipe("r1")]);
		const local = snapshot([], [], [{ ...recipe("r1"), name: "local" }]);
		const remote = snapshot([], [], [{ ...recipe("r1"), name: "remote" }]);
		expect(mergeSnapshots(recipeBase, local, remote).conflicts).toEqual([
			{ collection: "recipes", localId: "r1" },
		]);
	});

	it("merges against a stored v1 base snapshot", () => {
		const v1Base: WorkspaceSnapshotV1 = {
			schemaVersion: 1,
			beans: [bean("a")],
			machines: [
				{
					localId: "m",
					name: "V60",
					brand: "Hario",
					type: "Pour over",
					purchaseDate: "",
					model: "",
					grindRange: "",
					capacity: "",
				},
			],
			brews: [
				{
					localId: "x",
					beanLocalId: "a",
					machineLocalId: "m",
					beanWeight: 15,
					espressoWeight: 250,
					grindSize: 20,
					date: "2026-07-31T00:00:00.000Z",
				},
			],
		};
		const upgraded: WorkspaceSnapshot = {
			schemaVersion: 2,
			beans: [bean("a")],
			machines: [
				{
					localId: "m",
					name: "V60",
					brand: "Hario",
					method: "pour-over",
					purchaseDate: "",
					model: "",
					grindRange: "",
					capacity: "",
				},
			],
			brews: [
				{
					localId: "x",
					beanLocalId: "a",
					machineLocalId: "m",
					method: "pour-over",
					beanWeight: 15,
					brewWeight: 250,
					grindSize: 20,
					date: "2026-07-31T00:00:00.000Z",
				},
			],
			recipes: [],
		};
		const local = { ...upgraded, beans: [bean("a", "local edit")] };
		const remote = {
			...upgraded,
			brews: [
				{ ...upgraded.brews[0], grindSize: 21 },
				{ ...brew("y"), method: "pour-over" as const },
			],
		};

		const { snapshot: merged, conflicts } = mergeSnapshots(
			v1Base,
			local,
			remote,
		);

		// Local brew x equals the upgraded base, so the remote edit wins
		// instead of a false conflict against the v1 row.
		expect(conflicts).toEqual([]);
		expect(merged.beans[0].name).toBe("local edit");
		expect(merged.brews.find((row) => row.localId === "x")?.grindSize).toBe(21);
		expect(ids(merged.brews)).toEqual(["x", "y"]);
		expect(merged.machines[0].method).toBe("pour-over");
	});
});
