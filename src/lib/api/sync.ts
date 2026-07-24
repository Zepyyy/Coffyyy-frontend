import { db } from "@/db/db";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import {
	listPendingOperations,
	maxAttempts,
	nextRetry,
	recoverStalePushes,
} from "@/db/sync/outbox";
import type {
	BackendPushOperation,
	OutboxRecord,
	PushResponse,
	RemoteMapping,
	SyncEntity,
	SyncOperation,
} from "@/db/sync/types";
import { ApiError, api } from "@/lib/axios";

export type RemoteChange = {
	revision: number;
	entityType: Uppercase<SyncEntity>;
	serverId: number;
	clientId: string;
	operation: Uppercase<SyncOperation>;
	payload: Record<string, unknown>;
};

export type ChangePage = {
	changes: RemoteChange[];
	nextCursor: number | null;
	hasMore: boolean;
	fullResyncRequired: boolean;
};

export class FullResyncRequiredError extends Error {
	constructor() {
		super("Remote change history expired; full resync required");
		this.name = "FullResyncRequiredError";
	}
}

export async function getSyncCursor() {
	return (await db.SyncState.get("changes"))?.cursor ?? 0;
}

export async function pullRemoteChanges(limit = 100) {
	let pages = 0;
	let applied = 0;

	while (true) {
		const cursor = await getSyncCursor();
		const response = await api.get<ChangePage>("/sync/changes", {
			params: { since: cursor, limit },
		});
		const page = validateChangePage(response.data);
		if (page.fullResyncRequired) throw new FullResyncRequiredError();
		const nextCursor = page.nextCursor ?? cursor;
		if (nextCursor < cursor) {
			throw new Error("Remote change cursor moved backwards");
		}
		if (page.hasMore && nextCursor === cursor && page.changes.length === 0) {
			throw new Error("Remote change feed made no progress");
		}

		let pageApplied = 0;
		await db.transaction(
			"rw",
			[
				db.Beans,
				db.Machines,
				db.Brews,
				db.Outbox,
				db.RemoteMappings,
				db.SyncState,
			],
			async () => {
				for (const change of page.changes) {
					if (await applyRemoteChange(change)) pageApplied += 1;
				}
				const current = await db.SyncState.get("changes");
				await db.SyncState.put({
					id: "changes",
					cursor: Math.max(current?.cursor ?? 0, nextCursor),
					updatedAt: Date.now(),
				});
			},
		);

		pages += 1;
		applied += pageApplied;
		if (!page.hasMore) {
			return { pages, applied, cursor: await getSyncCursor() };
		}
	}
}

export function toBackendOperation(
	operation: OutboxRecord,
	mappings: RemoteMapping[],
): BackendPushOperation {
	const mappingByKey = new Map(
		mappings.map((mapping) => [
			mappingKey(mapping.entity, mapping.localId),
			mapping,
		]),
	);
	const entityType = operation.entity.toUpperCase() as Uppercase<
		typeof operation.entity
	>;
	const mapping =
		operation.operation === "create"
			? undefined
			: mappingByKey.get(mappingKey(operation.entity, operation.entityLocalId));
	const backend: BackendPushOperation = {
		operationId: operation.operationId,
		entityType,
		operation: operation.operation.toUpperCase() as Uppercase<
			typeof operation.operation
		>,
		clientId: operation.clientId,
		payload: { ...operation.payload },
	};
	if (operation.operation !== "create") {
		if (!mapping || typeof mapping.remoteId !== "number") {
			throw new Error(`Missing remote mapping for ${operation.entityLocalId}`);
		}
		backend.serverId = mapping.remoteId;
		backend.baseRevision =
			operation.baseRevision ?? Number(mapping.serverRevision ?? 0);
	}

	if (operation.entity === "brew") {
		for (const field of ["beanId", "machineId"] as const) {
			const localId = backend.payload[field];
			if (typeof localId !== "string") continue;
			const dependencyEntity = field === "beanId" ? "bean" : "machine";
			const mapping = mappingByKey.get(mappingKey(dependencyEntity, localId));
			if (!mapping || typeof mapping.remoteId !== "number") {
				throw new Error(`Missing remote mapping for ${localId}`);
			}
			backend.payload[field] = mapping.remoteId;
		}
	}

	return backend;
}

