import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Beans } from "@/types/BeanTypes";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type Note = Beans["dominantNote"] | "default";

export type Swatch = {
	bg: string;
	secondaryBg: string;
	stripe: string;
	text: string;
	secondaryText: string;
	borderColor: string;
	var: string;
	secondaryVar: string;
};

type TagColor =
	| "teal"
	| "red"
	| "blue"
	| "green"
	| "yellow"
	| "orange"
	| "purple"
	| "gray";

const tagColors: Record<TagColor, Swatch> = {
	teal: {
		bg: "bg-tag-teal-900",
		secondaryBg: "bg-tag-teal-900/40",
		stripe: "bg-tag-teal-500",
		text: "text-tag-teal-100",
		secondaryText: "text-tag-teal-100/75",
		borderColor: "border-tag-teal-500",
		var: "var(--color-tag-teal-500)",
		secondaryVar: "var(--color-tag-teal-900)",
	},
	red: {
		bg: "bg-tag-red-900",
		secondaryBg: "bg-tag-red-900/40",
		stripe: "bg-tag-red-500",
		text: "text-tag-red-100",
		secondaryText: "text-tag-red-100/75",
		borderColor: "border-tag-red-500",
		var: "var(--color-tag-red-500)",
		secondaryVar: "var(--color-tag-red-900)",
	},
	blue: {
		bg: "bg-tag-blue-900",
		secondaryBg: "bg-tag-blue-900/40",
		stripe: "bg-tag-blue-500",
		text: "text-tag-blue-100",
		secondaryText: "text-tag-blue-100/75",
		borderColor: "border-tag-blue-500",
		var: "var(--color-tag-blue-500)",
		secondaryVar: "var(--color-tag-blue-900)",
	},
	green: {
		bg: "bg-tag-green-900",
		secondaryBg: "bg-tag-green-900/40",
		stripe: "bg-tag-green-500",
		text: "text-tag-green-100",
		secondaryText: "text-tag-green-100/75",
		borderColor: "border-tag-green-500",
		var: "var(--color-tag-green-500)",
		secondaryVar: "var(--color-tag-green-900)",
	},
	yellow: {
		bg: "bg-tag-yellow-900",
		secondaryBg: "bg-tag-yellow-900/40",
		stripe: "bg-tag-yellow-500",
		text: "text-tag-yellow-100",
		secondaryText: "text-tag-yellow-100/75",
		borderColor: "border-tag-yellow-500",
		var: "var(--color-tag-yellow-500)",
		secondaryVar: "var(--color-tag-yellow-900)",
	},
	orange: {
		bg: "bg-tag-orange-900",
		secondaryBg: "bg-tag-orange-900/40",
		stripe: "bg-tag-orange-500",
		text: "text-tag-orange-100",
		secondaryText: "text-tag-orange-100/75",
		borderColor: "border-tag-orange-500",
		var: "var(--color-tag-orange-500)",
		secondaryVar: "var(--color-tag-orange-900)",
	},
	purple: {
		bg: "bg-tag-purple-900",
		secondaryBg: "bg-tag-purple-900/40",
		stripe: "bg-tag-purple-500",
		text: "text-tag-purple-100",
		secondaryText: "text-tag-purple-100/75",
		borderColor: "border-tag-purple-500",
		var: "var(--color-tag-purple-500)",
		secondaryVar: "var(--color-tag-purple-900)",
	},
	gray: {
		bg: "bg-tag-gray-900",
		secondaryBg: "bg-tag-gray-900/40",
		stripe: "bg-tag-gray-500",
		text: "text-tag-gray-100",
		secondaryText: "text-tag-gray-100/75",
		borderColor: "border-tag-gray-500",
		var: "var(--color-tag-gray-500)",
		secondaryVar: "var(--color-tag-gray-900)",
	},
};

export const colorSwatch: Record<Note, Swatch> = {
	Fruity: tagColors.teal,
	Nutty: tagColors.red,
	Floral: tagColors.blue,
	Green: tagColors.green,
	Roasted: tagColors.yellow,
	Sour: tagColors.orange,
	Spices: tagColors.purple,
	Sweet: tagColors.yellow,
	default: tagColors.gray,
};

export function getColorSwatch(note: string | null | undefined): Swatch {
	return colorSwatch[note as Note] ?? colorSwatch.default;
}

export function parseWeight({
	value,
	default_weight,
	min,
	max,
}: {
	value: number;
	default_weight: number;
	min: number;
	max: number;
}): number {
	if (Number.isNaN(value)) return default_weight;
	return Math.min(max, Math.max(min, value));
}
export function clampWeight({
	value,
	min,
	max,
}: {
	value: number;
	min: number;
	max: number;
}) {
	return Math.min(max, Math.max(min, value));
}

type Step = {
	step: number;
	title: string;
	information: string[];
	description: string;
};

export const STEPS: Step[] = [
	{
		step: 1,
		title: "Bean",
		information: ["Bean"],
		description: "Which bean are you brewing?",
	},
	{
		step: 2,
		title: "Parameters",
		information: [
			"GrindSize",
			"BeanWeight",
			"EspressoWeight",
			"ExtractionTime",
			"Flow",
		],
		description:
			"Grind size; bean weight; espresso weight; extraction time; flow.",
	},
	{
		step: 3,
		title: "Setup",
		information: ["Machine"],
		description: "Which machine did you use?",
	},
	{
		step: 4,
		title: "Summary",
		information: [],
		description: "Review and save.",
	},
];
