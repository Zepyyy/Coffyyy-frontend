import { isRecipeMethod } from "@/lib/brewMethods";
import { randomId } from "@/lib/randomId";
import type { Beans } from "@/types/BeanTypes";
import type { NewBrew } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import type { NewRecipe } from "@/types/RecipeTypes";
import { db } from "../db";

function asError(error: unknown) {
	return error instanceof Error ? error : new Error(String(error));
}

async function addBean(bean: Omit<Beans, "id">): Promise<number | Error> {
	try {
		const existing = await db.Beans.where("name").equals(bean.name).first();
		if (existing)
			return new Error(`Bean with name ${bean.name} already exists`);
		return await db.Beans.add({ ...bean, localId: randomId() });
	} catch (error) {
		return asError(error);
	}
}

/**
 * Logs a brew. A Brewer is required: the brew's immutable method is copied
 * from it. A linked recipe must exist and share that method.
 */
async function addBrew(brew: NewBrew): Promise<number | Error> {
	try {
		return await db.transaction(
			"rw",
			[db.Brews, db.Machines, db.Recipes],
			async () => {
				const machine = brew.machineId
					? await db.Machines.get(brew.machineId)
					: undefined;
				if (!machine) return new Error("Pick a brewer for this brew");
				if (brew.recipeId !== undefined) {
					const recipe = await db.Recipes.get(brew.recipeId);
					if (!recipe) return new Error("Recipe not found");
					if (recipe.method !== machine.method)
						return new Error("Recipe is for a different brew method");
				}
				return db.Brews.add({
					...brew,
					method: machine.method,
					localId: randomId(),
				});
			},
		);
	} catch (error) {
		return asError(error);
	}
}

async function addMachine(
	machine: Omit<Machines, "id">,
): Promise<number | Error> {
	try {
		const existing = await db.Machines.where("name")
			.equals(machine.name)
			.first();
		if (existing)
			return new Error(`Brewer with name ${machine.name} already exists`);
		return await db.Machines.add({ ...machine, localId: randomId() });
	} catch (error) {
		return asError(error);
	}
}

/** Adds a recipe. Moka has no recipes; a bean tie must point to a real bean. */
async function addRecipe(recipe: NewRecipe): Promise<number | Error> {
	try {
		const name = recipe.name.trim();
		if (!name) return new Error("Give the recipe a name");
		if (!isRecipeMethod(recipe.method))
			return new Error(`${recipe.method} has no recipes`);
		return await db.transaction("rw", [db.Recipes, db.Beans], async () => {
			if (recipe.beanId !== undefined && !(await db.Beans.get(recipe.beanId)))
				return new Error("Bean not found");
			return db.Recipes.add({
				...recipe,
				name,
				localId: randomId(),
				createdAt: new Date(),
			});
		});
	} catch (error) {
		return asError(error);
	}
}

export { addBean, addBrew, addMachine, addRecipe };
