import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Brewers } from "@/types/BrewerTypes";
import { isolateMethodMeasurements } from "@/lib/brewMethods";
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
		if (brew.beanId == null) return new Error("Select a bean before saving.");
		if (!brew.method) return new Error("Select a brew method before saving.");
		// Keep method-specific values isolated even if a caller passes a stale
		// value from another form state.
		return await db.Brews.bulkAdd([
			{
				...brew,
				...isolateMethodMeasurements(brew.method, brew),
			},
		]);
	} catch (error) {
		return error;
	}
}

async function addBrewer(brewer: Omit<Brewers, "id">) {
	try {
		// Check if a bean with the same name already exists
		const existingBrewer = await db.Brewers.where("name")
			.equals(brewer.name)
			.first();
		if (!existingBrewer) {
			return await db.Brewers.bulkAdd([brewer]);
		} else {
			return new Error(`Brewer with name ${brewer.name} already exists`);
		}
	} catch (error) {
		return error;
	}
}

export { addBean, addBrew, addBrewer };
