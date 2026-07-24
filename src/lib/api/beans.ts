import { db } from "@/db/db";
import type { BeanFilters, BeanSuggestions, Beans } from "@/types/BeanTypes";
import { uniqueSorted } from "./utils";

export async function getBean(
	beanId: number | undefined,
): Promise<Beans | undefined> {
	if (!beanId) return undefined;
	const bean = await db.Beans.get(beanId);
	return bean;
}

export async function getAllBeans(): Promise<Array<Beans>> {
	return db.Beans.filter((bean) => bean.deletedAt === undefined).toArray();
}

export async function getBeanCount(): Promise<number> {
	return db.Beans.filter((bean) => bean.deletedAt === undefined).count();
}

export async function getAllBeanNames(): Promise<Array<Beans["name"]>> {
	return getAllBeans().then((beans) => beans.map((b) => b.name));
}

export async function getBeanDominantNote(
	beanId: number | undefined,
): Promise<Beans["dominantNote"] | undefined> {
	if (!beanId) return undefined;
	const bean = await db.Beans.get(beanId);
	return bean?.dominantNote;
}

export async function getBeanFilters(): Promise<Array<BeanFilters>> {
	const beans = await getAllBeans();
	return beans.map((b) => {
		return {
			origin: b.origin,
			dominantNote: b.dominantNote,
			roastLevel: b.roastLevel,
			brand: b.brand,
		};
	});
}

export async function getBeanSuggestions(): Promise<BeanSuggestions> {
	const beans = await getAllBeans();
	const extract = (field: keyof Beans) =>
		beans
			.map((b) => b[field])
			.filter((v): v is string => typeof v === "string");

	const extractArray = (field: keyof Beans) =>
		beans
			.map((b) => b[field])
			.filter((v): v is string[] => Array.isArray(v))
			.flat();

	return {
		brands: uniqueSorted(extract("brand")),
		origins: uniqueSorted(extractArray("origin")),
		processes: uniqueSorted(extractArray("process")),
		varieties: uniqueSorted(extractArray("variety")),
		flavors: uniqueSorted(extractArray("flavors")),
	};
}
