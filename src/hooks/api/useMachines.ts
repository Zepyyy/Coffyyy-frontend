import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import * as data from "@/lib/data";
import type { Machines } from "@/types/MachineTypes";
import { queryKeys } from "./queryKeys";

function useMode() { return useAuth().status === "synced" ? "synced" : "local"; }
export const useAllMachines = () => { const mode = useMode(); const query = useQuery({ queryKey: queryKeys.machines(mode), queryFn: data.getAllMachines }); return query.data ?? []; };
export const useMachineFilters = () => { const mode = useMode(); const query = useQuery({ queryKey: ["machine-filters", mode], queryFn: data.getMachineFilters }); return query.data ?? []; };
export const useMachineCount = () => { const mode = useMode(); const query = useQuery({ queryKey: ["machine-count", mode], queryFn: data.getMachineCount }); return query.data ?? 0; };
export const useMachineSuggestions = () => { const mode = useMode(); const query = useQuery({ queryKey: queryKeys.machineSuggestions(mode), queryFn: data.getMachineSuggestions }); return query.data ?? { brands: [], models: [], types: [], grindRanges: [], capacities: [] }; };

export function useCreateMachine() { const queryClient = useQueryClient(); return useMutation({ mutationFn: data.createMachine, onSuccess: () => queryClient.invalidateQueries() }); }
export function useUpdateMachine() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, machine }: { id: number; machine: Partial<Machines> }) => data.updateMachine(id, machine), onSuccess: () => queryClient.invalidateQueries() }); }
export function useDeleteMachine() { const queryClient = useQueryClient(); return useMutation({ mutationFn: data.deleteMachine, onSuccess: () => queryClient.invalidateQueries() }); }
