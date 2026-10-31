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
const scenes = [...body.matchAll(/^\s*([\w]+)\s*(?::[^,]+)?\s*,?\s*$/gm)]
	.map((m) => m[1])
	.filter(
		(scene) =>
			!process.env.SCENES || process.env.SCENES.split(",").includes(scene),
	);
if (!scenes.length) throw new Error("Empty scene registry");
const base = process.env.BASE_URL ?? "http://localhost:5199";
// Blink is a dot reversing or snapping, so those are what fail the run. A dot
// may change by up to the engine's slew cap per frame. A hard flip is a dot
// going fully on or off in one frame; the old texture did this to 4% of dots.
// Ink turnover is printed but does not gate: any moving silhouette has it.
const limits = { step: 0.14, hardFlips: 0.0001, reversals: 0 };
const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
});
const rows = [];
try {
	for (const config of [
		{ width: 1280, height: 900, dpr: 1, cpu: 1 },
		{ width: 2560, height: 1440, dpr: 1, cpu: 1 },
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
			const probe = { serial: 0, costs: [], methods: {}, collect: false };
			window.__grainProbe = probe;
			let rendered = false;
			let inside = false;
			const proto = CanvasRenderingContext2D.prototype;
			// Mark a rendered grain frame, including frames where pixels hold still.
			for (const name of [
				"putImageData",
				"getImageData",
				"fillText",
				"fill",
				"clearRect",
			]) {
				const original = proto[name];
				proto[name] = function (...args) {
					const measured = inside && probe.collect;
					const start = measured ? performance.now() : 0;
					try {
						return original.apply(this, args);
					} finally {
						if (
							name === "clearRect" &&
							this.canvas.classList.contains("grain-field__blur")
						)
							rendered = true;
						if (measured)
							probe.methods[name] =
								(probe.methods[name] || 0) + performance.now() - start;
					}
				};
			}
			const raf = window.requestAnimationFrame.bind(window);
			window.requestAnimationFrame = (callback) =>
				raf((time) => {
					rendered = false;
					inside = true;
					const start = performance.now();
					try {
						callback(time);
					} finally {
						inside = false;
						if (rendered) {
							probe.serial++;
							if (probe.collect) probe.costs.push(performance.now() - start);
						}
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
				await page.waitForFunction(
					() =>
						window.__grain && document.querySelector(".grain-field__dither"),
				);
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
				const performanceResult = await page.evaluate(async () => {
					window.__grain.stats(); // reset startup maximum
					const p = window.__grainProbe;
					p.costs = [];
					p.methods = {};
					p.collect = true;
					const start = performance.now();
					await new Promise((resolve) => setTimeout(resolve, 10000));
					p.collect = false;
					const elapsed = performance.now() - start;
					return {
						...window.__grain.stats(),
						costs: p.costs,
						methods: p.methods,
						elapsed,
					};
				});
				// Sampling is a separate phase: getImageData/cell scans cannot inflate
				// the measured render callback, or get mistaken for engine readbacks.
				const pixels = await page.evaluate(async () => {
					const canvas = document.querySelector(".grain-field__dither");
					const ctx = canvas.getContext("2d");
					const p = window.__grainProbe;
					let prior = null,
						older = null,
						serial = p.serial;
					let delta = 0,
						ink = 0,
						allDelta = 0,
						reversals = 0,
						hardFlips = 0,
						transitions = 0;
					const n = canvas.width * canvas.height;
					// A full-opacity dot is 0.62*gain*255, read from current CSS.
					const gain =
						Number.parseFloat(
							getComputedStyle(canvas.parentElement).getPropertyValue(
								"--grain-gain",
							),
						) || 1;
					const full = Math.min(255, 0.62 * gain * 255);
					for (let frame = 0; frame < 41; frame++) {
						const deadline = performance.now() + 4000;
						while (p.serial === serial) {
							if (performance.now() > deadline)
								throw new Error("No rendered grain frames");
							await new Promise((resolve) => requestAnimationFrame(resolve));
						}
						serial = p.serial;
						const data = ctx.getImageData(
							0,
							0,
							canvas.width,
							canvas.height,
						).data;
						const current = new Uint8Array(n);
						for (let i = 0; i < n; i++) {
							const a = (current[i] = data[i * 4 + 3]);
							if (prior) {
								delta += Math.abs(a - prior[i]);
								ink += prior[i];
								if (
									(a >= full * 0.8 && prior[i] <= full * 0.2) ||
									(a <= full * 0.2 && prior[i] >= full * 0.8)
								)
									hardFlips++;
							}
							if (
								older &&
								older[i] >= full * 0.8 &&
								prior[i] <= full * 0.2 &&
								a >= full * 0.8
							)
								reversals++;
						}
						if (prior) {
							transitions++;
							allDelta += n * full;
						}
						older = prior;
						prior = current;
					}
					return {
						inkChange: delta / Math.max(1, ink),
						allChange: delta / Math.max(1, allDelta),
						hardFlipShare: hardFlips / (n * transitions),
						reversals,
						n,
						transitions,
					};
				});
				// A still must replace all previous ink in one render, including dark
				// tones above 1. A second still render must change no pixels.
				await page.evaluate(() => {
					const canvases = [
						...document.querySelectorAll(".grain-field canvas"),
					];
					const pixels = () =>
						canvases.map(
							(canvas) =>
								canvas
									.getContext("2d")
									.getImageData(0, 0, canvas.width, canvas.height).data,
						);
					window.__grain.setMotion(false);
					const first = pixels();
					window.__grain.setMotion(false);
					const second = pixels();
					if (
						first.some((data, layer) =>
							data.some((value, i) => value !== second[layer][i]),
						)
					)
						throw new Error(
							"Still redraw changed pixels: stale ink after stopping motion",
						);
				});
				const { costs, maxStep, alive, methods, elapsed } = performanceResult;
				const mean = costs.reduce((a, b) => a + b, 0) / costs.length;
				const sorted = [...costs].sort((a, b) => a - b);
				const threshold = config.cpu === 4 ? 20 : 10;
				// Blink fails the run. Cost only warns: 10ms is a budget, not a defect,
				// and one frame has 41ms.
				const blinks =
					!costs.length ||
					!alive ||
					maxStep >= limits.step ||
					pixels.hardFlipShare >= limits.hardFlips ||
					pixels.reversals > limits.reversals;
				const verdict = blinks ? "FAIL" : mean > threshold ? "SLOW" : "PASS";
				const hot = Object.entries(methods)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 2)
					.map(([name, ms]) => `${name} ${(ms / costs.length).toFixed(2)}`)
					.join(", ");
				// Separate sampled CPU profile: never included in the timing window.
				if (mean > threshold) {
					await cdp.send("Profiler.enable");
					await cdp.send("Profiler.start");
					await page.waitForTimeout(1500);
					const { profile } = await cdp.send("Profiler.stop");
					await cdp.send("Profiler.disable");
					const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
					const own = new Map();
					for (const id of profile.samples ?? []) {
						const frame = nodes.get(id)?.callFrame;
						if (!frame?.url.includes("/grain/")) continue;
						const name = frame.functionName || "anonymous";
						own.set(name, (own.get(name) || 0) + 1);
					}
					const total = [...own.values()].reduce((a, b) => a + b, 0);
					console.log(
						`${scene} ${config.width} sampled grain self-time: ${[...own]
							.sort((a, b) => b[1] - a[1])
							.slice(0, 4)
							.map(
								([name, count]) =>
									`${name} ${((100 * count) / Math.max(1, total)).toFixed(1)}%`,
							)
							.join(", ")}`,
					);
				}
				rows.push({
					scene,
					viewport: `${config.width}x${config.height}@${config.dpr}/${config.cpu}x`,
					alive,
					maxStep: maxStep.toFixed(4),
					"Δ/ink%": (pixels.inkChange * 100).toFixed(3),
					"Δ/all%": (pixels.allChange * 100).toFixed(3),
					"hard flip%": (pixels.hardFlipShare * 100).toFixed(4),
					"on-off-on": pixels.reversals,
					"ms/frame": mean.toFixed(2),
					p95: sorted[Math.floor(sorted.length * 0.95)]?.toFixed(2),
					fps: ((costs.length / elapsed) * 1000).toFixed(1),
					hot,
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
		"Steady-state 10s/case; 40 rendered-frame pixel transitions. Hard on/off: >=80% / <=20% dot alpha. Old baseline ~4% ALL dots hard-flipped/frame.",
	);
	console.log(
		"Cost = synchronous rendered rAF callback (not 42ms cadence); includes instrumentation, excludes GPU/compositor. Hot columns = Canvas API ms/frame; remaining cost includes engine JS loops, not individually instrumented.",
	);
	if (rows.some((row) => row.result === "FAIL")) process.exitCode = 1;
} finally {
	await browser.close();
}
