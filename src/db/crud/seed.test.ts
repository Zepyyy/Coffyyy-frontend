import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { readLocalSnapshot, validateSnapshot } from "@/lib/api/workspace";
import { resetDatabaseWithSeed } from "./seed";

describe("seed data", () => {
	it("seeds every method, a pour-over recipe and a valid snapshot", async () => {
		await resetDatabaseWithSeed({ beans: 3, machines: 3, brews: 48 });
		const snapshot = await readLocalSnapshot();

		expect(() => validateSnapshot(snapshot)).not.toThrow();
		expect(new Set(snapshot.machines.map((m) => m.method))).toEqual(
			new Set(["espresso", "pour-over", "moka"]),
		);
		expect(new Set(snapshot.brews.map((b) => b.method))).toEqual(
			new Set(["espresso", "pour-over", "moka"]),
		);
		expect(snapshot.recipes).toHaveLength(1);
		expect(snapshot.recipes[0].method).toBe("pour-over");
		expect(snapshot.brews.some((b) => b.recipeLocalId)).toBe(true);
	});
});
