import { db } from "@/db/db";

export type DatabaseCounts = {
	beans: number;
	brewers: number;
	brews: number;
};

export async function getDatabaseCounts(): Promise<DatabaseCounts> {
	const [beans, brewers, brews] = await Promise.all([
		db.Beans.count(),
		db.Brewers.count(),
		db.Brews.count(),
	]);

	return { beans, brewers, brews };
}
