// Run against a local Vite server. Seeds a disposable Chromium context.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
});
try {
	const page = await browser.newPage({ viewport: { width: 390, height: 667 } });
	page.setDefaultTimeout(7000);
	await page.goto(base);
	await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		await db.Beans.put({
			id: 101,
			localId: "guide-bean",
			name: "Guide bean",
			status: "New",
			origin: [],
			process: [],
			variety: [],
			flavors: [],
		});
		await db.Machines.put({
			id: 201,
			localId: "guide-brewer",
			name: "Hario",
			method: "pour-over",
		});
	});

	const openSetup = () =>
		page.goto(base + "/log/brew?method=pour-over&bean=101");
	const button = (name) => page.getByRole("button", { name, exact: true });
	const target = (grams) => page.getByText(String(grams), { exact: true });
	const timer = page.getByRole("timer", { name: "Elapsed time" });
	const next = button("Next pour");
	const finish = button("Finish");
	const cancel = button("Cancel brew");
	const elapsed = page.getByLabel("Elapsed time · s");
	const pouredWater = page.getByLabel("Poured water · g");

	await openSetup();
	const water = page.getByRole("textbox", {
		name: "Water dial — type a value",
	});
	await water.fill("300");
	await water.press("Enter");
	await button("Four pours").click();

	await button("Start").click();
	await target(75).waitFor();
	await page.evaluate(() => {
		const now = Date.now.bind(Date);
		Date.now = () => now() + 46000;
	});
	await page.evaluate(() =>
		document.dispatchEvent(new Event("visibilitychange")),
	);
	await page.getByText("Next pour due", { exact: true }).waitFor();
	assert.equal(await target(75).count(), 1);
	assert.ok(Number((await timer.textContent()).split(":")[1]) >= 46);

	for (const action of [next, finish]) {
		const rect = await action.boundingBox();
		assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= 667);
	}
	await next.click();
	await target(150).waitFor();
	await next.click();
	await target(225).waitFor();
	await page.getByText("Pour in", { exact: true }).waitFor();
	await next.click();
	await target(300).waitFor();
	assert.equal(await next.count(), 0);
	await finish.click();
	assert.equal(await pouredWater.inputValue(), "300");
	assert.ok(Number(await elapsed.inputValue()) >= 46);
	await cancel.click();
	await button("Start").waitFor();

	await openSetup();
	await button("Four pours").click();
	await button("Start").click();
	await target(63).waitFor();
	await next.click();
	await target(125).waitFor();
	await finish.click();
	assert.equal(await pouredWater.inputValue(), "250");
	await pouredWater.fill("120");
	await button("Save brew").click();
	await button("Done").waitFor();
	await openSetup();
	await button("Start").click();
	await timer.waitFor();
	assert.equal(await next.count(), 0);
	await page.goto(base + "/log/brew?fromBrew=1");
	await button("Cancel and repeat brew").click();
	await page.waitForFunction(
		() =>
			document.querySelector('[aria-label="Water dial — type a value"]')
				?.value === "120.0",
	);
	assert.equal(await button("Four pours").getAttribute("aria-pressed"), "true");
	await button("Start").click();
	await target(30).waitFor();
	await finish.click();
	await elapsed.fill("182");
	await pouredWater.fill("247");
	await button("Save brew").click();
	await page.getByRole("button", { name: /Add taste notes/ }).click();
	await button("Rate 5 out of 5").click();
	await button("Save notes").click();
	await page.goto(base + "/history");
	await page.getByText("Guide bean", { exact: true }).first().waitFor();
	const rows = await page.evaluate(async () => {
		const { db } = await import("/src/db/db.ts");
		return db.Brews.toArray();
	});
	assert.equal(rows.length, 2);
	assert.equal(rows[0].starterPours, true);
	assert.ok(Number.isFinite(new Date(rows[0].date).getTime()));
	assert.equal(rows[1].overallRating, 5);
	assert.equal(rows[1].extractionTime, "182");
	assert.equal(rows[1].brewWeight, 247);
	assert.equal(rows[1].waterTemp, undefined);
	console.log("V60 guide passed in 390×667 Chromium.");
} finally {
	await browser.close();
}
