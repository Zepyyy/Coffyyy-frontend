import { db } from "@/db/db";
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
} from "@/db/sync/types";
import { ApiError, api } from "@/lib/axios";

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
		const mapping = mappingByKey.get(
			mappingKey(operation.entity, operation.entityLocalId),
		);
		if (!mapping || typeof mapping.remoteId !== "number") {
			throw new Error(`Missing remote mapping for ${operation.entityLocalId}`);
		}
		backend.serverId = mapping.remoteId;
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
			serverRevision: result.revision,
			updatedAt: Date.now(),
		});
		if (result.serverId !== undefined) {
			const mapping = {
				entity: operation.entity,
				localId: operation.entityLocalId,
				remoteId: result.serverId,
				serverRevision: result.revision,
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

function mappingKey(entity: string, localId: string) {
	return `${entity}:${localId}`;
}
