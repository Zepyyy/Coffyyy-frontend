// Vite DEV required. Stills of a scene on the real Home, for judging by eye.
// Run: SCENES=whale,koi TIMES=20,30,40 node scripts/render-grain-frames.mjs
// Optional: BASE_URL, OUT, CHROMIUM_EXECUTABLE_PATH.
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:5199";
const out = process.env.OUT ?? "/tmp/grain-frames";
const scenes = (process.env.SCENES ?? "").split(",").filter(Boolean);
const times = (process.env.TIMES ?? "30").split(",").map(Number);
if (!scenes.length) throw new Error("Set SCENES");
await mkdir(out, { recursive: true });
const seed = { beans: 7, machines: 3, filters: 2, brews: 24, recipes: 3 };
const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
});
for (const view of [
	{ name: "desk", width: 1440, height: 900, dpr: 1 },
	{ name: "phone", width: 390, height: 844, dpr: 3 },
]) {
	for (const theme of ["light", "dark"]) {
		const context = await browser.newContext({
			viewport: { width: view.width, height: view.height },
			deviceScaleFactor: view.dpr,
			colorScheme: theme,
		});
		const page = await context.newPage();
		await page.goto(`${base}/home`);
		await page.evaluate(async (counts) => {
			const data = await import("/src/lib/data.ts");
			await data.resetDatabaseWithSeed(counts);
		}, seed);
		for (const scene of scenes) {
			await page.goto(`${base}/home?grain=${scene}`);
			await page.waitForFunction(() => window.__grain);
			await page.evaluate((dark) => {
				document.documentElement.classList.toggle("dark", dark);
			}, theme === "dark");
			await page.waitForTimeout(500);
			for (const t of times) {
				await page.evaluate(
					async ([name, at]) => {
						const { SCENES } = await import(
							"/src/components/grain/scenes/index.ts"
						);
						window.__grain.setScene((layers, env) =>
							SCENES[name](layers, { ...env, t: at }),
						);
						window.__grain.setMotion(false);
					},
					[scene, t],
				);
				await page.waitForTimeout(120);
				await page.screenshot({
					path: `${out}/${scene}-${view.name}-${theme}-t${t}.png`,
				});
			}
		}
		await context.close();
	}
}
await browser.close();
