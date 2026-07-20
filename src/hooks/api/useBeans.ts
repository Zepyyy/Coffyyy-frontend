import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as data from "@/lib/data";
import type { Beans } from "@/types/BeanTypes";
import { queryKeys } from "./queryKeys";

function useMode() { return useAuth().status === "synced" ? "synced" : "local"; }

export const useBean = (id: number | undefined) => {
	const mode = useMode();
	const query = useQuery({ queryKey: queryKeys.bean(mode, id), queryFn: () => data.getBean(id), enabled: id != null });
	return query.data;
};
export const useAllBeans = () => {
	const mode = useMode();
	const query = useQuery({ queryKey: queryKeys.beans(mode), queryFn: data.getAllBeans });
	return query.data ?? [];
};
export const useAllBeanNames = () => {
	const mode = useMode();
	const query = useQuery({ queryKey: ["bean-names", mode], queryFn: data.getAllBeanNames });
	return query.data ?? [];
};
export const useBeanFilters = () => {
	const mode = useMode();
	const query = useQuery({ queryKey: ["bean-filters", mode], queryFn: data.getBeanFilters });
	return query.data ?? [];
};
export const useBeanCount = () => {
	const mode = useMode();
	const query = useQuery({ queryKey: ["bean-count", mode], queryFn: data.getBeanCount });
	return query.data ?? 0;
};
export const useBeanDominantNote = (id: number | undefined) => {
	const mode = useMode();
	const query = useQuery({ queryKey: ["bean-note", mode, id], queryFn: () => data.getBeanDominantNote(id), enabled: id != null });
	return query.data;
};
export const useBeanSuggestions = () => {
	const mode = useMode();
	const query = useQuery({ queryKey: queryKeys.beanSuggestions(mode), queryFn: data.getBeanSuggestions });
	return query.data ?? { brands: [], countries: [], cities: [], varieties: [], flavors: [] };
};

export function useCreateBean() {
	const queryClient = useQueryClient();
	return useMutation({ mutationFn: data.createBean, onSuccess: () => queryClient.invalidateQueries() });
}
export function useUpdateBean() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, bean }: { id: number; bean: Partial<Beans> }) => data.updateBean(id, bean),
		onSuccess: () => queryClient.invalidateQueries(),
	});
}
export function useDeleteBean() {
	const queryClient = useQueryClient();
	return useMutation({ mutationFn: data.deleteBean, onSuccess: () => queryClient.invalidateQueries() });
}
