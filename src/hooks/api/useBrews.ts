import { useLiveQuery } from "dexie-react-hooks";
import * as brewStatsApi from "@/lib/data";
import type { BrewMethod } from "@/types/BrewTypes";

export const useRecentBrews = (limit: number) => {
	return useLiveQuery(() => brewStatsApi.getRecentBrews(limit), [limit]) ?? [];
};

export const useHistoryBrews = (search: string, minRating: number | null) => {
	return useLiveQuery(
		() => brewStatsApi.getBrewsForHistoryView(search, minRating),
		[search, minRating],
	);
};

export const useHistoryStats = () => {
	return useLiveQuery(() => brewStatsApi.getHistorySidebarStats(), []);
};

export const useBrewSuggestions = () => {
	return (
		useLiveQuery(() => brewStatsApi.getBrewSuggestions(), []) ?? {
			bean: [],
			machine: [],
		}
	);
};

export const useLatestUnratedBrew = (excludedIds: readonly number[] = []) => {
	return (
		useLiveQuery(
			() => brewStatsApi.getLatestUnratedBrew(excludedIds),
			[excludedIds.join(",")],
		) ?? null
	);
};

/**
 * Setup brew for one bean and method, tagged with the `beanId:method` key it
 * answers so callers can ignore a stale result. Undefined while loading.
 */
export const useBrewSetupHistory = (
	beanId: number | undefined,
	method: BrewMethod | undefined,
) => {
	return useLiveQuery(
		async () => ({
			key: `${beanId}:${method}`,
			brew:
				method === "pour-over"
					? await brewStatsApi.getPourOverSetupBrew(beanId)
					: method
						? await brewStatsApi.getLastBrewForBean(beanId, method)
						: null,
		}),
		[beanId, method],
	);
};

/** Where the brew log form starts from its deep-link params. Undefined while loading. */
export const useBrewFormStart = (entry: brewStatsApi.BrewEntry) => {
	const { beanParam, recipeParam, methodParam, brewerParam, preferredBrewers } =
		entry;
	const key = `${beanParam}|${recipeParam}|${methodParam}|${brewerParam}`;
	const result = useLiveQuery(
		async () => ({
			key,
			start: await brewStatsApi.getBrewFormStart(entry),
		}),
		[beanParam, recipeParam, methodParam, brewerParam, preferredBrewers],
	);
	return result?.key === key ? result.start : undefined;
};

export const useLastBrew = () => {
	return useLiveQuery(() => brewStatsApi.getLastBrew(), []) ?? null;
};

export const useBrewsForBeanId = (beanId: number | undefined) => {
	return useLiveQuery(() => brewStatsApi.getBrewsForBeanId(beanId), [beanId]);
};

export const useGrindSettingsForBean = (
	beanId: number | undefined,
	method: BrewMethod | undefined,
) => {
	return (
		useLiveQuery(
			() =>
				method ? brewStatsApi.getGrindSettingsForBean(beanId, method) : [],
			[beanId, method],
		) ?? []
	);
};
