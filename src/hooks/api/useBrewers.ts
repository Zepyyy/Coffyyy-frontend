import { useLiveQuery } from "dexie-react-hooks";
import * as brewerStatsApi from "../../lib/api/brewers";

export const useAllBrewers = () => {
	return useLiveQuery(() => brewerStatsApi.getAllBrewers(), []) ?? [];
};

export const useBrewerFilters = () => {
	return useLiveQuery(() => brewerStatsApi.getBrewerFilters(), []) ?? [];
};

export const useBrewerCount = () => {
	return useLiveQuery(() => brewerStatsApi.getBrewerCount(), []) ?? 0;
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
