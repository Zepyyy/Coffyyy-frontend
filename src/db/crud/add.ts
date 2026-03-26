import type { Brews, Machines } from "@/types/default";
import { db } from "../db";
import type { Beans } from "@/types/BeanTypes";

async function addBean(bean: Omit<Beans, "id">) {
	try {
		return await db.Beans.bulkAdd([bean]);
	} catch (error) {
		return error;
	}
}

export async function getRandomBean(): Promise<Beans["name"] | undefined> {
	const beans = await db.Beans.toArray();
	return SelectRandom(beans.map((bean) => bean.name));
}

export async function getRandomMachine(): Promise<
	Machines["name"] | undefined
> {
	const machines = await db.Machines.toArray();
	return SelectRandom(machines.map((machine) => machine.name));
}

function SelectRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function SelectMultiple<T>(arr: T[], count: number): T[] {
	const result: T[] = [];
	for (let i = 0; i < count; i++) {
		result.push(SelectRandom(arr));
	}
	return result;
}

async function addRandomBean() {
	try {
		return await db.Beans.bulkAdd([
			{
				botanic: "Arabica",
				name: SelectRandom([
					"Okay",
					"Randomly",
					"This one",
					" placeholder",
					"Just doing it",
					"Need more",
					"Easy tpo add",
					"and last qslidjfgb oqs",
				]),
				brand: SelectRandom(["Lugat", "The Barn", "Another Brand", "Last one"]),
				designation: "Pure Origin",
				dominantNote: SelectRandom([
					"Fruity",
					"Nutty",
					"Floral",
					"Sweet",
					"Sour",
					"Spices",
					"Roasted",
					"Green",
				]),
				finished: false,
				flavors: ["mango", "Banan", "Lime"],
				origin: [
					SelectRandom([
						"Colombia",
						"France",
						"Venezuela",
						"Brazil",
						"Argentina",
					]),
				],
				process: [
					SelectRandom(["Natural", "Honey", "Washed", "Semi-Processed"]),
				],
				rating: SelectRandom([1, 2, 3, 4, 5]),
				roastLevel: SelectRandom([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
				status: SelectRandom(["Excellent", "Good", "Fair", "Poor"]),
				tastingNotes: SelectMultiple(
					[
						"Mango",
						"Banan",
						"Lime",
						"Apple",
						"Orange",
						"Nut",
						"Chocolate",
						"Almonds",
						"Cherry",
						"Berries",
					],
					4,
				),
				variety: [SelectRandom(["Castillo", "Geisha"])],
			} as Omit<Beans, "id">,
		]);
	} catch (error) {
		return error;
	}
}
async function addRandomMachine() {
	try {
		return await db.Machines.bulkAdd([
			{
				name: SelectRandom([
					"This random machine",
					"Another oen",
					"And to finish",
				]),
				brand: SelectRandom(["Sage", "Hario", "V60"]),
				capacity: "capacity 2",
				grindRange: SelectRandom(["fine", "medium", "coarse"]),
				purchaseDate: "01-01-2025",
				induction: SelectRandom([true, false]),
				model: "MODEL",
				type: SelectRandom(["Espresso", "Moka Pot"]),
			} as Omit<Machines, "id">,
		]);
	} catch (error) {
		return error;
	}
}

async function addBrew(brew: Omit<Brews, "id">) {
	try {
		return await db.Brews.bulkAdd([brew]);
	} catch (error) {
		return error;
	}
}

// id: number;
// bean: string;
// overallRating: string;
// grindSize: string;
// date: Date;
// acidity: string;
// adjustementNeeded: string;
// aftertaste: string;
// bitterness: string;
// mouthfeel: string;
// strength: string;
// machine: string;
// tasteProfiles: Array<string>;

async function addRandomBrew() {
	console.log(await getRandomBean(), await getRandomMachine());
	if ((await getRandomBean()) === undefined) {
		console.log("No bean found");
		return;
	}
	if ((await getRandomMachine()) === undefined) {
		console.log("No machine found");
		return;
	}
	try {
		return await db.Brews.bulkAdd([
			{
				acidity: SelectRandom([
					"⚡ Too sharp/sour",
					"🍋 Bright/Lively",
					"😊 Balanced",
					"😴 Flat/Dull",
				]),
				bean: await getRandomBean(),
				overallRating: SelectRandom([
					"Excellent",
					"Good",
					"Mid",
					"Horrible",
					"Burnt🔥",
				]),
				grindSize: SelectRandom(["fine", "medium", "coarse"]),
				date: new Date(),
				adjustementNeeded: SelectRandom([
					"Keep this setting 👍",
					"Grind finer next time ⬇️",
					"Grind coarser next time ⬆️",
					"Try different machine 🔄",
					"Fuck this bean ‼️",
				]),
				aftertaste: SelectRandom([
					"✨ Amazing - lingering sweetness",
					"👍 Pleasant",
					"😐 Neutral",
					"👎 Unpleasant/harsh",
				]),
				bitterness: SelectRandom([
					"👍 Barely noticeable",
					"🍫 Pleasant bitter",
					"😐 Neutral",
					"👎 Unpleasant/harsh",
				]),
				mouthfeel: SelectRandom([
					"✨ Amazing - lingering sweetness",
					"👍 Pleasant",
					"😐 Neutral",
					"👎 Unpleasant/harsh",
				]),
				strength: SelectRandom(["‼️ Too strong", "🍃 Just right", "💧Too weak"]),
				machine: await getRandomMachine(),
				tasteProfiles: [],
			} as Omit<Brews, "id">,
		]);
	} catch (error) {
		return error;
	}
}

async function addMachine(machine: Omit<Machines, "id">) {
	try {
		return await db.Machines.bulkAdd([machine]);
	} catch (error) {
		return error;
	}
}

export {
	addBean,
	addBrew,
	addRandomBrew,
	addMachine,
	addRandomBean,
	addRandomMachine,
};
