import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addBean, addBrew, addMachine } from "@/db/crud/add";
import { deleteBeanById } from "@/db/crud/delete";
import { db } from "@/db/db";
import {
	listPendingOperations,
	markOperationsReconciled,
	queueOperation,
	retryOperation,
} from "@/db/sync/outbox";
import { updateBeanById } from "@/db/crud/update";
import {
	getSyncCursor,
	getRemoteHistory,
	pullRemoteChanges,
	restoreRemoteVersion,
	toBackendOperation,
	pushPendingOperations,
} from "@/lib/api/sync";
import { ApiError, api } from "@/lib/axios";
import type { OutboxRecord } from "@/db/sync/types";
import { getAllBeans, getBeanCount } from "@/lib/api/beans";
import { getAllMachines, getMachineCount } from "@/lib/api/machines";
import { getBrewsForHistoryView, getBrewSuggestions } from "@/lib/api/brews";
import { PendingOutboxError, replaceWithRemoteData } from "@/lib/api/migration";

beforeEach(async () => {
	vi.restoreAllMocks();
	await db.open();
	await Promise.all([
		db.Beans.clear(),
		db.Machines.clear(),
		db.Brews.clear(),
		db.Outbox.clear(),
		db.RemoteMappings.clear(),
		db.Tombstones.clear(),
		db.SyncState.clear(),
	]);
});

