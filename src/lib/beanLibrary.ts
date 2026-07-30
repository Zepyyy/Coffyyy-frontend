import type { Beans } from "@/types/BeanTypes";

type SearchableBean = Pick<
	Beans,
	"id" | "name" | "brand" | "origin" | "dominantNote"
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

	return beans
		.filter((bean) => {
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
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}
