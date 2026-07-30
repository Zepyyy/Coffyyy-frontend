import { db } from "../db";
import { canPermanentlyDelete } from "@/lib/libraryLifecycle";

async function deleteBeanById(beanId: number) {
	const brewCount = await db.Brews.where("beanId").equals(beanId).count();
	if (!canPermanentlyDelete(brewCount)) {
		return new Error("This bean has Brew history and can only be archived.");
	}
	await db.Beans.delete(beanId);
	return true;
}

async function deleteBrewerById(brewerId: number) {
	const brewCount = await db.Brews.where("brewerId").equals(brewerId).count();
	if (!canPermanentlyDelete(brewCount)) {
		return new Error("This brewer has Brew history and can only be archived.");
	}
	await db.Brewers.delete(brewerId);
	return true;
}

async function archiveBeanById(beanId: number, archived = true) {
	return db.Beans.update(beanId, { archived });
}

async function archiveBrewerById(brewerId: number, archived = true) {
	return db.Brewers.update(brewerId, { archived });
}

async function deleteBrewById(brewId: number) {
	await db.Brews.delete(brewId);
}

export {
	archiveBeanById,
	archiveBrewerById,
	deleteBeanById,
	deleteBrewById,
	deleteBrewerById,
};
