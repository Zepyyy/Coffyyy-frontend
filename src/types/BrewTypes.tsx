import type { BeanCardProps } from "./BeanTypes";
import type { MachineCardProps } from "./MachineTypes";

export type Brews = {
	id: number;
	beanWeight: number;
	espressoWeight: number;
	extractionTime: string | undefined;
	flow: string | undefined;
	overallRating?: number;
	tasteScore?: number; // -5 (sour/under-extracted) to +5 (bitter/over-extracted), 0 = balanced
	strengthScore?: number; // -5 (weak) to +5 (strong), 0 = balanced
	grindSize: string;
	date: Date;
	beanId: number | undefined;
	machineId: number | undefined;
};

export type BrewForm = {
	beanId: number | undefined;
	machineId: number | undefined;
	beanWeight: number;
	espressoWeight: number;
	extractionTime: string;
	flow: string;
	grindSize: string;
	date: Date;
};

export type BrewSuggestions = {
	bean: Array<BeanCardProps>;
	machine: Array<MachineCardProps>;
};

export type BrewAdjustment = {
	title: string;
	detail: string;
};

export type BeanDialInState = {
	beanId: number;
	isDialedIn: boolean;
	totalBrews: number;
	topRatedBrews: number;
	lastRating: number | null;
	stableGrind: boolean;
};

export type BeanBrewInsights = {
	beanId: number;
	target: {
		grindSize: string;
		beanWeight: number | null;
		espressoWeight: number | null;
		extractionTime: string | null;
		flow: string | null;
		ratio: number | null;
		tasteScore: number | null;
		strengthScore: number | null;
		basedOnCount: number;
		usesTopRatedBrews: boolean;
	};
	lastBrew: Brews | null;
	adjustments: BrewAdjustment[];
	dialIn: BeanDialInState;
};
