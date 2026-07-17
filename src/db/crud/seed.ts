import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
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
const MACHINE_SPECS = [
	{ brand: "La Marzocco", model: "Linea Mini", type: "Espresso" },
	{ brand: "Sage", model: "Barista Pro", type: "Espresso" },
	{ brand: "Flair", model: "58+", type: "Manual espresso" },
	{ brand: "Gaggia", model: "Classic Evo", type: "Espresso" },
	{ brand: "Hario", model: "V60", type: "Pour over" },
	{ brand: "Cafelat", model: "Robot", type: "Manual espresso" },
];
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
		capacity: spec.type === "Pour over" ? "1-3 cups" : "2 cups",
		grindRange: spec.type === "Pour over" ? "medium-fine" : "fine to coarse",
		purchaseDate: `${randomInt(2021, 2025)}-0${randomInt(1, 9)}-${String(randomInt(1, 28)).padStart(2, "0")}`,
		model: spec.model,
		type: spec.type,
	};
}

function createBrew(
	index: number,
	beanId: number,
	machineId: number,
): Omit<Brews, "id"> {
	const isUnrated = index % 11 === 0;
	const beanWeight = randomInt(17, 21);
	const espressoWeight = randomInt(30, 46);

	return {
		beanId,
		machineId,
		date: dateWithinLastMonths(),
		overallRating: isUnrated ? undefined : randomInt(2, 5),
		tasteScore: isUnrated ? undefined : randomInt(-3, 4),
		strengthScore: isUnrated ? undefined : randomInt(-2, 3),
		grindSize: randomInt(8, 18),
		beanWeight,
		espressoWeight,
		flow: pick(FLOWS),
		extractionTime: `${randomInt(25, 40)}s`,
	};
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
	await db.transaction("rw", db.Beans, db.Machines, db.Brews, async () => {
		await Promise.all([
			db.Brews.clear(),
			db.Beans.clear(),
			db.Machines.clear(),
		]);
	});
}

export async function resetDatabaseWithSeed(
	counts: DatabaseSeedCounts,
): Promise<DatabaseSeedSummary> {
	validateCounts(counts);

	return db.transaction("rw", db.Beans, db.Machines, db.Brews, async () => {
		await Promise.all([
			db.Brews.clear(),
			db.Beans.clear(),
			db.Machines.clear(),
		]);

		const beanIds: number[] = [];
		for (let index = 0; index < counts.beans; index += 1) {
			beanIds.push(await db.Beans.add(createBean(index)));
		}

		const machineIds: number[] = [];
		for (let index = 0; index < counts.machines; index += 1) {
			machineIds.push(await db.Machines.add(createMachine(index)));
		}

		for (let index = 0; index < counts.brews; index += 1) {
			await db.Brews.add(
				createBrew(
					index,
					beanIds[index % beanIds.length],
					machineIds[index % machineIds.length],
				),
			);
		}

		return counts;
	});
}
