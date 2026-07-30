import { db } from "@/db/db";
import type {
	BrewerFilters,
	BrewerSuggestions,
	Brewers,
} from "@/types/BrewerTypes";
import { uniqueSorted } from "./utils";

export async function getAllBrewers(): Promise<Array<Brewers>> {
	return db.Brewers.toArray();
}

export async function getBrewerCount(): Promise<number> {
	return db.Brewers.count();
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
