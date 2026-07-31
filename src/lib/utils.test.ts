import { describe, expect, it } from "vitest";
import { colorSwatch, getColorSwatch } from "@/lib/utils";

describe("getColorSwatch", () => {
	it("resolves known notes", () => {
		expect(getColorSwatch("Fruity")).toBe(colorSwatch.Fruity);
	});

	it("falls back for unknown note values", () => {
		expect(getColorSwatch("Unknown")).toBe(colorSwatch.default);
		expect(getColorSwatch(undefined)).toBe(colorSwatch.default);
	});
});
