import { db } from "@/db/db";
import type { BeanCardProps } from "@/types/BeanTypes";
import type { BrewMethod, BrewSuggestions, Brews } from "@/types/BrewTypes";
import type { MachineCardProps } from "@/types/MachineTypes";
import type { Recipes } from "@/types/RecipeTypes";

export type HistorySidebarStats = {
	total: number;
	uniqueBeans: number;
	avgRating: number | null;
	last7Days: number;
	topMachine: number | null;
};

function sortBrews(list: Brews[], order: "newest" | "oldest"): Brews[] {
	const sorted = [...list];
	const dateMs = (d: Date | string) => +new Date(d);
	if (order === "newest") {
		sorted.sort((a, b) => dateMs(b.date) - dateMs(a.date));
	} else {
		sorted.sort((a, b) => dateMs(a.date) - dateMs(b.date));
	}
	return sorted;
}

async function getBrewNameMaps() {
	const [beans, machines, recipes] = await Promise.all([
		db.Beans.toArray(),
		db.Machines.toArray(),
		db.Recipes.toArray(),
	]);

	return {
		beans: new Map(beans.map((bean) => [bean.id, bean.name])),
		machines: new Map(machines.map((machine) => [machine.id, machine.name])),
		recipes: new Map(recipes.map((recipe) => [recipe.id, recipe.name])),
	};
}

export async function getRecentBrews(limit = 5): Promise<Array<Brews>> {
	const brews = await db.Brews.orderBy("date").reverse().toArray();
	return brews.slice(0, limit);
}

/** How long a saved-but-unrated brew keeps asking for taste notes. */
const FEEDBACK_WINDOW_MS = 72 * 60 * 60 * 1000;

export async function getLatestUnratedBrew(
	excludedIds: readonly number[] = [],
): Promise<Brews | null> {
	const cutoff = Date.now() - FEEDBACK_WINDOW_MS;
	const excluded = new Set(excludedIds);
	const brews = await db.Brews.orderBy("date").reverse().toArray();
	return (
		brews.find(
			(b) =>
				!excluded.has(b.id) &&
				+new Date(b.date) >= cutoff &&
				(b.tasteScore == null ||
					b.strengthScore == null ||
					b.overallRating == null),
		) ?? null
	);
}

export type GrindSettingSummary = {
	grindSize: number;
	/** Newest brew made at this setting. */
	lastBrew: Brews;
	shotCount: number;
};

/**
 * One entry per grind setting used on a bean, newest use first. With a
 * method, only that method's brews count (grind means different things
 * across methods).
 */
export async function getGrindSettingsForBean(
	beanId: number | undefined,
	method?: BrewMethod,
): Promise<GrindSettingSummary[]> {
	if (!beanId) return [];
	const brews = await db.Brews.filter(
		(b) => b.beanId === beanId && (!method || b.method === method),
	).toArray();
	const byGrind = new Map<number, Brews[]>();
	for (const brew of brews) {
		if (brew.grindSize == null) continue;
		const list = byGrind.get(brew.grindSize) ?? [];
		list.push(brew);
		byGrind.set(brew.grindSize, list);
	}
	return [...byGrind.entries()]
		.map(([grindSize, list]) => ({
			grindSize,
			lastBrew: list.sort((a, b) => +new Date(b.date) - +new Date(a.date))[0],
			shotCount: list.length,
		}))
		.sort((a, b) => +new Date(b.lastBrew.date) - +new Date(a.lastBrew.date))
		.slice(0, 6);
}

/**
 * The most recent brew of one bean (of one method, when given) — the values
 * the next brew starts from.
 */
export async function getLastBrewForBean(
	beanId: number | undefined,
	method?: BrewMethod,
): Promise<Brews | null> {
	if (!beanId) return null;
	const brews = await db.Brews.filter(
		(b) => b.beanId === beanId && (!method || b.method === method),
	).toArray();
	if (brews.length === 0) return null;
	return brews.sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
}

/**
 * The Brewer the next brew most likely uses: the one behind the newest brew
 * (of `method`, when given), else the first Brewer. Null when none exists.
 */
export async function getLastUsedMachineId(
	method?: BrewMethod,
): Promise<number | null> {
	const machines = (await db.Machines.toArray()).filter(
		(m) => !method || m.method === method,
	);
	if (machines.length === 0) return null;
	const ids = new Set(machines.map((m) => m.id));
	const brews = await db.Brews.orderBy("date").reverse().toArray();
	const last = brews.find((b) => b.machineId != null && ids.has(b.machineId));
	return last?.machineId ?? machines[0].id;
}

export type BrewFormStart = {
	machineId: number | null;
	/** The start Brewer's method. */
	method: BrewMethod | null;
	beanId: number | null;
	/** Recipe to follow; null when missing, unusable for the bean, or no Brewer has its method. */
	recipe: Recipes | null;
};

