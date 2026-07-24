import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import { db } from "../db";
import { queueOperation } from "../sync/outbox";
import {
	beanSyncPayload,
	brewSyncPayload,
	machineSyncPayload,
} from "../sync/payload";

async function updateEntity<T extends { id: number; localId?: string }>(
	table: {
		get(id: number): Promise<T | undefined>;
		update(id: number, changes: Partial<T>): Promise<number>;
	},
	entity: "bean" | "machine" | "brew",
	id: number,
	changes: Partial<T>,
	payloadFactory: (next: T) => Record<string, unknown>,
	dependencyIds: string[] = [],
) {
	const current = await table.get(id);
	if (!current) return 0;
	const next = {
		...current,
		...changes,
		localId: current.localId ?? crypto.randomUUID(),
	};
	const updated = await table.update(id, next);
	if (updated) {
		await queueOperation({
			entity,
			entityLocalId: next.localId,
			operation: "update",
			payload: payloadFactory(next),
			dependencyIds,
		});
	}
	return updated;
}

async function updateBeanByName(bean: Partial<Beans>, name: string) {
	try {
		const current = await db.Beans.where({ name }).first();
		return current ? updateBeanById(bean, current.id) : 0;
	} catch (error) {
		return error;
	}
}

async function updateBeanById(bean: Partial<Beans>, id: number) {
	try {
		return await db.transaction(
			"rw",
			db.Beans,
			db.Outbox,
			db.RemoteMappings,
			() => updateEntity(db.Beans, "bean", id, bean, beanSyncPayload),
		);
	} catch (error) {
		return error;
	}
}

async function updateBrewByName(brew: Partial<Brews>, name: string) {
	try {
		const current = await db.Brews.where({ name }).first();
		return current ? updateBrewById(brew, current.id) : 0;
	} catch (error) {
		return error;
	}
}

async function updateBrewById(brew: Partial<Brews>, id: number) {
	try {
		return await db.transaction(
			"rw",
			[db.Beans, db.Machines, db.Brews, db.Outbox, db.RemoteMappings],
			async () => {
				const current = await db.Brews.get(id);
				const next = current
					? {
							...current,
							...brew,
							localId: current.localId ?? crypto.randomUUID(),
						}
					: undefined;
				if (!next) return 0;
				const [bean, machine] = await Promise.all([
					next.beanId === undefined ? undefined : db.Beans.get(next.beanId),
					next.machineId === undefined
						? undefined
						: db.Machines.get(next.machineId),
				]);
				return updateEntity(
					db.Brews,
					"brew",
					id,
					brew,
					(value) =>
						brewSyncPayload(value as Brews, bean?.localId, machine?.localId),
					[bean?.localId, machine?.localId].filter((value): value is string =>
						Boolean(value),
					),
				);
			},
		);
	} catch (error) {
		return error;
	}
}

async function updateMachineById(
	machine: Partial<import("@/types/MachineTypes").Machines>,
	id: number,
) {
	try {
		return await db.transaction(
			"rw",
			db.Machines,
			db.Outbox,
			db.RemoteMappings,
			() =>
				updateEntity(db.Machines, "machine", id, machine, machineSyncPayload),
		);
	} catch (error) {
		return error;
	}
}

export {
	updateBeanById,
	updateBeanByName,
	updateBrewById,
	updateBrewByName,
	updateMachineById,
};
