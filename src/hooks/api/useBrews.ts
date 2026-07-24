import { useLiveQuery } from "dexie-react-hooks";
import type { HistorySortMode } from "../../lib/api/brews";
import * as brewStatsApi from "@/lib/data";

export const useRecentBrews = (limit: number) => {
	return useLiveQuery(() => brewStatsApi.getRecentBrews(limit), [limit]) ?? [];
};

export const useHistoryBrews = (
	sort: HistorySortMode,
	search: string,
	minRating: number | null,
) => {
	return useLiveQuery(
		() => brewStatsApi.getBrewsForHistoryView(sort, search, minRating),
		[sort, search, minRating],
	);
};

export const useHistoryStats = () => {
	return useLiveQuery(() => brewStatsApi.getHistorySidebarStats(), []);
};

export const useBrewSuggestions = (includeDeleted = false) => {
	return (
		useLiveQuery(
			() => brewStatsApi.getBrewSuggestions(includeDeleted),
			[includeDeleted],
		) ?? {
			bean: [],
			machine: [],
		}
	);
};

export const useLatestUnratedBrew = () => {
	return useLiveQuery(() => brewStatsApi.getLatestUnratedBrew(), []) ?? null;
};

export const useBrewsForBeanId = (beanId: number | undefined) => {
	return useLiveQuery(() => brewStatsApi.getBrewsForBeanId(beanId), [beanId]);
};
