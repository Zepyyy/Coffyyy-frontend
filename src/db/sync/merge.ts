import {
	type AnyWorkspaceSnapshot,
	canonicalJson,
	upgradeSnapshot,
	type WorkspaceSnapshot,
} from "@/lib/api/workspace";

type Collection = "beans" | "machines" | "brews" | "recipes";
type Row = { localId: string };

export type MergeConflict = { collection: Collection; localId: string };
export type MergeResult = {
	snapshot: WorkspaceSnapshot;
	conflicts: MergeConflict[];
};

function same(left: Row | undefined, right: Row | undefined) {
	return canonicalJson(left) === canonicalJson(right);
}

function byId<T extends Row>(rows: T[]) {
	return new Map(rows.map((row) => [row.localId, row]));
}

function mergeRows<T extends Row>(
	collection: Collection,
	base: T[],
	local: T[],
	remote: T[],
	conflicts: MergeConflict[],
) {
	const [b, l, r] = [byId(base), byId(local), byId(remote)];
	const ids = new Set([...r.keys(), ...l.keys()]);
	const merged: T[] = [];
	for (const id of ids) {
		const [baseRow, localRow, remoteRow] = [b.get(id), l.get(id), r.get(id)];
		let row: T | undefined;
		if (same(localRow, remoteRow) || same(remoteRow, baseRow)) row = localRow;
		else if (same(localRow, baseRow)) row = remoteRow;
		else {
			conflicts.push({ collection, localId: id });
			row = localRow;
		}
		if (row) merged.push(row);
	}
	return merged;
}

/** Re-adds rows that merged rows reference but the merge dropped. */
function keepReferenced<T extends Row>(
	rows: T[],
	local: T[],
	remote: T[],
	references: Array<string | undefined>,
) {
	const kept = new Set(rows.map((row) => row.localId));
	const known = byId([...remote, ...local]);
	for (const id of references) {
		const row = id && !kept.has(id) ? known.get(id) : undefined;
		if (!row) continue;
		rows.push(row);
		kept.add(row.localId);
	}
	return rows;
}

type Machine = WorkspaceSnapshot["machines"][number];
type Brew = WorkspaceSnapshot["brews"][number];

/**
 * Keeps the Brewer method lock across a merge: a Brewer whose method changed
 * since `base` while merged brews logged with another method use it is a
 * conflict. The Brewer row matching those brews (local, else base, else
 * remote) is kept so brew.method still equals its Brewer's method.
 */
function lockMachineMethods(
	machines: Machine[],
	brews: Brew[],
	snapshots: WorkspaceSnapshot[],
	conflicts: MergeConflict[],
) {
	const brewMethods = new Map<string, Set<Brew["method"]>>();
	for (const brew of brews) {
		if (!brew.machineLocalId) continue;
		const methods = brewMethods.get(brew.machineLocalId) ?? new Set();
		methods.add(brew.method);
		brewMethods.set(brew.machineLocalId, methods);
	}
	const [base, local, remote] = snapshots.map((s) => byId(s.machines));
	return machines.map((machine) => {
		const id = machine.localId;
		const methods = [...(brewMethods.get(id) ?? [])];
		if (
			methods.every((method) => method === machine.method) ||
			base.get(id)?.method === machine.method
		)
			return machine;
		if (!conflicts.some((c) => c.collection === "machines" && c.localId === id))
			conflicts.push({ collection: "machines", localId: id });
		if (methods.length !== 1) return machine;
		const [method] = methods;
		return (
			[local.get(id), base.get(id), remote.get(id)].find(
				(row) => row?.method === method,
			) ?? machine
		);
	});
}

/**
 * Three-way merge of two snapshots that diverged from `base`, entity by
 * entity. A side wins when only it changed an entity (edit, add or delete);
 * an entity changed differently on both sides is a conflict. A brew added on
 * one side keeps the bean, machine or recipe it references even if the other
 * side deleted it; a kept recipe keeps its bean the same way. A Brewer whose
 * method change would contradict merged brews is a conflict (see
 * lockMachineMethods). Inputs may be older schemas (a stored base often is)
 * and are upgraded first.
 */
export function mergeSnapshots(
	baseInput: AnyWorkspaceSnapshot,
	localInput: AnyWorkspaceSnapshot,
	remoteInput: AnyWorkspaceSnapshot,
): MergeResult {
	const [base, local, remote] = [baseInput, localInput, remoteInput].map(
		upgradeSnapshot,
	);
	const conflicts: MergeConflict[] = [];
	const merge = <T extends Row>(
		collection: Collection,
		pick: (s: WorkspaceSnapshot) => T[],
	) => mergeRows(collection, pick(base), pick(local), pick(remote), conflicts);
	const brews = merge("brews", (s) => s.brews);
	const recipes = keepReferenced(
		merge("recipes", (s) => s.recipes),
		local.recipes,
		remote.recipes,
		brews.map((brew) => brew.recipeLocalId),
	);
	return {
		snapshot: {
			schemaVersion: 2,
			beans: keepReferenced(
				merge("beans", (s) => s.beans),
				local.beans,
				remote.beans,
				[
					...brews.map((brew) => brew.beanLocalId),
					...recipes.map((recipe) => recipe.beanLocalId),
				],
			),
			machines: lockMachineMethods(
				keepReferenced(
					merge("machines", (s) => s.machines),
					local.machines,
					remote.machines,
					brews.map((brew) => brew.machineLocalId),
				),
				brews,
				[base, local, remote],
				conflicts,
			),
			brews,
			recipes,
		},
		conflicts,
	};
}
