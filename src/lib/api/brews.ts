import { db } from "@/db/db";
import type { BeanCardProps } from "@/types/BeanTypes";
import type { BrewSuggestions, Brews } from "@/types/BrewTypes";
import type { MachineCardProps } from "@/types/MachineTypes";

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
	return brews.slice(0, limit);
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

/** The most recent brew of one bean — the recipe the next shot starts from. */
export async function getLastBrewForBean(
	beanId: number | undefined,
): Promise<Brews | null> {
	if (!beanId) return null;
	const brews = await db.Brews.filter((b) => b.beanId === beanId).toArray();
	if (brews.length === 0) return null;
	return brews.sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
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
