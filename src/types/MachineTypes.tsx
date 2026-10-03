import type { components } from "@/lib/api/schema.gen";

export type SnapshotMachine = components["schemas"]["Machine"];

// Local row: the snapshot contract plus the Dexie primary key.
export type Machines = Omit<SnapshotMachine, "localId"> & {
	id: number;
	localId?: string;
};
export type MachineCardProps = {
	id: number;
	name: string;
	type: string;
};

export type MachineForm = {
	name: string;
	brand: string;
	model: string;
	type: string;
	grindRange: string;
	capacity: string;
	purchaseDate: string;
};

export type MachineSuggestions = {
	brands: Array<string>;
	models: Array<string>;
	types: Array<string>;
	grindRanges: Array<string>;
	capacities: Array<string>;
};

export type MachineFilters = {
	name: string;
	brand: string;
	model: string;
	type: string;
	grindRange: string;
	capacity: string;
};
