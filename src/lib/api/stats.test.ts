import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import type { Brews } from "@/types/BrewTypes";
import {
	buildBeanBrewInsights,
	buildBeanDialInState,
	defaultMethodForBrews,
	getBeanBrewInsights,
	getBeanDialInStates,
	getBeanMethods,
	getBrewCountForBeanId,
	getBrewMethodsInUse,
	methodsInBrews,
} from "./stats";

const BEAN = 1;
const daysAgo = (days: number) =>
	new Date(Date.now() - days * 24 * 60 * 60 * 1000);

let nextId = 1;
function brew(overrides: Partial<Brews> & { date: Date }): Brews {
	return {
		id: nextId++,
		localId: `brew-${crypto.randomUUID()}`,
		beanId: BEAN,
		machineId: undefined,
		method: "espresso",
		grindSize: 12,
		beanWeight: 18,
		brewWeight: 36,
		...overrides,
	} as Brews;
}

function withoutId(row: Brews): Omit<Brews, "id"> {
	const copy: Partial<Brews> = { ...row };
	delete copy.id;
	return copy as Omit<Brews, "id">;
}

const espressoGood = (date: Date, grindSize = 12) =>
	brew({
		date,
		grindSize,
		overallRating: 5,
		flow: "even",
		extractionTime: "28",
	});

describe("method helpers", () => {
	it("methodsInBrews keeps fixed method order", () => {
		expect(
			methodsInBrews([
				brew({ date: daysAgo(1), method: "moka" }),
				brew({ date: daysAgo(2), method: "espresso" }),
				brew({ date: daysAgo(3), method: "moka" }),
			]),
		).toEqual(["espresso", "moka"]);
	});

	it("default method is the most recent brew's, regardless of order", () => {
		expect(
			defaultMethodForBrews([
				brew({ date: daysAgo(3), method: "espresso" }),
				brew({ date: daysAgo(1), method: "pour-over" }),
				brew({ date: daysAgo(2), method: "moka" }),
			]),
		).toBe("pour-over");
		expect(defaultMethodForBrews([])).toBeNull();
	});
});

describe("buildBeanBrewInsights", () => {
	const brews = [
		espressoGood(daysAgo(5), 12),
		espressoGood(daysAgo(4), 12),
		espressoGood(daysAgo(3), 13),
		brew({
			date: daysAgo(1),
			method: "pour-over",
			grindSize: 20,
			beanWeight: 15,
			brewWeight: 250,
			extractionTime: "180",
			waterTemp: 92,
			overallRating: 3,
		}),
		brew({
			date: daysAgo(2),
			method: "pour-over",
			grindSize: 22,
			beanWeight: 15,
			brewWeight: 240,
			extractionTime: "200",
			waterTemp: 94,
			overallRating: 4,
		}),
	];

	it("defaults to the latest method and uses only its brews", () => {
		const insights = buildBeanBrewInsights(BEAN, brews);
		expect(insights?.method).toBe("pour-over");
		expect(insights?.methods).toEqual(["espresso", "pour-over"]);
		expect(insights?.average._basedOnCount).toBe(2);
		expect(insights?.average.brewWeight).toBe(245);
		expect(insights?.average.waterTemp).toBe(93);
		expect(insights?.average._flow).toBeNull();
		expect(insights?.average.heat).toBeNull();
		expect(insights?.average.extractionTime).toBe("3:10");
		expect(insights?._lastBrew?.method).toBe("pour-over");
		expect(insights?.recentBrewScores).toHaveLength(2);
		expect(insights?.best?._basedOnCount).toBe(1);
		expect(insights?._dialIn).toMatchObject({
			method: "pour-over",
			totalBrews: 2,
			isDialedIn: false,
		});
	});

	it("splits by the requested method", () => {
		const insights = buildBeanBrewInsights(BEAN, brews, "espresso");
		expect(insights?.method).toBe("espresso");
		expect(insights?.average._basedOnCount).toBe(3);
		expect(insights?.average._flow).toBe("even");
		expect(insights?.average.waterTemp).toBeNull();
		expect(insights?.average.extractionTime).toBe("28s");
		expect(insights?._dialIn.isDialedIn).toBe(true);
	});

	it("falls back to the default when the method has no brews", () => {
		expect(buildBeanBrewInsights(BEAN, brews, "moka")?.method).toBe(
			"pour-over",
		);
	});

	it("summarises heat for moka", () => {
		const insights = buildBeanBrewInsights(BEAN, [
			brew({ date: daysAgo(2), method: "moka", heat: "high" }),
			brew({ date: daysAgo(1), method: "moka", heat: "medium" }),
			brew({ date: daysAgo(3), method: "moka", heat: "medium" }),
		]);
		expect(insights?.average.heat).toBe("medium");
		expect(insights?.average._flow).toBeNull();
	});

	it("is null with no brews", () => {
		expect(buildBeanBrewInsights(BEAN, [])).toBeNull();
	});

	it("dial-in badge judges the most recent method only", () => {
		// Espresso is dialed in, but the latest brew is pour-over.
		expect(buildBeanDialInState(BEAN, brews)).toMatchObject({
			method: "pour-over",
			isDialedIn: false,
		});
		expect(buildBeanDialInState(BEAN, brews.slice(0, 3))?.isDialedIn).toBe(
			true,
		);
	});
});

describe("stats queries", () => {
	beforeEach(async () => {
		await db.Brews.clear();
	});

	it("reads per bean and per method from Dexie", async () => {
		await db.Brews.bulkAdd(
			[
				espressoGood(daysAgo(4)),
				espressoGood(daysAgo(3)),
				espressoGood(daysAgo(2)),
				brew({ date: daysAgo(1), method: "moka", heat: "low" }),
				brew({ date: daysAgo(1), beanId: 2, method: "pour-over" }),
			].map(withoutId),
		);

		expect(await getBeanMethods(BEAN)).toEqual(["espresso", "moka"]);
		expect(await getBrewMethodsInUse()).toEqual([
			"espresso",
			"pour-over",
			"moka",
		]);
		expect(await getBrewCountForBeanId(BEAN)).toBe(4);
		expect(await getBrewCountForBeanId(BEAN, "espresso")).toBe(3);

		expect((await getBeanBrewInsights(BEAN))?.method).toBe("moka");
		const espresso = await getBeanBrewInsights(BEAN, "espresso");
		expect(espresso?._dialIn.isDialedIn).toBe(true);

		const states = await getBeanDialInStates([BEAN, 2]);
		expect(states.map((s) => [s.beanId, s.method, s.isDialedIn])).toEqual([
			[BEAN, "moka", false],
			[2, "pour-over", false],
		]);
	});
});
