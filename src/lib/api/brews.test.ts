import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import type { Beans } from "@/types/BeanTypes";
import type { BrewMethod, Brews } from "@/types/BrewTypes";
import {
	getBrewFormStart,
	getGrindSettingsForBean,
	getLastBrewForBean,
	getLastUsedMachineId,
	getLatestUnratedBrew,
} from "./brews";

async function seedBean(name: string): Promise<Beans> {
	const id = await db.Beans.add({
		localId: `bean-${name}`,
		name,
		rating: 0,
		status: "New",
		roastLevel: 3,
		origin: [],
		process: [],
		variety: [],
		brand: "",
		botanic: "Arabica",
		designation: "Pure Origin",
		flavors: [],
		finished: false,
		dominantNote: "Fruity",
	} as Omit<Beans, "id">);
	return (await db.Beans.get(id))!;
}

async function seedMachine(name: string, method: BrewMethod) {
	return db.Machines.add({
		localId: `machine-${name}`,
		name,
		brand: "",
		model: "",
		method,
		purchaseDate: "",
		grindRange: "",
		capacity: "",
	} as never);
}

async function seedRecipe(
	name: string,
	method: "espresso" | "pour-over",
	beanId?: number,
) {
	return db.Recipes.add({
		localId: `recipe-${name}`,
		name,
		method,
		beanId,
		beanWeight: 15,
		brewWeight: 250,
		createdAt: new Date(),
	} as never);
}

function brew(
	overrides: Partial<Brews> & { beanId: number; date: Date },
): Omit<Brews, "id"> {
	return {
		localId: `brew-${crypto.randomUUID()}`,
		grindSize: 12,
		beanWeight: 18,
		method: "espresso",
		brewWeight: 36,
		...overrides,
	} as Omit<Brews, "id">;
}

const hoursAgo = (hours: number) =>
	new Date(Date.now() - hours * 60 * 60 * 1000);

describe("getGrindSettingsForBean", () => {
	beforeEach(async () => {
		await Promise.all([db.Beans.clear(), db.Brews.clear()]);
	});

	it("returns one entry per grind setting, newest use first", async () => {
		const bean = await seedBean("Test Bean");
		await db.Brews.bulkAdd([
			brew({ beanId: bean.id, date: hoursAgo(30), grindSize: 10 }),
			brew({ beanId: bean.id, date: hoursAgo(2), grindSize: 12 }),
			brew({ beanId: bean.id, date: hoursAgo(28), grindSize: 12 }),
		]);

		const settings = await getGrindSettingsForBean(bean.id);

		expect(settings.map((s) => s.grindSize)).toEqual([12, 10]);
		expect(settings[0].shotCount).toBe(2);
		expect(+new Date(settings[0].lastBrew.date)).toBeGreaterThan(
			+new Date(settings[1].lastBrew.date),
		);
	});

	it("keeps extraction behavior and rating reachable on each entry", async () => {
		const bean = await seedBean("Test Bean");
		await db.Brews.bulkAdd([
			brew({
				beanId: bean.id,
				date: hoursAgo(5),
				grindSize: 10,
				flow: "Struggling",
				overallRating: 3,
			}),
		]);

		const [setting] = await getGrindSettingsForBean(bean.id);

		expect(setting.lastBrew.flow).toBe("Struggling");
		expect(setting.lastBrew.overallRating).toBe(3);
	});

	it("ignores other beans and missing grind sizes", async () => {
		const bean = await seedBean("Test Bean");
		const other = await seedBean("Other Bean");
		await db.Brews.bulkAdd([
			brew({ beanId: other.id, date: hoursAgo(1), grindSize: 5 }),
			brew({ beanId: bean.id, date: hoursAgo(1), grindSize: undefined }),
		]);

		expect(await getGrindSettingsForBean(bean.id)).toEqual([]);
	});
});

describe("getLatestUnratedBrew", () => {
	beforeEach(async () => {
		await Promise.all([db.Beans.clear(), db.Brews.clear()]);
	});

	it("finds the newest brew missing feedback", async () => {
		const bean = await seedBean("Test Bean");
		await db.Brews.bulkAdd([
			brew({
				beanId: bean.id,
				date: hoursAgo(1),
				tasteScore: 0,
				strengthScore: 0,
				overallRating: 4,
			}),
			brew({
				beanId: bean.id,
				date: hoursAgo(2),
				tasteScore: 0,
				strengthScore: 0,
			}),
		]);

		const unrated = await getLatestUnratedBrew();

		expect(unrated?.overallRating ?? null).toBeNull();
	});

	it("stops asking about brews older than the feedback window", async () => {
		const bean = await seedBean("Test Bean");
		await db.Brews.add(
			brew({ beanId: bean.id, date: hoursAgo(100), tasteScore: 0 }),
		);

		expect(await getLatestUnratedBrew()).toBeNull();
	});
});

