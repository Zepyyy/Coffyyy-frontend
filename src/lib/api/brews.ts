import { db } from "@/db/db";
import type { BeanCardProps } from "@/types/BeanTypes";
import type { BrewSuggestions, Brews } from "@/types/BrewTypes";
import { getAllMachineNames } from "./machines";

export async function getRecentBrews(limit = 5): Promise<Array<Brews>> {
	const brews = await db.Brews.orderBy("date").reverse().limit(limit).toArray();
	return brews;
}

export async function getBrewSuggestions(): Promise<BrewSuggestions> {
	const beans = await db.Beans.toArray().then((b) =>
		b.map((b) => ({
			name: b.name,
			origin: b.origin,
			dominantNote: b.dominantNote,
			process: b.process,
			roastLevel: b.roastLevel,
		})),
	);
	const machines = await getAllMachineNames();
	const BeanCardProps = beans as Array<BeanCardProps>;

	return {
		bean: BeanCardProps,
		machine: machines,
	};
}
