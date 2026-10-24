import type { Beans } from "@/types/BeanTypes";
import type { BrewChanges } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import type { RecipeChanges } from "@/types/RecipeTypes";
import { db } from "../db";

async function updateBeanByName(bean: Partial<Beans>, name: string) {
	const current = await db.Beans.where({ name }).first();
	return current ? updateBeanById(bean, current.id) : 0;
}

async function updateBeanById(bean: Partial<Beans>, id: number) {
	return db.Beans.update(id, bean);
}

async function updateBrewByName(brew: BrewChanges, name: string) {
	const current = await db.Brews.where({ name }).first();
	return current ? updateBrewById(brew, current.id) : 0;
}

/** Method is immutable and recipe links go through linkBrewToRecipe. */
async function updateBrewById(brew: BrewChanges, id: number) {
	return db.Brews.update(id, brew);
}

/** A Brewer's method is locked once it has brews; changing it then throws. */
async function updateMachineById(machine: Partial<Machines>, id: number) {
	return db.transaction("rw", [db.Machines, db.Brews], async () => {
		const current = await db.Machines.get(id);
		if (
			current &&
			machine.method !== undefined &&
			machine.method !== current.method &&
			(await db.Brews.where("machineId").equals(id).count()) > 0
		)
			throw new Error("A brewer's method is locked once it has brews");
		return db.Machines.update(id, machine);
	});
}

/** Edits never rewrite linked brews. Method is immutable. */
async function updateRecipeById(recipe: RecipeChanges, id: number) {
	if (recipe.name !== undefined && !recipe.name.trim())
		throw new Error("Give the recipe a name");
	return db.transaction("rw", [db.Recipes, db.Beans], async () => {
		if (recipe.beanId !== undefined && !(await db.Beans.get(recipe.beanId)))
			throw new Error("Bean not found");
		return db.Recipes.update(id, {
			...recipe,
			...(recipe.name !== undefined && { name: recipe.name.trim() }),
		});
	});
}

/**
 * Links a brew to the recipe it followed, or unlinks it with `undefined`.
 * The recipe must share the brew's method.
 */
async function linkBrewToRecipe(brewId: number, recipeId: number | undefined) {
	return db.transaction("rw", [db.Brews, db.Recipes], async () => {
		const brew = await db.Brews.get(brewId);
		if (!brew) throw new Error("Brew not found");
		if (recipeId !== undefined) {
			const recipe = await db.Recipes.get(recipeId);
			if (!recipe) throw new Error("Recipe not found");
			if (recipe.method !== brew.method)
				throw new Error("Recipe is for a different brew method");
		}
		return db.Brews.update(brewId, { recipeId });
	});
}

export {
	linkBrewToRecipe,
	updateBeanById,
	updateBeanByName,
	updateBrewById,
	updateBrewByName,
	updateMachineById,
	updateRecipeById,
};
