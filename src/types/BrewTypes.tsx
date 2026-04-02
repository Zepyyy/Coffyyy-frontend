import type { BeanCardProps } from "./BeanTypes";

export type Brews = {
	id: number;
	bean: string | undefined;
	beanWeight: number;
	espressoWeight: number;
	extractionTime: string | undefined;
	flow: string | undefined;
	overallRating: number;
	grindSize: string;
	date: Date;
	machine: string | undefined;
};

export type BrewForm = {
	bean: string;
	beanWeight: number;
	espressoWeight: number;
	extractionTime: string;
	flow: string;
	overallRating: "Excellent" | "Good" | "Mid" | "Horrible" | "Burnt" | "";
	grindSize: string;
	date: Date;
	machine: string;
};

export type BrewSuggestions = {
	bean: Array<BeanCardProps>;
	machine: Array<string>;
};
