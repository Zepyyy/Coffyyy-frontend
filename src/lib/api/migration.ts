import { db } from "@/db/db";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import type {
	OutboxRecord,
	RemoteMapping,
	RemoteTombstone,
	SyncCursor,
} from "@/db/sync/types";
import { api } from "@/lib/axios";

export type LocalSnapshot = {
	beans: Beans[];
	machines: Machines[];
	brews: Brews[];
	remoteMappings: RemoteMapping[];
	tombstones?: RemoteTombstone[];
	outbox: OutboxRecord[];
	syncState: SyncCursor[];
};

export type LocalDataCounts = {
	beans: number;
	machines: number;
	brews: number;
};

type ImportPayload = {
	schemaVersion: number;
	idempotencyKey: string;
	beans: Array<Record<string, unknown>>;
	machines: Array<Record<string, unknown>>;
	brews: Array<Record<string, unknown>>;
};

type RemoteBean = Record<string, unknown> & { id: number };
type RemoteMachine = Record<string, unknown> & { id: number };
type RemoteBrew = Record<string, unknown> & { id: number };

export type RemoteWorkspace = {
	beans: RemoteBean[];
	machines: RemoteMachine[];
	brews: RemoteBrew[];
};

export async function snapshotLocalData(): Promise<LocalSnapshot> {
	const [beans, machines, brews] = await Promise.all([
		db.Beans.toArray(),
		db.Machines.toArray(),
		db.Brews.toArray(),
	]);
	const remoteMappings = await db.RemoteMappings.toArray();
	const tombstones = await db.Tombstones.toArray();
	const outbox = await db.Outbox.toArray();
	const syncState = await db.SyncState.toArray();
	return {
		beans,
		machines,
		brews,
		remoteMappings,
		tombstones,
		outbox,
		syncState,
	};
}

export function getSnapshotCounts(snapshot: LocalSnapshot): LocalDataCounts {
	return {
		beans: snapshot.beans.length,
		machines: snapshot.machines.length,
		brews: snapshot.brews.length,
	};
}

function enumValue(value: string, fallback: string) {
	return value ? value.replaceAll(" ", "_").toUpperCase() : fallback;
}

function toImportPayload(
	snapshot: LocalSnapshot,
	idempotencyKey: string,
): ImportPayload {
	const beanLocalIds = new Map(
		snapshot.beans.map((bean) => [bean.id, bean.localId ?? String(bean.id)]),
	);
	const machineLocalIds = new Map(
		snapshot.machines.map((machine) => [
			machine.id,
			machine.localId ?? String(machine.id),
		]),
	);
	return {
		schemaVersion: 5,
		idempotencyKey,
		beans: snapshot.beans.map((bean) => ({
			localId: bean.localId ?? String(bean.id),
			name: bean.name,
			flavors: bean.flavors,
			rating: bean.rating,
			roastLevel: bean.roastLevel,
			countries: bean.origin,
			cities: [],
			botanic: enumValue(bean.botanic, "ARABICA"),
			varieties: bean.variety,
			brands: bean.brand ? [bean.brand] : [],
			status: enumValue(bean.status, "NEW"),
			dominantNote: enumValue(bean.dominantNote, "FRUITY"),
			designation: enumValue(bean.designation, "PURE_ORIGIN"),
			finished: bean.finished,
		})),
		machines: snapshot.machines.map((machine) => ({
			localId: machine.localId ?? String(machine.id),
			name: machine.name,
			brand: machine.brand,
			type: machine.type,
			purchaseDate: machine.purchaseDate || null,
			model: machine.model,
			grindRange: machine.grindRange,
			capacity: machine.capacity,
		})),
		brews: snapshot.brews.map((brew) => ({
			localId: brew.localId ?? String(brew.id),
			beanLocalId:
				brew.beanId === undefined
					? undefined
					: (beanLocalIds.get(brew.beanId) ?? String(brew.beanId)),
			machineLocalId:
				brew.machineId === undefined
					? undefined
					: (machineLocalIds.get(brew.machineId) ?? String(brew.machineId)),
			beanWeight: brew.beanWeight,
			espressoWeight: brew.espressoWeight,
			extractionTime: brew.extractionTime ?? "",
			flow: brew.flow ?? "",
			overallRating: brew.overallRating ?? 0,
			tasteScore: brew.tasteScore ?? 0,
			strengthScore: brew.strengthScore ?? 0,
			grindSize: brew.grindSize,
			date: new Date(brew.date).toISOString(),
		})),
	};
}