describe("offline outbox", () => {
	it("allows active names to be reused after remote tombstones", async () => {
		await db.Beans.put({
			id: 11,
			localId: "deleted-bean",
			deletedAt: Date.now(),
			name: "Ethiopia",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.Machines.put({
			id: 12,
			localId: "deleted-machine",
			deletedAt: Date.now(),
			name: "Linea Mini",
			brand: "",
			type: "",
			purchaseDate: "",
			model: "",
			grindRange: "",
			capacity: "",
		});

		const beanId = await addBean({
			name: "Ethiopia",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		const machineId = await addMachine({
			name: "Linea Mini",
			brand: "",
			type: "",
			purchaseDate: "",
			model: "",
			grindRange: "",
			capacity: "",
		});

		expect(beanId).toEqual(expect.any(Number));
		expect(machineId).toEqual(expect.any(Number));
		expect(await getAllMachines()).toEqual([
			expect.objectContaining({ id: machineId, name: "Linea Mini" }),
		]);
		expect(await getMachineCount()).toBe(1);
	});

	it("writes a bean and its backend-shaped create operation atomically", async () => {
		const result = await addBean({
			name: "Ethiopia",
			rating: 4,
			status: "Good",
			dominantNote: "Fruity",
			roastLevel: 4,
			origin: ["Ethiopia"],
			process: ["Washed"],
			variety: ["74110"],
			brand: "Kawa",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: ["citrus"],
			finished: false,
		});

		expect(result).toEqual(expect.any(Number));
		const bean = await db.Beans.get(result as number);
		const [operation] = await db.Outbox.toArray();
		expect(bean?.localId).toEqual(expect.any(String));
		expect(operation).toMatchObject({
			entity: "bean",
			operation: "create",
			entityLocalId: bean?.localId,
			clientId: bean?.localId,
		});
		expect(operation.payload).toMatchObject({
			countries: ["Ethiopia"],
			brands: ["Kawa"],
			status: "GOOD",
		});
		expect(operation.payload).not.toHaveProperty("id");
	});

	it("holds a brew until bean and machine dependencies are mapped", async () => {
		const beanId = (await addBean({
			name: "Ethiopia",
			rating: 4,
			status: "Good",
			dominantNote: "Fruity",
			roastLevel: 4,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		})) as number;
		const machineId = (await addMachine({
			name: "Linea Mini",
			brand: "La Marzocco",
			type: "Espresso",
			purchaseDate: "2026-01-01",
			model: "Mini",
			grindRange: "fine",
			capacity: "2 cups",
		})) as number;
		await addBrew({
			beanId,
			machineId,
			beanWeight: 18,
			espressoWeight: 36,
			extractionTime: "30s",
			flow: "Even",
			grindSize: 12,
			date: new Date("2026-07-24"),
		});

		expect((await listPendingOperations()).map(({ entity }) => entity)).toEqual(
			["bean", "machine"],
		);
		const bean = await db.Beans.get(beanId);
		const machine = await db.Machines.get(machineId);
		await db.RemoteMappings.bulkPut([
			{
				entity: "bean",
				localId: bean?.localId as string,
				remoteId: 11,
				updatedAt: Date.now(),
			},
			{
				entity: "machine",
				localId: machine?.localId as string,
				remoteId: 12,
				updatedAt: Date.now(),
			},
		]);
		expect((await listPendingOperations()).map(({ entity }) => entity)).toEqual(
			["bean", "machine", "brew"],
		);
	});

	it("queues update and delete inside the same local write", async () => {
		const beanId = (await addBean({
			name: "Ethiopia",
			rating: 4,
			status: "Good",
			dominantNote: "Fruity",
			roastLevel: 4,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		})) as number;
		await db.Outbox.clear();
		await updateBeanById({ rating: 5 }, beanId);
		await deleteBeanById(beanId);

		expect(await db.Beans.get(beanId)).toBeUndefined();
		expect(await db.Outbox.count()).toBe(2);
		expect(
			(await db.Outbox.toArray()).map(({ operation }) => operation),
		).toEqual(["update", "delete"]);
	});
});

describe("push sync", () => {
	it("translates local identities and foreign keys for the backend", () => {
		const operation: OutboxRecord = {
			id: 1,
			operationId: "op-1",
			clientId: "brew-local",
			entity: "brew",
			entityLocalId: "brew-local",
			operation: "create",
			payload: {
				beanId: "bean-local",
				machineId: "machine-local",
				date: "2026-07-24",
			},
			dependencyIds: ["bean-local", "machine-local"],
			sequence: 1,
			status: "pending",
			attempts: 0,
			nextAttemptAt: 0,
			createdAt: 0,
			updatedAt: 0,
		};

		expect(
			toBackendOperation(operation, [
				{ entity: "bean", localId: "bean-local", remoteId: 11, updatedAt: 0 },
				{
					entity: "machine",
					localId: "machine-local",
					remoteId: 12,
					updatedAt: 0,
				},
			]),
		).toEqual({
			operationId: "op-1",
			entityType: "BREW",
			operation: "CREATE",
			clientId: "brew-local",
			payload: { beanId: 11, machineId: 12, date: "2026-07-24" },
		});
	});

	it("acknowledges operations and persists the server mapping", async () => {
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-local",
			operation: "create",
			payload: { name: "Ethiopia" },
		});
		vi.spyOn(api, "post").mockResolvedValue({
			data: { operationId: "missing", status: "applied" },
		} as never);
		const operation = (await db.Outbox.toArray())[0];
		vi.mocked(api.post).mockResolvedValue({
			data: {
				operationId: operation.operationId,
				status: "applied",
				serverId: 42,
				revision: 7,
			},
		} as never);

		await expect(pushPendingOperations()).resolves.toBe(1);
		expect(await db.Outbox.get(operation.id)).toMatchObject({
			status: "acked",
		});
		expect(
			await db.RemoteMappings.where("[entity+localId]")
				.equals(["bean", "bean-local"])
				.first(),
		).toMatchObject({
			remoteId: 42,
			serverRevision: 7,
		});

		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-local",
			operation: "update",
			payload: { name: "Ethiopia updated" },
		});
		const update = (await db.Outbox.toCollection().sortBy("sequence")).at(
			-1,
		) as OutboxRecord;
		vi.mocked(api.post).mockResolvedValue({
			data: {
				operationId: update.operationId,
				status: "applied",
				serverId: 42,
				revision: 8,
			},
		} as never);
		await expect(pushPendingOperations()).resolves.toBe(1);
		expect(await db.RemoteMappings.count()).toBe(1);
	});

	it("persists a tombstone when a local delete is acknowledged", async () => {
		await db.RemoteMappings.put({
			entity: "bean",
			localId: "bean-local",
			remoteId: 42,
			serverRevision: 7,
			updatedAt: 0,
		});
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-local",
			operation: "delete",
			payload: {},
		});
		const [operation] = await db.Outbox.toArray();
		vi.spyOn(api, "post").mockResolvedValue({
			data: {
				operationId: operation.operationId,
				status: "applied",
				serverId: 42,
				revision: 8,
			},
		} as never);

		await pushPendingOperations();
		expect(await db.Tombstones.toArray()).toEqual([
			expect.objectContaining({
				entity: "bean",
				localId: "bean-local",
				remoteId: 42,
				serverRevision: 8,
			}),
		]);
		expect(await db.RemoteMappings.toArray()).toEqual([
			expect.objectContaining({ deletedAt: expect.any(Number) }),
		]);
	});

	it("applies the server canonical record after an accepted push", async () => {
		const id = (await addBean({
			name: "Local name",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		})) as number;
		const bean = await db.Beans.get(id);
		const [operation] = await db.Outbox.toArray();
		vi.spyOn(api, "post").mockResolvedValue({
			data: {
				operationId: operation.operationId,
				status: "applied",
				serverId: 42,
				revision: 7,
				canonicalRevision: 7,
				canonical: {
					id: 42,
					clientId: bean?.localId,
					name: "Canonical name",
					flavors: [],
					rating: 2,
					roastLevel: 3,
					countries: ["Ethiopia"],
					cities: [],
					varieties: [],
					brands: ["Kawa"],
					status: "GOOD",
					dominantNote: "FRUITY",
					botanic: "ARABICA",
					designation: "PURE_ORIGIN",
					finished: false,
					revision: 7,
				},
			},
		} as never);

		await expect(pushPendingOperations()).resolves.toBe(1);
		expect(await db.Beans.get(id)).toMatchObject({
			name: "Canonical name",
			rating: 2,
			serverRevision: 7,
		});
	});

	it("keeps transient failures retryable and terminal failures visible", async () => {
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-local",
			operation: "create",
			payload: { name: "Ethiopia" },
		});
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("invalid", 400));

		await pushPendingOperations();
		expect(await db.Outbox.toArray()).toEqual([
			expect.objectContaining({ status: "failed", lastError: "invalid" }),
		]);
	});

	it("leaves expired sessions retryable", async () => {
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-local",
			operation: "create",
			payload: { name: "Ethiopia" },
		});
		vi.spyOn(api, "post").mockRejectedValue(new ApiError("expired", 401));

		await pushPendingOperations();
		expect(await db.Outbox.toArray()).toEqual([
			expect.objectContaining({ status: "pending", attempts: 1 }),
		]);
	});

	it("allows only one concurrent tab to claim an operation", async () => {
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-local",
			operation: "create",
			payload: { name: "Ethiopia" },
		});
		let release!: () => void;
		let started!: () => void;
		const requestStarted = new Promise<void>((resolve) => {
			started = resolve;
		});
		const requestRelease = new Promise<void>((resolve) => {
			release = resolve;
		});
		vi.spyOn(api, "post").mockImplementation(async () => {
			started();
			await requestRelease;
			const operation = (await db.Outbox.toArray())[0];
			return {
				data: {
					operationId: operation.operationId,
					status: "applied",
					serverId: 42,
					revision: 7,
				},
			} as never;
		});

		const first = pushPendingOperations();
		await requestStarted;
		await expect(pushPendingOperations()).resolves.toBe(0);
		release();
		await expect(first).resolves.toBe(1);
	});
});

