import type { Beans } from "@/types/default";

export type BeanSuggestions = {
	names: Array<string>;
	brands: Array<string>;
	origins: Array<string>;
	varieties: Array<string>;
	dominantNotes: Array<string>;
	flavors: Array<string>;
	tastingNotes: Array<string>;
};

function rankByUsage(values: Array<string>): Array<string> {
	const counts = new Map<string, { label: string; count: number }>();

	for (const value of values) {
		const normalized = value.trim();
		if (!normalized) continue;
		const key = normalized.toLocaleLowerCase();
		const current = counts.get(key);
		if (current) {
			current.count += 1;
			continue;
		}
		counts.set(key, { label: normalized, count: 1 });
	}

	return [...counts.entries()]
		.sort((a, b) => {
			if (b[1].count !== a[1].count) return b[1].count - a[1].count;
			return a[0].localeCompare(b[0]);
		})
		.map(([, value]) => value.label);
}

export function buildBeanSuggestions(beans: Array<Beans>): BeanSuggestions {
	const names: Array<string> = [];
	const brands: Array<string> = [];
	const origins: Array<string> = [];
	const varieties: Array<string> = [];
	const dominantNotes: Array<string> = [];
	const flavors: Array<string> = [];
	const tastingNotes: Array<string> = [];

	for (const bean of beans) {
		if (bean.name) names.push(bean.name);
		if (bean.brand) brands.push(bean.brand);
		if (bean.dominantNote) dominantNotes.push(bean.dominantNote);
		origins.push(...(bean.origin ?? []));
		varieties.push(...(bean.variety ?? []));
		flavors.push(...(bean.flavors ?? []));
		tastingNotes.push(...(bean.tastingNotes ?? []));
	}

	return {
		names: rankByUsage(names),
		brands: rankByUsage(brands),
		origins: rankByUsage(origins),
		varieties: rankByUsage(varieties),
		dominantNotes: rankByUsage(dominantNotes),
		flavors: rankByUsage(flavors),
		tastingNotes: rankByUsage(tastingNotes),
	};
}
