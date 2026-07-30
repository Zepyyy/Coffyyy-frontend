import type { Beans } from "@/types/BeanTypes";

type SearchableBean = Pick<
	Beans,
	"id" | "name" | "brand" | "origin" | "dominantNote" | "pinned" | "archived"
>;

export type BeanCollectionFilters = {
	search?: string;
	origins?: string[];
	brands?: string[];
};

function normalize(value: string) {
	return value.trim().toLowerCase();
}

/** Apply the page-local Bean collection query and return alphabetical results. */
export function filterBeanCollection<T extends SearchableBean>(
	beans: readonly T[],
	filters: BeanCollectionFilters,
): T[] {
	const query = normalize(filters.search ?? "");
	const origins = new Set((filters.origins ?? []).map(normalize));
	const brands = new Set((filters.brands ?? []).map(normalize));

	return orderBeans(
		beans.filter((bean) => {
			const searchable = normalize(
				[bean.name, bean.brand, bean.dominantNote, ...bean.origin].join(" "),
			);
			const beanOrigins = bean.origin.map(normalize);
			const beanBrand = normalize(bean.brand);

			return (
				(!query || searchable.includes(query)) &&
				(origins.size === 0 ||
					beanOrigins.some((origin) => origins.has(origin))) &&
				(brands.size === 0 || brands.has(beanBrand))
			);
		}),
	);
}

type OrderedBean = Pick<Beans, "name" | "pinned" | "archived">;

export function orderBeans<T extends OrderedBean>(beans: readonly T[]): T[] {
	return [...beans].sort(
		(a, b) =>
			Number(Boolean(a.archived)) - Number(Boolean(b.archived)) ||
			Number(Boolean(!b.archived && b.pinned)) -
				Number(Boolean(!a.archived && a.pinned)) ||
			a.name.localeCompare(b.name),
	);
}