describe("pull sync", () => {
	function change(
		revision: number,
		operation: "CREATE" | "UPDATE" | "DELETE",
		entityType: "BEAN" | "MACHINE" | "BREW",
		serverId: number,
		clientId: string | null,
		payload: Record<string, unknown>,
	) {
		return {
			revision,
			operation,
			entityType,
			serverId,
			clientId,
			payload,
		};
	}

	it("consumes every page and resumes from the durable cursor", async () => {
		vi.spyOn(api, "get")
			.mockResolvedValueOnce({
				data: {
					changes: [
						change(1, "CREATE", "BEAN", 11, "bean-1", {
							id: 11,
							name: "Ethiopia",
							revision: 1,
						}),
					],
					nextCursor: 1,
					hasMore: true,
					fullResyncRequired: false,
				},
			} as never)
			.mockResolvedValueOnce({
				data: {
					changes: [
						change(2, "UPDATE", "BEAN", 11, "bean-1", {
							id: 11,
							name: "Kenya",
							revision: 2,
						}),
					],
					nextCursor: 2,
					hasMore: false,
					fullResyncRequired: false,
				},
			} as never);

		await expect(pullRemoteChanges(1)).resolves.toMatchObject({
			pages: 2,
			applied: 2,
			cursor: 2,
		});
		expect(vi.mocked(api.get).mock.calls.map(([, config]) => config)).toEqual([
			expect.objectContaining({ params: { since: 0, limit: 1 } }),
			expect.objectContaining({ params: { since: 1, limit: 1 } }),
		]);
		expect(await db.Beans.get(11)).toMatchObject({
			name: "Kenya",
			localId: "bean-1",
			serverRevision: 2,
		});
	});

	it("uses a stable local identity for legacy changes without client IDs", async () => {
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [
					change(1, "CREATE", "BEAN", 11, null, {
						id: 11,
						name: "Legacy bean",
					}),
				],
				nextCursor: 1,
				hasMore: false,
				fullResyncRequired: false,
			},
		} as never);

		await pullRemoteChanges();
		expect(await db.Beans.get(11)).toMatchObject({
			localId: "remote:bean:11",
		});
	});

	it("ignores duplicate delivery and stale local revisions", async () => {
		await db.Beans.put({
			id: 11,
			localId: "bean-1",
			serverRevision: 5,
			name: "Local newer",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.RemoteMappings.put({
			entity: "bean",
			localId: "bean-1",
			remoteId: 11,
			serverRevision: 5,
			updatedAt: 0,
		});
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [
					change(4, "UPDATE", "BEAN", 11, "bean-1", {
						id: 11,
						name: "Stale",
						revision: 4,
					}),
				],
				nextCursor: 4,
				hasMore: false,
				fullResyncRequired: false,
			},
		} as never);

		await expect(pullRemoteChanges()).resolves.toMatchObject({ applied: 0 });
		await expect(pullRemoteChanges()).resolves.toMatchObject({ applied: 0 });
		expect(await db.Beans.get(11)).toMatchObject({ name: "Local newer" });
		expect(await getSyncCursor()).toBe(4);
	});

	it("maps remote brew foreign keys to existing local records", async () => {
		await db.Beans.put({
			id: 101,
			localId: "bean-local",
			name: "Ethiopia",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.Machines.put({
			id: 102,
			localId: "machine-local",
			name: "Linea Mini",
			brand: "",
			type: "",
			purchaseDate: "",
			model: "",
			grindRange: "",
			capacity: "",
		});
		await db.RemoteMappings.bulkPut([
			{ entity: "bean", localId: "bean-local", remoteId: 11, updatedAt: 0 },
			{
				entity: "machine",
				localId: "machine-local",
				remoteId: 12,
				updatedAt: 0,
			},
		]);
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [
					change(1, "CREATE", "BREW", 20, "brew-1", {
						id: 20,
						beanId: 11,
						machineId: 12,
						date: "2026-07-24T00:00:00.000Z",
					}),
				],
				nextCursor: 1,
				hasMore: false,
				fullResyncRequired: false,
			},
		} as never);

		await pullRemoteChanges();
		expect(await db.Brews.get(20)).toMatchObject({
			localId: "brew-1",
			beanId: 101,
			machineId: 102,
		});
	});

	it("tombstones remote deletes without breaking historical brew references", async () => {
		await db.Beans.put({
			id: 11,
			localId: "bean-1",
			serverRevision: 1,
			name: "Ethiopia",
			rating: 4,
			status: "Good",
			dominantNote: "Fruity",
			roastLevel: 4,
			origin: ["Ethiopia"],
			process: [],
			variety: [],
			brand: "Kawa",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.Machines.put({
			id: 12,
			localId: "machine-1",
			serverRevision: 1,
			name: "Linea Mini",
			brand: "La Marzocco",
			type: "Espresso",
			purchaseDate: "",
			model: "",
			grindRange: "",
			capacity: "",
		});
		await db.Brews.put({
			id: 20,
			localId: "brew-1",
			serverRevision: 1,
			beanId: 11,
			machineId: 12,
			beanWeight: 18,
			espressoWeight: 36,
			extractionTime: "30s",
			flow: "Even",
			overallRating: 5,
			tasteScore: 0,
			strengthScore: 0,
			grindSize: 12,
			date: new Date("2026-07-24"),
		});
		await db.RemoteMappings.bulkPut([
			{
				entity: "bean",
				localId: "bean-1",
				remoteId: 11,
				serverRevision: 1,
				updatedAt: 0,
			},
			{
				entity: "machine",
				localId: "machine-1",
				remoteId: 12,
				serverRevision: 1,
				updatedAt: 0,
			},
			{
				entity: "brew",
				localId: "brew-1",
				remoteId: 20,
				serverRevision: 1,
				updatedAt: 0,
			},
		]);
		vi.spyOn(api, "get")
			.mockResolvedValueOnce({
				data: {
					changes: [
						change(2, "DELETE", "BEAN", 11, "bean-1", {}),
						change(3, "DELETE", "MACHINE", 12, "machine-1", {}),
					],
					nextCursor: 3,
					hasMore: false,
					fullResyncRequired: false,
				},
			} as never)
			.mockResolvedValueOnce({
				data: {
					changes: [change(4, "DELETE", "BREW", 20, "brew-1", {})],
					nextCursor: 4,
					hasMore: false,
					fullResyncRequired: false,
				},
			} as never);

		await pullRemoteChanges();

		expect(await db.Beans.get(11)).toMatchObject({
			name: "Ethiopia",
			serverRevision: 2,
			deletedAt: expect.any(Number),
		});
		expect(await db.Machines.get(12)).toMatchObject({
			name: "Linea Mini",
			serverRevision: 3,
			deletedAt: expect.any(Number),
		});
		expect(await db.Brews.get(20)).toMatchObject({
			beanId: 11,
			machineId: 12,
			serverRevision: 1,
		});
		expect(await getAllBeans()).toEqual([]);
		expect(await getBeanCount()).toBe(0);
		expect(await getMachineCount()).toBe(0);
		expect(
			await getBrewsForHistoryView("newest", "Ethiopia", null),
		).toHaveLength(1);
		expect(
			await getBrewsForHistoryView("newest", "Linea Mini", null),
		).toHaveLength(1);
		expect(await getBrewSuggestions(true)).toMatchObject({
			bean: [expect.objectContaining({ id: 11, name: "Ethiopia" })],
			machine: [expect.objectContaining({ id: 12, name: "Linea Mini" })],
		});
		db.close();
		await db.open();
		expect(await db.Beans.get(11)).toMatchObject({
			deletedAt: expect.any(Number),
		});
		expect(
			await db.Tombstones.where("[entity+localId]")
				.equals(["bean", "bean-1"])
				.count(),
		).toBe(1);
		await pullRemoteChanges();
		expect(await db.Brews.get(20)).toMatchObject({
			beanId: 11,
			machineId: 12,
			serverRevision: 4,
			deletedAt: expect.any(Number),
		});
		expect(await getBrewsForHistoryView("newest", "", null)).toHaveLength(0);
		for (const mapping of await db.RemoteMappings.toArray()) {
			expect(mapping).toMatchObject({ deletedAt: expect.any(Number) });
		}
	});

	it("keeps a delete tombstone against duplicate and stale updates", async () => {
		await db.Beans.put({
			id: 11,
			localId: "bean-1",
			name: "Ethiopia",
			rating: 4,
			status: "Good",
			dominantNote: "Fruity",
			roastLevel: 4,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.RemoteMappings.put({
			entity: "bean",
			localId: "bean-1",
			remoteId: 11,
			serverRevision: 1,
			updatedAt: 0,
		});
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-1",
			operation: "update",
			payload: { name: "Local update" },
		});
		vi.spyOn(api, "get")
			.mockResolvedValueOnce({
				data: {
					changes: [change(5, "DELETE", "BEAN", 11, "bean-1", {})],
					nextCursor: 5,
					hasMore: false,
					fullResyncRequired: false,
				},
			} as never)
			.mockResolvedValueOnce({
				data: {
					changes: [
						change(4, "UPDATE", "BEAN", 11, "bean-1", {
							name: "Stale update",
						}),
						change(5, "DELETE", "BEAN", 11, "bean-1", {}),
					],
					nextCursor: 5,
					hasMore: false,
					fullResyncRequired: false,
				},
			} as never);

		await expect(pullRemoteChanges()).resolves.toMatchObject({ applied: 1 });
		expect(await db.Outbox.toArray()).toEqual([
			expect.objectContaining({
				status: "failed",
				lastError: "Remote entity was deleted",
			}),
		]);
		const operation = (await db.Outbox.toArray())[0];
		await retryOperation(operation.id as number);
		expect(await listPendingOperations()).toEqual([]);
		expect(await db.Outbox.get(operation.id)).toMatchObject({
			status: "failed",
			lastError: "Remote entity was deleted",
		});
		await expect(pullRemoteChanges()).resolves.toMatchObject({ applied: 0 });
		expect(await db.Beans.get(11)).toMatchObject({
			name: "Ethiopia",
			serverRevision: 5,
			deletedAt: expect.any(Number),
		});
	});

	it("stores tombstones for deletes with no local record", async () => {
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [change(1, "DELETE", "BEAN", 99, "remote-bean", {})],
				nextCursor: 1,
				hasMore: false,
				fullResyncRequired: false,
			},
		} as never);

		await pullRemoteChanges();

		expect(await db.Beans.count()).toBe(0);
		expect(await db.Tombstones.toArray()).toMatchObject([
			expect.objectContaining({
				entity: "bean",
				localId: "remote-bean",
				remoteId: 99,
				serverRevision: 1,
			}),
		]);
	});

	it("repairs a brew when its parent mapping arrives later", async () => {
		vi.spyOn(api, "get")
			.mockResolvedValueOnce({
				data: {
					changes: [
						change(1, "CREATE", "BREW", 20, "brew-1", {
							id: 20,
							beanId: 11,
							machineId: 12,
							date: "2026-07-24T00:00:00.000Z",
						}),
					],
					nextCursor: 1,
					hasMore: true,
					fullResyncRequired: false,
				},
			} as never)
			.mockResolvedValueOnce({
				data: {
					changes: [
						change(2, "CREATE", "BEAN", 11, "bean-1", {
							id: 11,
							name: "Ethiopia",
						}),
						change(3, "CREATE", "MACHINE", 12, "machine-1", {
							id: 12,
							name: "Linea Mini",
						}),
					],
					nextCursor: 3,
					hasMore: false,
					fullResyncRequired: false,
				},
			} as never);

		await pullRemoteChanges();
		expect(await db.Brews.get(20)).toMatchObject({
			beanId: 11,
			machineId: 12,
		});
		expect(await db.Brews.get(20)).not.toHaveProperty("remoteBeanId");
		expect(await db.Brews.get(20)).not.toHaveProperty("remoteMachineId");
	});

	it("applies remote canonical state without dropping pending local work", async () => {
		await db.Beans.put({
			id: 11,
			localId: "bean-1",
			name: "Pending local edit",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.RemoteMappings.put({
			entity: "bean",
			localId: "bean-1",
			remoteId: 11,
			serverRevision: 1,
			updatedAt: 0,
		});
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-1",
			operation: "update",
			payload: { name: "Pending local edit" },
		});
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [
					change(2, "UPDATE", "BEAN", 11, "bean-1", {
						id: 11,
						name: "Remote edit",
					}),
				],
				nextCursor: 2,
				hasMore: false,
				fullResyncRequired: false,
			},
		} as never);

		await pullRemoteChanges();
		expect(await db.Beans.get(11)).toMatchObject({
			name: "Pending local edit",
			serverRevision: 2,
		});
		expect(await db.Outbox.toArray()).toEqual([
			expect.objectContaining({ status: "pending", baseRevision: 1 }),
		]);
	});

	it("keeps the cursor unchanged when reconnect retries after a failure", async () => {
		vi.spyOn(api, "get")
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce({
				data: {
					changes: [],
					nextCursor: 0,
					hasMore: false,
					fullResyncRequired: false,
				},
			} as never);

		await expect(pullRemoteChanges()).rejects.toThrow("offline");
		expect(await getSyncCursor()).toBe(0);
		await expect(pullRemoteChanges()).resolves.toMatchObject({ cursor: 0 });
	});

	it("rejects non-finite remote cursors without mutating the durable cursor", async () => {
		await db.SyncState.put({ id: "changes", cursor: 4, updatedAt: 0 });
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [],
				nextCursor: Number.POSITIVE_INFINITY,
				hasMore: false,
				fullResyncRequired: false,
			},
		} as never);

		await expect(pullRemoteChanges()).rejects.toThrow(
			"Remote change response is invalid",
		);
		expect(await getSyncCursor()).toBe(4);
	});

	it("rebuilds an equivalent cache after a reload from the durable feed", async () => {
		const remoteChanges = [
			change(1, "CREATE", "BEAN", 11, "bean-1", {
				id: 11,
				name: "Ethiopia",
				status: "GOOD",
				roastLevel: 4,
				countries: ["Ethiopia"],
				varieties: [],
				brands: [],
				flavors: [],
				botanic: "ARABICA",
				dominantNote: "FRUITY",
				designation: "PURE_ORIGIN",
				finished: false,
			}),
			change(2, "UPDATE", "BEAN", 11, "bean-1", {
				id: 11,
				name: "Ethiopia Guji",
				status: "GOOD",
				roastLevel: 4,
				countries: ["Ethiopia"],
				varieties: [],
				brands: [],
				flavors: [],
				botanic: "ARABICA",
				dominantNote: "FRUITY",
				designation: "PURE_ORIGIN",
				finished: false,
			}),
		];
		vi.spyOn(api, "get").mockImplementation(async () => ({
			data: {
				changes: remoteChanges,
				nextCursor: 2,
				hasMore: false,
				fullResyncRequired: false,
			},
		}) as never);

		await expect(pullRemoteChanges()).resolves.toMatchObject({
			applied: 2,
			cursor: 2,
		});
		const firstDevice = await db.Beans.get(11);

		await Promise.all([
			db.Beans.clear(),
			db.Machines.clear(),
			db.Brews.clear(),
			db.RemoteMappings.clear(),
			db.Tombstones.clear(),
			db.SyncState.clear(),
		]);
		await expect(pullRemoteChanges()).resolves.toMatchObject({
			applied: 2,
			cursor: 2,
		});

		expect(await db.Beans.get(11)).toEqual(firstDevice);
		expect(await getSyncCursor()).toBe(2);
	});

	it("recovers a pushing operation after reload", async () => {
		await queueOperation({
			entity: "bean",
			entityLocalId: "local-bean",
			operation: "create",
			payload: { name: "Local bean" },
		});
		const operation = (await db.Outbox.toArray())[0];
		await db.Outbox.update(operation.id as number, {
			status: "pushing",
			updatedAt: Date.now() - 6 * 60_000,
		});
		db.close();
		await db.open();

		expect(await listPendingOperations()).toEqual([
			expect.objectContaining({
				operationId: operation.operationId,
				status: "pending",
				lastError: "Recovered interrupted sync; retrying",
			}),
		]);
	});
});

