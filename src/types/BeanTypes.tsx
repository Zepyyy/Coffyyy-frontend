import type { components } from "@/lib/api/schema.gen";

export type SnapshotBean = components["schemas"]["Bean"];

// Local row: the snapshot contract plus the Dexie primary key.
export type Beans = Omit<SnapshotBean, "localId"> & {
	id: number;
	localId?: string;
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
