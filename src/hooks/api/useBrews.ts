import { useLiveQuery } from "dexie-react-hooks";
import * as brewStatsApi from "@/lib/data";

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

export const useLatestUnratedBrew = () => {
	return useLiveQuery(() => brewStatsApi.getLatestUnratedBrew(), []) ?? null;
};

export const useLastBrewForBean = (beanId: number | undefined) => {
	return useLiveQuery(() => brewStatsApi.getLastBrewForBean(beanId), [beanId]);
};

export const useLastBrew = () => {
	return useLiveQuery(() => brewStatsApi.getLastBrew(), []) ?? null;
};

export const useBrewsForBeanId = (beanId: number | undefined) => {
	return useLiveQuery(() => brewStatsApi.getBrewsForBeanId(beanId), [beanId]);
};
