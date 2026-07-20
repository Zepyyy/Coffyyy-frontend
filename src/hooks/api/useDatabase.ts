import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getDatabaseCounts } from "@/lib/data";
import { queryKeys } from "./queryKeys";

export const useDatabaseCounts = () => {
	const mode = useAuth().status === "synced" ? "synced" : "local";
	const query = useQuery({ queryKey: queryKeys.database(mode), queryFn: getDatabaseCounts });
	return query.data ?? { beans: 0, machines: 0, brews: 0 };
};
