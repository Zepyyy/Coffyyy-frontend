import { Dexie, type EntityTable } from "dexie";
import type { Beans } from "@/types/BeanTypes";
import type { Brews, Machines } from "@/types/default";

const db = new Dexie("Coffyyy") as Dexie & {
	Beans: EntityTable<Beans, "id">;
	Machines: EntityTable<Machines, "id">;
	Brews: EntityTable<Brews, "id">;
};

db.version(1).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote, tastingNotes",
	Machines: "++id, name",
	Brews:
		"++id, bean, overallRating, grindSize, date, acidity, adjustementNeeded, aftertaste",
});

export { db };
