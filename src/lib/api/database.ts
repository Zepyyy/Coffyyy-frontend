export type DatabaseCounts = {
	beans: number;
	machines: number;
	brews: number;
};

// Kept as compatibility export; data mode selection lives in lib/data.
export { getDatabaseCounts } from "@/lib/data";