export async function importLocalData(
	snapshot: LocalSnapshot,
	idempotencyKey = crypto.randomUUID(),
) {
	const payload = toImportPayload(snapshot, idempotencyKey);
	return api.post<{ status: string }>("/migration/import", payload);
}

export async function fetchRemoteWorkspace(): Promise<RemoteWorkspace> {
	const [beans, machines, brews] = await Promise.all([
		api.get<RemoteBean[]>("/bean"),
		api.get<RemoteMachine[]>("/machine"),
		api.get<RemoteBrew[]>("/brew"),
	]);
	return {
		beans: beans.data,
		machines: machines.data,
		brews: brews.data,
	};
}

export function assertCanonicalWorkspace(
	snapshot: LocalSnapshot,
	remote: RemoteWorkspace,
) {
	assertRemoteWorkspace(remote);
	const counts = getSnapshotCounts(snapshot);
	if (
		remote.beans.length !== counts.beans ||
		remote.machines.length !== counts.machines ||
		remote.brews.length !== counts.brews
	) {
		throw new Error("Canonical workspace count verification failed");
	}
	const remoteBeanNames = new Set(remote.beans.map((bean) => text(bean.name)));
	const remoteMachineNames = new Set(
		remote.machines.map((machine) => text(machine.name)),
	);
	if (snapshot.beans.some((bean) => !remoteBeanNames.has(bean.name))) {
		throw new Error("Canonical bean verification failed");
	}
	if (
		snapshot.machines.some((machine) => !remoteMachineNames.has(machine.name))
	) {
		throw new Error("Canonical machine verification failed");
	}
}

export function assertRemoteWorkspace(remote: RemoteWorkspace) {
	if (
		!Array.isArray(remote.beans) ||
		!Array.isArray(remote.machines) ||
		!Array.isArray(remote.brews)
	) {
		throw new Error("Remote workspace response is invalid");
	}

	const beanIds = new Set(remote.beans.map((bean) => bean.id));
	const machineIds = new Set(remote.machines.map((machine) => machine.id));
	if (
		remote.beans.some((bean) => !Number.isInteger(bean.id)) ||
		remote.machines.some((machine) => !Number.isInteger(machine.id)) ||
		remote.brews.some(
			(brew) =>
				!Number.isInteger(brew.id) ||
				!beanIds.has(Number(brew.beanId)) ||
				!machineIds.has(Number(brew.machineId)),
		)
	) {
		throw new Error("Remote workspace references are invalid");
	}
}

function text(value: unknown) {
	return typeof value === "string" ? value : "";
}

