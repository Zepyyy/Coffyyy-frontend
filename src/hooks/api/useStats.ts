import { useLiveQuery } from "dexie-react-hooks";
import * as statsApi from "@/lib/api/stats";

export const useBrewCountForBean = (bean: string | undefined) => {
	return (
		useLiveQuery(() => statsApi.getBrewCountForBean(bean ?? ""), [bean]) ?? 0
	);
};

export const useBestBrewForBean = (beanId: number | undefined) => {
	return useLiveQuery(() => statsApi.getBestBrewForBean(beanId), [beanId]);
};

export const useBrewCountForBeanId = (beanId: number | undefined) => {
	return (
		useLiveQuery(() => statsApi.getBrewCountForBeanId(beanId), [beanId]) ?? 0
	);
};