export async function pushPendingOperations() {
	await recoverStalePushes();
	let pushed = 0;

	while (true) {
		const operation = (await listPendingOperations())[0];
		if (!operation) break;
		if (!(await claim(operation))) continue;

		try {
			const backendOperation = toBackendOperation(
				operation,
				await db.RemoteMappings.toArray(),
			);
			const response = await api.post<PushResponse>(
				"/sync/push",
				backendOperation,
			);
			await acknowledge(operation, response.data);
			pushed += 1;
		} catch (error) {
			await recordFailure(operation, error);
		}
	}
	return pushed;
}

async function claim(operation: OutboxRecord) {
	if (operation.id === undefined) return false;
	return db.transaction("rw", db.Outbox, async () => {
		const current = await db.Outbox.get(operation.id as number);
		if (!current || current.status !== "pending") return false;
		await db.Outbox.update(operation.id as number, {
			status: "pushing",
			updatedAt: Date.now(),
		});
		return true;
	});
}

async function acknowledge(operation: OutboxRecord, response: PushResponse) {
	if (operation.id === undefined) return;
	const results = Array.isArray(response) ? response : [response];
	const result = results.find(
		(item) => item.operationId === operation.operationId,
	);
	if (!result) throw new Error("Push response did not acknowledge operation");
	if (result.status === "rejected") {
		await markFailed(operation, result.reason ?? "Server rejected operation");
		return;
	}

	await db.transaction("rw", db.Outbox, db.RemoteMappings, async () => {
		await db.Outbox.update(operation.id as number, {
			status: "acked",
			serverResult: result,
			serverRevision: result.canonicalRevision ?? result.revision,
			updatedAt: Date.now(),
		});
		if (result.serverId !== undefined) {
			const mapping = {
				entity: operation.entity,
				localId: operation.entityLocalId,
				remoteId: result.serverId,
				serverRevision: result.canonicalRevision ?? result.revision,
				updatedAt: Date.now(),
			};
			const existing = await db.RemoteMappings.where("[entity+localId]")
				.equals([mapping.entity, mapping.localId])
				.first();
			if (existing?.id === undefined) await db.RemoteMappings.add(mapping);
			else await db.RemoteMappings.update(existing.id, mapping);
		}
	});
}

async function recordFailure(operation: OutboxRecord, error: unknown) {
	if (operation.id === undefined) return;
	const attempts = operation.attempts + 1;
	const terminal = isTerminalFailure(error);
	await db.Outbox.update(operation.id, {
		status: terminal || attempts >= maxAttempts() ? "failed" : "pending",
		attempts,
		nextAttemptAt: nextRetry(attempts),
		lastError: error instanceof Error ? error.message : String(error),
		updatedAt: Date.now(),
	});
}

async function markFailed(operation: OutboxRecord, reason: string) {
	if (operation.id === undefined) return;
	await db.Outbox.update(operation.id, {
		status: "failed",
		lastError: reason,
		updatedAt: Date.now(),
	});
}

function isTerminalFailure(error: unknown) {
	if (error instanceof ApiError) {
		return (
			error.status === 400 ||
			error.status === 404 ||
			error.status === 409 ||
			error.status === 422
		);
	}
	return (
		error instanceof Error && error.message.startsWith("Missing remote mapping")
	);
}

async function applyRemoteChange(change: RemoteChange) {
	const entity = normalizeEntity(change.entityType);
	const operation = normalizeOperation(change.operation);
	const mapping = await findMapping(entity, change.serverId, change.clientId);
	const localId = mapping?.localId ?? change.clientId ?? crypto.randomUUID();
	const currentRevision = Math.max(
		Number(mapping?.serverRevision ?? 0),
		await localRevision(entity, localId, change.serverId),
	);
	if (change.revision <= currentRevision) return false;

	await putMapping({
		entity,
		localId,
		remoteId: change.serverId,
		serverRevision: change.revision,
		updatedAt: Date.now(),
	});

	if (operation === "delete") {
		await deleteLocalRecord(entity, localId, change.serverId);
		return true;
	}

	await upsertLocalRecord(
		entity,
		localId,
		change.serverId,
		change.payload,
		change.revision,
	);
	if (entity === "bean" || entity === "machine") {
		await repairBrewReferences(entity, change.serverId);
	}
	return true;
}

