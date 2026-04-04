import { db } from "../db";

async function deleteBean(beanId: number) {
	await db.Beans.delete(beanId);
}

async function deleteMachine(machineId: number) {
	await db.Machines.delete(machineId);
}

async function deleteBrewById(brewId: number) {
	await db.Brews.delete(brewId);
}

export { deleteBean, deleteBrewById, deleteMachine };
