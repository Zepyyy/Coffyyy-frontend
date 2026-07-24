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
	return db.Machines.filter(
		(machine) => machine.deletedAt === undefined,
	).count();
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
			type: b.type,
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
		types: uniqueSorted(extract("type")),
		grindRanges: uniqueSorted(extract("grindRange")),
		capacities: uniqueSorted(extract("capacity")),
	};
}

async function getActiveMachines() {
	return db.Machines.filter(
		(machine) => machine.deletedAt === undefined,
	).toArray();
}
