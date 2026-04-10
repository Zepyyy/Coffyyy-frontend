import type { Beans } from "@/types/BeanTypes";

export const DEFAULT_BOTANICS: Array<string> = ["Arabica", "Robusta", "?"];
export const DEFAULT_DESIGNATIONS: Array<string> = [
	"Pure origin",
	"Blend",
	"?",
];
export const DEFAULT_DOMINANT_NOTES: Array<Beans["dominantNote"]> = [
	"Floral",
	"Fruity",
	"Green",
	"Nutty",
	"Roasted",
	"Sour",
	"Spices",
	"Sweet",
];
export const DEFAULT_FLOW: Array<string> = [
	"Perfect",
	"Even",
	"Uneven",
	"Struggling",
];
export const DEFAULT_OVERALL_RATING: Array<string> = [
	"Excellent",
	"Good",
	"Mid",
	"Horrible",
	"Burnt",
];

export const MIN_BEAN_WEIGHT = 12;
export const MIN_ESPRESSO_WEIGHT = 12;
export const MAX_BEAN_WEIGHT = 24;
export const MAX_ESPRESSO_WEIGHT = 48;
export const DIAL_DEFAULT_BEAN_WEIGHT = 18;
export const DIAL_DEFAULT_ESPRESSO_WEIGHT = 24;
