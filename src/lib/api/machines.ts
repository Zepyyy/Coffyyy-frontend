import { db } from "@/db/db";
import type {
	MachineFilters,
	MachineSuggestions,
	Machines,
} from "@/types/MachineTypes";
import { uniqueSorted } from "./utils";

export async function getAllMachines(): Promise<Array<Machines>> {
	return getActiveMachines();
}

export async function getMachineCount(): Promise<number> {
	return db.Machines.count();
}

/** Brews logged with this Brewer; its method is editable only while 0. */
export async function getMachineBrewCount(
	machineId: number | undefined,
): Promise<number> {
	if (!machineId) return 0;
	return db.Brews.where("machineId").equals(machineId).count();
}

export async function getMachineNameById(
	id: number,
): Promise<string | undefined> {
	const machine = await db.Machines.get(id);
	return machine?.name;
}

export async function getAllMachineNames(): Promise<Array<Machines["name"]>> {
	return getActiveMachines().then((machines) => machines.map((m) => m.name));
}

export async function getMachineFilters(): Promise<Array<MachineFilters>> {
	const machines = await getActiveMachines();
	return machines.map((b) => {
		return {
			name: b.name,
			brand: b.brand,
			model: b.model,
			method: b.method,
			grindRange: b.grindRange,
			capacity: b.capacity,
		};
	});
}

export async function getMachineSuggestions(): Promise<MachineSuggestions> {
	const machines = await getActiveMachines();
	const extract = (field: keyof Machines) =>
		machines
			.map((m) => m[field])
			.filter((v): v is string => typeof v === "string");

	return {
		brands: uniqueSorted(extract("brand")),
		models: uniqueSorted(extract("model")),
		grindRanges: uniqueSorted(extract("grindRange")),
		capacities: uniqueSorted(extract("capacity")),
	};
}

async function getActiveMachines() {
	return db.Machines.toArray();
}
