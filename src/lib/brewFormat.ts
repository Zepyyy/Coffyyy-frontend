import { formatExtractionTime } from "@/lib/utils";
import type { Brews } from "@/types/BrewTypes";

export function tasteLabel(value: number | undefined | null): string | null {
	if (value == null) return null;
	if (value === 0) return "Balanced";
	return value < 0 ? `Sour ${value}` : `Bitter +${value}`;
}

export function strengthLabel(value: number | undefined | null): string | null {
	if (value == null) return null;
	if (value === 0) return "Balanced";
	return value < 0 ? `Weak ${value}` : `Strong +${value}`;
}

export function scoreClass(value: number | undefined | null): string {
	if (value == null) return "text-muted-foreground";
	if (value === 0) return "text-primary";
	return value < 0 ? "text-tag-teal-500" : "text-tag-orange-500";
}

/** One-line recipe, e.g. "grind 12 · 18g → 36g · 1:2 · 28s · even". */
export function recipeLine(brew: Brews): string {
	const ratio =
		brew.beanWeight && brew.espressoWeight
			? `1:${(brew.espressoWeight / brew.beanWeight).toFixed(1)}`
			: null;
	const time = formatExtractionTime(brew.extractionTime);
	return [
		brew.grindSize != null ? `grind ${brew.grindSize}` : null,
		brew.beanWeight != null
			? `${brew.beanWeight}g → ${brew.espressoWeight ?? "?"}g`
			: null,
		ratio,
		time,
		brew.flow ? brew.flow.toLowerCase() : null,
	]
		.filter(Boolean)
		.join(" · ");
}
