import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import { db } from "../db";

async function addBean(bean: Omit<Beans, "id">): Promise<number | Error> {
	try {
		const existing = await db.Beans.where("name").equals(bean.name).first();
		if (existing)
			return new Error(`Bean with name ${bean.name} already exists`);
		return await db.Beans.add({ ...bean, localId: crypto.randomUUID() });
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}
}

async function addBrew(brew: Omit<Brews, "id">): Promise<number | Error> {
	try {
		return await db.Brews.add({ ...brew, localId: crypto.randomUUID() });
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}
}

async function addMachine(
	machine: Omit<Machines, "id">,
): Promise<number | Error> {
	try {
		const existing = await db.Machines.where("name")
			.equals(machine.name)
			.first();
		if (existing)
			return new Error(`Machine with name ${machine.name} already exists`);
		return await db.Machines.add({ ...machine, localId: crypto.randomUUID() });
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}
}

export { addBean, addBrew, addMachine };
