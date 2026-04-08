import { db } from "@/db/db";
import type { Brews } from "@/types/BrewTypes";

export async function getBrewCountForBean(bean: string): Promise<number> {
	if (!bean) return 0;
	return db.Brews.where("bean").equals(bean).count();
}

export async function getUniqueBeansBrewedCount(): Promise<number> {
	const beans = await db.Brews.orderBy("bean").uniqueKeys();
	return beans.filter(Boolean).length;
}

export async function getBestBrewForBean(
	beanId: number | undefined,
): Promise<Brews | null> {
	if (!beanId) return null;
	const brews = await db.Brews.filter((b) => b.beanId === beanId).toArray();
	if (brews.length === 0) return null;
	return brews.reduce((best, b) =>
		b.overallRating > best.overallRating ? b : best,
	);
}

export async function getBrewCountForBeanId(
	beanId: number | undefined,
): Promise<number> {
	if (!beanId) return 0;
	return db.Brews.filter((b) => b.beanId === beanId).count();
}
