import type { Beans } from "@/types/BeanTypes";

/**
 * Bean-level preference, stored in the synced `status` field so it survives
 * push/pull. "New" and "" both mean the bean has no verdict yet.
 */
export type BeanVerdict = "Excellent" | "Good" | "Mid" | "Horrible";

export const VERDICT_OPTIONS: Array<{
	value: BeanVerdict;
	label: string;
	short: string;
	dot: string;
	text: string;
}> = [
	{
		value: "Excellent",
		label: "Love it",
		short: "Love",
		dot: "bg-crema-deep dark:bg-crema",
		text: "text-crema-deep dark:text-crema",
	},
	{
		value: "Good",
		label: "Good",
		short: "Good",
		dot: "bg-primary",
		text: "text-primary-700 dark:text-primary-200",
	},
	{
		value: "Mid",
		label: "Meh",
		short: "Meh",
		dot: "bg-ink-soft/60",
		text: "text-ink-soft",
	},
	{
		value: "Horrible",
		label: "Not for me",
		short: "Avoid",
		dot: "bg-destructive",
		text: "text-destructive",
	},
];

export function verdictOption(
	status: Beans["status"] | string | null | undefined,
) {
	return VERDICT_OPTIONS.find((option) => option.value === status) ?? null;
}

export function verdictRank(
	status: Beans["status"] | null | undefined,
): number {
	const index = VERDICT_OPTIONS.findIndex((option) => option.value === status);
	return index === -1 ? VERDICT_OPTIONS.length : index;
}

/** True when the bean carries an actual preference (not "New" or empty). */
export function hasVerdict(
	status: Beans["status"] | null | undefined,
): boolean {
	return verdictOption(status) != null;
}
