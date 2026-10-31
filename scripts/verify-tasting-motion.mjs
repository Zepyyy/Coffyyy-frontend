// Start Vite on5183. This seeds only a disposable browser context.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:5183";
const browser = await chromium.launch();
try {
	const page = await browser.newPage({
		viewport: { width: 390, height: 920 },
		isMobile: true,
		hasTouch: true,
		reducedMotion: "no-preference",
	});
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.goto(base);
	await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		await db.Beans.put({
			id: 101,
			localId: "tasting-bean",
			name: "Moonwalk",
			rating: 0,
			status: "New",
			roastLevel: 3,
			origin: ["Colombia"],
			process: [],
			variety: [],
			brand: "Test roaster",
			botanic: "Arabica",
			designation: "Pure Origin",
			flavors: [],
			finished: false,
			dominantNote: "Fruity",
		});
		await db.Machines.put({
			id: 201,
			localId: "tasting-brewer",
			name: "Kitchen",
			method: "espresso",
			brand: "Test",
			model: "One",
		});
		await db.Brews.put({
			id: 401,
			localId: "tasting-brew",
			beanId: 101,
			machineId: 201,
			method: "espresso",
			date: new Date(),
			grindSize: 12,
			beanWeight: 18,
			brewWeight: 36,
		});
	});
	await page.goto(base + "/home");
	const frame = page.locator(".pending-tasting");
	const add = page.getByRole("button", {
		name: "Add taste notes for Moonwalk",
		exact: true,
	});
	const group = page.getByRole("group", {
		name: "Taste notes for Moonwalk",
		exact: true,
	});
	const rating = page.getByRole("button", {
		name: "Rate 4 out of 5",
		exact: true,
	});
	const balanced = page.getByRole("button", {
		name: "Mark sour to bitter as balanced",
	});
	const fold = page.getByRole("button", { name: "Fold away", exact: true });
	const activeMotion = () =>
		frame.evaluate(
			(element) =>
				element
					.getAnimations({ subtree: true })
					.filter((animation) => animation.playState === "running").length,
		);
	const settled = () =>
		page.waitForFunction(
			() => document.querySelector(".pending-tasting")?.style.height === "",
			undefined,
			{ timeout: 3000 },
		);

	await add.waitFor();
	const scroll = await page.evaluate(() => scrollY);
	await add.click();
	assert.ok((await activeMotion()) > 0, "open uses continuity motion");
	await settled();
	assert.equal(
		await page.evaluate(() => scrollY),
		scroll,
		"opening does not force page scroll",
	);
	await rating.click();
	await balanced.click();
	await group.press("Escape");
	await settled();
	await add.click();
	assert.equal(
		await rating.getAttribute("aria-pressed"),
		"true",
		"fold preserves rating draft",
	);
	assert.equal(
		await balanced.getAttribute("aria-pressed"),
		"true",
		"fold preserves axis draft",
	);
	await settled();

	// A delayed failed local write must neither hide the editor nor lose edits.
	await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		window.restoreBrewUpdate = db.Brews.update;
		db.Brews.update = () =>
			new Promise((resolve, reject) =>
				setTimeout(() => reject(Error("Injected write failure")), 450),
			);
	});
	await page.getByRole("button", { name: "Save notes", exact: true }).click();
	assert.equal(await fold.isDisabled(), true, "cannot fold during save");
	await group.press("Escape");
	assert.equal(await frame.getAttribute("data-open"), "true");
	await page
		.getByRole("alert")
		.filter({ hasText: "Couldn’t save your notes" })
		.waitFor();
	assert.equal(await rating.getAttribute("aria-pressed"), "true");
	assert.equal(await balanced.getAttribute("aria-pressed"), "true");
	await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		db.Brews.update = window.restoreBrewUpdate;
	});

	await page.emulateMedia({ reducedMotion: "reduce" });
	await group.press("Escape");
	await page.waitForTimeout(70);
	assert.equal(await activeMotion(), 0, "reduce settles without motion");
	await add.click();
	await page.waitForTimeout(70);
	assert.equal(await activeMotion(), 0, "reduce opens instantly");
	assert.equal(await rating.getAttribute("aria-pressed"), "true");

	await page.emulateMedia({ reducedMotion: "no-preference" });
	await group.press("Escape");
	await page.waitForTimeout(90);
	await add.click();
	await page.waitForTimeout(90);
	await group.press("Escape");
	await settled();
	assert.equal(
		await frame.getAttribute("data-open"),
		"false",
		"interrupted reversal settles folded",
	);

	// A long shelf prevents scroll clamping from hiding an offscreen focus bug.
	await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		const bean = await db.Beans.get(101);
		await db.Beans.bulkPut(
			Array.from({ length: 30 }, (_, i) => ({
				...bean,
				id: 1000 + i,
				localId: `focus-bean-${i}`,
				name: `Focus bean ${i}`,
			})),
		);
	});
	await page
		.getByText("Focus bean 29", { exact: true })
		.waitFor({ state: "attached" });
	await page.setViewportSize({ width: 390, height: 600 });
	await add.click();
	await settled();
	await fold.scrollIntoViewIfNeeded();
	assert.ok(
		(await page.evaluate(() => scrollY)) > 0,
		"fixture reaches the scrolled editor",
	);
	await fold.click();
	await settled();
	const focused = await add.evaluate((element) => {
		const rect = element.getBoundingClientRect();
		const header = document.querySelector("header").getBoundingClientRect();
		const nav = document
			.querySelector('nav[aria-label="Primary"]')
			.getBoundingClientRect();
		return {
			active: document.activeElement === element,
			top: rect.top,
			bottom: rect.bottom,
			safeTop: header.bottom,
			safeBottom: nav.top,
		};
	});
	assert.equal(focused.active, true, "fold returns focus to its trigger");
	assert.ok(
		focused.top >= focused.safeTop && focused.bottom <= focused.safeBottom,
		`fold exposes focused trigger: ${JSON.stringify(focused)}`,
	);

	await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		await db.Beans.update(101, {
			name: "Moonwalk " + "UnbrokenLongBeanName".repeat(10),
		});
	});
	for (const width of [320, 390, 1280]) {
		await page.setViewportSize({ width, height: 920 });
		await page
			.getByRole("button", { name: /Add taste notes for Moonwalk/ })
			.click();
		await settled();
		assert.equal(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
			true,
			`expanded fits ${width}`,
		);
		await fold.click();
		await settled();
		assert.equal(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <=
					document.documentElement.clientWidth,
			),
			true,
			`folded fits ${width}`,
		);
	}
	await page
		.getByRole("button", { name: /Add taste notes for Moonwalk/ })
		.click();
	await settled();
	await page.getByRole("button", { name: "Save notes", exact: true }).click();
	await page.waitForFunction(async () => {
		const { db } = await import("/src/db/db.ts");
		const saved = await db.Brews.get(401);
		return saved?.overallRating === 4 && saved?.tasteScore === 0;
	});
	const saved = await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		return db.Brews.get(401);
	});
	assert.equal(
		saved.strengthScore,
		undefined,
		"retry does not invent untouched strength",
	);
	assert.deepEqual(errors, []);
	console.log(
		"PASS: continuity open/fold, preserved drafts, delayed failure/retry, in-flight guard, reduce, interrupted reversal, long-shelf focus recovery, long names320/390/1280; no page errors.",
	);
} finally {
	await browser.close();
}
