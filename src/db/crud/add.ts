import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import { db } from "../db";

async function addBean(bean: Omit<Beans, "id">) {
	try {
		// Check if a bean with the same name already exists
		const existingBean = await db.Beans.where("name").equals(bean.name).first();
		if (!existingBean) {
			return await db.Beans.bulkAdd([bean]);
		} else {
			return new Error(`Bean with name ${bean.name} already exists`);
		}
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
		return await addBean({
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
			process: [SelectRandom(["Natural", "Honey", "Washed", "Semi-Processed"])],
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
		} as Omit<Beans, "id">);
	} catch (error) {
		return error;
	}
}
async function addRandomMachine() {
	try {
		return await addMachine({
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
		} as Omit<Machines, "id">);
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
				bean: await getRandomBean(),
				date: new Date(),
				overallRating: SelectRandom([
					"Excellent",
					"Good",
					"Mid",
					"Horrible",
					"Burnt🔥",
				]),
				grindSize: SelectRandom(["fine", "medium", "coarse"]),
				beanWeight: SelectRandom([
					10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
				]),
				espressoWeight: SelectRandom([
					1, 2, 3, 4, 5, 6, 7, 8, 9, 10
				]),
				flow: SelectRandom(["even", "uneven"]),
				extractionTime: SelectRandom([
					"30s",
					"40s",
					"50s",
					"60s",
					"70s",
					"80s",
					"90s",
					"100s",
				]),
				machine: await getRandomMachine(),
			} as Omit<Brews, "id">,
		]);
	} catch (error) {
		return error;
	}
}

async function addMachine(machine: Omit<Machines, "id">) {
	try {
		// Check if a bean with the same name already exists
		const existingMachine = await db.Machines.where("name")
			.equals(machine.name)
			.first();
		if (!existingMachine) {
			return await db.Machines.bulkAdd([machine]);
		} else {
			return new Error(`Machine with name ${machine.name} already exists`);
		}
	} catch (error) {
		return error;
	}
}

export {
	addBean,
	addBrew,
	addMachine,
	addRandomBean,
	addRandomBrew,
	addRandomMachine,
};
