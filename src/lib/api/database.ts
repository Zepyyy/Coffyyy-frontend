import { db } from "@/db/db";

export type DatabaseCounts = {
	beans: number;
	machines: number;
	brews: number;
};

export async function getDatabaseCounts(): Promise<DatabaseCounts> {
	const [beans, machines, brews] = await Promise.all([
		db.Beans.count(),
		db.Machines.count(),
		db.Brews.count(),
	]);

	return { beans, machines, brews };
}
