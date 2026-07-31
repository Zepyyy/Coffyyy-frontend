import { useLiveQuery } from "dexie-react-hooks";
import { getDatabaseCounts } from "@/lib/data";

export const useDatabaseCounts = () => {
	return (
		useLiveQuery(() => getDatabaseCounts(), []) ?? {
			beans: 0,
			machines: 0,
			brews: 0,
		}
	);
};