function strings(value: unknown) {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

function titleEnum(value: unknown, fallback: string) {
	const source = text(value) || fallback;
	return source
		.toLowerCase()
		.replaceAll("_", " ")
		.split(/\s+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function remoteBean(bean: RemoteBean): Beans {
	const brands = strings(bean.brands);
	return {
		id: bean.id,
		localId: clientId(bean.clientId),
		serverRevision:
			typeof bean.revision === "number" ? bean.revision : undefined,
		name: text(bean.name),
		flavors: strings(bean.flavors),
		rating: Number(bean.rating) || 0,
		status: titleEnum(bean.status, "NEW") as Beans["status"],
		dominantNote: titleEnum(
			bean.dominantNote,
			"FRUITY",
		) as Beans["dominantNote"],
		roastLevel: Number(bean.roastLevel) || 0,
		origin: [...strings(bean.countries), ...strings(bean.cities)],
		process: [],
		variety: strings(bean.varieties),
		brand: brands[0] ?? "",
		botanic: titleEnum(bean.botanic, "ARABICA") as Beans["botanic"],
		designation: titleEnum(
			bean.designation,
			"PURE ORIGIN",
		) as Beans["designation"],
		finished: Boolean(bean.finished),
	};
}

function remoteMachine(machine: RemoteMachine): Machines {
	return {
		id: machine.id,
		localId: clientId(machine.clientId),
		serverRevision:
			typeof machine.revision === "number" ? machine.revision : undefined,
		name: text(machine.name),
		brand: text(machine.brand),
		type: text(machine.type),
		purchaseDate: text(machine.purchaseDate),
		model: text(machine.model),
		grindRange: text(machine.grindRange),
		capacity: text(machine.capacity),
	};
}

function remoteBrew(brew: RemoteBrew): Brews {
	return {
		id: brew.id,
		localId: clientId(brew.clientId),
		serverRevision:
			typeof brew.revision === "number" ? brew.revision : undefined,
		beanWeight: Number(brew.beanWeight) || 0,
		espressoWeight: Number(brew.espressoWeight) || 0,
		extractionTime: text(brew.extractionTime),
		flow: text(brew.flow),
		overallRating: Number(brew.overallRating) || 0,
		tasteScore: Number(brew.tasteScore) || 0,
		strengthScore: Number(brew.strengthScore) || 0,
		grindSize: Number(brew.grindSize) || 0,
		date: new Date(text(brew.date)),
		beanId: Number(brew.beanId),
		machineId: Number(brew.machineId),
	};
}

export async function replaceWithRemoteData(
	remote: RemoteWorkspace,
	options: {
		removeOutboxOperationIds?: string[];
		discardOutbox?: boolean;
	} = {},
) {
	const beans = remote.beans.map(remoteBean);
	const machines = remote.machines.map(remoteMachine);
	const brews = remote.brews.map(remoteBrew);
	await db.transaction(
		"rw",
		[
			db.Beans,
			db.Machines,
			db.Brews,
			db.RemoteMappings,
			db.Tombstones,
			db.Outbox,
			db.SyncState,
		],
		async () => {
			await db.Brews.clear();
			await db.Beans.clear();
			await db.Machines.clear();
			await db.RemoteMappings.clear();
			await db.Tombstones.clear();
			await db.Beans.bulkPut(beans);
			await db.Machines.bulkPut(machines);
			await db.Brews.bulkPut(brews);
			await db.RemoteMappings.bulkPut([
				...beans.map((bean) =>
					remoteMapping("bean", bean.localId, bean.id, remote.beans),
				),
				...machines.map((machine) =>
					remoteMapping(
						"machine",
						machine.localId,
						machine.id,
						remote.machines,
					),
				),
				...brews.map((brew) =>
					remoteMapping("brew", brew.localId, brew.id, remote.brews),
				),
			]);
			await db.SyncState.put({
				id: "changes",
				cursor: 0,
				updatedAt: Date.now(),
			});
			if (options.discardOutbox) await db.Outbox.clear();
			if (options.removeOutboxOperationIds?.length) {
				await db.Outbox.where("operationId")
					.anyOf(options.removeOutboxOperationIds)
					.delete();
			}
		},
	);
}

export async function restoreLocalData(snapshot: LocalSnapshot) {
	await db.transaction(
		"rw",
		[
			db.Beans,
			db.Machines,
			db.Brews,
			db.RemoteMappings,
			db.Tombstones,
			db.Outbox,
			db.SyncState,
		],
		async () => {
			await db.Brews.clear();
			await db.Beans.clear();
			await db.Machines.clear();
			await db.RemoteMappings.clear();
			await db.Tombstones.clear();
			await db.Outbox.clear();
			await db.Beans.bulkPut(snapshot.beans);
			await db.Machines.bulkPut(snapshot.machines);
			await db.Brews.bulkPut(snapshot.brews);
			await db.RemoteMappings.bulkPut(snapshot.remoteMappings);
			if (snapshot.tombstones?.length)
				await db.Tombstones.bulkPut(snapshot.tombstones);
			await db.Outbox.bulkPut(snapshot.outbox);
			await db.SyncState.bulkPut(snapshot.syncState);
		},
	);
}

function clientId(value: unknown) {
	return typeof value === "string" && value ? value : crypto.randomUUID();
}

function remoteMapping(
	entity: "bean" | "machine" | "brew",
	localId: string | undefined,
	remoteId: number,
	rows: Array<Record<string, unknown>>,
) {
	const row = rows.find((candidate) => candidate.id === remoteId);
	return {
		entity,
		localId: localId ?? clientId(row?.clientId),
		remoteId,
		serverRevision:
			typeof row?.revision === "number" ? row.revision : undefined,
		updatedAt: Date.now(),
	};
}
