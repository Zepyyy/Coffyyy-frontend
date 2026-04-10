import { db } from "@/db/db";
import type {
	BeanBrewInsights,
	BeanDialInState,
	Brews,
} from "@/types/BrewTypes";

const TOP_RATED_THRESHOLD = 4;
const MIN_BREWS_FOR_DIALED_IN = 3;
const MAX_GRIND_SPREAD = 1;
const EXTRACTION_DELTA_SECONDS = 2;
const DEFAULT_TARGET_EXTRACTION = 30;

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

function formatTasteLabel(score: number | null): string {
	if (score == null) return "—";
	if (Math.abs(score) < 0.5) return "Balanced";
	return score < 0
		? `Sour ${Number(score.toFixed(1))}`
		: `Bitter +${Number(score.toFixed(1))}`;
}

function formatStrengthLabel(score: number | null): string {
	if (score == null) return "—";
	if (Math.abs(score) < 0.5) return "Balanced";
	return score < 0
		? `Weak ${Number(score.toFixed(1))}`
		: `Strong +${Number(score.toFixed(1))}`;
}

function buildDialInState(beanId: number, brews: Brews[]): BeanDialInState {
	const topRatedBrews = brews.filter(
		(brew) => (brew.overallRating ?? 0) >= TOP_RATED_THRESHOLD,
	);
	const recentTopRatedBrews = topRatedBrews.slice(0, 3);
	const numericGrinds = recentTopRatedBrews
		.map((brew) => toNumericValue(brew.grindSize))
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

	console.log(numericGrinds);
	console.log(stableTextGrind);
	console.log(stableGrind);

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

function buildAdjustments(
	lastBrew: Brews | null,
	targetExtractionSeconds: number | null,
): Array<{ title: string; detail: string }> {
	if (!lastBrew) {
		return [];
	}

	const adjustments: Array<{ title: string; detail: string }> = [];
	const lastExtractionSeconds = toNumericValue(lastBrew.extractionTime);
	const extractionBaseline =
		targetExtractionSeconds ?? DEFAULT_TARGET_EXTRACTION;

	if (lastBrew.tasteScore != null) {
		if (
			lastBrew.tasteScore < 0 &&
			(lastExtractionSeconds == null ||
				lastExtractionSeconds <= extractionBaseline - EXTRACTION_DELTA_SECONDS)
		) {
			adjustments.push({
				title: "Grind finer",
				detail:
					lastExtractionSeconds != null
						? `Last brew ran sour and short at ${Math.round(lastExtractionSeconds)}s.`
						: "Last brew leaned sour.",
			});
		} else if (
			lastBrew.tasteScore > 0 &&
			(lastExtractionSeconds == null ||
				lastExtractionSeconds >= extractionBaseline + EXTRACTION_DELTA_SECONDS)
		) {
			adjustments.push({
				title: "Grind coarser",
				detail:
					lastExtractionSeconds != null
						? `Last brew ran bitter and long at ${Math.round(lastExtractionSeconds)}s.`
						: "Last brew leaned bitter.",
			});
		}
	}

	if (lastBrew.strengthScore != null) {
		if (lastBrew.strengthScore < 0) {
			adjustments.push({
				title: "Increase dose or decrease yield",
				detail: "Last brew read weak on the new strength axis.",
			});
		} else if (lastBrew.strengthScore > 0) {
			adjustments.push({
				title: "Decrease dose or increase yield",
				detail: "Last brew read strong on the new strength axis.",
			});
		}
	}

	if (
		adjustments.length === 0 &&
		lastBrew.tasteScore === 0 &&
		lastBrew.strengthScore === 0
	) {
		adjustments.push({
			title: "Hold steady",
			detail: "Last brew landed balanced on taste and strength.",
		});
	}

	return adjustments.slice(0, 2);
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
	const sourceBrews = topRatedBrews.length > 0 ? topRatedBrews : brews;
	const averageBeanWeight = average(
		sourceBrews.map((brew) => brew.beanWeight ?? null),
	);
	const averageEspressoWeight = average(
		sourceBrews.map((brew) => brew.espressoWeight ?? null),
	);
	const averageExtractionSeconds = average(
		sourceBrews.map((brew) => toNumericValue(brew.extractionTime)),
	);
	const averageTasteScore = average(
		sourceBrews.map((brew) => brew.tasteScore ?? null),
	);
	const averageStrengthScore = average(
		sourceBrews.map((brew) => brew.strengthScore ?? null),
	);
	const averageGrindNumeric = average(
		sourceBrews.map((brew) => toNumericValue(brew.grindSize)),
	);
	const averageRatio =
		averageBeanWeight && averageEspressoWeight
			? averageEspressoWeight / averageBeanWeight
			: null;

	const dialIn = buildDialInState(beanId, brews);
	const lastBrew = brews[0] ?? null;
	const adjustments = buildAdjustments(lastBrew, averageExtractionSeconds);

	return {
		beanId,
		target: {
			grindSize:
				formatAverage(averageGrindNumeric, { decimals: 1 }) ??
				mostCommon(sourceBrews.map((brew) => brew.grindSize)) ??
				"—",
			beanWeight: averageBeanWeight,
			espressoWeight: averageEspressoWeight,
			extractionTime: formatAverage(averageExtractionSeconds, {
				suffix: "s",
				decimals: 0,
			}),
			flow: mostCommon(sourceBrews.map((brew) => brew.flow)) ?? "—",
			ratio: averageRatio,
			tasteScore: averageTasteScore,
			strengthScore: averageStrengthScore,
			basedOnCount: sourceBrews.length,
			usesTopRatedBrews: topRatedBrews.length > 0,
		},
		lastBrew,
		adjustments,
		dialIn,
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

export { formatStrengthLabel, formatTasteLabel };
