// Vite DEV required. Run: node scripts/verify-grain.mjs
// Optional: BASE_URL, CHROMIUM_EXECUTABLE_PATH. No engine modifications.
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const registry = await readFile(
	new URL("../src/components/grain/scenes/index.ts", import.meta.url),
	"utf8",
);
const body = registry.match(/export const SCENES[^=]*=\s*\{([\s\S]*?)\}/)?.[1];
if (!body) throw new Error("Cannot parse SCENES registry");
const scenes = [...body.matchAll(/^\s*([\w]+)\s*(?::[^,]+)?\s*,?\s*$/gm)].map(
	(m) => m[1],
);
if (!scenes.length) throw new Error("Empty scene registry");
const base = process.env.BASE_URL ?? "http://localhost:5199";
// 8% tone/frame is already a visible edge; allow no more. The independent
// alpha test allows 2% of existing ink/frame, half the old 4%-of-ALL-dots flip
// baseline (different denominators, reported explicitly). A hard on/off/on
// reversal is never acceptable. Warm-up is excluded, never hidden in a mean.
const limits = { step: 0.08, inkChange: 0.02, reversals: 0 };
// Lab-only scenes are measured and printed, but never reach Home by default.
const labOnly = new Set(["kaldi"]);
const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
});
const rows = [];
try {
	for (const config of [
		{ width: 1280, height: 900, dpr: 1, cpu: 1 },
		{ width: 2560, height: 1440, dpr: 1, cpu: 1 },
		{ width: 390, height: 844, dpr: 3, cpu: 4 },
	]) {
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
							name === "putImageData" &&
							this.canvas.classList.contains("grain-field__dither")
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
					pixels.inkChange >= limits.inkChange ||
					pixels.reversals > limits.reversals;
				const verdict = labOnly.has(scene)
					? "LAB"
					: blinks
						? "FAIL"
						: mean > threshold
							? "SLOW"
							: "PASS";
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
					result: labOnly.has(scene) ? "LAB" : "FAIL",
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
