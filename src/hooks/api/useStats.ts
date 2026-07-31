import { useLiveQuery } from "dexie-react-hooks";
import * as statsApi from "@/lib/data";

export const useBrewCountForBean = (bean: string | undefined) => {
	return (
		useLiveQuery(() => statsApi.getBrewCountForBean(bean ?? ""), [bean]) ?? 0
	);
};

export const useBeanBrewInsights = (beanId: number | undefined) => {
	return useLiveQuery(() => statsApi.getBeanBrewInsights(beanId), [beanId]);
};

export const useBrewCountForBeanId = (beanId: number | undefined) => {
	return (
		useLiveQuery(() => statsApi.getBrewCountForBeanId(beanId), [beanId]) ?? 0
	);
};

export const useBeanDialInStates = (beanIds: number[]) => {
	return (
		useLiveQuery(
			() => statsApi.getBeanDialInStates(beanIds),
			[beanIds.join(",")],
		) ?? []
	);
};
