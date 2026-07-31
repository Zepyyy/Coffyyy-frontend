import {
	readLocalSnapshot,
	replaceLocalSnapshot,
	type WorkspaceSnapshot,
	validateSnapshot,
} from "./workspace";

export async function exportLocalSnapshot() {
	return JSON.stringify(await readLocalSnapshot(), null, 2);
}

export async function importLocalSnapshot(json: string) {
	const snapshot = JSON.parse(json) as WorkspaceSnapshot;
	validateSnapshot(snapshot);
	await replaceLocalSnapshot(snapshot);
}
