import { Dexie, type EntityTable } from "dexie";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";

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

db.version(2).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote, tastingNotes",
	Machines: "++id, name",
	Brews:
		"++id, bean, overallRating, grindSize, date, machine, beanWeight, espressoWeight, flow, extractionTime",
});

db.version(3).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
	Machines: "++id, name",
	Brews:
		"++id, bean, overallRating, grindSize, date, machine, beanWeight, espressoWeight, flow, extractionTime",
});

db.version(4).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
	Machines: "++id, name",
	Brews:
		"++id, bean, overallRating, tasteScore, grindSize, date, machine, beanWeight, espressoWeight, flow, extractionTime",
});

db.version(5).stores({
	Beans:
		"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
	Machines: "++id, name",
	Brews:
		"++id, bean, overallRating, tasteScore, strengthScore, grindSize, date, machine, beanWeight, espressoWeight, flow, extractionTime",
});

export { db };
