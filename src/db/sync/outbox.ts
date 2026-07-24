import { db } from "@/db/db";
import type { OutboxRecord, SyncEntity, SyncOperation } from "./types";

export type QueueOperationInput = {
	entity: SyncEntity;
	entityLocalId: string;
	operation: SyncOperation;
	payload: Record<string, unknown>;
	dependencyIds?: string[];
};

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [1_000, 5_000, 30_000, 300_000, 1_800_000];

export async function queueOperation(input: QueueOperationInput) {
	const now = Date.now();
	const dependencyIds = new Set(input.dependencyIds ?? []);
	if (input.operation !== "create") {
		const mapping = await db.RemoteMappings.where("[entity+localId]")
			.equals([input.entity, input.entityLocalId])
			.first();
		if (!mapping) {
			const pendingCreate = await db.Outbox.where("entityLocalId")
				.equals(input.entityLocalId)
				.filter(
					(operation) =>
						operation.entity === input.entity &&
						operation.operation === "create" &&
						operation.status !== "failed",
				)
				.first();
			if (pendingCreate) dependencyIds.add(input.entityLocalId);
		}
	}
	const record: OutboxRecord = {
		...input,
		operationId: crypto.randomUUID(),
		clientId: input.entityLocalId,
		dependencyIds: [...dependencyIds],
		sequence: 0,
		status: "pending",
		attempts: 0,
		nextAttemptAt: now,
		createdAt: now,
		updatedAt: now,
	};
	const id = await db.Outbox.add(record);
	await db.Outbox.update(id, { sequence: id });
	return id;
}

export async function listPendingOperations(now = Date.now()) {
	await recoverStalePushes();
	const pending = await db.Outbox.where("status")
		.equals("pending")
		.filter((operation) => operation.nextAttemptAt <= now)
		.sortBy("sequence");
	const completed = new Set(
		(await db.Outbox.where("status").equals("acked").toArray()).map(
			(operation) => operation.entityLocalId,
		),
	);
	for (const mapping of await db.RemoteMappings.toArray())
		completed.add(mapping.localId);
	const failed = new Set(
		(await db.Outbox.where("status").equals("failed").toArray()).map(
			(operation) => operation.entityLocalId,
		),
	);
	const ready = [];
	for (const operation of pending) {
		const failedDependency = operation.dependencyIds.find((id) =>
			failed.has(id),
		);
		if (failedDependency) {
			await db.Outbox.update(operation.id as number, {
				status: "failed",
				lastError: `Dependency failed: ${failedDependency}`,
				updatedAt: Date.now(),
			});
			continue;
		}
		if (
			operation.dependencyIds.every((dependencyId) =>
				completed.has(dependencyId),
			)
		) {
			ready.push(operation);
		}
	}
	return ready;
}

export async function retryOperation(id: number) {
	await db.Outbox.update(id, {
		status: "pending",
		attempts: 0,
		nextAttemptAt: Date.now(),
		lastError: undefined,
		updatedAt: Date.now(),
	});
}

export async function recoverStalePushes(maxAgeMs = 5 * 60_000) {
	const cutoff = Date.now() - maxAgeMs;
	await db.Outbox.where("status")
		.equals("pushing")
		.modify((operation) => {
			if (operation.updatedAt < cutoff) {
				operation.status = "pending";
				operation.nextAttemptAt = Date.now();
			}
		});
}

export async function exportFailedOperations() {
	return db.Outbox.where("status").equals("failed").toArray();
}

export async function listOutboxOperations() {
	return db.Outbox.toArray();
}

export async function countOutboxOperations() {
	return db.Outbox.where("status")
		.anyOf("pending", "pushing", "failed")
		.count();
}

export async function countFailedOperations() {
	return db.Outbox.where("status").equals("failed").count();
}

export async function retryFailedOperations() {
	const failed = await exportFailedOperations();
	await Promise.all(
		failed.flatMap((operation) =>
			operation.id === undefined ? [] : [retryOperation(operation.id)],
		),
	);
}

export async function clearOutbox() {
	await db.Outbox.clear();
}

export function nextRetry(attempts: number) {
	return Date.now() + BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
}

export function maxAttempts() {
	return MAX_ATTEMPTS;
}
