import { Dexie, type EntityTable } from "dexie";
import type { Beans } from "@/types/default";

const db = new Dexie("Beans") as Dexie & {
	Beans: EntityTable<Beans, "id">;
};

db.version(1).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote, tastingNotes",
});

export { db };
