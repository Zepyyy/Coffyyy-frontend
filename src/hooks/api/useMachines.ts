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
			grindRanges: [""],
			capacities: [""],
		}
	);
};

/** Brews logged with a Brewer; its method is locked when > 0. */
export const useMachineBrewCount = (machineId: number | undefined) => {
	return useLiveQuery(
		() => machineStatsApi.getMachineBrewCount(machineId),
		[machineId],
	);
};

/** One Brewer; undefined while loading, null when missing. */
export const useMachine = (machineId: number | undefined) => {
	return useLiveQuery(
		async () =>
			machineId
				? ((await machineStatsApi.getAllMachines()).find(
						(m) => m.id === machineId,
					) ?? null)
				: null,
		[machineId],
	);
};
