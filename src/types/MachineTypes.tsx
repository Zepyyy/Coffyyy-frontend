import type { components } from "@/lib/api/schema.gen";
import type { BrewMethod } from "./BrewTypes";

export type SnapshotMachine = components["schemas"]["Machine"];

// Local row: the snapshot contract plus the Dexie primary key.
export type Machines = Omit<SnapshotMachine, "localId"> & {
	id: number;
	localId?: string;
};
export type MachineCardProps = {
	id: number;
	name: string;
	method: BrewMethod;
};

export type MachineForm = {
	name: string;
	brand: string;
	model: string;
	method: BrewMethod;
	grindRange: string;
	capacity: string;
	purchaseDate: string;
};

export type MachineSuggestions = {
	brands: Array<string>;
	models: Array<string>;
	grindRanges: Array<string>;
	capacities: Array<string>;
};

export type MachineFilters = {
	name: string;
	brand: string;
	model: string;
	method: BrewMethod;
	grindRange: string;
	capacity: string;
};
