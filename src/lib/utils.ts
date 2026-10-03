import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Beans } from "@/types/BeanTypes";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type Note = Exclude<Beans["dominantNote"], ""> | "default";

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

/** Narrows free-form UI input to a contract enum, e.g. the "?" chip to "". */
export function oneOf<T extends string>(
	values: ReadonlyArray<T>,
	value: string,
	fallback: T,
): T {
	return (values as ReadonlyArray<string>).includes(value)
		? (value as T)
		: fallback;
}

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

/**
 * Accepts every extraction-time shape the app has ever stored or a user might
 * type: "28", "28.5", "28s", "0:28", "1:02", "1:02.5". Returns seconds, or
 * null when nothing numeric can be recovered.
 */
export function parseExtractionTime(
	raw: string | null | undefined,
): number | null {
	if (!raw) return null;
	const value = raw.trim().toLowerCase().replace(/s$/, "");
	if (!value) return null;

	if (value.includes(":")) {
		const [minutes, seconds] = value.split(":");
		const m = Number(minutes);
		const s = Number(seconds);
		if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
		return m * 60 + s;
	}
	const seconds = Number(value);
	return Number.isFinite(seconds) ? seconds : null;
}

/** "28" -> "28s", "62" -> "1:02". Sub-second precision is kept when present. */
export function formatExtractionTime(
	raw: string | number | null | undefined,
): string | null {
	const seconds = parseExtractionTime(
		typeof raw === "number" ? String(raw) : raw,
	);
	if (seconds == null || Number.isNaN(seconds)) return null;

	const whole = Math.floor(seconds);
	const fraction = seconds - whole;
	const minutes = Math.floor(whole / 60);
	const rest = whole % 60;
	if (minutes === 0) {
		const body = fraction > 0 ? seconds.toFixed(1) : String(whole);
		return `${body}s`;
	}
	const fractionBody = fraction > 0 ? `.${Math.round(fraction * 10)}` : "";
	return `${minutes}:${String(rest).padStart(2, "0")}${fractionBody}`;
}

/** "Today", "Yesterday", or "Sep 25". */
export function formatRelativeDay(date: Date | string | number): string {
	const day = new Date(date);
	day.setHours(0, 0, 0, 0);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const diffDays = Math.round((+today - +day) / (24 * 60 * 60 * 1000));
	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 0 || diffDays > 6) {
		return day.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});
	}
	return day.toLocaleDateString(undefined, { weekday: "long" });
}
