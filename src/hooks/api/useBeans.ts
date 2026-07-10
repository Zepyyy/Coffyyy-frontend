import { useLiveQuery } from "dexie-react-hooks";
import * as beanStatsApi from "@/lib/api/beans";

export const useBean = (beanId: number | undefined) => {
	return (
		useLiveQuery(() => beanStatsApi.getBean(beanId), [beanId]) ?? undefined
	);
};
export const useAllBeans = () => {
	return useLiveQuery(() => beanStatsApi.getAllBeans(), []) ?? [];
};

export const useAllBeanNames = () => {
	return useLiveQuery(() => beanStatsApi.getAllBeanNames(), []) ?? [];
};

export const useBeanFilters = () => {
	return useLiveQuery(() => beanStatsApi.getBeanFilters(), []) ?? [];
};

export const useBeanCount = () => {
	return useLiveQuery(() => beanStatsApi.getBeanCount(), []) ?? 0;
};

export const useBeanDominantNote = (beanId: number | undefined) => {
	return (
		useLiveQuery(() => beanStatsApi.getBeanDominantNote(beanId), []) ??
		undefined
	);
};
export const useBeanSuggestions = () => {
	return (
		useLiveQuery(() => beanStatsApi.getBeanSuggestions(), []) ?? {
			botanics: [""],
			designations: [""],
			dominantNotes: [""],
			brands: [""],
			origins: [""],
			processes: [""],
			flavors: [""],
			varieties: [""],
		}
	);
};
