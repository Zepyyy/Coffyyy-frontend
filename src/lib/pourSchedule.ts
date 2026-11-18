export type Pour = {
	atSeconds: number;
	/** Cumulative fraction of the planned water. */
	fraction: number;
};

export const V60_STARTER_POURS: readonly Pour[] = [
	{ atSeconds: 0, fraction: 0.25 },
	{ atSeconds: 45, fraction: 0.5 },
	{ atSeconds: 75, fraction: 0.75 },
	{ atSeconds: 105, fraction: 1 },
];

export function pourScheduleError(
	pours: readonly Pour[] | undefined,
	method: string,
): string | undefined {
	if (pours === undefined) return undefined;
	if (method !== "pour-over") return "Pour schedules require a V60 recipe.";
	if (!Array.isArray(pours) || pours.length === 0)
		return "Add at least one pour.";
	if (pours[0]?.atSeconds !== 0) return "The first pour must start at 0:00.";

	let previousTime = -1;
	let previousFraction = 0;
	for (const pour of pours) {
		if (
			!pour ||
			!Number.isSafeInteger(pour.atSeconds) ||
			pour.atSeconds <= previousTime
		)
			return "Enter nonnegative cue times in increasing order.";
		if (
			!Number.isFinite(pour.fraction) ||
			pour.fraction <= previousFraction ||
			pour.fraction > 1
		)
			return "Cumulative targets must increase and stay within 100%.";
		previousTime = pour.atSeconds;
		previousFraction = pour.fraction;
	}

	if (previousFraction !== 1) return "The last pour must reach 100%.";
}

export function scaledPours(pours: readonly Pour[], water: number) {
	return pours.map(({ atSeconds, fraction }) => ({
		atSeconds,
		grams:
			fraction === 1 ? water : Math.min(water, Math.round(fraction * water)),
	}));
}

export function clockTime(seconds: number) {
	return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}
