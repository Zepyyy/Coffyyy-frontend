import { db } from "@/db/db";
import type {
	BeanDisplay,
	BeanFilters,
	BeanSuggestions,
	Beans,
} from "@/types/BeanTypes";
import { uniqueSorted } from "./utils";

export async function getAllBeans(): Promise<Array<Beans>> {
	return db.Beans.toArray();
}

export async function getBeanCount(): Promise<number> {
	return db.Beans.count();
}

export async function getAllBeanNames(): Promise<Array<Beans["name"]>> {
	return db.Beans.toArray().then((beans) => beans.map((b) => b.name));
}

export async function getBeanFilters(): Promise<Array<BeanFilters>> {
	const beans = await db.Beans.toArray();
	return beans.map((b) => {
		return {
			origin: b.origin,
			dominantNote: b.dominantNote,
			roastLevel: b.roastLevel,
			process: b.process,
		};
	});
}

export async function getBeanDisplays(): Promise<Array<BeanDisplay>> {
	const beans = await db.Beans.toArray();
	return beans.map((b) => {
		return { name: b.name, id: b.id, dominantNote: b.dominantNote };
	});
}

export async function getBeanSuggestions(): Promise<BeanSuggestions> {
	const beans = await db.Beans.toArray();
	console.log(beans);
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
		tastingNotes: uniqueSorted(extractArray("tastingNotes")),
	};
}
