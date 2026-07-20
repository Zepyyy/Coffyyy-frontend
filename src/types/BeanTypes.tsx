export type Beans = {
	id: number;
	name: string;
	rating: number;
	status: "Excellent" | "Good" | "Mid" | "Horrible" | "New" | "";
	dominantNote:
		| "Fruity"
		| "Nutty"
		| "Floral"
		| "Sweet"
		| "Sour"
		| "Spices"
		| "Roasted"
		| "Green";
	roastLevel: number;
	countries: string[];
	cities: string[];
	varieties: string[];
	brands: string[];
	/** Local-only legacy value. Never sent to cloud API. */
	process?: string[];
	botanic: "Arabica" | "Robusta" | "";
	designation: "Pure Origin" | "Blend" | "";
	flavors: string[];
	finished: boolean;
};
export type BeanCardProps = {
	id: number;
	name: string;
	countries: string[];
	dominantNote: Beans["dominantNote"];
	roastLevel?: number;
	varieties?: string[];
};

export type MultiTagInputProps = {
	name: string;
};

export type BeanForm = {
	name: string;
	brand: string;
	roastLevel: string;
	botanic: string;
	designation: string;
	countries: string[];
	cities: string[];
	varieties: string[];
	dominantNote: string;
	flavors: string[];
};

export type BeanSuggestions = {
	brands: Array<string>;
	countries: Array<string>;
	cities: Array<string>;
	varieties: Array<string>;
	flavors: Array<string>;
};

export type BeanFilters = {
	countries: string[];
	dominantNote: Beans["dominantNote"] | "";
	brands: string[];
	roastLevel: number | null;
};
