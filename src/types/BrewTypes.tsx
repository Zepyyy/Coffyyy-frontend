import type { BeanCardProps } from "./BeanTypes";

export type Brews = {
	id: number;
	bean: string | undefined;
	beanWeight: number;
	espressoWeight: number;
	extractionTime: string | undefined;
	flow: string | undefined;
	overallRating: string;
	grindSize: string;
	date: Date;
	machine: string | undefined;
};

export type BrewForm = {
	bean: string | undefined;
	beanWeight: number;
	espressoWeight: number;
	extractionTime: string;
	flow: string;
	overallRating: string;
	grindSize: string;
	date: Date;
	machine: string | undefined;
};

export type BrewSuggestions = {
	bean: Array<BeanCardProps>;
	grindSize: Array<string>;
	beanWeight: Array<number>;
	espressoWeight: Array<number>;
	extractionTime: Array<string>;
	flow: Array<string>;
	overallRating: Array<string>;
	machine: Array<string>;
};
