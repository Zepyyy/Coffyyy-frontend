import { db } from "@/db/db";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import type { Recipes } from "@/types/RecipeTypes";

/** A brew to repeat, with what it points at; null where that is gone. */
export type RepeatSourceRows = {
	brew: Brews;
	bean: { id: number } | null;
	machine: Pick<Machines, "id" | "method"> | null;
	recipe: Recipes | null;
};

/** The exact brew behind `?fromBrew=`. Null when it no longer exists. */
export async function getRepeatSource(
	brewId: number | undefined,
): Promise<RepeatSourceRows | null> {
	if (!brewId) return null;
	const brew = await db.Brews.get(brewId);
	if (!brew) return null;
	const [bean, machine, recipe] = await Promise.all([
		brew.beanId ? db.Beans.get(brew.beanId) : undefined,
		brew.machineId ? db.Machines.get(brew.machineId) : undefined,
		brew.recipeId ? db.Recipes.get(brew.recipeId) : undefined,
	]);
	return {
		brew,
		bean: bean ? { id: bean.id } : null,
		machine: machine ? { id: machine.id, method: machine.method } : null,
		recipe: recipe ?? null,
	};
}
