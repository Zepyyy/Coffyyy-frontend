import { describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "@/lib/api/workspace";
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

const brew = (localId: string, beanLocalId?: string, grindSize = 12) => ({
	localId,
	beanLocalId,
	beanWeight: 18,
	espressoWeight: 36,
	grindSize,
	date: "2026-07-31T00:00:00.000Z",
});

const snapshot = (
	beans: WorkspaceSnapshot["beans"],
	brews: WorkspaceSnapshot["brews"] = [],
): WorkspaceSnapshot => ({ schemaVersion: 1, beans, machines: [], brews });

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
});
