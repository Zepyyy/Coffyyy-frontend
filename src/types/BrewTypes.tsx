import type { BeanCardProps } from "./BeanTypes";
import type { MachineCardProps } from "./MachineTypes";

export const BREW_METHODS = ["Espresso", "Moka Pot"] as const;
export type BrewMethod = (typeof BREW_METHODS)[number];
export const HEAT_LEVELS = ["Low", "Medium", "High"] as const;
export type HeatLevel = (typeof HEAT_LEVELS)[number];

export type Brews = {
	id: number;
	beanWeight?: number;
	espressoWeight?: number;
	yieldWeight?: number;
	extractionTime?: string;
	flow?: string;
	overallRating?: number;
	tasteScore?: number; // -5 (sour/under-extracted) to +5 (bitter/over-extracted), 0 = balanced
	strengthScore?: number; // -5 (weak) to +5 (strong), 0 = balanced
	grindSize?: number;
	date: Date;
	beanId: number | undefined;
	/** New brewer association. machineId remains readable for legacy records. */
	brewerId?: number;
	machineId?: number;
	method?: BrewMethod;
	waterAmount?: number;
	heatLevel?: HeatLevel;
	brewTime?: string;
};

export type BrewForm = {
	beanId: number | undefined;
	brewerId: number | undefined;
	/** @deprecated use brewerId */
	machineId?: number;
	method: BrewMethod | undefined;
	beanWeight: number | undefined;
	espressoWeight: number | undefined;
	yieldWeight: number | undefined;
	extractionTime: string;
	flow: string;
	waterAmount: number | undefined;
	heatLevel: HeatLevel | undefined;
	brewTime: string;
	grindSize: number | undefined;
	date: Date;
};

export type BrewSuggestions = {
	bean: Array<BeanCardProps>;
	machine: Array<MachineCardProps>;
	brewer: Array<MachineCardProps>;
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
	espressoWeight: number | null;
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
