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
};

export const colorSwatch: Record<Note, Swatch> = {
	Fruity: {
		bg: "bg-tag-teal-900",
		secondaryBg: "bg-tag-teal-900/40",
		stripe: "bg-tag-teal-500",
		text: "text-tag-teal-100",
		secondaryText: "text-tag-teal-100/75",
		border: "border border-tag-teal-500",
	},
	Nutty: {
		bg: "bg-tag-red-900",
		secondaryBg: "bg-tag-red-900/40",
		stripe: "bg-tag-red-500",
		text: "text-tag-red-100",
		secondaryText: "text-tag-red-100/75",
		border: "border border-tag-red-500",
	},
	Floral: {
		bg: "bg-tag-blue-900",
		secondaryBg: "bg-tag-blue-900/40",
		stripe: "bg-tag-blue-500",
		text: "text-tag-blue-100",
		secondaryText: "text-tag-blue-100/75",
		border: "border border-tag-blue-500",
	},
	Green: {
		bg: "bg-tag-green-900",
		secondaryBg: "bg-tag-green-900/40",
		stripe: "bg-tag-green-500",
		text: "text-tag-green-100",
		secondaryText: "text-tag-green-100/75",
		border: "border border-tag-green-500",
	},
	Roasted: {
		bg: "bg-tag-yellow-900",
		secondaryBg: "bg-tag-yellow-900/40",
		stripe: "bg-tag-yellow-500",
		text: "text-tag-yellow-100",
		secondaryText: "text-tag-yellow-100/75",
		border: "border border-tag-yellow-500",
	},
	Sour: {
		bg: "bg-tag-orange-900",
		secondaryBg: "bg-tag-orange-900/40",
		stripe: "bg-tag-orange-500",
		text: "text-tag-orange-100",
		secondaryText: "text-tag-orange-100/75",
		border: "border border-tag-orange-500",
	},
	Spices: {
		bg: "bg-tag-purple-900",
		secondaryBg: "bg-tag-purple-900/40",
		stripe: "bg-tag-purple-500",
		text: "text-tag-purple-100",
		secondaryText: "text-tag-purple-100/75",
		border: "border border-tag-purple-500",
	},
	Sweet: {
		bg: "bg-tag-yellow-900",
		secondaryBg: "bg-tag-yellow-900/40",
		stripe: "bg-tag-yellow-500",
		text: "text-tag-yellow-100",
		secondaryText: "text-tag-yellow-100/75",
		border: "border border-tag-yellow-500",
	},
	default: {
		bg: "bg-tag-gray-900",
		secondaryBg: "bg-tag-gray-900/40",
		stripe: "bg-tag-gray-500",
		text: "text-tag-gray-100",
		secondaryText: "text-tag-gray-100/75",
		border: "border border-tag-gray-500",
	},
};

export function SelectRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

export function SelectMultiple<T>(arr: T[], count: number): T[] {
	const result: T[] = [];
	for (let i = 0; i < count; i++) {
		result.push(SelectRandom(arr));
	}
	return result;
}
