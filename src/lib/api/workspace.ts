import { db } from "@/db/db";
import {
	beanBotanicValues,
	beanDesignationValues,
	beanDominantNoteValues,
	beanStatusValues,
} from "@/lib/api/schema.gen";
import { api } from "@/lib/axios";
import {
	snapshotHash,
	upgradeSnapshot,
	WORKSPACE_SCHEMA_VERSION,
	type AnyWorkspaceSnapshot,
	type WorkspaceResponse,
	type WorkspaceSnapshot,
} from "@/lib/api/snapshotSchema";
import { isBrewMethod, isRecipeMethod } from "@/lib/brewMethods";
import { pourScheduleError } from "@/lib/pourSchedule";
import { oneOf } from "@/lib/utils";
import type { Beans, SnapshotBean } from "@/types/BeanTypes";
import type { Brews, SnapshotBrew } from "@/types/BrewTypes";
import type { Machines, SnapshotMachine } from "@/types/MachineTypes";
import type { Recipes, SnapshotRecipe } from "@/types/RecipeTypes";

export {
	canonicalJson,
	snapshotHash,
	upgradeSnapshot,
	type AnyWorkspaceSnapshot,
	type WorkspaceResponse,
	type WorkspaceSnapshot,
	type WorkspaceSnapshotV1,
	type WorkspaceSnapshotV2,
} from "@/lib/api/snapshotSchema";

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
	method: true,
	purchaseDate: true,
	model: true,
	grindRange: true,
	capacity: true,
};
const BREW_FIELDS: Record<
	keyof Omit<
		SnapshotBrew,
		"localId" | "beanLocalId" | "machineLocalId" | "recipeLocalId" | "date"
	>,
	true
> = {
	method: true,
	beanWeight: true,
	brewWeight: true,
	grindSize: true,
	overallRating: true,
	tasteScore: true,
	strengthScore: true,
	extractionTime: true,
	flow: true,
	waterTemp: true,
	heat: true,
	notes: true,
};
const RECIPE_FIELDS: Record<
	keyof Omit<SnapshotRecipe, "localId" | "beanLocalId" | "createdAt">,
	true
> = {
	name: true,
	method: true,
	beanWeight: true,
	brewWeight: true,
	grindSize: true,
	extractionTime: true,
	waterTemp: true,
	notes: true,
	pours: true,
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
		[db.Beans, db.Machines, db.Brews, db.Recipes],
		readSnapshotRecords,
	);
}

async function readSnapshotRecords(): Promise<WorkspaceSnapshot> {
	const [beans, machines, brews, recipes] = await Promise.all([
		db.Beans.toArray(),
		db.Machines.toArray(),
		db.Brews.toArray(),
		db.Recipes.toArray(),
	]);
	const ids = <T extends { id: number; localId?: string }>(
		rows: T[],
		prefix: string,
	) =>
		new Map(rows.map((row) => [row.id, localId(row, `${prefix}:${row.id}`)]));
	const beanIds = ids(beans, "bean");
	const machineIds = ids(machines, "machine");
	const recipeIds = ids(recipes, "recipe");
	const ref = (map: Map<number, string>, id: number | undefined) =>
		id === undefined ? undefined : map.get(id);
	return {
		schemaVersion: WORKSPACE_SCHEMA_VERSION,
		beans: beans.map(toSnapshotBean),
		machines: machines.map(toSnapshotMachine),
		brews: brews.map(
			(brew: Brews): SnapshotBrew => ({
				localId: localId(brew, `brew:${brew.id}`),
				beanLocalId: ref(beanIds, brew.beanId),
				machineLocalId: ref(machineIds, brew.machineId),
				recipeLocalId: ref(recipeIds, brew.recipeId),
				...pick<Omit<SnapshotBrew, "localId">>(brew, BREW_FIELDS),
				date: new Date(brew.date).toISOString(),
			}),
		),
		recipes: recipes.map(
			(recipe: Recipes): SnapshotRecipe => ({
				localId: localId(recipe, `recipe:${recipe.id}`),
				beanLocalId: ref(beanIds, recipe.beanId),
				...pick<Omit<SnapshotRecipe, "localId">>(recipe, RECIPE_FIELDS),
				createdAt: new Date(recipe.createdAt).toISOString(),
			}),
		),
	};
}

/** Upgrade then validate any incoming snapshot (cloud, backup, merge input). */
export function parseSnapshot(snapshot: AnyWorkspaceSnapshot) {
	const upgraded = upgradeSnapshot(snapshot);
	validateSnapshot(upgraded);
	return upgraded;
}

