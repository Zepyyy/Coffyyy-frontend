export type Brewers = {
	id: number;
	name: string;
	brand: string;
	type: string;
	purchaseDate: string;
	model: string;
	grindRange: string;
	capacity: string;
};
export const BREWER_CATEGORIES = [
	"Espresso machine",
	"Moka pot",
	"Pour-over",
	"French press",
	"AeroPress",
] as const;
export type BrewerCardProps = {
	id: number;
	name: string;
	type: string;
};

export type BrewerForm = {
	name: string;
	brand: string;
	model: string;
	type: string;
	grindRange: string;
	capacity: string;
	purchaseDate: string;
};

export type BrewerSuggestions = {
	brands: Array<string>;
	models: Array<string>;
	types: Array<string>;
	grindRanges: Array<string>;
	capacities: Array<string>;
};

export type BrewerFilters = {
	name: string;
	brand: string;
	model: string;
	type: string;
	grindRange: string;
	capacity: string;
};
