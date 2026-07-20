import { api } from "@/lib/axios";
import type {
	MachineFilters,
	MachineSuggestions,
	Machines,
} from "@/types/MachineTypes";
import { uniqueSorted } from "./utils";

export type MachineWrite = Omit<Machines, "id">;

export async function listMachines() {
	const response = await api.get<Machines[]>("/machine");
	return response.data.map((machine) => ({
		...machine,
		purchaseDate: machine.purchaseDate ?? "",
	}));
}

export async function getMachine(id: number) {
	const response = await api.get<Machines>(`/machine/${id}`);
	return { ...response.data, purchaseDate: response.data.purchaseDate ?? "" };
}

export async function createMachine(machine: MachineWrite) {
	const response = await api.post<Machines>("/machine", machine);
	return { ...response.data, purchaseDate: response.data.purchaseDate ?? "" };
}

export async function updateMachine(id: number, machine: Partial<Machines>) {
	const response = await api.patch<Machines>(`/machine/${id}`, machine);
	return { ...response.data, purchaseDate: response.data.purchaseDate ?? "" };
}

export async function deleteMachine(id: number) {
	await api.delete(`/machine/${id}`);
}

export function getMachineFilters(machines: Machines[]): MachineFilters[] {
	return machines.map((machine) => ({
		name: machine.name,
		brand: machine.brand,
		model: machine.model,
		type: machine.type,
		grindRange: machine.grindRange,
		capacity: machine.capacity,
	}));
}

export function getMachineSuggestions(machines: Machines[]): MachineSuggestions {
	const extract = (field: keyof Machines) =>
		machines
			.map((machine) => machine[field])
			.filter((value): value is string => typeof value === "string");

	return {
		brands: uniqueSorted(extract("brand")),
		models: uniqueSorted(extract("model")),
		types: uniqueSorted(extract("type")),
		grindRanges: uniqueSorted(extract("grindRange")),
		capacities: uniqueSorted(extract("capacity")),
	};
}
