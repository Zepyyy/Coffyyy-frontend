import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import { db } from "../db";
import { queueOperation } from "../sync/outbox";
import {
	beanSyncPayload,
	brewSyncPayload,
	machineSyncPayload,
} from "../sync/payload";

async function addBean(bean: Omit<Beans, "id">) {
	try {
		// Check if a bean with the same name already exists
		const existingBean = await db.Beans.where("name").equals(bean.name).first();
		if (!existingBean) {
			const localId = crypto.randomUUID();
			return await db.transaction("rw", db.Beans, db.Outbox, async () => {
				const id = await db.Beans.add({ ...bean, localId });
				await queueOperation({
					entity: "bean",
					entityLocalId: localId,
					operation: "create",
					payload: beanSyncPayload({ ...bean, id, localId }),
				});
				return id;
			});
		} else {
			return new Error(`Bean with name ${bean.name} already exists`);
		}
	} catch (error) {
		return error;
	}
}

async function addBrew(brew: Omit<Brews, "id">) {
	try {
		const localId = crypto.randomUUID();
		return db.transaction(
			"rw",
			db.Beans,
			db.Machines,
			db.Brews,
			db.Outbox,
			async () => {
				const [beanRecord, machineRecord] = await Promise.all([
					brew.beanId === undefined ? undefined : db.Beans.get(brew.beanId),
					brew.machineId === undefined
						? undefined
						: db.Machines.get(brew.machineId),
				]);
				const dependencies = [
					beanRecord?.localId,
					machineRecord?.localId,
				].filter((value): value is string => Boolean(value));
				const id = await db.Brews.add({ ...brew, localId });
				await queueOperation({
					entity: "brew",
					entityLocalId: localId,
					operation: "create",
					payload: brewSyncPayload(
						{ ...brew, id, localId },
						beanRecord?.localId,
						machineRecord?.localId,
					),
					dependencyIds: dependencies,
				});
				return id;
			},
		);
	} catch (error) {
		return error;
	}
}

async function addMachine(machine: Omit<Machines, "id">) {
	try {
		// Check if a bean with the same name already exists
		const existingMachine = await db.Machines.where("name")
			.equals(machine.name)
			.first();
		if (!existingMachine) {
			const localId = crypto.randomUUID();
			return await db.transaction("rw", db.Machines, db.Outbox, async () => {
				const id = await db.Machines.add({ ...machine, localId });
				await queueOperation({
					entity: "machine",
					entityLocalId: localId,
					operation: "create",
					payload: machineSyncPayload({ ...machine, id, localId }),
				});
				return id;
			});
		} else {
			return new Error(`Machine with name ${machine.name} already exists`);
		}
	} catch (error) {
		return error;
	}
}

export { addBean, addBrew, addMachine };
