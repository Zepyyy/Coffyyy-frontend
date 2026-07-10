import { db } from "@/db/db";
import type { BeanCardProps } from "@/types/BeanTypes";
import type { BrewSuggestions, Brews } from "@/types/BrewTypes";
import type { MachineCardProps } from "@/types/MachineTypes";

export type HistorySortMode =
	| "newest"
	| "oldest"
	| "bean-asc"
	| "bean-desc"
	| "rating-desc"
	| "rating-asc";

export type HistorySidebarStats = {
	total: number;
	uniqueBeans: number;
	avgRating: number | null;
	last7Days: number;
	topMachine: number | null;
};

function sortBrews(list: Brews[], sort: HistorySortMode): Brews[] {
	const sorted = [...list];
	const dateMs = (d: Date | string) => +new Date(d);
	switch (sort) {
		case "newest":
			sorted.sort((a, b) => dateMs(b.date) - dateMs(a.date));
			break;
		case "oldest":
			sorted.sort((a, b) => dateMs(a.date) - dateMs(b.date));
			break;
		case "bean-asc":
			sorted.sort((a, b) => (a.beanId ?? 0) - (b.beanId ?? 0));
			break;
		case "bean-desc":
			sorted.sort((a, b) => (b.beanId ?? 0) - (a.beanId ?? 0));
			break;
		case "rating-desc":
			sorted.sort((a, b) => (b.overallRating ?? 0) - (a.overallRating ?? 0));
			break;
		case "rating-asc":
			sorted.sort((a, b) => (a.overallRating ?? 0) - (b.overallRating ?? 0));
			break;
		default:
			break;
	}
	return sorted;
}

export async function getRecentBrews(limit = 5): Promise<Array<Brews>> {
	const brews = await db.Brews.orderBy("date").reverse().limit(limit).toArray();
	return brews;
}

export async function getLatestUnratedBrew(): Promise<Brews | null> {
	const brews = await db.Brews.orderBy("date").reverse().toArray();
	return (
		brews.find(
			(b) =>
				b.tasteScore == null ||
				b.strengthScore == null ||
				b.overallRating == null,
		) ?? null
	);
}

export async function getBrewsForHistoryView(
	sort: HistorySortMode,
	search: string,
	minRating: number | null,
): Promise<Brews[]> {
	let list = await db.Brews.toArray();
	const q = search.trim().toLowerCase();
	if (q) {
		list = list.filter(
			(b) =>
				Boolean(b.beanId?.toString().toLowerCase().includes(q)) ||
				Boolean(b.machineId?.toString().toLowerCase().includes(q)),
		);
	}
	if (minRating !== null) {
		list = list.filter((b) => (b.overallRating ?? 0) >= minRating);
	}
	return sortBrews(list, sort);
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
	const sum = brews.reduce((s, b) => s + (Number(b.overallRating) || 0), 0);
	const avg = sum / brews.length;
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
		})),
	);
	const machines = await db.Machines.toArray().then((b) =>
		b.map((b) => ({
			id: b.id,
			name: b.name,
			type: b.type,
		})),
	);
	const BeanCardProps = beans as Array<BeanCardProps>;
	const MachineCardProps = machines as Array<MachineCardProps>;

	return {
		bean: BeanCardProps,
		machine: MachineCardProps,
	};
}
