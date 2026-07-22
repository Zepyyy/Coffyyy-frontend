import { useLiveQuery } from "dexie-react-hooks";
import * as machineStatsApi from "@/lib/data";

export const useAllMachines = () => {
	return useLiveQuery(() => machineStatsApi.getAllMachines(), []) ?? [];
};

export const useMachineFilters = () => {
	return useLiveQuery(() => machineStatsApi.getMachineFilters(), []) ?? [];
};

export const useMachineCount = () => {
	return useLiveQuery(() => machineStatsApi.getMachineCount(), []) ?? 0;
};

export const useMachineSuggestions = () => {
	return (
		useLiveQuery(() => machineStatsApi.getMachineSuggestions(), []) ?? {
			names: [""],
			brands: [""],
			models: [""],
			types: [""],
			grindRanges: [""],
			capacities: [""],
		}
	);
};
