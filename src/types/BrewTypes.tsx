import type { components } from "@/lib/api/schema.gen";
import type { BeanCardProps } from "./BeanTypes";
import type { MachineCardProps } from "./MachineTypes";

export type SnapshotBrew = components["schemas"]["Brew"];
export type BrewMethod = SnapshotBrew["method"];
export type BrewHeat = NonNullable<SnapshotBrew["heat"]>;

// Local row: Dexie keys replace snapshot localId references, date is a Date.
export type Brews = Omit<
	SnapshotBrew,
	"localId" | "beanLocalId" | "machineLocalId" | "recipeLocalId" | "date"
> & {
	id: number;
	localId?: string;
	date: Date;
	beanId: number | undefined;
	machineId: number | undefined;
	recipeId?: number;
};

/**
 * Input for addBrew: a Brewer is required and the brew's method is copied
 * from it, so callers never pass `method`.
 */
export type NewBrew = Omit<Brews, "id" | "localId" | "method" | "machineId"> & {
	machineId: number;
};

/** Editable brew fields; method is immutable, recipe links go through linkBrewToRecipe. */
export type BrewChanges = Partial<
	Omit<Brews, "id" | "localId" | "method" | "recipeId">
>;

export type BrewForm = {
	beanId: number | undefined;
	machineId: number | undefined;
	beanWeight: number;
	brewWeight: number;
	extractionTime: string;
	flow: string;
	grindSize: number;
	date: Date;
};

export type BrewSuggestions = {
	bean: Array<BeanCardProps>;
	machine: Array<MachineCardProps>;
};

export type BeanDialInState = {
	beanId: number;
	isDialedIn: boolean;
	totalBrews: number;
	topRatedBrews: number;
	lastRating: number | null;
	stableGrind: boolean;
};

export type BeanBrewParameterSummary = {
	grindSize: string;
	beanWeight: number | null;
	brewWeight: number | null;
	extractionTime: string | null;
	_flow: string | null;
	ratio: number | null;
	_tasteScore: number | null;
	_strengthScore: number | null;
	_rating: number | null;
	_basedOnCount: number;
	usesTopRatedBrews: boolean;
};

export type BeanBrewInsights = {
	beanId: number;
	target: BeanBrewParameterSummary;
	average: BeanBrewParameterSummary;
	best: BeanBrewParameterSummary | null;
	_lastBrew: Brews | null;
	_dialIn: BeanDialInState;
	recentBrewScores: Array<{
		taste: number | null;
		strength: number | null;
		rating: number | null;
		grindSize: number | null;
		date: Date;
	}>;
};
