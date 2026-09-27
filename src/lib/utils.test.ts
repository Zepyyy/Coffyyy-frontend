import { describe, expect, it } from "vitest";
import {
	colorSwatch,
	formatExtractionTime,
	getColorSwatch,
	parseExtractionTime,
} from "@/lib/utils";

describe("getColorSwatch", () => {
	it("resolves known notes", () => {
		expect(getColorSwatch("Fruity")).toBe(colorSwatch.Fruity);
	});

	it("falls back for unknown note values", () => {
		expect(getColorSwatch("Unknown")).toBe(colorSwatch.default);
		expect(getColorSwatch(undefined)).toBe(colorSwatch.default);
	});
});

describe("parseExtractionTime", () => {
	it("reads plain seconds", () => {
		expect(parseExtractionTime("28")).toBe(28);
		expect(parseExtractionTime("28.5")).toBe(28.5);
	});

	it("reads the legacy 28s format", () => {
		expect(parseExtractionTime("32s")).toBe(32);
	});

	it("reads minute-second notation", () => {
		expect(parseExtractionTime("0:28")).toBe(28);
		expect(parseExtractionTime("1:02")).toBe(62);
	});

	it("returns null for empty or nonsense input", () => {
		expect(parseExtractionTime("")).toBe(null);
		expect(parseExtractionTime(undefined)).toBe(null);
		expect(parseExtractionTime("soon")).toBe(null);
	});
});

describe("formatExtractionTime", () => {
	it("formats seconds with an s suffix", () => {
		expect(formatExtractionTime("28")).toBe("28s");
		expect(formatExtractionTime(28.5)).toBe("28.5s");
	});

	it("formats a minute and up as m:ss", () => {
		expect(formatExtractionTime("62")).toBe("1:02");
	});

	it("round-trips legacy values", () => {
		expect(formatExtractionTime("32s")).toBe("32s");
	});

	it("returns null for unrated brews", () => {
		expect(formatExtractionTime(undefined)).toBe(null);
		expect(formatExtractionTime("")).toBe(null);
	});
});
