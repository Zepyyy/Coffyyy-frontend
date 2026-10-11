/* Drives the running dev server through the morning workflow and captures
 * screenshots plus overflow findings. Not shipped; run with `bun run scripts/verify-ui.mjs`. */
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";

const BASE = "http://localhost:5199";
const OUT = "/tmp/coffyyy-shots";
mkdirSync(OUT, { recursive: true });

// WSL setup without system Chromium libs keeps them in /tmp/chrome-libs.
const localLibs = "/tmp/chrome-libs/usr/lib/x86_64-linux-gnu";
const env = existsSync(localLibs)
	? { ...process.env, LD_LIBRARY_PATH: localLibs }
	: process.env;

const findings = [];

async function checkOverflow(page, label) {
	const result = await page.evaluate(() => {
		const doc = document.documentElement;
		const wide = [];
		const vw = doc.clientWidth;
		for (const el of document.querySelectorAll("*")) {
			const rect = el.getBoundingClientRect();
			if (rect.right > vw + 1 || rect.left < -1) {
				const cls = String(el.className).slice(0, 80);
				wide.push(`${el.tagName.toLowerCase()}.${cls}`);
			}
		}
		return {
			scrollWidth: doc.scrollWidth,
			clientWidth: doc.clientWidth,
			wide: wide.slice(0, 5),
		};
	});
	if (result.scrollWidth > result.clientWidth || result.wide.length > 0) {
		findings.push({ label, ...result });
	}
}

async function shot(page, name) {
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
	await checkOverflow(page, name);
}

async function seed(page) {
	await page.goto(`${BASE}/dev`);
	await page.getByRole("button", { name: /reset with .* data/i }).first().click();
	await page.getByRole("button", { name: "Confirm" }).click();
	await page.waitForTimeout(800);
}

/** Logs one shot of the first bean so the workspace has a fresh unrated brew. */
async function logAShot(page, flow) {
	await page.goto(`${BASE}/log/brew`);
	const card = page.locator("form section").first().getByRole("button").first();
	await card.waitFor();
	await card.click();
	await page.waitForTimeout(300);
	await shot(page, "log-with-strip");
	if (flow) {
		await page.getByRole("button", { name: flow, exact: true }).click();
	}
	await page.getByRole("button", { name: /save the shot/i }).click();
	await page.getByRole("button", { name: /add taste notes/i }).waitFor();
	await shot(page, "logged");
	await page.getByRole("button", { name: /add taste notes/i }).click();
	await page.waitForTimeout(300);
	await shot(page, "feedback-editor");
	await page.getByRole("button", { name: "Not for me" }).click();
	await page.getByRole("button", { name: /save notes/i }).click();
	await page.waitForTimeout(500);
	await shot(page, "feedback-saved");
	await page.getByRole("button", { name: "Done" }).click();
	await page.waitForTimeout(500);
}

const browser = await chromium.launch({ env });

// ---------- Desktop pass ----------
{
	const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
	await seed(page);

	await page.goto(`${BASE}/library`);
	const beanLink = page.locator('a[href^="/beans/"]').first();
	await beanLink.waitFor();
	await shot(page, "d2-library");
	await beanLink.click();
	await page.waitForTimeout(500);
	await shot(page, "d4-bean-detail");

	await logAShot(page, "Struggling");

	// The fresh brew should now prompt on the dashboard
	await page.goto(`${BASE}/home`);
	await page.getByRole("button", { name: /save notes/i }).waitFor();
	await shot(page, "d1b-home-prompt");
	await page.close();
}

// ---------- Mobile pass ----------
{
	const page = await browser.newPage({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});
	await seed(page);
	await logAShot(page, "Struggling");

	await page.goto(`${BASE}/home`);
	await page.getByRole("button", { name: /save notes/i }).waitFor();
	await shot(page, "m1-home");

	await page.goto(`${BASE}/library`);
	await shot(page, "m2-library");
	const filters = page.getByRole("button", { name: /filters/i });
	await filters.click();
	await page.waitForTimeout(300);
	await shot(page, "m3-library-filters");

	await page.goto(`${BASE}/history`);
	await shot(page, "m4-history");
	const row = page.locator("article > button").first();
	await row.click();
	await page.waitForTimeout(400);
	await shot(page, "m5-history-expanded");

	await page.goto(`${BASE}/log/brew`);
	await page.locator("form section").first().getByRole("button").first().waitFor();
	await shot(page, "m6-log");
	await page.close();
}

await browser.close();
console.log(JSON.stringify(findings, null, 2));
console.log("shots in", OUT);
