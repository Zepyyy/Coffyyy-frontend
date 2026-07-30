import type { Brews, BrewMethod } from "@/types/BrewTypes";

export type BrewerUsage = {
	lastUsed: string;
	brewCount: number;
	methods: Array<BrewMethod | "Unknown">;
};

/** Derive the usage signals shown on Brewer cards and detail pages. */
export function summarizeBrewerUsage(
	brews: readonly Brews[],
): Map<number, BrewerUsage> {
	const usage = new Map<number, BrewerUsage>();
	const ordered = [...brews].sort(
		(a, b) => +new Date(b.date) - +new Date(a.date),
	);

	for (const brew of ordered) {
		if (brew.brewerId == null) continue;
		const current = usage.get(brew.brewerId);
		const method = brew.method ?? "Unknown";
		usage.set(brew.brewerId, {
			lastUsed: current?.lastUsed ?? new Date(brew.date).toISOString(),
			brewCount: (current?.brewCount ?? 0) + 1,
			methods: current?.methods.includes(method)
				? current.methods
				: [...(current?.methods ?? []), method],
		});
	}

	return usage;
}
