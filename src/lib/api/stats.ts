import { db } from "@/db/db";
import type {
	Brews,
	BeanBrewInsights,
	BeanBrewParameterSummary,
} from "@/types/BrewTypes";

const TOP_RATED_THRESHOLD = 4;

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

	const durationMatch = value.match(/^(\d+):([0-5]\d)$/);
	if (durationMatch) {
		const seconds = Number(durationMatch[1]) * 60 + Number(durationMatch[2]);
		return Number.isFinite(seconds) ? seconds : null;
	}

	const match = value.match(/-?\d+(\.\d+)?/);
	if (!match) {
		return null;
	}

	const parsed = Number(match[0]);
	return Number.isFinite(parsed) ? parsed : null;
}

function formatDurationAverage(value: number | null): string | null {
	if (value == null) return null;
	const rounded = Math.max(0, Math.round(value));
	return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
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
	const espressoBrews = brews.filter((brew) => brew.method === "Espresso");
	const mokaBrews = brews.filter((brew) => brew.method === "Moka Pot");
	const averageBeanWeight = average(
		brews.map((brew) => brew.beanWeight ?? null),
	);
	const averageEspressoBeanWeight = average(
		espressoBrews.map((brew) => brew.beanWeight ?? null),
	);
	const averageEspressoWeight = average(
		espressoBrews.map((brew) => brew.espressoWeight ?? null),
	);
	const averageYieldWeight = average(
		mokaBrews.map((brew) => brew.yieldWeight ?? null),
	);
	const averageWaterAmount = average(
		mokaBrews.map((brew) => brew.waterAmount ?? null),
	);
	const averageExtractionSeconds = average(
		espressoBrews.map((brew) => toNumericValue(brew.extractionTime)),
	);
	const averageBrewSeconds = average(
		mokaBrews.map((brew) => toNumericValue(brew.brewTime)),
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
		averageEspressoBeanWeight && averageEspressoWeight
			? averageEspressoWeight / averageEspressoBeanWeight
			: null;

	return {
		grindSize:
			formatAverage(averageGrindNumeric, { decimals: 1 }) ??
			mostCommon(
				brews
					.map((brew) => brew.grindSize?.toString())
					.filter((v): v is string => Boolean(v)),
			) ??
			"—",
		beanWeight: averageBeanWeight,
		espressoWeight: averageEspressoWeight,
		yieldWeight: averageYieldWeight,
		waterAmount: averageWaterAmount,
		brewTime: formatDurationAverage(averageBrewSeconds),
		heatLevel: (mostCommon(mokaBrews.map((brew) => brew.heatLevel)) ?? null) as
			| "Low"
			| "Medium"
			| "High"
			| null,
		extractionTime: formatDurationAverage(averageExtractionSeconds),
		_flow: mostCommon(brews.map((brew) => brew.flow)) ?? "—",
		ratio: averageRatio,
		_tasteScore: averageTasteScore,
		_strengthScore: averageStrengthScore,
		_rating: averageRating,
		_basedOnCount: brews.length,
		usesTopRatedBrews,
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
		methods: Array.from(new Set(brews.map((brew) => brew.method ?? "Unknown"))),
		target: bestTarget ?? averageTarget,
		average: averageTarget,
		best: bestTarget,
		_lastBrew,
		recentBrewScores,
	};
}

export async function getBrewCountForBeanId(
	beanId: number | undefined,
): Promise<number> {
	if (!beanId) return 0;
	return db.Brews.filter((b) => b.beanId === beanId).count();
}
