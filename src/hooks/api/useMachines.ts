import { useLiveQuery } from "dexie-react-hooks";
import * as machineStatsApi from "../../lib/api/machines";

export const useGetAllMachines = () => {
	return useLiveQuery(() => machineStatsApi.getAllMachines(), []) ?? [];
};

export const useGetMachineFilters = () => {
	return useLiveQuery(() => machineStatsApi.getMachineFilters(), []) ?? [];
};

export const useGetMachineCount = () => {
	return useLiveQuery(() => machineStatsApi.getMachineCount(), []) ?? 0;
};

export const useGetMachineSuggestions = () => {
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
