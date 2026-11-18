import { describe, expect, it } from "vitest";
import {
	pourScheduleError,
	scaledPours,
	V60_STARTER_POURS,
} from "./pourSchedule";

describe("V60 pour schedules", () => {
	it("scales cumulative targets and ends at exactly the planned water", () => {
		expect(scaledPours(V60_STARTER_POURS, 300)).toEqual([
			{ atSeconds: 0, grams: 75 },
			{ atSeconds: 45, grams: 150 },
			{ atSeconds: 75, grams: 225 },
			{ atSeconds: 105, grams: 300 },
		]);
		expect(
			scaledPours(V60_STARTER_POURS, 243.5).map((pour) => pour.grams),
		).toEqual([61, 122, 183, 243.5]);
	});

	it("allows flat recipes and validates staged schedules", () => {
		expect(pourScheduleError(undefined, "pour-over")).toBeUndefined();
		expect(pourScheduleError(V60_STARTER_POURS, "pour-over")).toBeUndefined();
		expect(pourScheduleError(V60_STARTER_POURS, "espresso")).toBeDefined();
		expect(pourScheduleError([], "pour-over")).toBeDefined();
		expect(
			pourScheduleError(V60_STARTER_POURS.slice(0, -1), "pour-over"),
		).toBeDefined();
		expect(
			pourScheduleError([{ atSeconds: 45, fraction: 1 }], "pour-over"),
		).toBeDefined();
		expect(
			pourScheduleError(
				[
					{ atSeconds: 0, fraction: 0.5 },
					{ atSeconds: 45, fraction: 0.25 },
					{ atSeconds: 75, fraction: 1 },
				],
				"pour-over",
			),
		).toBeDefined();
		expect(
			pourScheduleError(
				[
					{ atSeconds: 0, fraction: 0.25 },
					{ atSeconds: 45, fraction: 0.5 },
					{ atSeconds: 30, fraction: 1 },
				],
				"pour-over",
			),
		).toBeDefined();
	});
});
