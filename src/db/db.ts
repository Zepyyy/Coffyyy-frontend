import { Dexie, type EntityTable } from "dexie";
import { methodFromMachineType } from "@/lib/brewMethods";
import { randomId } from "@/lib/randomId";
import type { Beans } from "@/types/BeanTypes";
import type { BrewMethod, Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import type { Recipes } from "@/types/RecipeTypes";
import type { Enrollment } from "./sync/types";

const db = new Dexie("Coffyyy") as Dexie & {
	Beans: EntityTable<Beans, "id">;
	Machines: EntityTable<Machines, "id">;
	Brews: EntityTable<Brews, "id">;
	Recipes: EntityTable<Recipes, "id">;
	Enrollment: EntityTable<Enrollment, "id">;
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

db.version(6)
	.stores({
		Beans:
			"++id, localId, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
		Machines: "++id, localId, name",
		Brews:
			"++id, localId, bean, overallRating, tasteScore, strengthScore, grindSize, date, machine, beanWeight, espressoWeight, flow, extractionTime",
		Outbox:
			"++id, &operationId, status, [status+sequence], entity, entityLocalId, clientId, nextAttemptAt",
		RemoteMappings: "++id, &[entity+localId], entity, localId, remoteId",
	})
	.upgrade(async (tx) => {
		for (const tableName of ["Beans", "Machines", "Brews"] as const) {
			const table = tx.table(tableName);
			await table.toCollection().modify((record) => {
				if (!record.localId) record.localId = randomId();
			});
		}
	});

db.version(7).stores({
	SyncState: "&id",
});

db.version(8).stores({
	Beans:
		"++id, localId, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote, deletedAt",
	Machines: "++id, localId, name, deletedAt",
	Brews:
		"++id, localId, bean, overallRating, tasteScore, strengthScore, grindSize, date, machine, beanWeight, espressoWeight, flow, extractionTime, deletedAt",
	Outbox:
		"++id, &operationId, status, [status+sequence], entity, entityLocalId, clientId, nextAttemptAt",
	RemoteMappings: "++id, &[entity+localId], entity, localId, remoteId",
	Tombstones:
		"++id, &[entity+localId], entity, localId, remoteId, serverRevision",
	SyncState: "&id",
});

db.version(9).stores({
	SyncLeases: "&id, workspaceId, ownerId, expiresAt",
});

db.version(10).stores({
	Beans:
		"++id, localId, name, flavors, roastLevel, origin, botanic, variety, brand, finished, dominantNote",
	Machines: "++id, localId, name",
	Brews:
		"++id, localId, bean, machine, overallRating, tasteScore, strengthScore, grindSize, date",
	Enrollment: "&id, workspaceId, paused",
	Outbox: null,
	RemoteMappings: null,
	Tombstones: null,
	SyncState: null,
	SyncLeases: null,
});

db.version(11)
	.stores({
		Beans:
			"++id, localId, name, flavors, roastLevel, origin, city, botanic, variety, brand, finished, dominantNote",
		Machines: "++id, localId, name",
		Brews:
			"++id, localId, bean, machine, overallRating, tasteScore, strengthScore, grindSize, date",
		Enrollment: "&id, workspaceId, paused",
	})
	.upgrade(async (tx) => {
		for (const tableName of ["Beans", "Machines", "Brews"] as const) {
			await tx
				.table(tableName)
				.toCollection()
				.modify((record) => {
					delete record.serverRevision;
					delete record.deletedAt;
					delete record.remoteBeanId;
					delete record.remoteMachineId;
				});
		}
	});

// Multi-method brewing: Machine.type (free text) becomes a Brew method,
// espressoWeight becomes brewWeight, brews record their own method.
db.version(12)
	.stores({
		Machines: "++id, localId, name, method",
		Brews:
			"++id, localId, bean, machine, beanId, machineId, recipeId, method, overallRating, tasteScore, strengthScore, grindSize, date",
		Recipes: "++id, localId, method, beanId",
	})
	.upgrade(async (tx) => {
		const methods = new Map<number, BrewMethod>();
		await tx
			.table("Machines")
			.toCollection()
			.modify((machine) => {
				machine.method = methodFromMachineType(machine.type);
				delete machine.type;
				methods.set(machine.id, machine.method);
			});
		await tx
			.table("Brews")
			.toCollection()
			.modify((brew) => {
				if (brew.brewWeight === undefined)
					brew.brewWeight = brew.espressoWeight;
				delete brew.espressoWeight;
				brew.method = methods.get(brew.machineId) ?? "espresso";
			});
	});

export { db };
