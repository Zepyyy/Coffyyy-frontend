import { useLiveQuery } from "dexie-react-hooks";
import * as statsApi from "@/lib/api/stats";
import type { BrewMethod } from "@/types/BrewTypes";

export const useBrewCountForBean = (bean: string | undefined) => {
	return (
		useLiveQuery(() => statsApi.getBrewCountForBean(bean ?? ""), [bean]) ?? 0
	);
};

/**
 * Insights for `(beanId, method)`. Without a method (or one the bean has no
 * brews in) the bean's most recent method is used; read `insights.method`.
 */
export const useBeanBrewInsights = (
	beanId: number | undefined,
	method?: BrewMethod,
) => {
	return useLiveQuery(
		() => statsApi.getBeanBrewInsights(beanId, method),
		[beanId, method],
	);
};

/** Methods the bean has brews in; drives the method switcher. */
export const useBeanMethods = (beanId: number | undefined) => {
	return useLiveQuery(() => statsApi.getBeanMethods(beanId), [beanId]) ?? [];
};

/** Methods with at least one brew in the whole journal. */
export const useBrewMethodsInUse = () => {
	return useLiveQuery(() => statsApi.getBrewMethodsInUse(), []) ?? [];
};

export const useBrewCountForBeanId = (
	beanId: number | undefined,
	method?: BrewMethod,
) => {
	return (
		useLiveQuery(
			() => statsApi.getBrewCountForBeanId(beanId, method),
			[beanId, method],
		) ?? 0
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
