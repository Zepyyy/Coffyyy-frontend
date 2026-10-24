import {
	type AnyWorkspaceSnapshot,
	parseSnapshot,
	readLocalSnapshot,
	replaceLocalSnapshot,
} from "./workspace";

export async function exportLocalSnapshot() {
	return JSON.stringify(await readLocalSnapshot(), null, 2);
}

/** Accepts any snapshot schema this client can upgrade (old backups are v1). */
export async function importLocalSnapshot(json: string) {
	const snapshot = parseSnapshot(JSON.parse(json) as AnyWorkspaceSnapshot);
	await replaceLocalSnapshot(snapshot);
}
