import { db } from "@/db/db";
import { BREW_METHODS, methodConfig } from "@/lib/brewMethods";
import { formatExtractionTime, parseExtractionTime } from "@/lib/utils";
import type {
	BeanBrewInsights,
	BeanBrewParameterSummary,
	BeanDialInState,
	BrewHeat,
	BrewMethod,
	Brews,
} from "@/types/BrewTypes";

const TOP_RATED_THRESHOLD = 4;
const MIN_BREWS_FOR_DIALED_IN = 3;
const MAX_GRIND_SPREAD = 1;

function sortByNewest(a: Brews, b: Brews) {
	return +new Date(b.date) - +new Date(a.date);
}

/** A brew's method; legacy rows without one read as espresso. */
function brewMethod(brew: Pick<Brews, "method">): BrewMethod {
	return methodConfig(brew.method).method;
}

function average(values: Array<number | null>): number | null {
	const numericValues = values.filter(
		(value): value is number => value != null && Number.isFinite(value),
	);
	if (numericValues.length === 0) {
		return null;
	}

	return (
		numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
	);
}

function formatAverage(value: number | null, decimals = 1): string | null {
	if (value == null) {
		return null;
	}
	return String(Number(value.toFixed(decimals)));
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

/** Brew methods present in `brews`, in the fixed BREW_METHODS order. */
export function methodsInBrews(
	brews: Array<Pick<Brews, "method">>,
): BrewMethod[] {
	const present = new Set(brews.map(brewMethod));
	return BREW_METHODS.filter((method) => present.has(method));
}

/**
 * A bean's default method: the method of its most recent brew. Null when
 * there are no brews.
 */
export function defaultMethodForBrews(
	brews: Array<Pick<Brews, "method" | "date">>,
): BrewMethod | null {
	let newest: Pick<Brews, "method" | "date"> | null = null;
	for (const brew of brews) {
		if (!newest || +new Date(brew.date) > +new Date(newest.date)) {
			newest = brew;
		}
	}
	return newest ? brewMethod(newest) : null;
}

export function buildParameterSummary(
	brews: Brews[],
	method: BrewMethod,
	usesTopRatedBrews: boolean,
): BeanBrewParameterSummary {
	const config = methodConfig(method);
	const averageBeanWeight = average(
		brews.map((brew) => brew.beanWeight ?? null),
	);
	const averageBrewWeight = average(
		brews.map((brew) => brew.brewWeight ?? null),
	);
	const averageExtractionSeconds = average(
		brews.map((brew) => parseExtractionTime(brew.extractionTime)),
	);
	const averageGrindNumeric = average(
		brews.map((brew) => brew.grindSize ?? null),
	);
	const averageRatio =
		averageBeanWeight && averageBrewWeight
			? averageBrewWeight / averageBeanWeight
			: null;

	return {
		method,
		grindSize: formatAverage(averageGrindNumeric) ?? "—",
		beanWeight: averageBeanWeight,
		brewWeight: averageBrewWeight,
		extractionTime:
			averageExtractionSeconds == null
				? null
				: formatExtractionTime(Math.round(averageExtractionSeconds)),
		_flow: config.flow
			? (mostCommon(brews.map((brew) => brew.flow)) ?? "—")
			: null,
		waterTemp: config.waterTemp
			? average(brews.map((brew) => brew.waterTemp ?? null))
			: null,
		heat: config.heat
			? (mostCommon(brews.map((brew) => brew.heat)) as BrewHeat | null)
			: null,
		ratio: averageRatio,
		_tasteScore: average(brews.map((brew) => brew.tasteScore ?? null)),
		_strengthScore: average(brews.map((brew) => brew.strengthScore ?? null)),
		_rating: average(brews.map((brew) => brew.overallRating ?? null)),
		_basedOnCount: brews.length,
		usesTopRatedBrews,
	};
}

/** `brews` must be one method's brews, newest first. */
function buildDialInState(
	beanId: number,
	method: BrewMethod,
	brews: Brews[],
): BeanDialInState {
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
		method,
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

/**
 * Insights for one bean from its brews (any method, any order). Only brews of
 * `method` count; when `method` is omitted or the bean has no brews of it,
 * the bean's default method (most recent brew) is used. Null with no brews.
 */
export function buildBeanBrewInsights(
	beanId: number,
	allBrews: Brews[],
	method?: BrewMethod,
): BeanBrewInsights | null {
	const methods = methodsInBrews(allBrews);
	const chosen =
		method && methods.includes(method)
			? method
			: defaultMethodForBrews(allBrews);
	if (!chosen) return null;

	const brews = allBrews
		.filter((brew) => brewMethod(brew) === chosen)
		.sort(sortByNewest);

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
	const averageTarget = buildParameterSummary(brews, chosen, false);
	const bestTarget =
		bestSourceBrews.length > 0
			? buildParameterSummary(bestSourceBrews, chosen, topRatedBrews.length > 0)
			: null;

	const recentBrewScores = [...brews].reverse().map((brew) => ({
		taste: brew.tasteScore ?? null,
		strength: brew.strengthScore ?? null,
		rating: brew.overallRating ?? null,
		grindSize: brew.grindSize ?? null,
		date: brew.date,
	}));

	return {
		beanId,
		method: chosen,
		methods,
		target: bestTarget ?? averageTarget,
		average: averageTarget,
		best: bestTarget,
		_lastBrew: brews[0] ?? null,
		_dialIn: buildDialInState(beanId, chosen, brews),
		recentBrewScores,
	};
}

/**
 * Dial-in state for one bean, judged on its most recent method only.
 * Null with no brews.
 */
export function buildBeanDialInState(
	beanId: number,
	allBrews: Brews[],
): BeanDialInState | null {
	const method = defaultMethodForBrews(allBrews);
	if (!method) return null;
	return buildDialInState(
		beanId,
		method,
		allBrews.filter((brew) => brewMethod(brew) === method).sort(sortByNewest),
	);
}

export async function getBrewCountForBean(bean: string): Promise<number> {
	if (!bean) return 0;
	return db.Brews.filter((brew) => String(brew.beanId) === bean).count();
}

export async function getUniqueBeansBrewedCount(): Promise<number> {
	const beans = await db.Brews.toArray();
	return new Set(beans.map((brew) => brew.beanId).filter(Boolean)).size;
}

/**
 * Insights for `(beanId, method)`. Omit `method` (or pass one the bean has
 * no brews in) to get the bean's default method: that of its latest brew.
 */
export async function getBeanBrewInsights(
	beanId: number | undefined,
	method?: BrewMethod,
): Promise<BeanBrewInsights | null> {
	if (!beanId) return null;
	const brews = await db.Brews.where("beanId").equals(beanId).toArray();
	return buildBeanBrewInsights(beanId, brews, method);
}

/** Methods a bean has brews in (BREW_METHODS order), for method switchers. */
export async function getBeanMethods(
	beanId: number | undefined,
): Promise<BrewMethod[]> {
	if (!beanId) return [];
	return methodsInBrews(
		await db.Brews.where("beanId").equals(beanId).toArray(),
	);
}

/** Methods with at least one brew anywhere (BREW_METHODS order). */
export async function getBrewMethodsInUse(): Promise<BrewMethod[]> {
	return methodsInBrews(await db.Brews.toArray());
}

export async function getBrewCountForBeanId(
	beanId: number | undefined,
	method?: BrewMethod,
): Promise<number> {
	if (!beanId) return 0;
	return db.Brews.filter(
		(b) => b.beanId === beanId && (!method || brewMethod(b) === method),
	).count();
}

/** Dial-in badge state per bean, each judged on the bean's most recent method. */
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
		.map(([beanId, beanBrews]) => buildBeanDialInState(beanId, beanBrews))
		.filter((state): state is BeanDialInState => state != null)
		.sort((a, b) => a.beanId - b.beanId);
}
