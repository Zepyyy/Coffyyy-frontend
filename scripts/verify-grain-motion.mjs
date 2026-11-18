// Vite DEV required. Run: BASE_URL=http://localhost:5173 node scripts/verify-grain-motion.mjs
// Uses isolated browser storage. Checks real controls and changing canvas pixels.
export async function verifyGrainMotion({
	simulateReducedMotion = false,
} = {}) {
	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const until = async (read, label) => {
		const deadline = performance.now() + 6000;
		while (!read()) {
			if (performance.now() > deadline) throw new Error(`Timed out: ${label}`);
			await wait(30);
		}
	};
	if (simulateReducedMotion && !window.__grainMotionOriginalMedia) {
		const original = window.matchMedia.bind(window);
		window.__grainMotionOriginalMedia = original;
		window.matchMedia = (query) => {
			const media = original(query);
			return query === "(prefers-reduced-motion: reduce)"
				? new Proxy(media, {
						get(target, key) {
							if (key === "matches") return true;
							const value = Reflect.get(target, key, target);
							return typeof value === "function" ? value.bind(target) : value;
						},
					})
				: media;
		};
	}
	const reports = [];
	const assertMotion = async (moving, label) => {
		await wait(180);
		const canvas = document.querySelector(".grain-field__dither");
		if (!canvas) throw new Error(`${label}: no grain canvas`);
		const before = canvas.toDataURL();
		await wait(700);
		const changed = before !== canvas.toDataURL();
		if (changed !== moving)
			throw new Error(
				`${label}: expected ${moving ? "moving" : "still"} pixels, got ${changed ? "moving" : "still"}`,
			);
		reports.push(label);
	};
	const settings = () =>
		document.querySelector('button[aria-label="Settings"]');
	const dialog = () =>
		document.querySelector('[role="dialog"][aria-label="Settings"]');
	const openSettings = async () => {
		if (!dialog()) settings().click();
		await until(dialog, "Settings");
	};
	const select = async (name) => {
		await openSettings();
		const radio = [...dialog().querySelectorAll('[role="radio"]')].find(
			(el) => el.textContent.trim() === name,
		);
		if (!radio) throw new Error(`Missing background ${name}`);
		radio.click();
		await wait(80);
	};
	const toggle = async () => {
		await openSettings();
		dialog().querySelector('[role="switch"]').click();
		await wait(100);
	};
	const go = async (path) => {
		const link = document.querySelector(`a[href="${path}"]`);
		if (!link) throw new Error(`Missing link ${path}`);
		link.click();
		await until(() => location.pathname === path, path);
		await wait(150);
	};

	await go("/home");
	await select("Willow");
	await openSettings();
	if (
		dialog().querySelector('[role="switch"]').getAttribute("aria-checked") ===
		"true"
	)
		await toggle();
	await assertMotion(false, "dashboard Off");
	await toggle();
	await assertMotion(true, "dashboard explicit On overrides reduced motion");
	await select("Windfall");
	await assertMotion(true, "switch background while On");
	await select("Willow");
	await select("Willow");
	await assertMotion(true, "reselect background while On");
	settings().click();
	await go("/library");
	await assertMotion(true, "Library keeps On");
	await go("/home");
	await assertMotion(true, "return to dashboard keeps On");
	await toggle();
	await select("Windfall");
	await assertMotion(false, "switch background while Off");
	await select("Willow");
	await go("/backgrounds");
	await until(
		() => document.querySelector(".background-studies__motion"),
		"study playback",
	);
	const play = document.querySelector(".background-studies__motion");
	if (play.getAttribute("aria-pressed") !== "true") play.click();
	await assertMotion(true, "study Play");
	await go("/home");
	await assertMotion(true, "study Play survives returning to dashboard");
	await openSettings();
	await go("/backgrounds");
	await until(
		() => document.querySelector(".background-studies__motion"),
		"study playback",
	);
	const trial = [...document.querySelectorAll("a")].find((el) =>
		el.textContent.includes("Try on dashboard"),
	);
	if (!trial) throw new Error("Missing dashboard trial");
	trial.click();
	await until(() => location.pathname === "/home", "dashboard trial");
	await assertMotion(true, "temporary dashboard trial");
	await toggle();
	await assertMotion(false, "dashboard Off exits temporary trial");
	await select("Willow");
	await go("/backgrounds");
	await until(
		() => document.querySelector(".background-studies__motion"),
		"study playback",
	);
	const resume = document.querySelector(".background-studies__motion");
	if (resume.getAttribute("aria-pressed") !== "true") resume.click();
	await until(
		() =>
			document
				.querySelector(".background-studies__motion")
				?.getAttribute("aria-pressed") === "true",
		"study playback resumed",
	);
	const use = [...document.querySelectorAll("button")].find((el) =>
		/^(Use|Keep) this background$/.test(el.textContent.trim()),
	);
	if (!use) throw new Error("Missing Use background");
	use.click();
	await until(
		() => location.pathname === "/home",
		"saved background dashboard",
	);
	await assertMotion(true, "Use background preserves explicit study Play");
	if (JSON.parse(localStorage.getItem("coffyyy:grain")).motion !== true)
		throw new Error("Explicit study playback was not saved");
	return { result: "PASS", reports };
}

// CLI runner. The browser function above also runs through shared preview tools.
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
	const browser = await chromium.launch({
		executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
	});
	const base = process.env.BASE_URL ?? "http://localhost:5173";
	try {
		const context = await browser.newContext({
			reducedMotion: "reduce",
			viewport: { width: 1280, height: 900 },
		});
		const page = await context.newPage();
		const errors = [];
		page.on("pageerror", (error) => errors.push(error.message));
		await page.goto(`${base}/home`);
		await page.waitForFunction(() => window.__grain);
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(1000);
		assert.ok(
			await page.evaluate(async () => {
				const canvas = document.querySelector(".grain-field__dither");
				const before = canvas.toDataURL();
				await new Promise((r) => setTimeout(r, 700));
				return before === canvas.toDataURL();
			}),
			"unset motion must follow the reduced-motion device setting",
		);
		console.log(await page.evaluate(verifyGrainMotion));
		await page.reload();
		await page.waitForFunction(() => window.__grain);
		await page.waitForTimeout(1000);
		assert.ok(
			await page.evaluate(async () => {
				const canvas = document.querySelector(".grain-field__dither");
				const before = canvas.toDataURL();
				await new Promise((r) => setTimeout(r, 700));
				return before !== canvas.toDataURL();
			}),
			"saved explicit On must animate after reload under reduced motion",
		);
		assert.deepEqual(errors, []);
		await context.close();
	} finally {
		await browser.close();
	}
}
