import { db } from "@/db/db";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import {
	listPendingOperations,
	maxAttempts,
	nextRetry,
	queueOperation,
	recoverStalePushes,
	UNRESOLVED_OUTBOX_STATUSES,
} from "@/db/sync/outbox";
import type {
	BackendPushOperation,
	OutboxRecord,
	PushResult,
	PushResponse,
	RemoteMapping,
	RemoteTombstone,
	RecoveryHistoryEntry,
	RecoveryHistoryPage,
	SyncEntity,
	SyncOperation,
} from "@/db/sync/types";
import { ApiError, api } from "@/lib/axios";
import { SyncLeaseLostError } from "@/db/sync/coordinator";

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

export type SyncLeaseGuard = () => Promise<void>;

export async function getSyncCursor() {
	return (await db.SyncState.get("changes"))?.cursor ?? 0;
}

export async function getRemoteHistory(options?: {
	entity?: SyncEntity;
	serverId?: number;
	limit?: number;
}) {
	const changes: RecoveryHistoryEntry[] = [];
	let since = 0;
	let hasMore = false;
	let retentionBoundary = "";

	do {
		const response = await api.get<RecoveryHistoryPage>("/sync/history", {
			params: {
				since,
				limit: options?.limit ?? 100,
				...(options?.entity
					? { entityType: options.entity.toUpperCase() }
					: {}),
				...(options?.serverId !== undefined
					? { serverId: options.serverId }
					: {}),
			},
		});
		const page = validateRecoveryHistoryPage(response.data);
		changes.push(...page.changes);
		retentionBoundary = page.retentionBoundary;
		hasMore = page.hasMore;
		if (hasMore && page.nextCursor <= since) {
			throw new Error("Remote recovery history made no progress");
		}
		since = page.nextCursor;
	} while (hasMore);

	return { changes, retentionBoundary };
}

export async function restoreRemoteVersion(entry: RecoveryHistoryEntry) {
	const entity = normalizeEntity(entry.entityType);
	const mapping = await findMapping(entity, entry.serverId, entry.clientId);
	if (!mapping || typeof mapping.serverRevision !== "number") {
		throw new Error("Sync record revision unavailable; sync before restoring");
	}

	const payload = recoveryPayload(entry.payload);
	return db.transaction(
		"rw",
		[
			db.Beans,
			db.Machines,
			db.Brews,
			db.Outbox,
			db.RemoteMappings,
			db.Tombstones,
		],
		async () => {
			const tombstone = await db.Tombstones.where("[entity+localId]")
				.equals([entity, mapping.localId])
				.first();
			const deleted = Boolean(tombstone || mapping.deletedAt !== undefined);
			const localId = deleted ? crypto.randomUUID() : mapping.localId;
			if (!deleted) await clearTombstone(entity, mapping.localId);
			await upsertLocalRecord(
				entity,
				localId,
				entry.serverId,
				payload,
				deleted ? 0 : (mapping.serverRevision as number),
			);
			const id = await queueOperation({
				entity,
				entityLocalId: localId,
				operation: deleted ? "create" : "update",
				payload,
			});
			const operation = await db.Outbox.get(id);
			if (!operation?.operationId)
				throw new Error("Restore operation was not queued");
			return { operationId: operation.operationId, recreated: deleted };
		},
	);
}