describe("recovery history", () => {
	it("rejects history filters that the backend cannot scope safely", async () => {
		const get = vi.spyOn(api, "get");
		await expect(getRemoteHistory({ entity: "bean" })).rejects.toThrow(
			"entity and serverId together",
		);
		expect(get).not.toHaveBeenCalled();
	});

	it("loads paginated retained history and preserves the retention boundary", async () => {
		vi.spyOn(api, "get")
			.mockResolvedValueOnce({
				data: {
					changes: [
						{
							entityType: "BEAN",
							serverId: 11,
							clientId: "bean-1",
							revision: 4,
							operation: "UPDATE",
							accepted: false,
							payload: { id: 11, name: "Older name", revision: 4 },
							createdAt: "2026-07-24T10:00:00.000Z",
						},
					],
					nextCursor: 4,
					hasMore: true,
					retentionBoundary: "2026-07-17T10:00:00.000Z",
				},
			} as never)
			.mockResolvedValueOnce({
				data: {
					changes: [],
					nextCursor: 4,
					hasMore: false,
					retentionBoundary: "2026-07-17T10:00:00.000Z",
				},
			} as never);

		await expect(getRemoteHistory({ limit: 1 })).resolves.toEqual({
			changes: [expect.objectContaining({ revision: 4, accepted: false })],
			retentionBoundary: "2026-07-17T10:00:00.000Z",
		});
		expect(vi.mocked(api.get).mock.calls.map(([, config]) => config)).toEqual([
			expect.objectContaining({ params: { since: 0, limit: 1 } }),
			expect.objectContaining({ params: { since: 4, limit: 1 } }),
		]);
	});

	it("returns no versions when the server has already expired the window", async () => {
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [],
				nextCursor: 0,
				hasMore: false,
				retentionBoundary: "2026-07-17T10:00:00.000Z",
			},
		} as never);

		await expect(getRemoteHistory()).resolves.toMatchObject({ changes: [] });
	});

	it("restores an active version through a revision-aware outbox update", async () => {
		await db.Beans.put({
			id: 11,
			localId: "bean-1",
			serverRevision: 9,
			name: "Current name",
			rating: 1,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.RemoteMappings.put({
			entity: "bean",
			localId: "bean-1",
			remoteId: 11,
			serverRevision: 9,
			updatedAt: 0,
		});

		const operationId = await restoreRemoteVersion({
			entityType: "BEAN",
			serverId: 11,
			clientId: "bean-1",
			revision: 4,
			operation: "UPDATE",
			accepted: false,
			payload: {
				id: 11,
				revision: 4,
				name: "Restored name",
				status: "GOOD",
				roastLevel: 3,
				countries: ["Ethiopia"],
				varieties: [],
				brands: [],
				flavors: [],
				botanic: "ARABICA",
				dominantNote: "FRUITY",
				designation: "PURE_ORIGIN",
				finished: false,
			},
			createdAt: "2026-07-24T10:00:00.000Z",
		});

		expect(operationId).toMatchObject({ operationId: expect.any(String), recreated: false });
		expect(await db.Beans.get(11)).toMatchObject({
			name: "Restored name",
			serverRevision: 9,
		});
		expect(await db.Outbox.toArray()).toEqual([
			expect.objectContaining({
				operationId: operationId.operationId,
				operation: "update",
				baseRevision: 9,
				payload: expect.objectContaining({ name: "Restored name" }),
			}),
		]);
	});

	it("recreates a deleted local record before queuing its restore", async () => {
		await db.RemoteMappings.put({
			entity: "bean",
			localId: "deleted-bean",
			remoteId: 22,
			serverRevision: 12,
			updatedAt: 0,
		});
		await db.Tombstones.put({
			entity: "bean",
			localId: "deleted-bean",
			remoteId: 22,
			serverRevision: 12,
			deletedAt: 1,
			updatedAt: 1,
		});

		await restoreRemoteVersion({
			entityType: "BEAN",
			serverId: 22,
			clientId: "deleted-bean",
			revision: 7,
			operation: "UPDATE",
			accepted: false,
			payload: {
				id: 22,
				name: "Recovered",
				status: "NEW",
				roastLevel: 2,
				countries: [],
				cities: [],
				varieties: [],
				brands: [],
				flavors: [],
				botanic: "ARABICA",
				dominantNote: "FRUITY",
				designation: "PURE_ORIGIN",
				finished: false,
			},
			createdAt: "2026-07-24T10:00:00.000Z",
		});

		expect(await db.Beans.get(22)).toMatchObject({
			name: "Recovered",
			localId: expect.not.stringMatching(/^deleted-bean$/),
		});
		expect(await db.Tombstones.count()).toBe(1);
		const [operation] = await db.Outbox.toArray();
		expect(operation).toMatchObject({
			operation: "create",
			entityLocalId: expect.any(String),
		});
		vi.spyOn(api, "post").mockResolvedValue({
			data: {
				operationId: operation.operationId,
				status: "applied",
				serverId: 33,
				revision: 13,
			},
		} as never);
		await expect(pushPendingOperations()).resolves.toBe(1);
		expect(await db.RemoteMappings.toArray()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					localId: "deleted-bean",
					remoteId: 22,
				}),
				expect.objectContaining({
					localId: operation.entityLocalId,
					remoteId: 33,
				}),
			]),
		);
		expect(await db.Beans.get(22)).toMatchObject({ name: "Recovered" });
	});
});