async function findMapping(
	entity: SyncEntity,
	serverId: number,
	clientId: string,
) {
	return (
		(await db.RemoteMappings.where("remoteId")
			.equals(serverId)
			.filter((candidate) => candidate.entity === entity)
			.first()) ??
		(await db.RemoteMappings.where("[entity+localId]")
			.equals([entity, clientId])
			.first())
	);
}

async function putMapping(mapping: Omit<RemoteMapping, "id">) {
	const existing = await db.RemoteMappings.where("[entity+localId]")
		.equals([mapping.entity, mapping.localId])
		.first();
	if (existing?.id === undefined) await db.RemoteMappings.add(mapping);
	else await db.RemoteMappings.update(existing.id, mapping);
}

async function deleteLocalRecord(
	entity: SyncEntity,
	localId: string,
	serverId: number,
) {
	if (entity === "bean") {
		const current = await localRecord(db.Beans, localId, serverId);
		if (current) await db.Beans.delete(current.id);
		return;
	}
	if (entity === "machine") {
		const current = await localRecord(db.Machines, localId, serverId);
		if (current) await db.Machines.delete(current.id);
		return;
	}
	const current = await localRecord(db.Brews, localId, serverId);
	if (current) await db.Brews.delete(current.id);
}

async function upsertLocalRecord(
	entity: SyncEntity,
	localId: string,
	serverId: number,
	payload: Record<string, unknown>,
	revision: number,
) {
	if (entity === "bean") {
		const current = await localRecord(db.Beans, localId, serverId);
		await db.Beans.put(
			remoteBean(payload, current?.id ?? serverId, localId, revision),
		);
		return;
	}
	if (entity === "machine") {
		const current = await localRecord(db.Machines, localId, serverId);
		await db.Machines.put(
			remoteMachine(payload, current?.id ?? serverId, localId, revision),
		);
		return;
	}
	const current = await localRecord(db.Brews, localId, serverId);
	await db.Brews.put(
		await remoteBrew(payload, current?.id ?? serverId, localId, revision),
	);
}

async function localRecord<
	T extends { id: number; localId?: string; serverRevision?: number },
>(
	table: {
		where(index: string): {
			equals(value: string): { first(): Promise<T | undefined> };
		};
		get(id: number): Promise<T | undefined>;
	},
	localId: string,
	serverId: number,
) {
	const byLocalId = await table.where("localId").equals(localId).first();
	if (byLocalId) return byLocalId;
	const byServerId = await table.get(serverId);
	if (byServerId && byServerId.localId !== localId) {
		throw new Error(`Remote id collision for ${localId}`);
	}
	return byServerId;
}

async function localRevision(
	entity: SyncEntity,
	localId: string,
	serverId: number,
) {
	if (entity === "bean")
		return (
			(await localRecord(db.Beans, localId, serverId))?.serverRevision ?? 0
		);
	if (entity === "machine")
		return (
			(await localRecord(db.Machines, localId, serverId))?.serverRevision ?? 0
		);
	return (await localRecord(db.Brews, localId, serverId))?.serverRevision ?? 0;
}

function remoteBean(
	payload: Record<string, unknown>,
	id: number,
	localId: string,
	serverRevision: number,
): Beans {
	return {
		id,
		localId,
		serverRevision,
		name: text(payload.name),
		flavors: strings(payload.flavors),
		rating: number(payload.rating),
		status: titleEnum(payload.status, "NEW") as Beans["status"],
		dominantNote: titleEnum(
			payload.dominantNote,
			"FRUITY",
		) as Beans["dominantNote"],
		roastLevel: number(payload.roastLevel),
		origin: [...strings(payload.countries), ...strings(payload.cities)],
		process: [],
		variety: strings(payload.varieties),
		brand: strings(payload.brands)[0] ?? "",
		botanic: titleEnum(payload.botanic, "ARABICA") as Beans["botanic"],
		designation: titleEnum(
			payload.designation,
			"PURE_ORIGIN",
		) as Beans["designation"],
		finished: Boolean(payload.finished),
	};
}

