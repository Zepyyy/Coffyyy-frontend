import { useLiveQuery } from "dexie-react-hooks";
import { getRepeatSource } from "@/lib/api/repeatSource";

/** Ignore a prior query's result while a new in-place navigation loads. */
export const useRepeatSource = (brewId: number | undefined) => {
	const result = useLiveQuery(
		async () => ({
			brewId,
			source: await getRepeatSource(brewId),
		}),
		[brewId],
	);
	if (brewId == null) return null;
	return result?.brewId === brewId ? result.source : undefined;
};
