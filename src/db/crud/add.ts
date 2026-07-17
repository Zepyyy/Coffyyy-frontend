import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import { db } from "../db";

async function addBean(bean: Omit<Beans, "id">) {
	try {
		// Check if a bean with the same name already exists
		const existingBean = await db.Beans.where("name").equals(bean.name).first();
		if (!existingBean) {
			return await db.Beans.bulkAdd([bean]);
		} else {
			return new Error(`Bean with name ${bean.name} already exists`);
		}
	} catch (error) {
		return error;
	}
}

async function addBrew(brew: Omit<Brews, "id">) {
	try {
		return await db.Brews.bulkAdd([brew]);
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
			return await db.Machines.bulkAdd([machine]);
		} else {
			return new Error(`Machine with name ${machine.name} already exists`);
		}
	} catch (error) {
		return error;
	}
}

export { addBean, addBrew, addMachine };
