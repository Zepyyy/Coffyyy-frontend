import { useLiveQuery } from "dexie-react-hooks";
import { getRepeatSource } from "@/lib/api/repeatSource";

/**
 * The brew behind `?fromBrew=`: undefined while loading, null when it is
 * missing (or no id was given).
 */
export const useRepeatSource = (brewId: number | undefined) => {
	return useLiveQuery(() => getRepeatSource(brewId), [brewId]);
};
