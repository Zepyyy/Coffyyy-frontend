import { Dexie, type EntityTable } from "dexie";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Brewers } from "@/types/BrewerTypes";

// A new database name is the intentional local-data reset. Existing
// development data is disposable and no compatibility migration is required.
const db = new Dexie("CoffyyyBrewer") as Dexie & {
	Beans: EntityTable<Beans, "id">;
	Brewers: EntityTable<Brewers, "id">;
	Brews: EntityTable<Brews, "id">;
};

db.version(1)
	.stores({
		Beans:
			"++id, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
		Brewers: "++id, name, type",
		Brews:
			"++id, beanId, method, brewerId, overallRating, tasteScore, strengthScore, grindSize, date, beanWeight, espressoWeight, waterAmount, heatLevel, brewTime, flow, extractionTime",
	});

export { db };
