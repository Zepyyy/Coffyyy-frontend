import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Brewers } from "@/types/BrewerTypes";
import { db } from "../db";

async function updateBeanByName(bean: Partial<Beans>, name: string) {
	try {
		return await db.Beans.where({ name }).modify({ ...bean });
	} catch (error) {
		return error;
	}
}

async function updateBeanById(bean: Partial<Beans>, id: number) {
	try {
		return await db.Beans.where({ id }).modify({ ...bean });
	} catch (error) {
		return error;
	}
}

async function updateBrewByName(brew: Partial<Brews>, name: string) {
	try {
		return await db.Brews.where({ name }).modify({ ...brew });
	} catch (error) {
		return error;
	}
}

async function updateBrewById(brew: Partial<Brews>, id: number) {
	try {
		return await db.Brews.where({ id }).modify({ ...brew });
	} catch (error) {
		return error;
	}
}

async function updateBrewerById(brewer: Partial<Brewers>, id: number) {
	try {
		return await db.Brewers.where({ id }).modify({ ...brewer });
	} catch (error) {
		return error;
	}
}

export {
	updateBeanById,
	updateBeanByName,
	updateBrewById,
	updateBrewByName,
	updateBrewerById,
};
