// Run against an isolated browser: npm run dev -- --host 127.0.0.1, then node scripts/verify-ux.mjs.
// Seeds only the disposable Playwright context. Screenshots go to /tmp.
import { chromium } from "playwright";
import assert from "node:assert/strict";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({
	headless: true,
	...(process.env.CHROMIUM_EXECUTABLE_PATH
		? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
		: {}),
});
try {
	const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
	page.setDefaultTimeout(10000);
	const errors = [];
	page.on("pageerror", (e) => {
		errors.push(e.message);
		undefined;
	});
	await page.goto(BASE);
	await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		const bean = {
			id: 101,
			localId: "ux-bean",
			name: "Moonwalk",
			rating: 0,
			status: "New",
			roastLevel: 3,
			origin: ["Colombia"],
			process: [],
			variety: [],
			brand: "Test Roaster",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
			dominantNote: "Fruity",
		};
		await db.Beans.put(bean);
		await db.Machines.put({
			id: 201,
			localId: "ux-brewer",
			name: "Kitchen",
			method: "espresso",
			brand: "Test",
			model: "One",
		});
		await db.Recipes.put({
			id: 301,
			localId: "ux-recipe",
			name: "Morning target",
			method: "espresso",
			beanId: 101,
			beanWeight: 18,
			brewWeight: 36,
			createdAt: new Date(),
		});
		await db.Brews.bulkPut([
			{
				id: 401,
				localId: "ux-brew1",
				beanId: 101,
				machineId: 201,
				recipeId: 301,
				method: "espresso",
				date: new Date(Date.now() - 86400000),
				grindSize: 12,
				beanWeight: 18,
				brewWeight: 36,
				extractionTime: "28",
				overallRating: 5,
				notes: "Chocolate finish",
			},
			{
				id: 402,
				localId: "ux-brew2",
				beanId: 101,
				machineId: 201,
				method: "espresso",
				date: new Date(),
				grindSize: 15,
				beanWeight: 18,
				brewWeight: 40,
				overallRating: 3,
			},
		]);
	});
	await page.goto(BASE + "/library");
	await page
		.getByRole("textbox", { name: "Search beans", exact: true })
		.fill("Moonwalk");
	await page.getByRole("status").filter({ hasText: "1 of 1 beans" }).waitFor();
	await page
		.getByRole("textbox", { name: "Search beans", exact: true })
		.fill("nonexistent");
	await page.getByRole("status").filter({ hasText: "0 of 1 beans" }).waitFor();
	await page.getByRole("button", { name: "Clear search and filters" }).click();
	await page.getByRole("button", { name: "Filters", exact: true }).click();
	const filter = page
		.getByRole("button", { name: /Colombia/ })
		.filter({ visible: true });
	await filter.focus();
	await page.keyboard.press("Space");
	assert.equal(await filter.getAttribute("aria-pressed"), "true");
	await page.screenshot({
		path: "/tmp/coffyyy-library-mobile.png",
		fullPage: true,
	});
	await page.goto(BASE + "/library?tab=recipes");
	await page
		.getByRole("link", { name: "View brews following Morning target" })
		.click();
	await page.getByText("Brews following").waitFor();

	await page.getByText(/Matching:.*1 brew.*1 bean chapter/).waitFor();
	await page.getByRole("button", { name: "Timeline", exact: true }).click();
	await page.waitForURL(/view=timeline/);
	await page
		.getByRole("textbox", {
			name: "Search brews by bean, brewer, recipe or notes",
		})
		.fill("chocolate");
	await page.waitForURL(/q=chocolate/);
	await page.reload();
	await page
		.getByRole("textbox", {
			name: "Search brews by bean, brewer, recipe or notes",
		})
		.waitFor();
	assert.equal(
		await page
			.getByRole("textbox", {
				name: "Search brews by bean, brewer, recipe or notes",
			})
			.inputValue(),
		"chocolate",
	);

	assert.equal(
		await page
			.getByRole("button", { name: "Timeline", exact: true })
			.getAttribute("aria-pressed"),
		"true",
	);
	await page.screenshot({
		path: "/tmp/coffyyy-history-mobile.png",
		fullPage: true,
	});
	await page.goto(BASE + "/log/brew?fromBrew=401");
	await page
		.getByText(/Repeating your shot/)
		.filter({ visible: true })
		.waitFor();
	assert.equal(
		await page
			.getByRole("button", { name: "12", exact: true })
			.getAttribute("data-active"),
		"true",
	);
	assert.equal(
		await page.getByRole("textbox", { name: "Time in seconds" }).inputValue(),
		"",
	);
	await page
		.getByRole("button", { name: "Save the shot", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Add taste notes", exact: false })
		.click();
	await page
		.getByRole("button", { name: "Mark sour to bitter as balanced" })
		.click();
	await page.getByRole("button", { name: "Save notes", exact: true }).click();
	await page.getByText("Notes saved", { exact: true }).waitFor();
	const saved = await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		return await db.Brews.orderBy("date").reverse().first();
	});
	assert.equal(saved.grindSize, 12);
	assert.equal(saved.tasteScore, 0);
	assert.equal(saved.strengthScore, undefined);
	assert.equal(saved.overallRating, undefined);
	assert.equal(saved.notes, undefined);
	for (const width of [320, 390, 1280]) {
		await page.setViewportSize({ width, height: 900 });
		for (const route of [
			"/library",
			"/history?view=timeline",
			"/library?tab=recipes",
			"/beans/101",
		]) {
			await page.goto(BASE + route);
			await page.getByRole("heading", { level: 1 }).waitFor();
			assert.ok(
				await page.evaluate(
					() =>
						document.documentElement.scrollWidth <=
						document.documentElement.clientWidth,
				),
				`overflow ${width} ${route}`,
			);
		}
	}
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	await page.waitForTimeout(500);
	await page.screenshot({
		path: "/tmp/coffyyy-recipes-dark.png",
		fullPage: true,
	});
	assert.deepEqual(errors, []);
	console.log(
		"PASS: name search, reset, Space filter, recipe history, URL persistence; no overflow 320/390/1280; no page errors.",
	);
} finally {
	await browser.close();
}