describe("restore conflict retry", () => {
	it("reports a newer revision and retries against its canonical revision", async () => {
		await db.Beans.put({
			id: 11,
			localId: "bean-1",
			name: "Restore attempt",
			rating: 1,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		});
		await db.RemoteMappings.put({
			entity: "bean",
			localId: "bean-1",
			remoteId: 11,
			serverRevision: 7,
			updatedAt: 0,
		});
		await queueOperation({
			entity: "bean",
			entityLocalId: "bean-1",
			operation: "update",
			payload: { name: "Restore attempt" },
		});
		const [operation] = await db.Outbox.toArray();
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [
					{
						revision: 8,
						operation: "UPDATE",
						entityType: "BEAN",
						serverId: 11,
						clientId: "bean-1",
						payload: { id: 11, name: "Newer server edit", revision: 8 },
					},
				],
				nextCursor: 8,
				hasMore: false,
				fullResyncRequired: false,
			},
		} as never);
		await pullRemoteChanges();
		vi.spyOn(api, "post").mockResolvedValueOnce({
			data: {
				operationId: operation.operationId,
				status: "rejected",
				serverId: 11,
				revision: 8,
				canonicalRevision: 8,
				canonical: { id: 11, name: "Newer" },
				reason: "stale_revision",
			},
		} as never);

		await pushPendingOperations();
		expect(await db.Outbox.get(operation.id)).toMatchObject({
			status: "failed",
			lastError: "Conflict: a newer server revision exists",
			serverRevision: 8,
			serverResult: expect.objectContaining({ reason: "stale_revision" }),
		});

		await retryOperation(operation.id as number);
		expect(await db.Outbox.get(operation.id)).toMatchObject({
			status: "pending",
			baseRevision: 8,
		});
		vi.mocked(api.post).mockResolvedValueOnce({
			data: {
				operationId: operation.operationId,
				status: "applied",
				serverId: 11,
				revision: 9,
			},
		} as never);
		await expect(pushPendingOperations()).resolves.toBe(1);
		expect(vi.mocked(api.post).mock.calls[1]?.[1]).toMatchObject({
			baseRevision: 8,
		});
		expect(await db.Outbox.get(operation.id)).toMatchObject({
			status: "acked",
		});
	});
});

