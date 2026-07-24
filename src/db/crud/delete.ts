import { db } from "../db";
import { queueOperation } from "../sync/outbox";
import { beanSyncPayload, brewSyncPayload, machineSyncPayload } from "../sync/payload";

async function deleteEntity(
	table: typeof db.Beans | typeof db.Machines | typeof db.Brews,
	entity: "bean" | "machine" | "brew",
	id: number,
	payload: Record<string, unknown>,
) {
	const current = await table.get(id);
	if (!current) return;
	await table.delete(id);
	if (current.localId) {
		await queueOperation({
			entity,
			entityLocalId: current.localId,
			operation: "delete",
			payload,
		});
	}
}

async function deleteBeanById(beanId: number) {
	await db.transaction("rw", db.Beans, db.Outbox, db.RemoteMappings, async () => {
		const current = await db.Beans.get(beanId);
		if (current) await deleteEntity(db.Beans, "bean", beanId, beanSyncPayload(current));
	});
}

async function deleteMachineById(machineId: number) {
	await db.transaction("rw", db.Machines, db.Outbox, db.RemoteMappings, async () => {
		const current = await db.Machines.get(machineId);
		if (current) await deleteEntity(db.Machines, "machine", machineId, machineSyncPayload(current));
	});
}

async function deleteBrewById(brewId: number) {
	await db.transaction("rw", [db.Beans, db.Machines, db.Brews, db.Outbox, db.RemoteMappings], async () => {
		const current = await db.Brews.get(brewId);
		if (!current) return;
		const [bean, machine] = await Promise.all([
			current.beanId === undefined ? undefined : db.Beans.get(current.beanId),
			current.machineId === undefined ? undefined : db.Machines.get(current.machineId),
		]);
		await deleteEntity(
			db.Brews,
			"brew",
			brewId,
			brewSyncPayload(current, bean?.localId, machine?.localId),
		);
	});
}

export { deleteBeanById, deleteBrewById, deleteMachineById };
