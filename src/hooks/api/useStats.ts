import { useLiveQuery } from "dexie-react-hooks";
import * as statsApi from "@/lib/api/stats";

export const useUniqueBeansBrewedCount = () => {
	return useLiveQuery(() => statsApi.getUniqueBeansBrewedCount(), []) ?? 0;
};

export const useBrewCountForBean = (bean: string | undefined) => {
	return (
		useLiveQuery(() => statsApi.getBrewCountForBean(bean ?? ""), [bean]) ?? 0
	);
};

export const useBestGrindSize = () => {
	return useLiveQuery(() => statsApi.getBestGrindSize(), []) ?? null;
};