/**
 * Where the brew log form starts, from its deep-link params (`?bean=`,
 * `?recipe=`). A recipe picks a Brewer of its method and, when bean-tied,
 * its bean. An explicit bean wins over a recipe tied to another bean.
 */
export async function getBrewFormStart(
	beanParam?: number,
	recipeParam?: number,
): Promise<BrewFormStart> {
	const bean = beanParam ? await db.Beans.get(beanParam) : undefined;
	let recipe = recipeParam
		? ((await db.Recipes.get(recipeParam)) ?? null)
		: null;
	if (recipe && bean && recipe.beanId != null && recipe.beanId !== bean.id) {
		recipe = null;
	}
	let machineId = recipe ? await getLastUsedMachineId(recipe.method) : null;
	if (machineId == null) {
		recipe = null;
		machineId = await getLastUsedMachineId();
	}
	const machine = machineId != null ? await db.Machines.get(machineId) : null;
	return {
		machineId,
		method: machine?.method ?? null,
		beanId: bean?.id ?? recipe?.beanId ?? null,
		recipe,
	};
}

/** The most recent brew overall. */
export async function getLastBrew(): Promise<Brews | null> {
	const brews = await db.Brews.orderBy("date").reverse().toArray();
	return brews[0] ?? null;
}

export async function getBrewsForHistoryView(
	search: string,
	minRating: number | null,
): Promise<Brews[]> {
	let list = await db.Brews.toArray();
	const names = await getBrewNameMaps();
	const q = search.trim().toLowerCase();
	if (q) {
		list = list.filter((brew) => {
			const beanName =
				brew.beanId != null ? names.beans.get(brew.beanId)?.toLowerCase() : "";
			const machineName =
				brew.machineId != null
					? names.machines.get(brew.machineId)?.toLowerCase()
					: "";
			return (
				Boolean(brew.notes?.toLowerCase().includes(q)) ||
				Boolean(
					brew.recipeId != null &&
						names.recipes.get(brew.recipeId)?.toLowerCase().includes(q),
				) ||
				Boolean(beanName?.includes(q)) ||
				Boolean(machineName?.includes(q)) ||
				Boolean(brew.beanId?.toString().includes(q)) ||
				Boolean(brew.machineId?.toString().includes(q))
			);
		});
	}
	if (minRating !== null) {
		list = list.filter((b) => (b.overallRating ?? 0) >= minRating);
	}
	return sortBrews(list, "newest");
}

export async function getHistorySidebarStats(): Promise<HistorySidebarStats> {
	const brews = await db.Brews.toArray();
	if (brews.length === 0) {
		return {
			total: 0,
			uniqueBeans: 0,
			avgRating: null,
			last7Days: 0,
			topMachine: null,
		};
	}
	const beans = new Set(
		brews.map((b) => b.beanId).filter((n): n is number => Boolean(n)),
	);
	const ratedBrews = brews.filter((b) => b.overallRating != null);
	const sum = ratedBrews.reduce(
		(s, b) => s + (Number(b.overallRating) || 0),
		0,
	);
	const avg = ratedBrews.length > 0 ? sum / ratedBrews.length : null;
	const now = Date.now();
	const weekMs = 7 * 24 * 60 * 60 * 1000;
	const last7Days = brews.filter(
		(b) => now - +new Date(b.date) <= weekMs,
	).length;

	const machineCounts = new Map<number, number>();
	for (const b of brews) {
		if (!b.machineId) continue;
		machineCounts.set(b.machineId, (machineCounts.get(b.machineId) ?? 0) + 1);
	}
	let topMachine: number | null = null;
	let top = 0;
	for (const [name, count] of machineCounts) {
		if (count > top) {
			top = count;
			topMachine = name;
		}
	}

	return {
		total: brews.length,
		uniqueBeans: beans.size,
		avgRating: avg,
		last7Days,
		topMachine,
	};
}

export async function getBrewsForBeanId(
	beanId: number | undefined,
): Promise<Brews[]> {
	if (!beanId) return [];
	const brews = await db.Brews.filter((b) => b.beanId === beanId).toArray();
	return brews.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function getBrewSuggestions(): Promise<BrewSuggestions> {
	const beans = await db.Beans.toArray().then((b) =>
		b.map((b) => ({
			id: b.id,
			name: b.name,
			origin: b.origin,
			dominantNote: b.dominantNote,
			process: b.process,
			roastLevel: b.roastLevel,
			status: b.status,
		})),
	);
	const machines = await db.Machines.toArray().then((b) =>
		b.map((b) => ({
			id: b.id,
			name: b.name,
			method: b.method,
		})),
	);
	const BeanCardProps = beans as Array<BeanCardProps>;
	const MachineCardProps = machines as Array<MachineCardProps>;

	return {
		bean: BeanCardProps,
		machine: MachineCardProps,
	};
}
