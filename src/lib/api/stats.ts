import { db } from "@/db/db";

export async function getBestGrindSize(): Promise<string | null> {
	const brews = await db.Brews.toArray();
	if (brews.length === 0) return null;

	const byGrind = brews.reduce(
		(acc, b) => {
			if (!b.grindSize) return acc;
			if (!acc[b.grindSize]) acc[b.grindSize] = { sum: 0, count: 0 };
			acc[b.grindSize].sum += b.overallRating;
			acc[b.grindSize].count++;
			return acc;
		},
		{} as Record<string, { sum: number; count: number }>,
	);

	const best = Object.entries(byGrind)
		.map(([size, { sum, count }]) => ({ size, avg: sum / count }))
		.sort((a, b) => b.avg - a.avg)[0];

	return best?.size ?? null;
}

export async function getBrewCountForBean(bean: string): Promise<number> {
	if (!bean) return 0;
	return db.Brews.where("bean").equals(bean).count();
}

export async function getUniqueBeansBrewedCount(): Promise<number> {
	const beans = await db.Brews.orderBy("bean").uniqueKeys();
	return beans.filter(Boolean).length;
}
