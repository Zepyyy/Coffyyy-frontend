import { db } from "../db";

async function deleteBean(beanId: number) {
	await db.Beans.delete(beanId);
}

async function deleteMachine(machineId: number) {
	await db.Machines.delete(machineId);
}

export { deleteBean, deleteMachine };
