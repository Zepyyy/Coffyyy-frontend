import type { DataMode } from "@/lib/data";

export const queryKeys = {
	beans: (mode: DataMode) => ["beans", mode] as const,
	bean: (mode: DataMode, id: number | undefined) => ["bean", mode, id] as const,
	beanSuggestions: (mode: DataMode) => ["bean-suggestions", mode] as const,
	machines: (mode: DataMode) => ["machines", mode] as const,
	machineSuggestions: (mode: DataMode) => ["machine-suggestions", mode] as const,
	brews: (mode: DataMode) => ["brews", mode] as const,
	brewSuggestions: (mode: DataMode) => ["brew-suggestions", mode] as const,
	database: (mode: DataMode) => ["database", mode] as const,
};
