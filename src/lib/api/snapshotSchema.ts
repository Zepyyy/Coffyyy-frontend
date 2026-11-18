import type { components } from "@/lib/api/schema.gen";
import { methodFromMachineType } from "@/lib/brewMethods";
import type { SnapshotBean } from "@/types/BeanTypes";
import type { BrewMethod, SnapshotBrew } from "@/types/BrewTypes";
import type { SnapshotMachine } from "@/types/MachineTypes";
import type { SnapshotRecipe } from "@/types/RecipeTypes";

export type WorkspaceSnapshot = components["schemas"]["Snapshot"];
export type WorkspaceResponse = components["schemas"]["SnapshotResponse"];

/** Schema 1: machines had free-text `type`, brews had `espressoWeight`, no recipes. */
export type WorkspaceSnapshotV1 = {
	schemaVersion: 1;
	beans: SnapshotBean[];
	machines: Array<Omit<SnapshotMachine, "method"> & { type?: string }>;
	brews: Array<
		Omit<
			SnapshotBrew,
			"method" | "brewWeight" | "recipeLocalId" | "waterTemp" | "heat" | "notes"
		> & { espressoWeight?: number }
	>;
};
/** Schema 2 introduced recipes without timed pours. */
export type WorkspaceSnapshotV2 = Omit<
	WorkspaceSnapshot,
	"schemaVersion" | "recipes"
> & {
	schemaVersion: 2;
	recipes: Omit<SnapshotRecipe, "pours">[];
};
/** Any snapshot this client can read: old backups, stored merge bases, cloud. */
export type AnyWorkspaceSnapshot =
	| WorkspaceSnapshot
	| WorkspaceSnapshotV2
	| WorkspaceSnapshotV1;
export const WORKSPACE_SCHEMA_VERSION = 3;

const asArray = <T>(value: T[] | undefined): T[] =>
	Array.isArray(value) ? value : [];

/**
 * Pure, non-destructive upgrade (mirrors the backend). V1 maps legacy
 * methods and weights. V2 recipes stay flat because pours are optional.
 */
export function upgradeSnapshot(
	snapshot: AnyWorkspaceSnapshot,
): WorkspaceSnapshot {
	if (snapshot?.schemaVersion === 2)
		return { ...snapshot, schemaVersion: WORKSPACE_SCHEMA_VERSION };
	if (snapshot?.schemaVersion !== 1) return snapshot as WorkspaceSnapshot;
	const methods = new Map<string, BrewMethod>();
	const machines = asArray(snapshot.machines).map(({ type, ...machine }) => {
		const method = methodFromMachineType(type);
		methods.set(machine.localId, method);
		return { ...machine, method };
	});
	return {
		...snapshot,
		schemaVersion: WORKSPACE_SCHEMA_VERSION,
		machines,
		brews: asArray(snapshot.brews).map(({ espressoWeight, ...brew }) => ({
			...brew,
			method:
				(brew.machineLocalId && methods.get(brew.machineLocalId)) || "espresso",
			brewWeight: espressoWeight as number,
		})),
		recipes: [],
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
	const sorted = <T extends { localId: string }>(rows: T[]) =>
		[...rows].sort((a, b) => a.localId.localeCompare(b.localId));
	return canonicalJson({
		...snapshot,
		beans: sorted(snapshot.beans),
		machines: sorted(snapshot.machines),
		brews: sorted(snapshot.brews),
		recipes: sorted(snapshot.recipes),
	});
}
