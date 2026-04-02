import { useLiveQuery } from "dexie-react-hooks";
import * as brewStatsApi from "../../lib/api/brews";

export const useGetRecentBrews = (limit: number) => {
	return useLiveQuery(() => brewStatsApi.getRecentBrews(limit), [limit]) ?? [];
};

export const useGetBrewSuggestions = () => {
	return (
		useLiveQuery(() => brewStatsApi.getBrewSuggestions(), []) ?? {
			bean: [],
			beanWeight: [],
			espressoWeight: [],
			extractionTime: [],
			flow: [],
			grindSize: [],
			machine: [],
			overallRating: [],
		}
	);
};
