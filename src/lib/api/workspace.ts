import { db } from "@/db/db";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import { api } from "@/lib/axios";

export type WorkspaceSnapshot = {
	schemaVersion: 1;
	beans: Array<Omit<Beans, "id" | "serverRevision" | "deletedAt"> & { localId: string }>;
	machines: Array<Omit<Machines, "id" | "serverRevision" | "deletedAt"> & { localId: string }>;
	brews: Array<{
		localId: string;
		beanLocalId?: string;
		machineLocalId?: string;
		beanWeight: number;
		espressoWeight: number;
		extractionTime: string | undefined;
		flow: string | undefined;
		overallRating?: number;
		tasteScore?: number;
		strengthScore?: number;
		grindSize: number;
		date: string;
	}>;
};

export type WorkspaceResponse = {
	snapshot: WorkspaceSnapshot;
	version: number;
};

function localId(value: { localId?: string }, fallback: string) {
	return value.localId ?? fallback;
}

export async function readLocalSnapshot(): Promise<WorkspaceSnapshot> {
	const [beans, machines, brews] = await Promise.all([
		db.Beans.toArray(),
		db.Machines.toArray(),
		db.Brews.toArray(),
	]);
	const beanIds = new Map(
		beans.map((bean) => [bean.id, localId(bean, `bean:${bean.id}`)]),
	);
	const machineIds = new Map(
		machines.map((machine) => [machine.id, localId(machine, `machine:${machine.id}`)]),
	);
	return {
		schemaVersion: 1,
		beans: beans.map((record) => {
			const bean = { ...record } as Partial<Beans>;
			const id = bean.id;
			delete bean.id;
			delete bean.serverRevision;
			delete bean.deletedAt;
			return { ...bean, localId: localId(record, `bean:${id}`) } as Omit<Beans, "id" | "serverRevision" | "deletedAt"> & { localId: string };
		}),
		machines: machines.map((record) => {
			const machine = { ...record } as Partial<Machines>;
			const id = machine.id;
			delete machine.id;
			delete machine.serverRevision;
			delete machine.deletedAt;
			return { ...machine, localId: localId(record, `machine:${id}`) } as Omit<Machines, "id" | "serverRevision" | "deletedAt"> & { localId: string };
		}),
		brews: brews.map((brew) => ({
			localId: localId(brew, `brew:${brew.id}`),
			beanLocalId: brew.beanId === undefined ? undefined : beanIds.get(brew.beanId),
			machineLocalId: brew.machineId === undefined ? undefined : machineIds.get(brew.machineId),
			beanWeight: brew.beanWeight,
			espressoWeight: brew.espressoWeight,
			extractionTime: brew.extractionTime,
			flow: brew.flow,
			overallRating: brew.overallRating,
			tasteScore: brew.tasteScore,
			strengthScore: brew.strengthScore,
			grindSize: brew.grindSize,
			date: new Date(brew.date).toISOString(),
		})),
	};
}

export function snapshotHash(snapshot: WorkspaceSnapshot) {
	return JSON.stringify({
		...snapshot,
		beans: [...snapshot.beans].sort((a, b) => a.localId.localeCompare(b.localId)),
		machines: [...snapshot.machines].sort((a, b) => a.localId.localeCompare(b.localId)),
		brews: [...snapshot.brews].sort((a, b) => a.localId.localeCompare(b.localId)),
	});
}

export function validateSnapshot(snapshot: WorkspaceSnapshot) {
	if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.beans) || !Array.isArray(snapshot.machines) || !Array.isArray(snapshot.brews)) {
		throw new Error("Workspace snapshot is invalid");
	}
	const beanIds = new Set(snapshot.beans.map((bean) => bean.localId));
	const machineIds = new Set(snapshot.machines.map((machine) => machine.localId));
	const brewIds = new Set(snapshot.brews.map((brew) => brew.localId));
	if (
		[...beanIds, ...machineIds, ...brewIds].some(
			(localId) => typeof localId !== "string" || localId.length === 0,
		) ||
		beanIds.size !== snapshot.beans.length ||
		machineIds.size !== snapshot.machines.length ||
		brewIds.size !== snapshot.brews.length
	) {
		throw new Error("Workspace snapshot contains duplicate IDs");
	}
	for (const brew of snapshot.brews) {
		if ((brew.beanLocalId && !beanIds.has(brew.beanLocalId)) || (brew.machineLocalId && !machineIds.has(brew.machineLocalId))) {
			throw new Error("Workspace snapshot contains invalid relationships");
		}
	}
}

export async function replaceLocalSnapshot(snapshot: WorkspaceSnapshot) {
	validateSnapshot(snapshot);
	await db.transaction("rw", [db.Beans, db.Machines, db.Brews], async () => {
		await db.Beans.clear();
		await db.Machines.clear();
		await db.Brews.clear();
		const beans = await db.Beans.bulkAdd(snapshot.beans.map((bean) => ({ ...bean })) as Beans[], { allKeys: true });
		const machines = await db.Machines.bulkAdd(snapshot.machines.map((machine) => ({ ...machine })) as Machines[], { allKeys: true });
		const beanIds = new Map(snapshot.beans.map((bean, index) => [bean.localId, beans[index]]));
		const machineIds = new Map(snapshot.machines.map((machine, index) => [machine.localId, machines[index]]));
		await db.Brews.bulkAdd(snapshot.brews.map((brew) => ({
			...brew,
			date: new Date(brew.date),
			beanId: brew.beanLocalId ? beanIds.get(brew.beanLocalId) : undefined,
			machineId: brew.machineLocalId ? machineIds.get(brew.machineLocalId) : undefined,
		})) as Brews[]);
	});
}

export async function getWorkspaceSnapshot() {
	const response = await api.get<WorkspaceResponse>("/workspace/snapshot");
	validateSnapshot(response.data.snapshot);
	return response.data;
}

export async function putWorkspaceSnapshot(snapshot: WorkspaceSnapshot, expectedVersion: number) {
	validateSnapshot(snapshot);
	const response = await api.put<WorkspaceResponse>("/workspace/snapshot", snapshot, {
		headers: { "If-Match": String(expectedVersion) },
	});
	return response.data;
}
