import { isRecipeMethod } from "@/lib/brewMethods";
import { pourScheduleError } from "@/lib/pourSchedule";
import { randomId } from "@/lib/randomId";
import type { Beans } from "@/types/BeanTypes";
import type { Brews, BrewSessionIdentity, NewBrew } from "@/types/BrewTypes";
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

async function insertBrew(
	brew: NewBrew,
	expectedMethod?: Machines["method"],
	localId = randomId(),
): Promise<Brews | Error> {
	const machine = brew.machineId
		? await db.Machines.get(brew.machineId)
		: undefined;
	if (!machine) return new Error("Pick a brewer for this brew");
	if (expectedMethod && machine.method !== expectedMethod)
		return new Error("Brewer method changed. Select the brewer again.");
	if (brew.recipeId !== undefined) {
		const recipe = await db.Recipes.get(brew.recipeId);
		if (!recipe) return new Error("Recipe not found");
		if (recipe.method !== machine.method)
			return new Error("Recipe is for a different brew method");
	}
	const row = { ...brew, method: machine.method, localId };
	return { ...row, id: await db.Brews.add(row) };
}

/** Logs a brew with its Brewer's method. */
async function addBrew(
	brew: NewBrew,
	expectedMethod?: Machines["method"],
): Promise<number | Error> {
	try {
		const saved = await db.transaction(
			"rw",
			[db.Brews, db.Machines, db.Recipes],
			() => insertBrew(brew, expectedMethod),
		);
		return saved instanceof Error ? saved : saved.id;
	} catch (error) {
		return asError(error);
	}
}

async function sessionReferences(identity: BrewSessionIdentity) {
	const [bean, machine, recipe] = await Promise.all([
		db.Beans.where("localId").equals(identity.beanLocalId).first(),
		db.Machines.where("localId").equals(identity.machineLocalId).first(),
		identity.recipeLocalId
			? db.Recipes.where("localId").equals(identity.recipeLocalId).first()
			: undefined,
	]);
	return { bean, machine, recipe };
}

/** Resolve the setup's current local keys when returning from the timer. */
async function restoreBrewSession(identity: BrewSessionIdentity) {
	return db.transaction("r", [db.Beans, db.Machines, db.Recipes], async () => {
		const { bean, machine, recipe } = await sessionReferences(identity);
		return {
			beanId: bean?.id,
			machineId: machine?.method === "pour-over" ? machine.id : undefined,
			recipeId:
				recipe?.method === "pour-over" &&
				(recipe.beanId == null || recipe.beanId === bean?.id)
					? recipe.id
					: undefined,
		};
	});
}

/** Retry a timer save by stable brew ID, even after Dexie keys are remapped. */
async function saveBrewSession(
	brew: NewBrew,
	identity: BrewSessionIdentity,
): Promise<Brews | Error> {
	try {
		return await db.transaction(
			"rw",
			[db.Brews, db.Beans, db.Machines, db.Recipes],
			async () => {
				const saved = await db.Brews.where("localId")
					.equals(identity.attemptId)
					.first();
				if (saved) return saved;
				const { bean, machine, recipe } = await sessionReferences(identity);
				if (!bean) return new Error("This brew's bean is no longer available.");
				if (!machine)
					return new Error("This brew's brewer is no longer available.");
				if (identity.recipeLocalId && !recipe)
					return new Error("This brew's recipe is no longer available.");
				if (recipe?.beanId != null && recipe.beanId !== bean.id)
					return new Error("This brew's recipe is now linked to another bean.");
				return insertBrew(
					{
						...brew,
						beanId: bean.id,
						machineId: machine.id,
						recipeId: recipe?.id,
					},
					"pour-over",
					identity.attemptId,
				);
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

/** Checks a new recipe and inserts it; call inside a transaction on Recipes + Beans. */
async function insertRecipe(recipe: NewRecipe): Promise<number | Error> {
	const name = recipe.name.trim();
	if (!name) return new Error("Give the recipe a name");
	if (!isRecipeMethod(recipe.method))
		return new Error(`${recipe.method} has no recipes`);
	const scheduleError = pourScheduleError(recipe.pours, recipe.method);
	if (scheduleError) return new Error(scheduleError);
	if (recipe.beanId !== undefined && !(await db.Beans.get(recipe.beanId)))
		return new Error("Bean not found");
	return db.Recipes.add({
		...recipe,
		name,
		localId: randomId(),
		createdAt: new Date(),
	});
}

/** Adds a recipe. Moka has no recipes; a bean tie must point to a real bean. */
async function addRecipe(recipe: NewRecipe): Promise<number | Error> {
	try {
		return await db.transaction("rw", [db.Recipes, db.Beans], () =>
			insertRecipe(recipe),
		);
	} catch (error) {
		return asError(error);
	}
}

/**
 * Promotes a brew: adds the recipe and links the brew to it in one
 * transaction. The brew must exist and share the recipe's method.
 */
async function addRecipeFromBrew(
	recipe: NewRecipe,
	brewId: number,
): Promise<number | Error> {
	try {
		return await db.transaction(
			"rw",
			[db.Recipes, db.Beans, db.Brews],
			async () => {
				const brew = await db.Brews.get(brewId);
				if (!brew) return new Error("Brew not found");
				if (brew.method !== recipe.method)
					return new Error("Recipe is for a different brew method");
				const recipeId = await insertRecipe(recipe);
				if (recipeId instanceof Error) return recipeId;
				await db.Brews.update(brewId, { recipeId });
				return recipeId;
			},
		);
	} catch (error) {
		return asError(error);
	}
}

export {
	addBean,
	addBrew,
	addMachine,
	addRecipe,
	addRecipeFromBrew,
	restoreBrewSession,
	saveBrewSession,
};
