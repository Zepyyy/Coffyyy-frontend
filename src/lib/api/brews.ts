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

async function getBrewNameMaps() {
	const [beans, machines] = await Promise.all([
		db.Beans.toArray(),
		db.Machines.toArray(),
	]);

	return {
		beans: new Map(beans.map((bean) => [bean.id, bean.name])),
		machines: new Map(machines.map((machine) => [machine.id, machine.name])),
	};
}

export async function getRecentBrews(limit = 5): Promise<Array<Brews>> {
	const brews = await db.Brews.orderBy("date").reverse().toArray();
	const active = brews.filter((brew) => brew.deletedAt === undefined);
	return active.slice(0, limit);
}

export async function getLatestUnratedBrew(): Promise<Brews | null> {
	const brews = (await db.Brews.orderBy("date").reverse().toArray()).filter(
		(brew) => brew.deletedAt === undefined,
	);
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
	let list = (await db.Brews.toArray()).filter(
		(brew) => brew.deletedAt === undefined,
	);
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
	if (sort === "bean-asc" || sort === "bean-desc") {
		return [...list].sort((a, b) => {
			const aName = a.beanId != null ? (names.beans.get(a.beanId) ?? "") : "";
			const bName = b.beanId != null ? (names.beans.get(b.beanId) ?? "") : "";
			return sort === "bean-asc"
				? aName.localeCompare(bName)
				: bName.localeCompare(aName);
		});
	}
	return sortBrews(list, sort);
}

export async function getHistorySidebarStats(): Promise<HistorySidebarStats> {
	const brews = (await db.Brews.toArray()).filter(
		(brew) => brew.deletedAt === undefined,
	);
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
	const brews = await db.Brews.filter(
		(b) => b.beanId === beanId && b.deletedAt === undefined,
	).toArray();
	return brews.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function getBrewSuggestions(
	includeDeleted = false,
): Promise<BrewSuggestions> {
	const beans = await (includeDeleted
		? db.Beans.toArray()
		: db.Beans.filter((b) => b.deletedAt === undefined).toArray()
	).then((b) =>
		b.map((b) => ({
			id: b.id,
			name: b.name,
			origin: b.origin,
			dominantNote: b.dominantNote,
			process: b.process,
			roastLevel: b.roastLevel,
		})),
	);
	const machines = await (includeDeleted
		? db.Machines.toArray()
		: db.Machines.filter((b) => b.deletedAt === undefined).toArray()
	).then((b) =>
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
