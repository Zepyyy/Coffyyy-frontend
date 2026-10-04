import { db } from "@/db/db";
import {
	beanBotanicValues,
	beanDesignationValues,
	beanDominantNoteValues,
	beanStatusValues,
	type components,
} from "@/lib/api/schema.gen";
import { api } from "@/lib/axios";
import { oneOf } from "@/lib/utils";
import type { Beans, SnapshotBean } from "@/types/BeanTypes";
import type { Brews, SnapshotBrew } from "@/types/BrewTypes";
import type { Machines, SnapshotMachine } from "@/types/MachineTypes";

export type WorkspaceSnapshot = components["schemas"]["Snapshot"];
export type WorkspaceResponse = components["schemas"]["SnapshotResponse"];

// Exhaustive so that a field added to the backend contract fails to compile
// here until the local snapshot carries it.
const BEAN_FIELDS: Record<keyof Omit<SnapshotBean, "localId">, true> = {
	name: true,
	rating: true,
	roastLevel: true,
	origin: true,
	process: true,
	variety: true,
	brand: true,
	flavors: true,
	status: true,
	dominantNote: true,
	botanic: true,
	designation: true,
	finished: true,
};
const MACHINE_FIELDS: Record<keyof Omit<SnapshotMachine, "localId">, true> = {
	name: true,
	brand: true,
	type: true,
	purchaseDate: true,
	model: true,
	grindRange: true,
	capacity: true,
};

function pick<T extends object>(record: object, fields: Record<string, true>) {
	return Object.fromEntries(
		Object.keys(fields).map((field) => [
			field,
			(record as Record<string, unknown>)[field],
		]),
	) as T;
}

function localId(value: { localId?: string }, fallback: string) {
	return value.localId ?? fallback;
}

function toSnapshotBean(record: Beans): SnapshotBean {
	const bean = pick<Omit<SnapshotBean, "localId">>(record, BEAN_FIELDS);
	// Stored values predate the contract: "?" chips, "Pure origin" label.
	const designation: string = bean.designation;
	return {
		localId: localId(record, `bean:${record.id}`),
		...bean,
		status: oneOf(beanStatusValues, bean.status, ""),
		dominantNote: oneOf(beanDominantNoteValues, bean.dominantNote, ""),
		botanic: oneOf(beanBotanicValues, bean.botanic, ""),
		designation: oneOf(
			beanDesignationValues,
			designation === "Pure origin" ? "Pure Origin" : designation,
			"",
		),
	};
}

function toSnapshotMachine(record: Machines): SnapshotMachine {
	return {
		localId: localId(record, `machine:${record.id}`),
		...pick<Omit<SnapshotMachine, "localId">>(record, MACHINE_FIELDS),
	};
}

export function readLocalSnapshot(): Promise<WorkspaceSnapshot> {
	return db.transaction(
		"r",
		[db.Beans, db.Machines, db.Brews],
		readSnapshotRecords,
	);
}

async function readSnapshotRecords(): Promise<WorkspaceSnapshot> {
	const [beans, machines, brews] = await Promise.all([
		db.Beans.toArray(),
		db.Machines.toArray(),
		db.Brews.toArray(),
	]);
	const beanIds = new Map(
		beans.map((bean) => [bean.id, localId(bean, `bean:${bean.id}`)]),
	);
	const machineIds = new Map(
		machines.map((machine) => [
			machine.id,
			localId(machine, `machine:${machine.id}`),
		]),
	);
	return {
		schemaVersion: 1,
		beans: beans.map(toSnapshotBean),
		machines: machines.map(toSnapshotMachine),
		brews: brews.map(
			(brew): SnapshotBrew => ({
				localId: localId(brew, `brew:${brew.id}`),
				beanLocalId:
					brew.beanId === undefined ? undefined : beanIds.get(brew.beanId),
				machineLocalId:
					brew.machineId === undefined
						? undefined
						: machineIds.get(brew.machineId),
				beanWeight: brew.beanWeight,
				espressoWeight: brew.espressoWeight,
				extractionTime: brew.extractionTime,
				flow: brew.flow,
				overallRating: brew.overallRating,
				tasteScore: brew.tasteScore,
				strengthScore: brew.strengthScore,
				grindSize: brew.grindSize,
				date: new Date(brew.date).toISOString(),
			}),
		),
	};
}

