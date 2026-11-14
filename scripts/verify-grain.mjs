// Vite DEV required. Run: node scripts/verify-grain.mjs
// Optional: BASE_URL, CHROMIUM_EXECUTABLE_PATH, SCENES (comma separated), WIDTH.
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const registry = await readFile(
	new URL("../src/components/grain/scenes/index.ts", import.meta.url),
	"utf8",
);
const body = registry.match(/export const SCENES[^=]*=\s*\{([\s\S]*?)\}/)?.[1];
if (!body) throw new Error("Cannot parse SCENES registry");
const scenes = [...body.matchAll(/^\s*"?([\w-]+)"?\s*(?::[^,]+)?\s*,?\s*$/gm)]
	.map((m) => m[1])
	.filter(
		(scene) =>
			!process.env.SCENES || process.env.SCENES.split(",").includes(scene),
	);
if (!scenes.length) throw new Error("Empty scene registry");
const base = process.env.BASE_URL ?? "http://localhost:5199";
// Steps are read from the GPU state: 0..255 spans every lightness step, so one
// step is 51. Blink is a dot snapping a whole step in one frame, or reversing
// (up a step then straight back down). Turnover is printed but does not gate:
// any moving silhouette has it.
const STEP = 255 / 5;
const limits = { hardFlips: 0.0001, reversals: 0 };
const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
});
const rows = [];
try {
	for (const config of [
		{ width: 1280, height: 900, dpr: 1, cpu: 1 },
		{ width: 2560, height: 1440, dpr: 1, cpu: 1 },
		{ width: 1440, height: 900, dpr: 1, cpu: 4 },
		{ width: 390, height: 844, dpr: 3, cpu: 4 },
	].filter(
		(config) =>
			!process.env.WIDTH || config.width === Number(process.env.WIDTH),
	)) {
		const context = await browser.newContext({
			viewport: { width: config.width, height: config.height },
			deviceScaleFactor: config.dpr,
			reducedMotion: "no-preference",
		});
		await context.addInitScript(() => {
			const probe = { costs: [], collect: false };
			window.__grainProbe = probe;
			const raf = window.requestAnimationFrame.bind(window);
			// Main-thread cost of each rAF callback that drew a grain frame.
			window.requestAnimationFrame = (callback) =>
				raf((time) => {
					const before = window.__grain?.stats().frames ?? 0;
					const start = performance.now();
					try {
						callback(time);
					} finally {
						const drew = (window.__grain?.stats().frames ?? 0) !== before;
						if (drew && probe.collect)
							probe.costs.push(performance.now() - start);
					}
				});
		});
		const page = await context.newPage();
		const cdp = await context.newCDPSession(page);
		await cdp.send("Emulation.setCPUThrottlingRate", { rate: config.cpu });
		// Isolated demo DB: meaningful Home cards and their quiet masks.
		await page.goto(`${base}/dev`);
		await page.getByRole("button", { name: "Reset with demo data" }).click();
		await page.getByRole("button", { name: "Confirm", exact: true }).click();
		await page.waitForTimeout(1200);
		for (const scene of scenes) {
			try {
				await page.goto(`${base}/home?grain=${scene}`);
				await page.waitForFunction(() => window.__grain);
				await page.evaluate(() => document.fonts.ready);
				// Whale deliberately spends a minute offscreen. Exercise a crossing,
				// rather than mistaking that pause for a stalled/empty renderer.
				if (scene === "whale") {
					await page.evaluate(async () => {
						const { SCENES } = await import(
							"/src/components/grain/scenes/index.ts"
						);
						window.__grain.setScene((layers, env) =>
							SCENES.whale(layers, { ...env, t: env.t + 30 }),
						);
					});
				}
				await page.waitForTimeout(3000);
				const timing = await page.evaluate(async () => {
					const p = window.__grainProbe;
					p.costs = [];
					p.collect = true;
					const start = performance.now();
					await new Promise((resolve) => setTimeout(resolve, 10000));
					p.collect = false;
					return { costs: p.costs, elapsed: performance.now() - start };
				});
				// Sampling is a separate phase: GPU readbacks must not inflate timing.
				const pixels = await page.evaluate(async (STEP) => {
					let frames = window.__grain.stats().frames;
					let prior = null;
					let older = null;
					let delta = 0;
					let ink = 0;
					let alive = 0;
					let reversals = 0;
					let hardFlips = 0;
					let transitions = 0;
					let n = 0;
					for (let frame = 0; frame < 41; frame++) {
						const deadline = performance.now() + 4000;
						while (window.__grain.stats().frames === frames) {
							if (performance.now() > deadline)
								throw new Error("No rendered grain frames");
							await new Promise((resolve) => requestAnimationFrame(resolve));
						}
						frames = window.__grain.stats().frames;
						const current = window.__grain.steps().data;
						n = current.length;
						alive = 0;
						for (let i = 0; i < n; i++) {
							const v = current[i];
							if (v > 0) alive++;
							if (!prior) continue;
							const d = v - prior[i];
							delta += Math.abs(d);
							ink += prior[i];
							if (Math.abs(d) >= STEP * 0.8) hardFlips++;
							if (older) {
								const was = prior[i] - older[i];
								if (
									(was >= STEP * 0.6 && d <= -STEP * 0.6) ||
									(was <= -STEP * 0.6 && d >= STEP * 0.6)
								)
									reversals++;
							}
						}
						if (prior) transitions++;
						older = prior;
						prior = current;
					}
					return {
						alive,
						inkChange: delta / Math.max(1, ink),
						hardFlipShare: hardFlips / Math.max(1, n * transitions),
						reversals,
					};
				}, STEP);
				// A still must replace motion state in one render, and a second still
				// render must change nothing.
				await page.evaluate(() => {
					window.__grain.setMotion(false);
					const first = window.__grain.steps().data;
					window.__grain.setMotion(false);
					const second = window.__grain.steps().data;
					if (first.some((v, i) => v !== second[i]))
						throw new Error("Still redraw changed dots after stopping motion");
				});
				// Switching to an empty scene must leave bare paper: no held dots.
				const ghosts = await page.evaluate(async () => {
					window.__grain.setMotion(true);
					window.__grain.setScene(() => {});
					await new Promise((resolve) => setTimeout(resolve, 1500));
					let alive = 0;
					for (const v of window.__grain.steps().data) if (v > 0) alive++;
					return alive;
				});
				if (ghosts > 0)
					throw new Error(`${ghosts} ghost dots left after clearing the scene`);
				const { costs, elapsed } = timing;
				const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
				const sorted = [...costs].sort((a, b) => a - b);
				const threshold = config.cpu === 4 ? 20 : 10;
				// Blink fails the run. Cost only warns: a frame has 41ms.
				const blinks =
					!costs.length ||
					!pixels.alive ||
					pixels.hardFlipShare >= limits.hardFlips ||
					pixels.reversals > limits.reversals;
				const verdict = blinks ? "FAIL" : mean > threshold ? "SLOW" : "PASS";
				rows.push({
					scene,
					viewport: `${config.width}x${config.height}@${config.dpr}/${config.cpu}x`,
					alive: pixels.alive,
					"Δ/ink%": (pixels.inkChange * 100).toFixed(3),
					"hard flip%": (pixels.hardFlipShare * 100).toFixed(4),
					"on-off-on": pixels.reversals,
					"ms/frame": mean.toFixed(2),
					p95: sorted[Math.floor(sorted.length * 0.95)]?.toFixed(2),
					fps: ((costs.length / elapsed) * 1000).toFixed(1),
					result: verdict,
				});
				console.log(
					`${scene} ${config.width}: ${verdict}, ${mean.toFixed(2)}ms/rendered frame`,
				);
			} catch (error) {
				rows.push({
					scene,
					viewport: `${config.width}x${config.height}`,
					result: "FAIL",
					error: error.message,
				});
			}
		}
		await context.close();
	}
	console.table(rows);
	console.log(
		"Steady-state 10s/case; 40 rendered-frame transitions of GPU dot state. Hard flip: a dot moving >=0.8 of a lightness step in one frame.",
	);
	console.log(
		"Cost = main-thread rAF callback: scene drawing, texture upload, GL command submission, ASCII. GPU execution is asynchronous and not included.",
	);
	if (rows.some((row) => row.result === "FAIL")) process.exitCode = 1;
} finally {
	await browser.close();
}