export async function pullRemoteChanges(
	limit = 100,
	assertLease?: SyncLeaseGuard,
) {
	let pages = 0;
	let applied = 0;

	while (true) {
		await assertLease?.();
		const cursor = await getSyncCursor();
		const response = await api.get<ChangePage>("/sync/changes", {
			params: { since: cursor, limit },
		});
		await assertLease?.();
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
				db.Tombstones,
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

export async function pushPendingOperations(assertLease?: SyncLeaseGuard) {
	await recoverStalePushes();
	let pushed = 0;

	while (true) {
		await assertLease?.();
		const operation = (await listPendingOperations())[0];
		if (!operation) break;
		if (!(await claim(operation))) continue;

		try {
			await assertLease?.();
			const backendOperation = toBackendOperation(
				operation,
				await db.RemoteMappings.toArray(),
			);
			const response = await api.post<PushResponse>(
				"/sync/push",
				backendOperation,
			);
			await assertLease?.();
			await acknowledge(operation, response.data);
			pushed += 1;
		} catch (error) {
			if (error instanceof SyncLeaseLostError) {
				await db.Outbox.update(operation.id as number, {
					status: "pending",
					nextAttemptAt: Date.now(),
					lastError: "Sync lease lost; retrying",
					updatedAt: Date.now(),
				});
				throw error;
			}
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
		await markFailed(
			operation,
			result.reason === "stale_revision"
				? "Conflict: a newer server revision exists"
				: result.reason === "already_deleted"
					? "Conflict: record is deleted on server"
					: (result.reason ?? "Server rejected operation"),
			result,
		);
		return;
	}

	await db.transaction(
		"rw",
		db.Outbox,
		db.RemoteMappings,
		db.Tombstones,
		async () => {
			const current = await db.Outbox.get(operation.id as number);
			if (!current || current.status !== "pushing") return;
			const tombstone = await db.Tombstones.where("[entity+localId]")
				.equals([operation.entity, operation.entityLocalId])
				.first();
			if (tombstone) {
				await db.Outbox.update(operation.id as number, {
					status: "failed",
					lastError: "Remote entity was deleted",
					updatedAt: Date.now(),
				});
				return;
			}
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
		},
	);
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

async function markFailed(
	operation: OutboxRecord,
	reason: string,
	result?: PushResult,
) {
	if (operation.id === undefined) return;
	const serverRevision = result?.canonicalRevision ?? result?.revision;
	await db.Outbox.update(operation.id, {
		status: "failed",
		lastError: reason,
		...(result ? { serverResult: result } : {}),
		...(serverRevision === undefined ? {} : { serverRevision }),
		updatedAt: Date.now(),
	});
	if (serverRevision === undefined) return;
	const mapping = await db.RemoteMappings.where("[entity+localId]")
		.equals([operation.entity, operation.entityLocalId])
		.first();
	if (mapping?.id !== undefined)
		await db.RemoteMappings.update(mapping.id, {
			serverRevision,
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
		deletedAt: operation === "delete" ? Date.now() : undefined,
		updatedAt: Date.now(),
	});

	if (operation === "delete") {
		await putTombstone({
			entity,
			localId,
			remoteId: change.serverId,
			serverRevision: change.revision,
			deletedAt: Date.now(),
			updatedAt: Date.now(),
		});
		await failPendingOperations(entity, localId);
		await tombstoneLocalRecord(
			entity,
			localId,
			change.serverId,
			change.revision,
		);
		return true;
	}

	await clearTombstone(entity, localId);
	if (await hasUnresolvedLocalWork(entity, localId)) {
		await preserveLocalRecord(
			entity,
			localId,
			change.serverId,
			change.revision,
		);
	} else {
		await upsertLocalRecord(
			entity,
			localId,
			change.serverId,
			change.payload,
			change.revision,
		);
	}
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

async function putTombstone(tombstone: Omit<RemoteTombstone, "id">) {
	const existing = await db.Tombstones.where("[entity+localId]")
		.equals([tombstone.entity, tombstone.localId])
		.first();
	if (existing?.id === undefined) await db.Tombstones.add(tombstone);
	else await db.Tombstones.update(existing.id, tombstone);
}

async function clearTombstone(entity: SyncEntity, localId: string) {
	const existing = await db.Tombstones.where("[entity+localId]")
		.equals([entity, localId])
		.first();
	if (existing?.id !== undefined) await db.Tombstones.delete(existing.id);
}

async function failPendingOperations(entity: SyncEntity, localId: string) {
	await db.Outbox.where("entityLocalId")
		.equals(localId)
		.filter(
			(operation) =>
				operation.entity === entity && operation.status === "pending",
		)
		.modify((operation) => {
			operation.status = "failed";
			operation.lastError = "Remote entity was deleted";
			operation.updatedAt = Date.now();
		});
}

async function hasUnresolvedLocalWork(entity: SyncEntity, localId: string) {
	return Boolean(
		await db.Outbox.where("entityLocalId")
			.equals(localId)
			.filter(
				(operation) =>
					operation.entity === entity &&
					UNRESOLVED_OUTBOX_STATUSES.some(
						(status) => status === operation.status,
					),
			)
			.first(),
	);
}

async function preserveLocalRecord(
	entity: SyncEntity,
	localId: string,
	serverId: number,
	serverRevision: number,
) {
	if (entity === "bean") {
		const current = await localRecord(db.Beans, localId, serverId);
		if (current) await db.Beans.update(current.id, { serverRevision });
		return;
	}
	if (entity === "machine") {
		const current = await localRecord(db.Machines, localId, serverId);
		if (current) await db.Machines.update(current.id, { serverRevision });
		return;
	}
	const current = await localRecord(db.Brews, localId, serverId);
	if (current) await db.Brews.update(current.id, { serverRevision });
}

async function tombstoneLocalRecord(
	entity: SyncEntity,
	localId: string,
	serverId: number,
	serverRevision: number,
) {
	if (entity === "bean") {
		const current = await localRecord(db.Beans, localId, serverId);
		if (current)
			await db.Beans.update(current.id, {
				deletedAt: Date.now(),
				serverRevision,
			});
		return;
	}
	if (entity === "machine") {
		const current = await localRecord(db.Machines, localId, serverId);
		if (current)
			await db.Machines.update(current.id, {
				deletedAt: Date.now(),
				serverRevision,
			});
		return;
	}
	const current = await localRecord(db.Brews, localId, serverId);
	if (current)
		await db.Brews.update(current.id, {
			deletedAt: Date.now(),
			serverRevision,
		});
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

function validateRecoveryHistoryPage(value: RecoveryHistoryPage) {
	if (
		!value ||
		!Array.isArray(value.changes) ||
		(typeof value.nextCursor !== "number" || value.nextCursor < 0) ||
		typeof value.hasMore !== "boolean" ||
		typeof value.retentionBoundary !== "string"
	) {
		throw new Error("Remote recovery history response is invalid");
	}
	return value;
}

function recoveryPayload(payload: Record<string, unknown>) {
	return Object.fromEntries(
		Object.entries(payload).filter(
			([key]) =>
				![
					"id",
					"revision",
					"deletedAt",
					"userId",
					"clientId",
					"createdAt",
					"updatedAt",
				].includes(key),
		),
	);
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
