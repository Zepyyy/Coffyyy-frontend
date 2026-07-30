import type { Brewers } from "@/types/BrewerTypes";

type SearchableBrewer = Pick<
	Brewers,
	"id" | "name" | "brand" | "model" | "type" | "pinned"
>;

export type BrewerCollectionFilters = {
	search?: string;
	categories?: string[];
	brands?: string[];
};

type OrderedBrewer = Pick<Brewers, "name" | "pinned" | "archived">;

function normalize(value: string) {
	return value.trim().toLowerCase();
}

/** Apply the page-local Brewer collection query and return alphabetical results. */
export function filterBrewerCollection<T extends SearchableBrewer>(
	brewers: readonly T[],
	filters: BrewerCollectionFilters,
): T[] {
	const query = normalize(filters.search ?? "");
	const categories = new Set((filters.categories ?? []).map(normalize));
	const brands = new Set((filters.brands ?? []).map(normalize));

	return orderBrewers(
		brewers.filter((brewer) => {
			const searchable = normalize(
				[brewer.name, brewer.brand, brewer.model, brewer.type].join(" "),
			);

			return (
				(!query || searchable.includes(query)) &&
				(categories.size === 0 || categories.has(normalize(brewer.type))) &&
				(brands.size === 0 || brands.has(normalize(brewer.brand)))
			);
		}),
	);
}

export function orderBrewers<T extends OrderedBrewer>(
	brewers: readonly T[],
): T[] {
	return [...brewers].sort(
		(a, b) =>
			Number(Boolean(a.archived)) - Number(Boolean(b.archived)) ||
			Number(Boolean(!b.archived && b.pinned)) -
				Number(Boolean(!a.archived && a.pinned)) ||
			a.name.localeCompare(b.name),
	);
}
