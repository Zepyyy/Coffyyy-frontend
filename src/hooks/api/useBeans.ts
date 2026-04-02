import { useLiveQuery } from "dexie-react-hooks";
import * as beanStatsApi from "@/lib/api/beans";

export const useGetAllBeans = () => {
	return useLiveQuery(() => beanStatsApi.getAllBeans(), []) ?? [];
};

export const useGetBeanFilters = () => {
	return useLiveQuery(() => beanStatsApi.getBeanFilters(), []) ?? [];
};

export const useGetBeanDisplays = () => {
	return useLiveQuery(() => beanStatsApi.getBeanDisplays(), []) ?? [];
};

export const useGetBeanCount = () => {
	return useLiveQuery(() => beanStatsApi.getBeanCount(), []) ?? 0;
};

export const useGetBeanSuggestions = () => {
	return (
		useLiveQuery(() => beanStatsApi.getBeanSuggestions(), []) ?? {
			botanics: [""],
			designations: [""],
			dominantNotes: [""],
			brands: [""],
			flavors: [""],
			origins: [""],
			processes: [""],
			tastingNotes: [""],
			varieties: [""],
		}
	);
};
