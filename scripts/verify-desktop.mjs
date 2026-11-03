// Start Vite first. Only an isolated browser context receives demo data.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:5199";
const browser = await chromium.launch();
const failures = [];
try {
	const page = await browser.newPage({ reducedMotion: "reduce" });
	page.on("pageerror", (error) => failures.push(error.message));
	await page.goto(`${base}/dev`);
	await page.getByRole("button", { name: "Reset with demo data" }).click();
	await page.getByRole("button", { name: "Confirm", exact: true }).click();
	await page.waitForTimeout(500);
	for (const [width, height] of [
		[1024, 768],
		[1280, 720],
		[1366, 768],
		[1440, 900],
		[1536, 864],
		[1920, 1080],
		[2560, 1440],
	]) {
		await page.setViewportSize({ width, height });
		const frames = [];
		for (const route of ["/home", "/library", "/history"]) {
			await page.goto(base + route);
			await page.getByRole("heading", { level: 1 }).waitFor();
			await page.locator(".journal-page").waitFor();
			await page.evaluate(() => document.fonts.ready);
			await page.waitForTimeout(300);
			frames.push(
				await page.evaluate(() => {
					const frame = document.querySelector(".journal-page");
					const r = frame.getBoundingClientRect();
					const style = getComputedStyle(frame);
					const grain = document
						.querySelector(".grain-field")
						.getBoundingClientRect();
					return {
						x: r.x + parseFloat(style.paddingLeft),
						y: r.y + window.scrollY,
						width:
							r.width -
							parseFloat(style.paddingLeft) -
							parseFloat(style.paddingRight),
						grainHeight: grain.height,
					};
				}),
			);
			if (
				await page.evaluate(
					() =>
						document.documentElement.scrollWidth >
						document.documentElement.clientWidth,
				)
			)
				failures.push(`${width} ${route}: horizontal overflow`);
		}
		try {
			for (const frame of frames.slice(1))
				for (const key of ["x", "y", "width", "grainHeight"])
					assert.ok(
						Math.abs(frame[key] - frames[0][key]) < 1,
						`${key} differs`,
					);
		} catch (error) {
			failures.push(
				`${width}x${height}: ${error.message} ${JSON.stringify(frames)}`,
			);
		}
	}
	// Real navigation must keep the same canvas and animation clock alive.
	await page.goto(`${base}/home`);
	await page.locator(".grain-field__dither").waitFor();
	await page.evaluate(() => {
		window.__desktopCanvas = document.querySelector(".grain-field__dither");
		window.__desktopEngine = window.__grain;
	});
	for (const [name, route] of [
		["Library", "/library"],
		["History", "/history"],
		["Dashboard", "/home"],
	]) {
		await page
			.locator("header nav")
			.getByRole("link", { name, exact: true })
			.click();
		await page.waitForURL(base + route);
		await page.waitForTimeout(100);
		if (
			!(await page.evaluate(
				() =>
					window.__desktopCanvas ===
						document.querySelector(".grain-field__dither") &&
					window.__desktopEngine === window.__grain,
			))
		) {
			failures.push(`${name}: background restarted during navigation`);
		}
	}
	// A still must also adapt its text masks without restarting the renderer.
	await page.evaluate(async () => {
		const { setGrainPrefs } = await import(
			"/src/components/grain/useGrainPrefs.ts"
		);
		setGrainPrefs({ motion: false });
	});
	await page.waitForTimeout(100);
	await page.evaluate(() =>
		window.__grain.setScene((_layers, env) => {
			window.__desktopAnchors = env.anchors;
		}),
	);
	await page
		.locator("header nav")
		.getByRole("link", { name: "Library", exact: true })
		.click();
	await page.waitForURL(base + "/library");
	await page.waitForFunction(() => {
		const content = document
			.querySelector(".journal-page")
			.getBoundingClientRect();
		return (
			Math.abs((window.__desktopAnchors?.content.h ?? -1) - content.height) < 1
		);
	});
	const aligned = await page.evaluate(() => {
		const root = document.querySelector(".grain-field").getBoundingClientRect();
		const content = document
			.querySelector(".journal-page")
			.getBoundingClientRect();
		const frame = window.__desktopAnchors.frame;
		return (
			Math.abs(frame.x - (content.x - root.x)) < 1 &&
			Math.abs(frame.w - content.width) < 1
		);
	});
	if (!aligned)
		failures.push("Still background does not follow the content frame");
	console.log(
		failures.length
			? failures.join("\n")
			: "PASS: shared page geometry, background height and no overflow at 7 desktop sizes; continuous navigation and still-scene masks.",
	);
	if (failures.length) process.exitCode = 1;
} finally {
	await browser.close();
}
