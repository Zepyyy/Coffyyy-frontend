import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import { db } from "../db";

async function updateBeanByName(bean: Partial<Beans>, name: string) {
	const current = await db.Beans.where({ name }).first();
	return current ? updateBeanById(bean, current.id) : 0;
}

async function updateBeanById(bean: Partial<Beans>, id: number) {
	return db.Beans.update(id, bean);
}

async function updateBrewByName(brew: Partial<Brews>, name: string) {
	const current = await db.Brews.where({ name }).first();
	return current ? updateBrewById(brew, current.id) : 0;
}

async function updateBrewById(brew: Partial<Brews>, id: number) {
	return db.Brews.update(id, brew);
}

async function updateMachineById(machine: Partial<Machines>, id: number) {
	return db.Machines.update(id, machine);
}

export {
	updateBeanById,
	updateBeanByName,
	updateBrewById,
	updateBrewByName,
	updateMachineById,
};
