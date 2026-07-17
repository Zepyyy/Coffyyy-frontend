import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Beans } from "@/types/BeanTypes";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

type Note = Beans["dominantNote"] | "default";

type Swatch = {
	bg: string;
	secondaryBg: string;
	stripe: string;
	text: string;
	secondaryText: string;
	border: string;
	var: string;
	secondaryVar: string;
};

export const colorSwatch: Record<Note, Swatch> = {
	Fruity: {
		bg: "bg-tag-teal-900",
		secondaryBg: "bg-tag-teal-900/40",
		stripe: "bg-tag-teal-500",
		text: "text-tag-teal-100",
		secondaryText: "text-tag-teal-100/75",
		border: "border border-tag-teal-500",
		var: "var(--color-tag-teal-500)",
		secondaryVar: "var(--color-tag-teal-900)",
	},
	Nutty: {
		bg: "bg-tag-red-900",
		secondaryBg: "bg-tag-red-900/40",
		stripe: "bg-tag-red-500",
		text: "text-tag-red-100",
		secondaryText: "text-tag-red-100/75",
		border: "border border-tag-red-500",
		var: "var(--color-tag-red-500)",
		secondaryVar: "var(--color-tag-red-900)",
	},
	Floral: {
		bg: "bg-tag-blue-900",
		secondaryBg: "bg-tag-blue-900/40",
		stripe: "bg-tag-blue-500",
		text: "text-tag-blue-100",
		secondaryText: "text-tag-blue-100/75",
		border: "border border-tag-blue-500",
		var: "var(--color-tag-blue-500)",
		secondaryVar: "var(--color-tag-blue-900)",
	},
	Green: {
		bg: "bg-tag-green-900",
		secondaryBg: "bg-tag-green-900/40",
		stripe: "bg-tag-green-500",
		text: "text-tag-green-100",
		secondaryText: "text-tag-green-100/75",
		border: "border border-tag-green-500",
		var: "var(--color-tag-green-500)",
		secondaryVar: "var(--color-tag-green-900)",
	},
	Roasted: {
		bg: "bg-tag-yellow-900",
		secondaryBg: "bg-tag-yellow-900/40",
		stripe: "bg-tag-yellow-500",
		text: "text-tag-yellow-100",
		secondaryText: "text-tag-yellow-100/75",
		border: "border border-tag-yellow-500",
		var: "var(--color-tag-yellow-500)",
		secondaryVar: "var(--color-tag-yellow-900)",
	},
	Sour: {
		bg: "bg-tag-orange-900",
		secondaryBg: "bg-tag-orange-900/40",
		stripe: "bg-tag-orange-500",
		text: "text-tag-orange-100",
		secondaryText: "text-tag-orange-100/75",
		border: "border border-tag-orange-500",
		var: "var(--color-tag-orange-500)",
		secondaryVar: "var(--color-tag-orange-900)",
	},
	Spices: {
		bg: "bg-tag-purple-900",
		secondaryBg: "bg-tag-purple-900/40",
		stripe: "bg-tag-purple-500",
		text: "text-tag-purple-100",
		secondaryText: "text-tag-purple-100/75",
		border: "border border-tag-purple-500",
		var: "var(--color-tag-purple-500)",
		secondaryVar: "var(--color-tag-purple-900)",
	},
	Sweet: {
		bg: "bg-tag-yellow-900",
		secondaryBg: "bg-tag-yellow-900/40",
		stripe: "bg-tag-yellow-500",
		text: "text-tag-yellow-100",
		secondaryText: "text-tag-yellow-100/75",
		border: "border border-tag-yellow-500",
		var: "var(--color-tag-yellow-500)",
		secondaryVar: "var(--color-tag-yellow-900)",
	},
	default: {
		bg: "bg-tag-gray-900",
		secondaryBg: "bg-tag-gray-900/40",
		stripe: "bg-tag-gray-500",
		text: "text-tag-gray-100",
		secondaryText: "text-tag-gray-100/75",
		border: "border border-tag-gray-500",
		var: "var(--color-tag-gray-500)",
		secondaryVar: "var(--color-tag-gray-900)",
	},
};

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
