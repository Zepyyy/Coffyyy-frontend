export type Machines = {
	id: number;
	localId?: string;
	serverRevision?: number;
	deletedAt?: number;
	name: string;
	brand: string;
	type: string;
	purchaseDate: string;
	model: string;
	grindRange: string;
	capacity: string;
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
