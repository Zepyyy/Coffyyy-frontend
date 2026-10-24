import type { Beans } from "@/types/BeanTypes";
import { methodConfig } from "@/lib/brewMethods";
import { randomId } from "@/lib/randomId";
import type { BrewMethod, Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import type { Recipes } from "@/types/RecipeTypes";
import { db } from "@/db/db";

export type DatabaseSeedCounts = {
	beans: number;
	machines: number;
	brews: number;
};

export type DatabaseSeedSummary = DatabaseSeedCounts;

const ROASTERS = ["Kawa", "The Barn", "April", "Tim Wendelboe", "Nomad"];
const ORIGINS = [
	{ country: "Ethiopia", region: "Guji", process: "Natural", variety: "74110" },
	{
		country: "Colombia",
		region: "Huila",
		process: "Washed",
		variety: "Caturra",
	},
	{
		country: "Brazil",
		region: "Cerrado",
		process: "Natural",
		variety: "Yellow Bourbon",
	},
	{ country: "Kenya", region: "Nyeri", process: "Washed", variety: "SL28" },
	{
		country: "Guatemala",
		region: "Huehuetenango",
		process: "Honey",
		variety: "Bourbon",
	},
	{
		country: "Costa Rica",
		region: "Tarrazú",
		process: "Honey",
		variety: "Caturra",
	},
];
const DOMINANT_NOTES: Array<Beans["dominantNote"]> = [
	"Floral",
	"Fruity",
	"Green",
	"Nutty",
	"Roasted",
	"Sour",
	"Spices",
	"Sweet",
];
const TASTING_NOTES = [
	"chocolate",
	"caramel",
	"red berries",
	"citrus",
	"stone fruit",
	"black tea",
	"almond",
	"honey",
	"jasmine",
	"dried fruit",
];
// Small presets still get one Brewer per method: espresso, V60, moka first.
const MACHINE_SPECS: Array<{
	brand: string;
	model: string;
	method: BrewMethod;
	capacity: string;
	grindRange: string;
}> = [
	{
		brand: "La Marzocco",
		model: "Linea Mini",
		method: "espresso",
		capacity: "2 cups",
		grindRange: "fine to coarse",
	},
	{
		brand: "Hario",
		model: "V60",
		method: "pour-over",
		capacity: "1-3 cups",
		grindRange: "medium-fine",
	},
	{
		brand: "Bialetti",
		model: "Moka Express",
		method: "moka",
		capacity: "3 cups",
		grindRange: "fine",
	},
	{
		brand: "Sage",
		model: "Barista Pro",
		method: "espresso",
		capacity: "2 cups",
		grindRange: "fine to coarse",
	},
	{
		brand: "Flair",
		model: "58+",
		method: "espresso",
		capacity: "1 cup",
		grindRange: "fine to coarse",
	},
	{
		brand: "Gaggia",
		model: "Classic Evo",
		method: "espresso",
		capacity: "2 cups",
		grindRange: "fine to coarse",
	},
];
const HEATS = ["low", "medium", "medium", "high"] as const;
const FLOWS = ["Perfect", "Even", "Uneven", "Struggling"];

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(values: readonly T[]) {
	return values[randomInt(0, values.length - 1)] as T;
}

function pickMany<T>(values: readonly T[], min: number, max: number) {
	const copy = [...values];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = randomInt(0, i);
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, randomInt(min, Math.min(max, copy.length)));
}

