import { Dexie, type EntityTable } from "dexie";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import type {
	OutboxRecord,
	RemoteMapping,
	RemoteTombstone,
	SyncCursor,
	SyncLease,
} from "./sync/types";

const db = new Dexie("Coffyyy") as Dexie & {
	Beans: EntityTable<Beans, "id">;
	Machines: EntityTable<Machines, "id">;
	Brews: EntityTable<Brews, "id">;
	Outbox: EntityTable<OutboxRecord, "id">;
	RemoteMappings: EntityTable<RemoteMapping, "id">;
	Tombstones: EntityTable<RemoteTombstone, "id">;
	SyncState: EntityTable<SyncCursor, "id">;
	SyncLeases: EntityTable<SyncLease, "id">;
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
				if (!record.localId) record.localId = crypto.randomUUID();
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

export { db };