describe("form-side queries filter by method", () => {
	beforeEach(async () => {
		await Promise.all([db.Beans.clear(), db.Brews.clear()]);
	});

	it("grind history only counts brews of the method", async () => {
		const bean = await seedBean("Test Bean");
		await db.Brews.bulkAdd([
			brew({
				beanId: bean.id,
				date: hoursAgo(1),
				grindSize: 20,
				method: "pour-over",
			}),
			brew({ beanId: bean.id, date: hoursAgo(2), grindSize: 12 }),
		]);

		const espresso = await getGrindSettingsForBean(bean.id, "espresso");
		const pourOver = await getGrindSettingsForBean(bean.id, "pour-over");

		expect(espresso.map((s) => s.grindSize)).toEqual([12]);
		expect(pourOver.map((s) => s.grindSize)).toEqual([20]);
	});

	it("last brew for a bean is the newest of that method", async () => {
		const bean = await seedBean("Test Bean");
		await db.Brews.bulkAdd([
			brew({
				beanId: bean.id,
				date: hoursAgo(1),
				method: "moka",
				brewWeight: 100,
			}),
			brew({ beanId: bean.id, date: hoursAgo(3), brewWeight: 40 }),
			brew({ beanId: bean.id, date: hoursAgo(5), brewWeight: 36 }),
		]);

		expect((await getLastBrewForBean(bean.id, "espresso"))?.brewWeight).toBe(
			40,
		);
		expect((await getLastBrewForBean(bean.id, "moka"))?.brewWeight).toBe(100);
		expect(await getLastBrewForBean(bean.id, "pour-over")).toBeNull();
	});
});

describe("getLastUsedMachineId", () => {
	beforeEach(async () => {
		await Promise.all([
			db.Beans.clear(),
			db.Brews.clear(),
			db.Machines.clear(),
		]);
	});

	it("is null without brewers", async () => {
		expect(await getLastUsedMachineId()).toBeNull();
	});

	it("falls back to the first brewer when none has brews", async () => {
		const first = await seedMachine("Linea", "espresso");
		await seedMachine("V60", "pour-over");

		expect(await getLastUsedMachineId()).toBe(first);
	});

	it("picks the brewer of the newest brew, per method when asked", async () => {
		const bean = await seedBean("Test Bean");
		const linea = await seedMachine("Linea", "espresso");
		const v60 = await seedMachine("V60", "pour-over");
		const kalita = await seedMachine("Kalita", "pour-over");
		await db.Brews.bulkAdd([
			brew({ beanId: bean.id, date: hoursAgo(1), machineId: linea }),
			brew({
				beanId: bean.id,
				date: hoursAgo(2),
				machineId: kalita,
				method: "pour-over",
			}),
			brew({
				beanId: bean.id,
				date: hoursAgo(3),
				machineId: v60,
				method: "pour-over",
			}),
		]);

		expect(await getLastUsedMachineId()).toBe(linea);
		expect(await getLastUsedMachineId("pour-over")).toBe(kalita);
		expect(await getLastUsedMachineId("moka")).toBeNull();
	});

	it("skips brews whose brewer was deleted", async () => {
		const bean = await seedBean("Test Bean");
		const linea = await seedMachine("Linea", "espresso");
		await db.Brews.bulkAdd([
			brew({ beanId: bean.id, date: hoursAgo(1), machineId: 999 }),
			brew({ beanId: bean.id, date: hoursAgo(2), machineId: linea }),
		]);

		expect(await getLastUsedMachineId()).toBe(linea);
	});
});

describe("getBrewFormStart", () => {
	beforeEach(async () => {
		await Promise.all([
			db.Beans.clear(),
			db.Brews.clear(),
			db.Machines.clear(),
			db.Recipes.clear(),
		]);
	});

	it("starts on the last-used brewer without params", async () => {
		const bean = await seedBean("Test Bean");
		await seedMachine("Linea", "espresso");
		const v60 = await seedMachine("V60", "pour-over");
		await db.Brews.add(
			brew({
				beanId: bean.id,
				date: hoursAgo(1),
				machineId: v60,
				method: "pour-over",
			}),
		);

		expect(await getBrewFormStart()).toEqual({
			machineId: v60,
			method: "pour-over",
			beanId: null,
			recipe: null,
		});
	});

	it("keeps a bean param only when the bean exists", async () => {
		const bean = await seedBean("Test Bean");
		await seedMachine("Linea", "espresso");

		expect((await getBrewFormStart(bean.id)).beanId).toBe(bean.id);
		expect((await getBrewFormStart(999)).beanId).toBeNull();
	});

	it("a recipe picks a brewer of its method and its bean", async () => {
		const bean = await seedBean("Test Bean");
		await seedMachine("Linea", "espresso");
		const v60 = await seedMachine("V60", "pour-over");
		const recipeId = await seedRecipe("Bright", "pour-over", bean.id);

		const start = await getBrewFormStart(undefined, recipeId);

		expect(start.machineId).toBe(v60);
		expect(start.method).toBe("pour-over");
		expect(start.beanId).toBe(bean.id);
		expect(start.recipe?.id).toBe(recipeId);
	});

	it("drops a recipe no brewer can follow, or tied to another bean", async () => {
		const bean = await seedBean("Test Bean");
		const other = await seedBean("Other Bean");
		const linea = await seedMachine("Linea", "espresso");
		const pourOver = await seedRecipe("Bright", "pour-over");
		const tied = await seedRecipe("Tied", "espresso", other.id);

		const noBrewer = await getBrewFormStart(undefined, pourOver);
		expect(noBrewer.recipe).toBeNull();
		expect(noBrewer.machineId).toBe(linea);

		const otherBean = await getBrewFormStart(bean.id, tied);
		expect(otherBean.recipe).toBeNull();
		expect(otherBean.beanId).toBe(bean.id);

		expect((await getBrewFormStart(undefined, 999)).recipe).toBeNull();
	});
});
