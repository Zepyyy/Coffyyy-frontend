import { db } from "../db";

async function deleteBeanById(beanId: number) {
	await db.Beans.delete(beanId);
}

async function deleteBrewerById(brewerId: number) {
	await db.Brewers.delete(brewerId);
}

async function archiveBrewerById(brewerId: number, archived = true) {
	return db.Brewers.update(brewerId, { archived });
}

async function deleteBrewById(brewId: number) {
	await db.Brews.delete(brewId);
}

export { archiveBrewerById, deleteBeanById, deleteBrewById, deleteBrewerById };
