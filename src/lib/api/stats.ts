import { db } from "@/db/db";
import type {
	BeanBrewParameterSummary,
	BeanBrewInsights,
	BeanDialInState,
	Brews,
} from "@/types/BrewTypes";

const TOP_RATED_THRESHOLD = 4;
const MIN_BREWS_FOR_DIALED_IN = 3;
const MAX_GRIND_SPREAD = 1;

function sortByNewest(a: Brews, b: Brews) {
	return +new Date(b.date) - +new Date(a.date);
}

function toNumericValue(
	value: number | string | undefined | null,
): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value !== "string") {
		return null;
	}

	const match = value.match(/-?\d+(\.\d+)?/);
	if (!match) {
		return null;
	}

	const parsed = Number(match[0]);
	return Number.isFinite(parsed) ? parsed : null;
}

function average(values: Array<number | null>): number | null {
	const numericValues = values.filter(
		(value): value is number => value != null,
	);
	if (numericValues.length === 0) {
		return null;
	}

	return (
		numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
	);
}

function formatAverage(
	value: number | null,
	options?: {
		suffix?: string;
		decimals?: number;
	},
): string | null {
	if (value == null) {
		return null;
	}

	const decimals = options?.decimals ?? 1;
	const rounded = Number(value.toFixed(decimals));
	return `${rounded}${options?.suffix ?? ""}`;
}

function mostCommon(values: Array<string | undefined | null>): string | null {
	const counts = new Map<string, { count: number; lastIndex: number }>();

	values.forEach((value, index) => {
		if (!value) return;
		const current = counts.get(value);
		counts.set(value, {
			count: (current?.count ?? 0) + 1,
			lastIndex: index,
		});
	});

	let winner: string | null = null;
	let topCount = 0;
	let latestIndex = -1;

	for (const [value, entry] of counts) {
		if (
			entry.count > topCount ||
			(entry.count === topCount && entry.lastIndex > latestIndex)
		) {
			winner = value;
			topCount = entry.count;
			latestIndex = entry.lastIndex;
		}
	}

	return winner;
}

function buildParameterSummary(
	brews: Brews[],
	usesTopRatedBrews: boolean,
): BeanBrewParameterSummary {
	const averageBeanWeight = average(
		brews.map((brew) => brew.beanWeight ?? null),
	);
	const averageEspressoWeight = average(
		brews.map((brew) => brew.espressoWeight ?? null),
	);
	const averageExtractionSeconds = average(
		brews.map((brew) => toNumericValue(brew.extractionTime)),
	);
	const averageTasteScore = average(
		brews.map((brew) => brew.tasteScore ?? null),
	);
	const averageStrengthScore = average(
		brews.map((brew) => brew.strengthScore ?? null),
	);
	const averageRating = average(
		brews.map((brew) => brew.overallRating ?? null),
	);
	const averageGrindNumeric = average(
		brews.map((brew) => brew.grindSize ?? null),
	);
	const averageRatio =
		averageBeanWeight && averageEspressoWeight
			? averageEspressoWeight / averageBeanWeight
			: null;

	return {
		grindSize:
			formatAverage(averageGrindNumeric, { decimals: 1 }) ??
			mostCommon(brews.map((brew) => brew.grindSize.toString())) ??
			"—",
		beanWeight: averageBeanWeight,
		espressoWeight: averageEspressoWeight,
		extractionTime: formatAverage(averageExtractionSeconds, {
			suffix: "s",
			decimals: 0,
		}),
		_flow: mostCommon(brews.map((brew) => brew.flow)) ?? "—",
		ratio: averageRatio,
		_tasteScore: averageTasteScore,
		_strengthScore: averageStrengthScore,
		_rating: averageRating,
		_basedOnCount: brews.length,
		usesTopRatedBrews,
	};
}

