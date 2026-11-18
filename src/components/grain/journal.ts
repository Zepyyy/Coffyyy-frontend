import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";

/**
 * What a background may know about the journal: one entry per bean, enough
 * for a scene to grow something from it. Plain data, so scenes stay pure
 * functions of (t, journal).
 */
export type GardenBean = {
	id: number;
	name: string;
	origin: string[];
	/** 1 (light) to 10 (dark), when known. */
	roastLevel: number | null;
	dominantNote: string;
	/** The bag is used up. */
	finished: boolean;
	brews: number;
	/** Epoch ms of the most recent brew. */
	lastBrew: number | null;
	/** Epoch ms of the first brew. */
	firstBrew: number | null;
	/** Mean overall rating of rated brews, 1-5. */
	rating: number | null;
};
export type Journal = { beans: GardenBean[] };
export const EMPTY_JOURNAL: Journal = { beans: [] };

export async function readJournal(): Promise<Journal> {
	const [beans, brews] = await Promise.all([
		db.Beans.toArray(),
		db.Brews.toArray(),
	]);
	const by = new Map<
		number,
		{ n: number; last: number; first: number; sum: number; rated: number }
	>();
	for (const b of brews) {
		if (b.beanId == null) continue;
		const at = new Date(b.date).getTime();
		const s = by.get(b.beanId) ?? {
			n: 0,
			last: -Infinity,
			first: Infinity,
			sum: 0,
			rated: 0,
		};
		s.n++;
		s.last = Math.max(s.last, at);
		s.first = Math.min(s.first, at);
		if (typeof b.overallRating === "number") {
			s.sum += b.overallRating;
			s.rated++;
		}
		by.set(b.beanId, s);
	}
	return {
		beans: beans
			.map((b) => {
				const s = by.get(b.id);
				return {
					id: b.id,
					name: b.name ?? "",
					origin: b.origin ?? [],
					roastLevel: typeof b.roastLevel === "number" ? b.roastLevel : null,
					dominantNote: String(b.dominantNote ?? ""),
					finished: Boolean(b.finished),
					brews: s?.n ?? 0,
					lastBrew: s ? s.last : null,
					firstBrew: s ? s.first : null,
					rating: s?.rated ? s.sum / s.rated : null,
				};
			})
			.sort((a, b) => a.id - b.id),
	};
}

export function useJournal(): Journal {
	return useLiveQuery(readJournal, []) ?? EMPTY_JOURNAL;
}
