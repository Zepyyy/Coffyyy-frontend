import { api } from "@/lib/axios";
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

export type BrewWrite = Omit<Brews, "id" | "overallRating" | "tasteScore" | "strengthScore"> & {
	overallRating?: number;
	tasteScore?: number;
	strengthScore?: number;
};

type BackendBrew = Omit<Brews, "date"> & { date: string };

function fromBackendBrew(brew: BackendBrew): Brews {
	return { ...brew, date: new Date(brew.date) };
}

export async function listBrews() {
	const response = await api.get<BackendBrew[]>("/brew");
	return response.data.map(fromBackendBrew);
}

export async function getBrew(id: number) {
	const response = await api.get<BackendBrew>(`/brew/${id}`);
	return fromBackendBrew(response.data);
}

export async function createBrew(brew: BrewWrite) {
	const response = await api.post<BackendBrew>("/brew", brew);
	return fromBackendBrew(response.data);
}

export async function updateBrew(id: number, brew: Partial<Brews>) {
	const response = await api.patch<BackendBrew>(`/brew/${id}`, brew);
	return fromBackendBrew(response.data);
}

export async function deleteBrew(id: number) {
	await api.delete(`/brew/${id}`);
}

function sortBrews(list: Brews[], sort: HistorySortMode): Brews[] {
	const sorted = [...list];
	const dateMs = (date: Date | string) => +new Date(date);
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
	}
	return sorted;
}

export function getBrewsForHistoryView(
	brews: Brews[],
	beans: BeanCardProps[],
	machines: MachineCardProps[],
	sort: HistorySortMode,
	search: string,
	minRating: number | null,
) {
	const beanNames = new Map(beans.map((bean) => [bean.id, bean.name]));
	const machineNames = new Map(machines.map((machine) => [machine.id, machine.name]));
	const query = search.trim().toLowerCase();
	let list = brews.filter((brew) => {
		if (!query) return true;
		return [
			brew.beanId != null ? beanNames.get(brew.beanId) : "",
			brew.machineId != null ? machineNames.get(brew.machineId) : "",
			brew.beanId?.toString(),
			brew.machineId?.toString(),
		].some((value) => value?.toLowerCase().includes(query));
	});
	if (minRating !== null) list = list.filter((brew) => (brew.overallRating ?? 0) >= minRating);
	if (sort === "bean-asc" || sort === "bean-desc") {
		return [...list].sort((a, b) => {
			const aName = beanNames.get(a.beanId ?? 0) ?? "";
			const bName = beanNames.get(b.beanId ?? 0) ?? "";
			return sort === "bean-asc" ? aName.localeCompare(bName) : bName.localeCompare(aName);
		});
	}
	return sortBrews(list, sort);
}

export function getHistorySidebarStats(brews: Brews[]): HistorySidebarStats {
	const beans = new Set(brews.map((brew) => brew.beanId).filter((id): id is number => Boolean(id)));
	const rated = brews.filter((brew) => brew.overallRating != null);
	const avgRating = rated.length > 0
		? rated.reduce((sum, brew) => sum + (brew.overallRating ?? 0), 0) / rated.length
		: null;
	const weekMs = 7 * 24 * 60 * 60 * 1000;
	const last7Days = brews.filter((brew) => Date.now() - +new Date(brew.date) <= weekMs).length;
	const counts = new Map<number, number>();
	for (const brew of brews) if (brew.machineId) counts.set(brew.machineId, (counts.get(brew.machineId) ?? 0) + 1);
	let topMachine: number | null = null;
	let top = 0;
	for (const [machineId, count] of counts) if (count > top) {
		top = count;
		topMachine = machineId;
	}
	return { total: brews.length, uniqueBeans: beans.size, avgRating, last7Days, topMachine };
}

export function getBrewSuggestions(beans: BeanCardProps[], machines: MachineCardProps[]): BrewSuggestions {
	return { bean: beans, machine: machines };
}
