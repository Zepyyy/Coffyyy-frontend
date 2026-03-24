import type { Beans, Brews, Machines } from "@/types/default";
import { db } from "../db";

async function addBean(bean: Omit<Beans, "id">) {
	try {
		return await db.Beans.bulkAdd([bean]);
	} catch (error) {
		return error;
	}
}

async function addRandomBean() {
	try {
		return await db.Beans.bulkAdd([
			{
				botanic: "Arabica",
				name: "Random Bean",
				brand: "Lugat",
				designation: "Pure Origin",
				dominantNote: "Spices",
				finished: false,
				flavors: ["mango", "Banan", "Lime"],
				origin: ["Colombia"],
				process: "Honey",
				rating: 5,
				roastLevel: 4,
				status: "Excellent",
				tastingNotes: ["Fruity"],
				variety: ["Castillo"],
			} as Omit<Beans, "id">,
		]);
	} catch (error) {
		return error;
	}
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

async function addRandomBean2() {
	try {
		return await db.Beans.bulkAdd([
			{
				botanic: "Arabica",
				name: "Random Bean",
				brand: "Lugat",
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
				origin: [SelectRandom(["Colombia", "France"])],
				process: "Honey",
				rating: 5,
				roastLevel: SelectRandom([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
				status: SelectRandom(["Excellent", "Good", "Fair", "Poor"]),
				tastingNotes: SelectMultiple(
					[
						"mango",
						"Banan",
						"Lime",
						"Apple",
						"Orange",
						"qsd",
						"JustRandomStuff",
						"ALongAssFlavorRightThere",
						"I",
						"smol",
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
				name: "Random Machine",
				brand: "Sage",
				capacity: "capacity 2",
				grindRange: "fine",
				purchaseDate: "qsd",
				induction: false,
				model: "MODEL",
				type: "Espresso",
			} as Omit<Machines, "id">,
		]);
	} catch (error) {
		return error;
	}
}
async function addRandomMachine2() {
	try {
		return await db.Machines.bulkAdd([
			{
				name: "Random Machine",
				brand: "Sage",
				capacity: "capacity 2",
				grindRange: "fine",
				purchaseDate: "qsd",
				induction: false,
				model: "MODEL",
				type: "Moka Pot",
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
	addMachine,
	addRandomBean,
	addRandomBean2,
	addRandomMachine,
	addRandomMachine2,
};
