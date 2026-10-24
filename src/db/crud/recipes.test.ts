import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { getMachineBrewCount } from "@/lib/api/machines";
import { getRecipesForMethod } from "@/lib/api/recipes";
import type { BrewMethod } from "@/types/BrewTypes";
import { addBrew, addRecipe, addRecipeFromBrew } from "./add";
import { deleteBeanById, deleteRecipeById } from "./delete";
import { linkBrewToRecipe, updateMachineById } from "./update";

async function machine(method: BrewMethod) {
	return db.Machines.add({
		name: method,
		brand: "",
		model: "",
		method,
		purchaseDate: "",
		grindRange: "",
		capacity: "",
	} as never);
}

async function bean(name: string) {
	return db.Beans.add({
		name,
		rating: 0,
		status: "New",
		dominantNote: "Fruity",
		roastLevel: 3,
		origin: [],
		process: [],
		variety: [],
		brand: "",
		botanic: "Arabica",
		designation: "Pure Origin",
		flavors: [],
		finished: false,
	} as never);
}

const dial = { beanWeight: 15, brewWeight: 250, grindSize: 20 };

async function ok<T>(value: Promise<T | Error>): Promise<T> {
	const result = await value;
	if (result instanceof Error) throw result;
	return result;
}

describe("brew and recipe CRUD", () => {
	beforeEach(async () => {
		await db.open();
		await Promise.all([
			db.Beans.clear(),
			db.Machines.clear(),
			db.Brews.clear(),
			db.Recipes.clear(),
		]);
	});

	it("requires a brewer and copies its method onto the brew", async () => {
		const v60 = await machine("pour-over");
		const id = await ok(
			addBrew({ ...dial, beanId: undefined, machineId: v60, date: new Date() }),
		);
		expect((await db.Brews.get(id))?.method).toBe("pour-over");
		expect(
			await addBrew({
				...dial,
				beanId: undefined,
				machineId: 999,
				date: new Date(),
			}),
		).toBeInstanceOf(Error);
		expect(await getMachineBrewCount(v60)).toBe(1);
	});

	it("rejects moka recipes, blank names and recipes of another method", async () => {
		expect(
			await addRecipe({ ...dial, name: "Moka", method: "moka" as never }),
		).toBeInstanceOf(Error);
		expect(
			await addRecipe({ ...dial, name: "  ", method: "espresso" }),
		).toBeInstanceOf(Error);
		const espressoRecipe = await ok(
			addRecipe({ ...dial, name: "Classic", method: "espresso" }),
		);
		const v60 = await machine("pour-over");
		expect(
			await addBrew({
				...dial,
				beanId: undefined,
				machineId: v60,
				recipeId: espressoRecipe,
				date: new Date(),
			}),
		).toBeInstanceOf(Error);
		const brew = await ok(
			addBrew({ ...dial, beanId: undefined, machineId: v60, date: new Date() }),
		);
		await expect(linkBrewToRecipe(brew, espressoRecipe)).rejects.toThrow(
			"different brew method",
		);
	});

	it("promotes a brew: adds the recipe and links the brew atomically", async () => {
		const v60 = await machine("pour-over");
		const brew = await ok(
			addBrew({ ...dial, beanId: undefined, machineId: v60, date: new Date() }),
		);
		const recipe = await ok(
			addRecipeFromBrew(
				{ ...dial, name: "Promoted", method: "pour-over" },
				brew,
			),
		);
		expect((await db.Brews.get(brew))?.recipeId).toBe(recipe);

		// Failures leave no recipe behind and the brew unchanged.
		expect(
			await addRecipeFromBrew(
				{ ...dial, name: "Shot", method: "espresso" },
				brew,
			),
		).toBeInstanceOf(Error);
		expect(
			await addRecipeFromBrew(
				{ ...dial, name: "Gone bean", method: "pour-over", beanId: 999 },
				brew,
			),
		).toBeInstanceOf(Error);
		expect(
			await addRecipeFromBrew(
				{ ...dial, name: "No brew", method: "pour-over" },
				999,
			),
		).toBeInstanceOf(Error);
		expect(await db.Recipes.count()).toBe(1);
		expect((await db.Brews.get(brew))?.recipeId).toBe(recipe);
	});

	it("deleting a recipe unlinks its brews", async () => {
		const v60 = await machine("pour-over");
		const recipe = await ok(
			addRecipe({ ...dial, name: "Morning", method: "pour-over" }),
		);
		const brew = await ok(
			addBrew({ ...dial, beanId: undefined, machineId: v60, date: new Date() }),
		);
		await linkBrewToRecipe(brew, recipe);
		expect((await db.Brews.get(brew))?.recipeId).toBe(recipe);

		await deleteRecipeById(recipe);

		expect(await db.Recipes.count()).toBe(0);
		expect(await db.Brews.get(brew)).not.toHaveProperty("recipeId");
	});

	it("deleting a bean clears recipe bean ties", async () => {
		const beanId = await bean("Kenya");
		const recipe = await ok(
			addRecipe({ ...dial, name: "Kenya V60", method: "pour-over", beanId }),
		);
		await deleteBeanById(beanId);
		expect(await db.Recipes.get(recipe)).not.toHaveProperty("beanId");
	});

	it("lists recipes for a method: bean-less plus the selected bean's", async () => {
		const kenya = await bean("Kenya");
		const brazil = await bean("Brazil");
		await ok(addRecipe({ ...dial, name: "Any", method: "pour-over" }));
		await ok(
			addRecipe({ ...dial, name: "Kenya", method: "pour-over", beanId: kenya }),
		);
		await ok(
			addRecipe({
				...dial,
				name: "Brazil",
				method: "pour-over",
				beanId: brazil,
			}),
		);
		await ok(addRecipe({ ...dial, name: "Shot", method: "espresso" }));

		const names = async (beanId?: number) =>
			(await getRecipesForMethod("pour-over", beanId)).map((r) => r.name);
		expect(await names()).toEqual(["Any"]);
		expect(await names(kenya)).toEqual(["Any", "Kenya"]);
		expect(await getRecipesForMethod("moka")).toEqual([]);
	});

	it("locks a brewer's method once it has brews", async () => {
		const id = await machine("espresso");
		await updateMachineById({ method: "moka" }, id);
		expect((await db.Machines.get(id))?.method).toBe("moka");
		await ok(
			addBrew({ ...dial, beanId: undefined, machineId: id, date: new Date() }),
		);
		await expect(updateMachineById({ method: "espresso" }, id)).rejects.toThrow(
			"locked",
		);
		await updateMachineById({ name: "Renamed", method: "moka" }, id);
		expect((await db.Machines.get(id))?.name).toBe("Renamed");
	});
});