/** Key-order independent JSON, so JSONB round-trips compare equal. */
export function canonicalJson(value: unknown): string {
	return JSON.stringify(value, (_key, entry: unknown) =>
		entry && typeof entry === "object" && !Array.isArray(entry)
			? Object.fromEntries(
					Object.entries(entry).sort(([a], [b]) => a.localeCompare(b)),
				)
			: entry,
	);
}

export function snapshotHash(snapshot: WorkspaceSnapshot) {
	return canonicalJson({
		...snapshot,
		beans: [...snapshot.beans].sort((a, b) =>
			a.localId.localeCompare(b.localId),
		),
		machines: [...snapshot.machines].sort((a, b) =>
			a.localId.localeCompare(b.localId),
		),
		brews: [...snapshot.brews].sort((a, b) =>
			a.localId.localeCompare(b.localId),
		),
	});
}

export function validateSnapshot(snapshot: WorkspaceSnapshot) {
	if (
		snapshot.schemaVersion !== 1 ||
		!Array.isArray(snapshot.beans) ||
		!Array.isArray(snapshot.machines) ||
		!Array.isArray(snapshot.brews)
	) {
		throw new Error("Workspace snapshot is invalid");
	}
	const beanIds = new Set(snapshot.beans.map((bean) => bean.localId));
	const machineIds = new Set(
		snapshot.machines.map((machine) => machine.localId),
	);
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
		if (
			(brew.beanLocalId && !beanIds.has(brew.beanLocalId)) ||
			(brew.machineLocalId && !machineIds.has(brew.machineLocalId))
		) {
			throw new Error("Workspace snapshot contains invalid relationships");
		}
	}
}

export async function replaceLocalSnapshot(
	snapshot: WorkspaceSnapshot,
	expectedHash?: string,
) {
	validateSnapshot(snapshot);
	return db.transaction("rw", [db.Beans, db.Machines, db.Brews], async () => {
		// Automatic pulls/merges must preserve edits made while a request was in flight.
		if (
			expectedHash !== undefined &&
			snapshotHash(await readLocalSnapshot()) !== expectedHash
		)
			return false;
		await db.Beans.clear();
		await db.Machines.clear();
		await db.Brews.clear();
		const beans = await db.Beans.bulkAdd(
			snapshot.beans.map((bean) => ({ ...bean })) as Beans[],
			{ allKeys: true },
		);
		const machines = await db.Machines.bulkAdd(
			snapshot.machines.map((machine) => ({ ...machine })) as Machines[],
			{ allKeys: true },
		);
		const beanIds = new Map(
			snapshot.beans.map((bean, index) => [bean.localId, beans[index]]),
		);
		const machineIds = new Map(
			snapshot.machines.map((machine, index) => [
				machine.localId,
				machines[index],
			]),
		);
		await db.Brews.bulkAdd(
			snapshot.brews.map((brew) => ({
				...brew,
				date: new Date(brew.date),
				beanId: brew.beanLocalId ? beanIds.get(brew.beanLocalId) : undefined,
				machineId: brew.machineLocalId
					? machineIds.get(brew.machineLocalId)
					: undefined,
			})) as Brews[],
		);
		return true;
	});
}

export async function getWorkspaceSnapshot() {
	const response = await api.get<WorkspaceResponse>("/workspace/snapshot");
	validateSnapshot(response.data.snapshot);
	return response.data;
}

export async function putWorkspaceSnapshot(
	snapshot: WorkspaceSnapshot,
	expectedVersion: number,
) {
	validateSnapshot(snapshot);
	const response = await api.put<WorkspaceResponse>(
		"/workspace/snapshot",
		snapshot,
		{
			headers: { "If-Match": String(expectedVersion) },
		},
	);
	return response.data;
}
