import { useLiveQuery } from "dexie-react-hooks";
import * as brewerStatsApi from "../../lib/api/brewers";

export const useAllBrewers = (includeArchived = false) => {
	return (
		useLiveQuery(
			() => brewerStatsApi.getAllBrewers(includeArchived),
			[includeArchived],
		) ?? []
	);
};

export const useBrewer = (brewerId: number | undefined) => {
	return useLiveQuery(() => brewerStatsApi.getBrewer(brewerId), [brewerId]);
};

export const useBrewerFilters = () => {
	return useLiveQuery(() => brewerStatsApi.getBrewerFilters(), []) ?? [];
};

export const useBrewerCount = () => {
	return useLiveQuery(() => brewerStatsApi.getBrewerCount(), []) ?? 0;
};

export const useBrewerUsage = () => {
	return useLiveQuery(() => brewerStatsApi.getBrewerUsage(), []) ?? new Map();
};

export const useBrewerSuggestions = () => {
	return (
		useLiveQuery(() => brewerStatsApi.getBrewerSuggestions(), []) ?? {
			names: [""],
			brands: [""],
			models: [""],
			types: [""],
			grindRanges: [""],
			capacities: [""],
		}
	);
};
