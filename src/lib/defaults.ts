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
export const DEFAULT_FLOW: Array<string> = ["Even", "Uneven"];
export const DEFAULT_OVERALL_RATING: Array<string> = [
	"Excellent",
	"Good",
	"Mid",
	"Horrible",
	"Burnt",
];
