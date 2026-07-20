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

db.version(6).stores({
	Beans:
		"++id, name, flavors, roastLevel, countries, cities, botanic, varieties, brands, finished, dominantNote",
	Machines: "++id, name",
	Brews:
		"++id, beanId, overallRating, tasteScore, strengthScore, grindSize, date, machineId, beanWeight, espressoWeight, flow, extractionTime",
}).upgrade((transaction) =>
	transaction.table("Beans").toCollection().modify((bean) => {
		const legacy = bean as typeof bean & {
			origin?: string[];
			city?: string;
			variety?: string[];
			brand?: string;
		};
		legacy.countries ??= legacy.origin ?? [];
		legacy.cities ??= legacy.city ? [legacy.city] : [];
		legacy.varieties ??= legacy.variety ?? [];
		legacy.brands ??= legacy.brand ? [legacy.brand] : [];
	}),
);

export { db };
