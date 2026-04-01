export type Beans = {
	id: number;
	name: string;
	rating: number;
	status: "Excellent" | "Good" | "Mid" | "Horrible" | "New" | "";
	tastingNotes: string[];
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
	name: string;
	origin: string[];
	dominantNote: Beans["dominantNote"];
	selected: boolean;
	process?: string[];
	roastLevel?: number;
};

export type MultiTagInputProps = {
	name: string;
	tastingNotes: Beans["tastingNotes"];
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
	tastingNotes: string[];
};

export type BeanSuggestions = {
	names: Array<string>;
	processes: Array<string>;
	botanics: Array<string>;
	designations: Array<string>;
	brands: Array<string>;
	origins: Array<string>;
	varieties: Array<string>;
	dominantNotes: Array<Beans["dominantNote"]>;
	flavors: Array<string>;
	tastingNotes: Array<string>;
};
