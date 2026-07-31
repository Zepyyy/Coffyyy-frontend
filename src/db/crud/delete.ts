import { db } from "../db";

async function deleteBeanById(beanId: number) {
	await db.Beans.delete(beanId);
}

async function deleteMachineById(machineId: number) {
	await db.Machines.delete(machineId);
}

async function deleteBrewById(brewId: number) {
	await db.Brews.delete(brewId);
}

export { deleteBeanById, deleteBrewById, deleteMachineById };
