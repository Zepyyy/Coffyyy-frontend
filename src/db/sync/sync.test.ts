import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addBean, addBrew, addMachine } from "@/db/crud/add";
import { deleteBeanById } from "@/db/crud/delete";
import { db } from "@/db/db";
import {
	listPendingOperations,
	queueOperation,
	retryOperation,
} from "@/db/sync/outbox";
import { updateBeanById } from "@/db/crud/update";
import {
	getSyncCursor,
	pullRemoteChanges,
	toBackendOperation,
	pushPendingOperations,
} from "@/lib/api/sync";
import { ApiError, api } from "@/lib/axios";
import type { OutboxRecord } from "@/db/sync/types";
import { getAllBeans, getBeanCount } from "@/lib/api/beans";
import { getMachineCount } from "@/lib/api/machines";
import { getBrewsForHistoryView, getBrewSuggestions } from "@/lib/api/brews";

beforeEach(async () => {
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
		clientId: string,
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
			name: "Local edit",
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
		expect(await db.Beans.get(11)).toMatchObject({ name: "Remote edit" });
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
});
