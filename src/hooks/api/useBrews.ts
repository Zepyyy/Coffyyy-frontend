import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as data from "@/lib/data";
import type { HistorySortMode } from "@/lib/api/brews";
import type { Brews } from "@/types/BrewTypes";
import { queryKeys } from "./queryKeys";

function useMode() { return useAuth().status === "synced" ? "synced" : "local"; }
export const useRecentBrews = (limit: number) => { const mode = useMode(); const query = useQuery({ queryKey: ["recent-brews", mode, limit], queryFn: () => data.getRecentBrews(limit) }); return query.data ?? []; };
export const useHistoryBrews = (sort: HistorySortMode, search: string, minRating: number | null) => { const mode = useMode(); const query = useQuery({ queryKey: ["history-brews", mode, sort, search, minRating], queryFn: () => data.getBrewsForHistoryView(sort, search, minRating) }); return query.data; };
export const useHistoryStats = () => { const mode = useMode(); const query = useQuery({ queryKey: ["history-stats", mode], queryFn: data.getHistorySidebarStats }); return query.data; };
export const useBrewSuggestions = () => { const mode = useMode(); const query = useQuery({ queryKey: queryKeys.brewSuggestions(mode), queryFn: data.getBrewSuggestions }); return query.data ?? { bean: [], machine: [] }; };
export const useLatestUnratedBrew = () => { const mode = useMode(); const query = useQuery({ queryKey: ["latest-unrated-brew", mode], queryFn: data.getLatestUnratedBrew }); return query.data ?? null; };
export const useBrewsForBeanId = (id: number | undefined) => { const mode = useMode(); const query = useQuery({ queryKey: ["brews-for-bean", mode, id], queryFn: () => data.getBrewsForBeanId(id), enabled: id != null }); return query.data; };

export function useCreateBrew() { const queryClient = useQueryClient(); return useMutation({ mutationFn: data.createBrew, onSuccess: () => queryClient.invalidateQueries() }); }
export function useUpdateBrew() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, brew }: { id: number; brew: Partial<Brews> }) => data.updateBrew(id, brew), onSuccess: () => queryClient.invalidateQueries() }); }
export function useDeleteBrew() { const queryClient = useQueryClient(); return useMutation({ mutationFn: data.deleteBrew, onSuccess: () => queryClient.invalidateQueries() }); }
