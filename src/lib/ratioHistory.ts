/**
 * Where a recipe's ratio sits against the brews already logged: past ratios
 * of the method (this bean's marked), the range your 4★+ brews landed in,
 * and a one-line verdict.
 */
import { methodConfig } from "@/lib/brewMethods";
import type { Brews } from "@/types/BrewTypes";
import type { RecipeMethod } from "@/types/RecipeTypes";

export type RatioZone = { from: number; to: number; label: string };

/** The ratio scale per method: its range, nudge step and named zones. */
export const RATIO_SCALE: Record<
	RecipeMethod,
	{ min: number; max: number; step: number; zones: RatioZone[] }
> = {
	espresso: {
		min: 1,
		max: 3.5,
		step: 0.1,
		zones: [
			{ from: 1, to: 1.7, label: "Ristretto" },
			{ from: 1.7, to: 2.5, label: "Normale" },
			{ from: 2.5, to: 3.5, label: "Lungo" },
		],
	},
	"pour-over": {
		min: 12,
		max: 20,
		step: 0.1,
		zones: [
			{ from: 12, to: 14.5, label: "Strong" },
			{ from: 14.5, to: 16.5, label: "Balanced" },
			{ from: 16.5, to: 20, label: "Light" },
		],
	},
};

export type RatioPoint = {
	id: number;
	ratio: number;
	rating: number | null;
	date: Date;
	sameBean: boolean;
	grind: number | null;
};

export type SweetSpot = {
	median: number;
	lo: number;
	hi: number;
	n: number;
	/** Whether the range comes from this bean's brews or the whole method's. */
	scope: "bean" | "method";
};

export type RatioVerdict = {
	tone: "in" | "stronger" | "lighter" | "none";
	headline: string;
	detail: string;
};

/** One decimal, trailing `.0` dropped. */
export const fmtRatio = (n: number) => String(Number(n.toFixed(1)));

const median = (sorted: number[]) => {
	const m = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
};

/** Brews of `method` with both weights, oldest first. */
export function ratioHistory(
	brews: Brews[],
	method: RecipeMethod,
	beanId: number | undefined,
): RatioPoint[] {
	return brews
		.filter((b) => b.method === method && b.beanWeight && b.brewWeight)
		.map((b) => ({
			id: b.id,
			ratio: b.brewWeight / b.beanWeight,
			rating: b.overallRating ?? null,
			date: new Date(b.date),
			sameBean: beanId != null && b.beanId === beanId,
			grind: b.grindSize ?? null,
		}))
		.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * The range your 4★+ brews landed in: this bean's when it has two or more,
 * else the method's. From six brews on, the outer quarter each side is
 * dropped so one odd brew doesn't stretch it.
 */
export function sweetSpot(points: RatioPoint[]): SweetSpot | null {
	const good = (pool: RatioPoint[]) => pool.filter((p) => (p.rating ?? 0) >= 4);
	const bean = good(points.filter((p) => p.sameBean));
	const scope = bean.length >= 2 ? "bean" : "method";
	const pool = scope === "bean" ? bean : good(points);
	if (pool.length === 0) return null;
	const ratios = pool.map((p) => p.ratio).sort((a, b) => a - b);
	const cut = ratios.length >= 6 ? Math.floor(ratios.length / 4) : 0;
	return {
		median: median(ratios),
		lo: ratios[cut],
		hi: ratios[ratios.length - 1 - cut],
		n: pool.length,
		scope,
	};
}

export function zoneOf(ratio: number, method: RecipeMethod): string {
	const zones = RATIO_SCALE[method].zones;
	const found = zones.find((z) => ratio >= z.from && ratio < z.to);
	if (found) return found.label;
	return ratio < zones[0].from ? zones[0].label : zones[zones.length - 1].label;
}

export function ratioVerdict(
	ratio: number,
	spot: SweetSpot | null,
	method: RecipeMethod,
	beanName?: string,
): RatioVerdict {
	if (!spot)
		return {
			tone: "none",
			headline: zoneOf(ratio, method),
			detail: "Rate a few brews to see where your good ones land.",
		};
	const whose =
		spot.scope === "bean" && beanName
			? `Your 4★+ brews of ${beanName}`
			: `Your 4★+ ${methodConfig(method).label.toLowerCase()}s`;
	const range = `1:${fmtRatio(spot.lo)}–1:${fmtRatio(spot.hi)}`;
	const detail = `${whose} sit at ${range} (${spot.n}).`;
	if (ratio < spot.lo - 0.05)
		return {
			tone: "stronger",
			headline: `${fmtRatio(spot.lo - ratio)} stronger than usual`,
			detail,
		};
	if (ratio > spot.hi + 0.05)
		return {
			tone: "lighter",
			headline: `${fmtRatio(ratio - spot.hi)} lighter than usual`,
			detail,
		};
	return { tone: "in", headline: "In your sweet spot", detail };
}
