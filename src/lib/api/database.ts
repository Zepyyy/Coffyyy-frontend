import { db } from "@/db/db";

export type DatabaseCounts = {
	beans: number;
	machines: number;
	brews: number;
	recipes: number;
};

export async function getDatabaseCounts(): Promise<DatabaseCounts> {
	const [beans, machines, brews, recipes] = await Promise.all([
		db.Beans.count(),
		db.Machines.count(),
		db.Brews.count(),
		db.Recipes.count(),
	]);

	return { beans, machines, brews, recipes };
}
