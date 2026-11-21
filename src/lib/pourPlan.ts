/**
 * A pour plan as you brew it: "pour this much, then wait this long". Converts
 * to and from the stored Pour[] (cumulative fraction + cue time), so the
 * schema is unchanged. The last pour is always "the rest" of the water, its
 * wait is the drawdown, and the sum of waits is the recipe's total time.
 */
import type { Pour } from "@/lib/pourSchedule";

export type PourStep = {
	/** Grams poured in this step. The last step is "the rest". */
	grams: number;
	/** Seconds from this pour's start to the next (last step: drawdown). */
	wait: number;
};

export type PlanKind = "classic" | "two" | "four-six" | "single";

export const PLAN_KINDS: { kind: PlanKind; label: string; hint: string }[] = [
	{ kind: "classic", label: "Bloom + 3", hint: "Even, forgiving" },
	{ kind: "two", label: "Bloom + 2", hint: "Fewer, bigger pours" },
	{ kind: "four-six", label: "4:6", hint: "Five 20% pours" },
	{ kind: "single", label: "Bloom + 1", hint: "One long pour" },
];

const DEFAULT_DRAWDOWN = 60;
const MIN_POUR = 5;

const round5 = (n: number) => Math.max(MIN_POUR, Math.round(n / 5) * 5);

export function autoPlan(
	kind: PlanKind,
	dose: number,
	water: number,
): PourStep[] {
	const bloom = Math.min(round5(dose * 2.5), Math.round(water * 0.3));
	const split = (n: number, waits: number[]): PourStep[] => {
		const rest = water - bloom;
		const each = round5(rest / n);
		const steps: PourStep[] = [{ grams: bloom, wait: 45 }];
		for (let i = 0; i < n; i++) steps.push({ grams: each, wait: waits[i] });
		return withRest(steps, water);
	};
	switch (kind) {
		case "classic":
			return split(3, [30, 30, 75]);
		case "two":
			return split(2, [45, 90]);
		case "single":
			return split(1, [105]);
		case "four-six": {
			const each = Math.round(water / 5);
			return withRest(
				[45, 45, 45, 45, 30].map((wait) => ({ grams: each, wait })),
				water,
			);
		}
	}
}

/** Forces the last step to hold whatever water is left. */
export function withRest(steps: PourStep[], water: number): PourStep[] {
	if (steps.length === 0) return steps;
	const head = steps.slice(0, -1);
	const used = head.reduce((sum, s) => sum + s.grams, 0);
	const last = steps[steps.length - 1];
	return [...head, { ...last, grams: Math.max(0, water - used) }];
}

export function stepsFromPours(
	pours: readonly Pour[] | undefined,
	water: number,
	totalSeconds: number | null,
): PourStep[] {
	if (!pours?.length) return [];
	const steps = pours.map((pour, i) => {
		const prev = i === 0 ? 0 : pours[i - 1].fraction;
		const next = pours[i + 1];
		return {
			grams: Math.round((pour.fraction - prev) * water),
			wait: next ? next.atSeconds - pour.atSeconds : DEFAULT_DRAWDOWN,
		};
	});
	const lastAt = pours[pours.length - 1].atSeconds;
	if (totalSeconds != null && totalSeconds > lastAt)
		steps[steps.length - 1].wait = totalSeconds - lastAt;
	return withRest(steps, water);
}

export function poursFromSteps(steps: PourStep[], water: number): Pour[] {
	let at = 0;
	let cumulative = 0;
	return steps.map((step, i) => {
		const pour = {
			atSeconds: at,
			fraction:
				i === steps.length - 1
					? 1
					: Number(((cumulative + step.grams) / water).toFixed(4)),
		};
		at += step.wait;
		cumulative += step.grams;
		return pour;
	});
}

export const totalSeconds = (steps: PourStep[]) =>
	steps.reduce((sum, s) => sum + s.wait, 0);

/** Starts of each pour, in seconds. */
export const cueTimes = (steps: PourStep[]) => {
	let at = 0;
	return steps.map((s) => {
		const cue = at;
		at += s.wait;
		return cue;
	});
};

/** Change one non-last pour's grams; the last pour absorbs the difference. */
export function nudgeGrams(
	steps: PourStep[],
	index: number,
	delta: number,
	water: number,
): PourStep[] {
	if (index >= steps.length - 1) return steps;
	const restNow = steps[steps.length - 1].grams;
	const next = Math.max(MIN_POUR, steps[index].grams + delta);
	const applied = Math.min(next - steps[index].grams, restNow - MIN_POUR);
	if (applied === 0) return steps;
	return withRest(
		steps.map((s, i) => (i === index ? { ...s, grams: s.grams + applied } : s)),
		water,
	);
}

export function nudgeWait(
	steps: PourStep[],
	index: number,
	delta: number,
): PourStep[] {
	return steps.map((s, i) =>
		i === index
			? { ...s, wait: Math.max(10, Math.min(300, s.wait + delta)) }
			: s,
	);
}

/** Splits the biggest non-bloom pour in two. */
export function addStep(steps: PourStep[], water: number): PourStep[] {
	if (steps.length === 0) return autoPlan("single", water / 15, water);
	let biggest = steps.length - 1;
	for (let i = 1; i < steps.length; i++)
		if (steps[i].grams > steps[biggest].grams) biggest = i;
	const s = steps[biggest];
	const half = round5(s.grams / 2);
	const copy = [...steps];
	copy.splice(
		biggest,
		1,
		{ grams: half, wait: Math.max(20, Math.round(s.wait / 2)) },
		{
			grams: s.grams - half,
			wait: Math.max(20, s.wait - Math.round(s.wait / 2)),
		},
	);
	return withRest(copy, water);
}

/** Folds a pour into the one before it (or after, for the bloom). */
export function removeStep(steps: PourStep[], index: number, water: number) {
	if (steps.length <= 1) return steps;
	const copy = steps.map((s) => ({ ...s }));
	const [gone] = copy.splice(index, 1);
	const into = index === 0 ? 0 : index - 1;
	copy[into].grams += gone.grams;
	copy[into].wait += gone.wait;
	return withRest(copy, water);
}

export function clock(seconds: number) {
	const s = Math.max(0, Math.round(seconds));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Water in the cone before and after each pour. */
export const cumulative = (steps: PourStep[]) =>
	steps.reduce<{ before: number; after: number }[]>((acc, s) => {
		const before = acc.length ? acc[acc.length - 1].after : 0;
		acc.push({ before, after: before + s.grams });
		return acc;
	}, []);
