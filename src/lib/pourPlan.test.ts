import { describe, expect, it } from "vitest";
import {
	addStep,
	autoPlan,
	cueTimes,
	nudgeGrams,
	nudgeWait,
	poursFromSteps,
	removeStep,
	stepsFromPours,
	totalSeconds,
} from "./pourPlan";
import { pourScheduleError } from "./pourSchedule";

const sum = (xs: { grams: number }[]) => xs.reduce((s, x) => s + x.grams, 0);

describe("pour plans", () => {
	it("generates a plan from dose and water that pours exactly the water", () => {
		for (const kind of ["classic", "two", "four-six", "single"] as const) {
			const steps = autoPlan(kind, 15, 250);
			expect(sum(steps)).toBe(250);
			expect(
				pourScheduleError(poursFromSteps(steps, 250), "pour-over"),
			).toBeUndefined();
		}
	});

	it("blooms with about 2.5× the dose, then splits the rest evenly", () => {
		const steps = autoPlan("classic", 15, 250);
		expect(steps.map((s) => s.grams)).toEqual([40, 70, 70, 70]);
		expect(steps.map((s) => s.wait)).toEqual([45, 30, 30, 75]);
		expect(totalSeconds(steps)).toBe(180);
		expect(cueTimes(steps)).toEqual([0, 45, 75, 105]);
	});

	it("round-trips through the stored cumulative schedule", () => {
		const steps = autoPlan("classic", 15, 250);
		const pours = poursFromSteps(steps, 250);
		expect(pours.at(-1)).toEqual({ atSeconds: 105, fraction: 1 });
		expect(stepsFromPours(pours, 250, 180)).toEqual(steps);
	});

	it("takes the drawdown from the recipe's total time", () => {
		const pours = poursFromSteps(autoPlan("classic", 15, 250), 250);
		expect(stepsFromPours(pours, 250, 200).at(-1)?.wait).toBe(95);
		expect(stepsFromPours(pours, 250, null).at(-1)?.wait).toBe(60);
	});

	it("keeps the water fixed: the last pour absorbs a nudge", () => {
		const steps = autoPlan("classic", 15, 250);
		const more = nudgeGrams(steps, 0, 10, 250);
		expect(more[0].grams).toBe(50);
		expect(more.at(-1)?.grams).toBe(60);
		expect(sum(more)).toBe(250);
		// The last pour is "the rest": nudging it does nothing.
		expect(nudgeGrams(steps, 3, 10, 250)).toBe(steps);
	});

	it("never lets a pour or the rest drop below 5 g", () => {
		const steps = autoPlan("classic", 15, 250);
		expect(nudgeGrams(steps, 1, -500, 250)[1].grams).toBe(5);
		const greedy = nudgeGrams(steps, 1, 500, 250);
		expect(greedy.at(-1)?.grams).toBe(5);
		expect(sum(greedy)).toBe(250);
	});

	it("bounds waits between 10 s and 5 min", () => {
		const steps = autoPlan("classic", 15, 250);
		expect(nudgeWait(steps, 0, -100)[0].wait).toBe(10);
		expect(nudgeWait(steps, 0, 1000)[0].wait).toBe(300);
	});

	it("splits the biggest later pour and merges a removed one back", () => {
		const steps = autoPlan("two", 15, 250);
		const split = addStep(steps, 250);
		expect(split).toHaveLength(4);
		expect(sum(split)).toBe(250);
		const merged = removeStep(split, 1, 250);
		expect(merged).toHaveLength(3);
		expect(sum(merged)).toBe(250);
		expect(totalSeconds(merged)).toBe(totalSeconds(split));
	});
});
