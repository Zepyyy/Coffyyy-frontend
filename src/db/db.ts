import { Dexie, type EntityTable } from "dexie";
import type { Beans, Machines } from "@/types/default";

const db = new Dexie("Coffyyy") as Dexie & {
	Beans: EntityTable<Beans, "id">;
	Machines: EntityTable<Machines, "id">;
};

db.version(1).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote, tastingNotes",
	Machines: "++id, name",
	DefaultValues: "++id, origins, varieties, processes, brands",
});

db.version(2).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote, tastingNotes",
	Machines: "++id, name",
	DefaultValues: "++id",
});

db.version(3).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote, tastingNotes",
	Machines: "++id, name",
});

db.on("populate", () => {
	db.Machines.bulkAdd([{ name: "" }]);
});

export { db };
