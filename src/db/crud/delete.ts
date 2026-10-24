import { db } from "../db";

/** Recipes tied to the bean lose the tie; brews behave as before. */
async function deleteBeanById(beanId: number) {
	await db.transaction("rw", [db.Beans, db.Recipes], async () => {
		await db.Recipes.where("beanId")
			.equals(beanId)
			.modify((recipe) => {
				delete recipe.beanId;
			});
		await db.Beans.delete(beanId);
	});
}

async function deleteMachineById(machineId: number) {
	await db.Machines.delete(machineId);
}

async function deleteBrewById(brewId: number) {
	await db.Brews.delete(brewId);
}

/** Linked brews keep their actuals and lose the recipe link. */
async function deleteRecipeById(recipeId: number) {
	await db.transaction("rw", [db.Recipes, db.Brews], async () => {
		await db.Brews.where("recipeId")
			.equals(recipeId)
			.modify((brew) => {
				delete brew.recipeId;
			});
		await db.Recipes.delete(recipeId);
	});
}

export { deleteBeanById, deleteBrewById, deleteMachineById, deleteRecipeById };
