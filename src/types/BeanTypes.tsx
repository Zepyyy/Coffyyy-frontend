export type Beans = {
	id: number;
	localId?: string;
	serverRevision?: number;
	deletedAt?: number;
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
	origin: string[];
	process: string[];
	variety: string[];
	brand: string;
	botanic: "Arabica" | "Robusta" | "";
	designation: "Pure Origin" | "Blend" | "";
	flavors: string[];
	finished: boolean;
};
export type BeanCardProps = {
	id: number;
	name: string;
	origin: string[];
	dominantNote: Beans["dominantNote"];
	process?: string[];
	roastLevel?: number;
	variety?: string[];
};

export type MultiTagInputProps = {
	name: string;
};

export type BeanForm = {
	name: string;
	brand: string;
	roastLevel: string;
	process: string[];
	botanic: string;
	designation: string;
	origin: string[];
	variety: string[];
	dominantNote: string;
	flavors: string[];
};

export type BeanSuggestions = {
	processes: Array<string>;
	brands: Array<string>;
	origins: Array<string>;
	varieties: Array<string>;
	flavors: Array<string>;
};

export type BeanFilters = {
	origin: string[];
	dominantNote: Beans["dominantNote"] | "";
	brand: string;
	roastLevel: number | null;
};
