import type { Brews, BrewMethod } from "@/types/BrewTypes";

export type BeanUsage = {
	lastUsed: string;
	lastMethod: BrewMethod | "Unknown";
	brewCount: number;
};

/** Derive the compact usage signals shown on Bean collection cards. */
export function summarizeBeanUsage(
	brews: readonly Brews[],
): Map<number, BeanUsage> {
	const usage = new Map<number, BeanUsage>();
	const ordered = [...brews].sort(
		(a, b) => +new Date(b.date) - +new Date(a.date),
	);

	for (const brew of ordered) {
		if (brew.beanId == null) continue;
		const current = usage.get(brew.beanId);
		usage.set(brew.beanId, {
			lastUsed: current?.lastUsed ?? new Date(brew.date).toISOString(),
			lastMethod: current?.lastMethod ?? brew.method ?? "Unknown",
			brewCount: (current?.brewCount ?? 0) + 1,
		});
	}

	return usage;
}