function dateWithinLastMonths() {
	const daysAgo = randomInt(0, 180);
	return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

function createBean(index: number): Omit<Beans, "id"> {
	const origin = ORIGINS[index % ORIGINS.length];
	const roaster = pick(ROASTERS);
	const note = pick(DOMINANT_NOTES);

	return {
		botanic: "Arabica",
		name: `${origin.country} ${origin.region} ${index + 1}`,
		brand: roaster,
		designation: index % 4 === 0 ? "Blend" : "Pure Origin",
		dominantNote: note,
		finished: Math.random() < 0.2,
		flavors: pickMany(TASTING_NOTES, 3, 5),
		origin: [origin.country, origin.region],
		process: [origin.process],
		rating: randomInt(3, 5),
		roastLevel: randomInt(2, 6),
		status: pick(["Excellent", "Good", "Mid", "New"]),
		variety: [origin.variety],
	};
}

function createMachine(index: number): Omit<Machines, "id"> {
	const spec = MACHINE_SPECS[index % MACHINE_SPECS.length];

	return {
		name: `${spec.model} ${index + 1}`,
		brand: spec.brand,
		capacity: spec.capacity,
		grindRange: spec.grindRange,
		purchaseDate: `${randomInt(2021, 2025)}-0${randomInt(1, 9)}-${String(randomInt(1, 28)).padStart(2, "0")}`,
		model: spec.model,
		method: spec.method,
	};
}

/** Method-shaped dial values, around each method's defaults. */
function brewValues(method: BrewMethod) {
	if (method === "pour-over")
		return {
			grindSize: randomInt(16, 20),
			beanWeight: randomInt(14, 18),
			brewWeight: pick([230, 250, 270, 280]),
			extractionTime: String(randomInt(150, 240)),
			waterTemp: randomInt(90, 96),
		};
	if (method === "moka")
		return {
			grindSize: randomInt(8, 12),
			beanWeight: randomInt(14, 17),
			brewWeight: randomInt(80, 120),
			extractionTime: String(randomInt(180, 300)),
			heat: pick(HEATS),
		};
	return {
		grindSize: randomInt(8, 18),
		beanWeight: randomInt(17, 21),
		brewWeight: randomInt(30, 46),
		flow: pick(FLOWS),
		extractionTime: `${randomInt(25, 40)}s`,
	};
}

function createPourOverRecipe(beanId: number): Omit<Recipes, "id"> {
	const config = methodConfig("pour-over");
	return {
		name: "Bright V60 · 1:16",
		method: "pour-over",
		beanId,
		beanWeight: config.dose.default,
		brewWeight: 240,
		grindSize: 18,
		extractionTime: "180",
		waterTemp: config.waterTemp?.default,
		notes: "50g bloom 45s, then 4 even pours",
		localId: randomId(),
		createdAt: new Date(),
	};
}

function createBrew(
	index: number,
	beanId: number,
	machineId: number,
	method: BrewMethod,
): Omit<Brews, "id"> {
	const isUnrated = index % 11 === 0;

	return {
		beanId,
		machineId,
		method,
		date: dateWithinLastMonths(),
		overallRating: isUnrated ? undefined : randomInt(2, 5),
		tasteScore: isUnrated ? undefined : randomInt(-3, 4),
		strengthScore: isUnrated ? undefined : randomInt(-2, 3),
		...brewValues(method),
	};
}

/** Mostly espresso; every 5th brew pour-over, every 7th moka, when owned. */
function machineForBrew(index: number, machines: Machines[]) {
	const byMethod = (method: BrewMethod) =>
		machines.filter((machine) => machine.method === method);
	const wanted: BrewMethod =
		index % 5 === 1 ? "pour-over" : index % 7 === 2 ? "moka" : "espresso";
	const options = byMethod(wanted).length > 0 ? byMethod(wanted) : machines;
	return options[index % options.length];
}

function validateCounts(counts: DatabaseSeedCounts) {
	if (
		!Number.isInteger(counts.beans) ||
		counts.beans < 1 ||
		counts.beans > 50
	) {
		throw new Error("Beans count must be an integer from 1 to 50");
	}
	if (
		!Number.isInteger(counts.machines) ||
		counts.machines < 1 ||
		counts.machines > 12
	) {
		throw new Error("Machines count must be an integer from 1 to 12");
	}
	if (
		!Number.isInteger(counts.brews) ||
		counts.brews < 0 ||
		counts.brews > 500
	) {
		throw new Error("Brews count must be an integer from 0 to 500");
	}
}

export async function clearDatabase() {
	await db.transaction(
		"rw",
		[db.Beans, db.Machines, db.Brews, db.Recipes],
		async () => {
			await Promise.all([
				db.Brews.clear(),
				db.Beans.clear(),
				db.Machines.clear(),
				db.Recipes.clear(),
			]);
		},
	);
}

export async function resetDatabaseWithSeed(
	counts: DatabaseSeedCounts,
): Promise<DatabaseSeedSummary> {
	validateCounts(counts);

	return db.transaction(
		"rw",
		[db.Beans, db.Machines, db.Brews, db.Recipes],
		async () => {
			await Promise.all([
				db.Brews.clear(),
				db.Beans.clear(),
				db.Machines.clear(),
				db.Recipes.clear(),
			]);

			const beanIds: number[] = [];
			for (let index = 0; index < counts.beans; index += 1) {
				beanIds.push(
					await db.Beans.add({
						...createBean(index),
						localId: randomId(),
					}),
				);
			}

			const machines: Machines[] = [];
			for (let index = 0; index < counts.machines; index += 1) {
				const machine = { ...createMachine(index), localId: randomId() };
				machines.push({ ...machine, id: await db.Machines.add(machine) });
			}

			const recipeId = machines.some((m) => m.method === "pour-over")
				? await db.Recipes.add(createPourOverRecipe(beanIds[0]))
				: undefined;

			for (let index = 0; index < counts.brews; index += 1) {
				const machine = machineForBrew(index, machines);
				const beanId = beanIds[index % beanIds.length];
				await db.Brews.add({
					...createBrew(index, beanId, machine.id, machine.method),
					// Some pour-overs of the recipe's bean followed it.
					recipeId:
						machine.method === "pour-over" && beanId === beanIds[0]
							? recipeId
							: undefined,
					localId: randomId(),
				});
			}

			return counts;
		},
	);
}
