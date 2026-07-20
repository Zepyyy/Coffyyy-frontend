import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as data from "@/lib/data";

function useMode() { return useAuth().status === "synced" ? "synced" : "local"; }
export const useBrewCountForBean = (bean: string | undefined) => { const mode = useMode(); const query = useQuery({ queryKey: ["brew-count", mode, bean], queryFn: () => data.getBrewCountForBean(bean) }); return query.data ?? 0; };
export const useBeanBrewInsights = (id: number | undefined) => { const mode = useMode(); const query = useQuery({ queryKey: ["bean-insights", mode, id], queryFn: () => data.getBeanBrewInsights(id), enabled: id != null }); return query.data; };
export const useBrewCountForBeanId = (id: number | undefined) => { const mode = useMode(); const query = useQuery({ queryKey: ["brew-count-id", mode, id], queryFn: () => data.getBrewCountForBeanId(id), enabled: id != null }); return query.data ?? 0; };
export const useBeanDialInStates = (ids: number[]) => { const mode = useMode(); const query = useQuery({ queryKey: ["dial-in", mode, ids.join(",")], queryFn: () => data.getBeanDialInStates(ids) }); return query.data ?? []; };