/** Asserts a current-schema snapshot. Upgrade older input first. */
export function validateSnapshot(snapshot: WorkspaceSnapshot) {
	if (
		snapshot?.schemaVersion !== WORKSPACE_SCHEMA_VERSION ||
		!Array.isArray(snapshot.beans) ||
		!Array.isArray(snapshot.machines) ||
		!Array.isArray(snapshot.brews) ||
		!Array.isArray(snapshot.recipes)
	) {
		throw new Error("Workspace snapshot is invalid");
	}
	const collections = [
		snapshot.beans,
		snapshot.machines,
		snapshot.brews,
		snapshot.recipes,
	];
	const [beanIds, machineIds, brewIds, recipeIds] = collections.map(
		(rows: Array<{ localId: string }>) =>
			new Set(rows.map((row) => row.localId)),
	);
	if (
		collections.some(
			(rows, index) =>
				[beanIds, machineIds, brewIds, recipeIds][index].size !== rows.length ||
				rows.some(
					(row) => typeof row.localId !== "string" || row.localId.length === 0,
				),
		)
	) {
		throw new Error("Workspace snapshot contains duplicate IDs");
	}
	if (
		!snapshot.machines.every((machine) => isBrewMethod(machine.method)) ||
		!snapshot.brews.every((brew) => isBrewMethod(brew.method)) ||
		!snapshot.recipes.every(
			(recipe) =>
				isRecipeMethod(recipe.method) &&
				typeof recipe.name === "string" &&
				recipe.name.trim().length > 0,
		)
	) {
		throw new Error("Workspace snapshot contains invalid methods");
	}
	const recipeMethods = new Map(
		snapshot.recipes.map((recipe) => [recipe.localId, recipe.method]),
	);
	for (const recipe of snapshot.recipes) {
		const scheduleError = pourScheduleError(recipe.pours, recipe.method);
		if (scheduleError) throw new Error(scheduleError);
		if (recipe.beanLocalId && !beanIds.has(recipe.beanLocalId))
			throw new Error("Workspace snapshot contains invalid relationships");
	}
	for (const brew of snapshot.brews) {
		if (
			(brew.beanLocalId && !beanIds.has(brew.beanLocalId)) ||
			(brew.machineLocalId && !machineIds.has(brew.machineLocalId)) ||
			(brew.recipeLocalId && !recipeIds.has(brew.recipeLocalId))
		) {
			throw new Error("Workspace snapshot contains invalid relationships");
		}
		if (
			brew.recipeLocalId &&
			recipeMethods.get(brew.recipeLocalId) !== brew.method
		) {
			throw new Error("Workspace snapshot brew method differs from its recipe");
		}
	}
}

/**
 * Replaces all local records with `snapshot` (upgraded and validated first),
 * remapping localId references to Dexie ids. Returns false, writing nothing,
 * when `expectedHash` no longer matches the local snapshot.
 */
export async function replaceLocalSnapshot(
	input: AnyWorkspaceSnapshot,
	expectedHash?: string,
) {
	const snapshot = parseSnapshot(input);
	return db.transaction(
		"rw",
		[db.Beans, db.Machines, db.Brews, db.Recipes],
		async () => {
			// Automatic pulls/merges must preserve edits made while a request was in flight.
			if (
				expectedHash !== undefined &&
				snapshotHash(await readLocalSnapshot()) !== expectedHash
			)
				return false;
			await Promise.all([
				db.Beans.clear(),
				db.Machines.clear(),
				db.Brews.clear(),
				db.Recipes.clear(),
			]);
			const keys = <T extends { localId: string }>(rows: T[], ids: number[]) =>
				new Map(rows.map((row, index) => [row.localId, ids[index]]));
			const ref = (map: Map<string, number>, id: string | undefined) =>
				id ? map.get(id) : undefined;
			const beanIds = keys(
				snapshot.beans,
				await db.Beans.bulkAdd(
					snapshot.beans.map((bean) => ({ ...bean })) as Beans[],
					{ allKeys: true },
				),
			);
			const machineIds = keys(
				snapshot.machines,
				await db.Machines.bulkAdd(
					snapshot.machines.map((machine) => ({ ...machine })) as Machines[],
					{ allKeys: true },
				),
			);
			const recipeIds = keys(
				snapshot.recipes,
				await db.Recipes.bulkAdd(
					snapshot.recipes.map(({ beanLocalId, createdAt, ...recipe }) => ({
						...recipe,
						beanId: ref(beanIds, beanLocalId),
						createdAt: new Date(createdAt),
					})) as Recipes[],
					{ allKeys: true },
				),
			);
			await db.Brews.bulkAdd(
				snapshot.brews.map(
					({ beanLocalId, machineLocalId, recipeLocalId, date, ...brew }) => ({
						...brew,
						date: new Date(date),
						beanId: ref(beanIds, beanLocalId),
						machineId: ref(machineIds, machineLocalId),
						recipeId: ref(recipeIds, recipeLocalId),
					}),
				) as Brews[],
			);
			return true;
		},
	);
}

/** GET always yields a validated current snapshot, whatever schema the cloud sent. */
export async function getWorkspaceSnapshot(): Promise<WorkspaceResponse> {
	const response = await api.get<WorkspaceResponse>("/workspace/snapshot");
	return { ...response.data, snapshot: parseSnapshot(response.data.snapshot) };
}

export async function putWorkspaceSnapshot(
	snapshot: WorkspaceSnapshot,
	expectedVersion: number,
): Promise<WorkspaceResponse> {
	validateSnapshot(snapshot);
	const response = await api.put<WorkspaceResponse>(
		"/workspace/snapshot",
		snapshot,
		{
			headers: { "If-Match": String(expectedVersion) },
		},
	);
	// The cloud echoes what it stored; upgrade only, a validation failure here
	// would misreport a push that succeeded.
	return {
		...response.data,
		snapshot: upgradeSnapshot(response.data.snapshot),
	};
}