function buildDialInState(beanId: number, brews: Brews[]): BeanDialInState {
	const topRatedBrews = brews.filter(
		(brew) => (brew.overallRating ?? 0) >= TOP_RATED_THRESHOLD,
	);
	const recentTopRatedBrews = topRatedBrews.slice(0, 3);
	const numericGrinds = recentTopRatedBrews
		.map((brew) => brew.grindSize)
		.filter((value): value is number => value != null);

	const stableNumericGrind =
		numericGrinds.length >= 2 &&
		Math.max(...numericGrinds) - Math.min(...numericGrinds) <= MAX_GRIND_SPREAD;
	const stableTextGrind =
		numericGrinds.length === 0 &&
		recentTopRatedBrews.length >= 2 &&
		new Set(recentTopRatedBrews.map((brew) => brew.grindSize)).size === 1;
	const stableGrind = stableNumericGrind || stableTextGrind;
	const lastRating = brews[0]?.overallRating ?? null;

	return {
		beanId,
		isDialedIn:
			brews.length >= MIN_BREWS_FOR_DIALED_IN &&
			recentTopRatedBrews.length >= 2 &&
			stableGrind &&
			(lastRating ?? 0) >= TOP_RATED_THRESHOLD,
		totalBrews: brews.length,
		topRatedBrews: topRatedBrews.length,
		lastRating,
		stableGrind,
	};
}

export async function getBrewCountForBean(bean: string): Promise<number> {
	if (!bean) return 0;
	return db.Brews.where("bean").equals(bean).count();
}

export async function getUniqueBeansBrewedCount(): Promise<number> {
	const beans = await db.Brews.orderBy("bean").uniqueKeys();
	return beans.filter(Boolean).length;
}

export async function getBeanBrewInsights(
	beanId: number | undefined,
): Promise<BeanBrewInsights | null> {
	if (!beanId) return null;

	const brews = (
		await db.Brews.filter((brew) => brew.beanId === beanId).toArray()
	).sort(sortByNewest);

	if (brews.length === 0) {
		return null;
	}

	const topRatedBrews = brews.filter(
		(brew) => (brew.overallRating ?? 0) >= TOP_RATED_THRESHOLD,
	);
	const ratedBrews = brews.filter((brew) => brew.overallRating != null);
	const highestRating =
		ratedBrews.length > 0
			? Math.max(...ratedBrews.map((brew) => brew.overallRating ?? 0))
			: null;
	const highestRatedBrews =
		highestRating == null
			? []
			: ratedBrews.filter((brew) => brew.overallRating === highestRating);
	const bestSourceBrews =
		topRatedBrews.length > 0 ? topRatedBrews : highestRatedBrews;
	const averageTarget = buildParameterSummary(brews, false);
	const bestTarget =
		bestSourceBrews.length > 0
			? buildParameterSummary(bestSourceBrews, topRatedBrews.length > 0)
			: null;

	const _dialIn = buildDialInState(beanId, brews);
	const _lastBrew = brews[0] ?? null;

	const recentBrewScores = [...brews].reverse().map((brew) => ({
		taste: brew.tasteScore ?? null,
		strength: brew.strengthScore ?? null,
		rating: brew.overallRating ?? null,
		grindSize: brew.grindSize ?? null,
		date: brew.date,
	}));

	return {
		beanId,
		target: bestTarget ?? averageTarget,
		average: averageTarget,
		best: bestTarget,
		_lastBrew,
		_dialIn,
		recentBrewScores,
	};
}

export async function getBrewCountForBeanId(
	beanId: number | undefined,
): Promise<number> {
	if (!beanId) return 0;
	return db.Brews.filter((b) => b.beanId === beanId).count();
}

export async function getBeanDialInStates(
	beanIds?: number[],
): Promise<BeanDialInState[]> {
	const brews = await db.Brews.toArray();
	const relevantIds = new Set(
		beanIds?.filter((beanId): beanId is number => typeof beanId === "number") ??
			[],
	);
	const brewsByBean = new Map<number, Brews[]>();

	for (const brew of brews) {
		if (brew.beanId == null) continue;
		if (relevantIds.size > 0 && !relevantIds.has(brew.beanId)) continue;

		const existing = brewsByBean.get(brew.beanId) ?? [];
		existing.push(brew);
		brewsByBean.set(brew.beanId, existing);
	}

	return [...brewsByBean.entries()]
		.map(([beanId, beanBrews]) =>
			buildDialInState(beanId, beanBrews.sort(sortByNewest)),
		)
		.sort((a, b) => a.beanId - b.beanId);
}