function remoteMachine(
	payload: Record<string, unknown>,
	id: number,
	localId: string,
	serverRevision: number,
): Machines {
	return {
		id,
		localId,
		serverRevision,
		name: text(payload.name),
		brand: text(payload.brand),
		type: text(payload.type),
		purchaseDate: text(payload.purchaseDate),
		model: text(payload.model),
		grindRange: text(payload.grindRange),
		capacity: text(payload.capacity),
	};
}

async function remoteBrew(
	payload: Record<string, unknown>,
	id: number,
	localId: string,
	serverRevision: number,
): Promise<Brews> {
	const bean = await remoteForeignKey("bean", payload.beanId);
	const machine = await remoteForeignKey("machine", payload.machineId);
	return {
		id,
		localId,
		serverRevision,
		beanWeight: number(payload.beanWeight),
		espressoWeight: number(payload.espressoWeight),
		extractionTime: text(payload.extractionTime),
		flow: text(payload.flow),
		overallRating: number(payload.overallRating),
		tasteScore: number(payload.tasteScore),
		strengthScore: number(payload.strengthScore),
		grindSize: number(payload.grindSize),
		date: new Date(text(payload.date)),
		beanId: bean.id,
		machineId: machine.id,
		...(bean.unresolvedRemoteId === undefined
			? {}
			: { remoteBeanId: bean.unresolvedRemoteId }),
		...(machine.unresolvedRemoteId === undefined
			? {}
			: { remoteMachineId: machine.unresolvedRemoteId }),
	};
}

async function remoteForeignKey(entity: "bean" | "machine", value: unknown) {
	if (typeof value !== "number" || !Number.isInteger(value)) {
		return { id: undefined };
	}
	const mapping = await db.RemoteMappings.where("remoteId")
		.equals(value)
		.filter((candidate) => candidate.entity === entity)
		.first();
	if (!mapping) {
		const existing =
			entity === "bean"
				? await db.Beans.get(value)
				: await db.Machines.get(value);
		return existing
			? { id: existing.id }
			: { id: undefined, unresolvedRemoteId: value };
	}
	if (entity === "bean") {
		const local = await db.Beans.where("localId")
			.equals(mapping.localId)
			.first();
		return local
			? { id: local.id }
			: { id: undefined, unresolvedRemoteId: value };
	}
	const local = await db.Machines.where("localId")
		.equals(mapping.localId)
		.first();
	return local
		? { id: local.id }
		: { id: undefined, unresolvedRemoteId: value };
}

async function repairBrewReferences(
	entity: "bean" | "machine",
	remoteId: number,
) {
	const mapping = await db.RemoteMappings.where("remoteId")
		.equals(remoteId)
		.filter((candidate) => candidate.entity === entity)
		.first();
	if (!mapping) return;
	const local =
		entity === "bean"
			? await db.Beans.where("localId").equals(mapping.localId).first()
			: await db.Machines.where("localId").equals(mapping.localId).first();
	if (!local) return;
	for (const brew of await db.Brews.toArray()) {
		if (
			(entity === "bean" && brew.remoteBeanId === remoteId) ||
			(entity === "machine" && brew.remoteMachineId === remoteId)
		) {
			await db.Brews.update(
				brew.id,
				entity === "bean"
					? { beanId: local.id, remoteBeanId: undefined }
					: { machineId: local.id, remoteMachineId: undefined },
			);
		}
	}
}

function normalizeEntity(value: string): SyncEntity {
	const entity = value.toLowerCase();
	if (entity === "bean" || entity === "machine" || entity === "brew")
		return entity;
	throw new Error(`Unsupported remote entity: ${value}`);
}

function normalizeOperation(value: string): SyncOperation {
	const operation = value.toLowerCase();
	if (
		operation === "create" ||
		operation === "update" ||
		operation === "delete"
	)
		return operation;
	throw new Error(`Unsupported remote operation: ${value}`);
}

function validateChangePage(value: ChangePage) {
	if (
		!value ||
		!Array.isArray(value.changes) ||
		(typeof value.nextCursor !== "number" && value.nextCursor !== null) ||
		typeof value.hasMore !== "boolean" ||
		typeof value.fullResyncRequired !== "boolean"
	) {
		throw new Error("Remote change response is invalid");
	}
	return value;
}

function number(value: unknown) {
	return typeof value === "number" ? value : Number(value) || 0;
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

function mappingKey(entity: string, localId: string) {
	return `${entity}:${localId}`;
}
