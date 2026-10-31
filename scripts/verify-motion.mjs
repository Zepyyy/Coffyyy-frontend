// Disposable lab checks. Vite on5183; no production data or persistence.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch();
try {
	const page = await browser.newPage({
		viewport: { width: 390, height: 920 },
		hasTouch: true,
		isMobile: true,
		reducedMotion: "reduce",
	});
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	const base = process.env.BASE_URL ?? "http://127.0.0.1:5183";
	for (const width of [320, 390, 640, 1280]) {
		await page.setViewportSize({ width, height: 920 });
		for (const study of ["ascii", "dither", "blur", "continuity"]) {
			await page.goto(`${base}/cta-lab?study=${study}`);
			await page.locator(".motion-stage").waitFor();
			await page.waitForTimeout(200);
			assert.equal(
				await page.evaluate(
					() =>
						document.documentElement.scrollWidth <=
						document.documentElement.clientWidth,
				),
				true,
				`${study} fits ${width}`,
			);
		}
	}
	await page.setViewportSize({ width: 390, height: 920 });
	for (const mode of ["ascii", "dither", "blur"]) {
		await page.goto(`${base}/cta-lab?study=${mode}`);
		const surface = page.locator(".motion-panel:not([hidden])");
		await surface.waitFor();
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(250);
		const live = await surface.screenshot();
		await page.waitForTimeout(350);
		assert.notDeepEqual(
			await surface.screenshot(),
			live,
			`${mode} moves with explicit Motion on`,
		);
		await page.getByRole("button", { name: /Motion on/ }).click();
		await page.waitForTimeout(200);
		const still = await surface.screenshot();
		await page.waitForTimeout(250);
		assert.deepEqual(
			await surface.screenshot(),
			still,
			`${mode} holds still with Motion off`,
		);
	}

	await page.goto(`${base}/cta-lab?study=continuity`);
	await page.getByRole("button", { name: /Repeat this brew/ }).click();
	const dose = page.getByRole("spinbutton", { name: "Demo dose in grams" });
	await dose.waitFor();
	assert.equal(
		(await page
			.locator(".continuity-study")
			.evaluate(
				(e) =>
					e
						.getAnimations({ subtree: true })
						.filter((a) => a.playState === "running").length,
			)) > 0,
		true,
		"continuity transition runs",
	);
	await page
		.getByRole("spinbutton", { name: "Demo yield in grams" })
		.fill("39");
	await page.getByRole("button", { name: /Save this attempt/ }).click();
	await page.getByText("Brew saved · demo only").waitFor();
	assert.match(await page.locator(".continuity-yield").innerText(), /39/);
	await page.getByRole("button", { name: "Reset study" }).click();
	assert.match(await page.locator(".continuity-yield").innerText(), /36/);
	await page.getByRole("button", { name: /Repeat this brew/ }).click();
	await page
		.getByRole("spinbutton", { name: "Demo yield in grams" })
		.fill("42");
	await page.getByRole("button", { name: "ASCII", exact: true }).click();
	await page.getByRole("button", { name: "Continuity", exact: true }).click();
	assert.equal(
		await page
			.getByRole("spinbutton", { name: "Demo yield in grams" })
			.inputValue(),
		"42",
		"switching studies keeps the continuity draft",
	);
	await page.getByRole("button", { name: /Motion on/ }).click();
	assert.equal(
		await page
			.locator(".continuity-study")
			.evaluate((e) =>
				e
					.getAnimations({ subtree: true })
					.some((a) => a.playState === "running"),
			),
		false,
	);

	assert.deepEqual(errors, []);
	console.log(
		"PASS: sixteen route/width checks; three moving/frozen textures; continuity edit/save/reset; draft retained across study tabs; no page errors.",
	);
} finally {
	await browser.close();
}
