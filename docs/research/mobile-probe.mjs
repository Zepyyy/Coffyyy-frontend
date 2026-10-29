// Research regression probe; disposable browser only. Start Vite on port 5183.
import { chromium } from "playwright";
const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true,
});
const page = await context.newPage();
const failures = [];
try {
	await page.goto("http://127.0.0.1:5183");
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

	const rows = [];
	for (const width of [320, 360, 390, 430]) {
		await page.setViewportSize({ width, height: 844 });
		for (const route of [
			"/home",
			"/history",
			"/library",
			"/library?tab=recipes",
			"/library?tab=machines",
			"/beans/101",
			"/log/brew?fromBrew=401",
			"/log/bean",
			"/log/machine",
			"/log/recipe",
		]) {
			await page.goto("http://127.0.0.1:5183" + route);
			await page.waitForTimeout(600);
			const row = await page.evaluate(
				({ route, width }) => ({
					route,
					width,
					scrollWidth: document.documentElement.scrollWidth,
					clientWidth: document.documentElement.clientWidth,
				}),
				{ route, width },
			);
			rows.push(row);
			if (row.scrollWidth > row.clientWidth)
				failures.push(`overflow ${width} ${route}: ${row.scrollWidth}`);
		}
	}
	console.table(rows);
	await page.goto("http://127.0.0.1:5183/log/brew?fromBrew=401");
	await page.waitForTimeout(600);
	const input = page.getByRole("textbox", {
		name: "Dose (ground coffee) dial — type a value",
	});
	const before = await input.inputValue();
	await page
		.getByRole("button", { name: "Dose (ground coffee) dial — increase" })
		.focus();
	await page.keyboard.press("Enter");
	if ((await input.inputValue()) === before)
		failures.push("Dial increase Enter does not change value");
	await page.keyboard.press("Space");
	if ((await input.inputValue()) === before)
		failures.push("Dial increase Space does not change value");
	// Exact mobile-polish base-layer rule, isolated browser only. Checks proposed fix.
	await page.addStyleTag({
		content:
			'@layer base { @media(max-width:639px) {input:not([type="checkbox"], [type="radio"], [type="range"]),select,textarea {font-size:16px;} } }',
	});
	const font = await page
		.getByRole("spinbutton", { name: "Custom grind size" })
		.evaluate((e) => getComputedStyle(e).fontSize);
	if (font !== "16px")
		failures.push(`branch font-size guard ineffective: ${font}`);
	console.log(failures.length ? failures.join("\n") : "PASS mobile probes");
	if (failures.length) process.exitCode = 1;
} finally {
	await browser.close();
}
