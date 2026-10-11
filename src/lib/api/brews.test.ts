import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import { getGrindSettingsForBean, getLatestUnratedBrew } from "./brews";

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

function brew(
	overrides: Partial<Brews> & { beanId: number; date: Date },
): Omit<Brews, "id"> {
	return {
		localId: `brew-${crypto.randomUUID()}`,
		grindSize: 12,
		beanWeight: 18,
		espressoWeight: 36,
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
