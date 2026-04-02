import { SelectRandom } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Machines } from "@/types/MachineTypes";
import { db } from "../db";

async function getRandomBean(): Promise<Beans["name"] | undefined> {
	const beans = await db.Beans.toArray();
	return SelectRandom(beans.map((bean) => bean.name));
}

async function getRandomMachine(): Promise<Machines["name"] | undefined> {
	const machines = await db.Machines.toArray();
	return SelectRandom(machines.map((machine) => machine.name));
}

export { getRandomBean, getRandomMachine };
