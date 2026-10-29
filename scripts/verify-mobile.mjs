// Mobile regression checks. Start Vite on 5183; only disposable browser data is seeded.
import { chromium } from "playwright";
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 390, height: 844 },
	isMobile: true,
	hasTouch: true,
});
const page = await context.newPage();
const failures = [];
page.on("pageerror", (error) => failures.push(`page error: ${error.message}`));
try {
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
		await db.Machines.bulkPut([
			{
				id: 202,
				localId: "mobile-v60",
				name: "Glass dripper",
				method: "pour-over",
				brand: "Test",
				model: "V60",
			},
			{
				id: 203,
				localId: "mobile-moka",
				name: "Moka pot",
				method: "moka",
				brand: "Test",
				model: "Three cup",
			},
		]);
		await db.Brews.bulkPut([
			{
				id: 403,
				localId: "mobile-pour",
				beanId: 101,
				machineId: 202,
				method: "pour-over",
				date: new Date(),
				grindSize: 20,
				beanWeight: 15,
				brewWeight: 250,
				waterTemp: 93,
			},
			{
				id: 404,
				localId: "mobile-moka-brew",
				beanId: 101,
				machineId: 203,
				method: "moka",
				date: new Date(),
				grindSize: 10,
				beanWeight: 17,
				brewWeight: 100,
				heat: "medium",
			},
		]);
	});

	const rows = [];
	for (const width of [320, 360, 390, 430, 640, 768, 1280]) {
		await page.setViewportSize({ width, height: 844 });
		for (const route of [
			"/home",
			"/history",
			"/library",
			"/library?tab=recipes",
			"/library?tab=machines",
			"/beans/101",
			"/log/brew?fromBrew=401",
			"/log/brew?fromBrew=403",
			"/log/brew?fromBrew=404",
			"/log/bean",
			"/log/machine",
			"/log/recipe",
		]) {
			await page.goto(BASE + route);
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
			if (row.scrollWidth > row.clientWidth || row.clientWidth !== width)
				failures.push(`overflow ${width} ${route}: ${row.scrollWidth}`);
		}
	}
	console.log(`${rows.length} populated route/width checks completed.`);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(BASE + "/log/brew?fromBrew=401");
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
	const afterEnter = await input.inputValue();
	await page.keyboard.press("Space");
	if ((await input.inputValue()) === afterEnter)
		failures.push("Dial increase Space does not change value");
	const font = await page
		.getByRole("spinbutton", { name: "Custom grind size" })
		.evaluate((e) => getComputedStyle(e).fontSize);
	if (font !== "16px") failures.push(`mobile field is too small: ${font}`);
	// Valid DOM and intentional scroll/typed entry contracts.
	const slider = page.getByRole("slider", {
		name: "Dose (ground coffee) dial",
		exact: true,
	});
	const inc = page.getByRole("button", {
		name: "Dose (ground coffee) dial — increase",
	});
	await input.fill("18");
	await input.press("Enter");
	await inc.tap();
	if ((await input.inputValue()) !== "18.1")
		failures.push("tap must increment exactly once");
	await input.fill("19.4");
	await input.press("Enter");
	await input.fill("22");
	await input.press("Escape");
	if ((await input.inputValue()) !== "19.4")
		failures.push("Escape must restore typed value");
	await inc.focus();
	await slider.dispatchEvent("wheel", { deltaY: 80, cancelable: true });
	if ((await input.inputValue()) !== "19.4")
		failures.push("unfocused wheel edited dose");
	await slider.focus();
	await slider.press("ArrowUp");
	if ((await input.inputValue()) !== "19.5")
		failures.push("slider ArrowUp failed");
	if (await page.locator("button input,[role=slider] input").count())
		failures.push("nested interactive dial");
	const box = await inc.boundingBox();
	if (!box || box.width < 44 || box.height < 44)
		failures.push("dial target below 44px");
	// Reopening a populated picker must not wipe edited actuals.
	await page.getByRole("button", { name: /Change bean,/ }).click();
	await page
		.getByRole("button", { name: /Moonwalk/ })
		.filter({ has: page.locator("span") })
		.last()
		.click();
	if ((await input.inputValue()) !== "19.5")
		failures.push("reselecting bean discarded dose");
	// Same component, changed query: a previous async repeat result must not be reapplied.
	await page
		.getByRole("navigation", { name: "Primary" })
		.getByRole("link", { name: "Log a brew", exact: true })
		.click();
	await page.waitForFunction(
		() => !document.body.textContent.includes("Repeating your"),
	);
	await page.goto(BASE + "/log/brew?fromBrew=401");
	await input.waitFor();
	await page.screenshot({
		path: "/tmp/coffyyy-finished-brew.png",
		fullPage: true,
	});

	await page.goto(BASE + "/home");
	const addTaste = page.getByRole("button", {
		name: "Add taste notes for Moonwalk",
		exact: true,
	});
	await addTaste.click();
	const rating = page.getByRole("button", {
		name: "Rate 4 out of 5",
		exact: true,
	});
	await rating.click();
	await page.getByRole("button", { name: "Fold away", exact: true }).click();
	await addTaste.click();
	if ((await rating.getAttribute("aria-pressed")) !== "true")
		failures.push("folding discarded tasting draft");
	await page.getByRole("button", { name: "Fold away", exact: true }).click();
	await page.setViewportSize({ width: 640, height: 844 });
	await page
		.getByRole("heading", { level: 1 })
		.evaluate((e) => (e.textContent = "Good afternoon."));
	const heroTitle = await page.getByRole("heading", { level: 1 }).boundingBox();
	const heroKey = await page.locator(".censer-key").boundingBox();
	if (
		heroTitle.y + heroTitle.height > heroKey.y &&
		heroTitle.x + heroTitle.width > heroKey.x
	)
		failures.push("tablet greeting overlaps censer");
	await page.setViewportSize({ width: 390, height: 844 });
	await page.screenshot({
		path: "/tmp/coffyyy-finished-home.png",
		fullPage: true,
	});

	console.log(failures.length ? failures.join("\n") : "PASS mobile probes");
	if (failures.length) process.exitCode = 1;
} finally {
	await browser.close();
}