describe("full resync safety", () => {
	it("preserves historical brews when a snapshot omits deleted parents", async () => {
		await replaceWithRemoteData(
			{
				beans: [],
				machines: [],
				brews: [
					{
						id: 20,
						beanId: 11,
						machineId: 12,
						date: "2026-07-24T00:00:00.000Z",
					},
				],
			},
			{ discardOutbox: true },
		);

		expect(await db.Brews.get(20)).toMatchObject({
			beanId: undefined,
			machineId: undefined,
			remoteBeanId: 11,
			remoteMachineId: 12,
		});
	});

	it("refuses to replace the cache while unresolved outbox work exists", async () => {
		const beanId = (await addBean({
			name: "Local bean",
			rating: 0,
			status: "New",
			dominantNote: "Fruity",
			roastLevel: 1,
			origin: [],
			process: [],
			variety: [],
			brand: "",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
		})) as number;
		await db.Outbox.clear();
		await updateBeanById({ name: "Pending local edit" }, beanId);
		const [operation] = await db.Outbox.toArray();

		await expect(
			replaceWithRemoteData(
				{ beans: [], machines: [], brews: [] },
				{ removeOutboxOperationIds: [operation.operationId] },
			),
		).rejects.toBeInstanceOf(PendingOutboxError);
		expect(await db.Beans.get(beanId)).toMatchObject({
			name: "Pending local edit",
		});
		expect(await db.Outbox.toArray()).toEqual([
			expect.objectContaining({ status: "pending" }),
		]);
	});

	it("discards unresolved work only through explicit transactional consent", async () => {
		await queueOperation({
			entity: "bean",
			entityLocalId: "local-bean",
			operation: "create",
			payload: { name: "Local bean" },
		});

		await replaceWithRemoteData(
			{ beans: [], machines: [], brews: [] },
			{ discardOutbox: true },
		);

		expect(await db.Beans.count()).toBe(0);
		expect(await db.Outbox.count()).toBe(0);
		expect(await getSyncCursor()).toBe(0);
	});

	it("allows replacement to remove only reconciled operations", async () => {
		await queueOperation({
			entity: "bean",
			entityLocalId: "local-bean",
			operation: "create",
			payload: { name: "Local bean" },
		});
		const [operation] = await db.Outbox.toArray();
		await markOperationsReconciled([operation.operationId]);

		await replaceWithRemoteData(
			{ beans: [], machines: [], brews: [] },
			{ removeOutboxOperationIds: [operation.operationId] },
		);

		expect(await db.Outbox.count()).toBe(0);
	});

	it("does not mutate state when the remote change cursor has expired", async () => {
		await db.SyncState.put({ id: "changes", cursor: 12, updatedAt: 0 });
		await queueOperation({
			entity: "bean",
			entityLocalId: "local-bean",
			operation: "create",
			payload: { name: "Local bean" },
		});
		vi.spyOn(api, "get").mockResolvedValue({
			data: {
				changes: [],
				nextCursor: 0,
				hasMore: false,
				fullResyncRequired: true,
			},
		} as never);

		await expect(pullRemoteChanges()).rejects.toThrow(
			"Remote change history expired",
		);
		expect(await getSyncCursor()).toBe(12);
		expect(await db.Outbox.count()).toBe(1);
	});
});
