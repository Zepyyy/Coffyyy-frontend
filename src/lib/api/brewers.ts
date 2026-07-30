import { db } from "@/db/db";
import type {
	BrewerFilters,
	BrewerSuggestions,
	Brewers,
} from "@/types/BrewerTypes";
import type { BrewMethod } from "@/types/BrewTypes";
import { uniqueSorted } from "./utils";

export async function getAllBrewers(): Promise<Array<Brewers>> {
	return db.Brewers.toArray();
}

export async function getBrewer(
	brewerId: number | undefined,
): Promise<Brewers | undefined> {
	if (brewerId == null || !Number.isInteger(brewerId) || brewerId < 1) {
		return undefined;
	}
	return db.Brewers.get(brewerId);
}

export async function getBrewerCount(): Promise<number> {
	return db.Brewers.count();
}

export type BrewerUsage = {
	lastUsed: string;
	brewCount: number;
	methods: BrewMethod[];
};

export async function getBrewerUsage(): Promise<Map<number, BrewerUsage>> {
	const brews = await db.Brews.orderBy("date").reverse().toArray();
	const usage = new Map<number, BrewerUsage>();

	for (const brew of brews) {
		if (brew.brewerId == null) continue;
		const current = usage.get(brew.brewerId);
		usage.set(brew.brewerId, {
			lastUsed: current?.lastUsed ?? new Date(brew.date).toISOString(),
			brewCount: (current?.brewCount ?? 0) + 1,
			methods:
				brew.method && !current?.methods.includes(brew.method)
					? [...(current?.methods ?? []), brew.method]
					: (current?.methods ?? []),
		});
	}

	return usage;
}

export async function getBrewerNameById(
	id: number,
): Promise<string | undefined> {
	const brewer = await db.Brewers.get(id);
	return brewer?.name;
}

export async function getAllBrewerNames(): Promise<Array<Brewers["name"]>> {
	return db.Brewers.toArray().then((brewers) =>
		brewers.map((brewer) => brewer.name),
	);
}

export async function getBrewerFilters(): Promise<Array<BrewerFilters>> {
	const brewers = await db.Brewers.toArray();
	return brewers.map((b) => {
		return {
			name: b.name,
			brand: b.brand,
			model: b.model,
			type: b.type,
			grindRange: b.grindRange,
			capacity: b.capacity,
		};
	});
}

export async function getBrewerSuggestions(): Promise<BrewerSuggestions> {
	const brewers = await db.Brewers.toArray();
	const extract = (field: keyof Brewers) =>
		brewers
			.map((brewer) => brewer[field])
			.filter((v): v is string => typeof v === "string");

	return {
		brands: uniqueSorted(extract("brand")),
		models: uniqueSorted(extract("model")),
		types: uniqueSorted(extract("type")),
		grindRanges: uniqueSorted(extract("grindRange")),
		capacities: uniqueSorted(extract("capacity")),
	};
}
