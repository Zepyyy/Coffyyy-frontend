import { db } from "@/db/db";
import type {
	BrewerFilters,
	BrewerSuggestions,
	Brewers,
} from "@/types/BrewerTypes";
import { summarizeBrewerUsage, type BrewerUsage } from "@/lib/brewerUsage";
import { uniqueSorted } from "./utils";

export async function getAllBrewers(
	includeArchived = false,
): Promise<Array<Brewers>> {
	return includeArchived
		? db.Brewers.toArray()
		: db.Brewers.filter((brewer) => !brewer.archived).toArray();
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
	return db.Brewers.filter((brewer) => !brewer.archived).count();
}

export async function getBrewerUsage(): Promise<Map<number, BrewerUsage>> {
	return summarizeBrewerUsage(await db.Brews.toArray());
}

export async function getBrewerNameById(
	id: number,
): Promise<string | undefined> {
	const brewer = await db.Brewers.get(id);
	return brewer?.name;
}

export async function getAllBrewerNames(): Promise<Array<Brewers["name"]>> {
	return getAllBrewers().then((brewers) => brewers.map((brewer) => brewer.name));
}

export async function getBrewerFilters(): Promise<Array<BrewerFilters>> {
	const brewers = await getAllBrewers();
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
	const brewers = await getAllBrewers();
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
