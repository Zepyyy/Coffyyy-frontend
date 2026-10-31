import { useCallback, useEffect, useRef, useState } from "react";
import "./TextureStudy.css";

/**
 * One quiet organic field, three renderings.
 *
 * A few fragmented, vaguely branching islands drift slowly through the card.
 * Every rendering samples the same field:
 *   ascii  - sparse tiles of tiny glyphs; the glyph pattern travels with its
 *            island, so characters are carried, never re-rolled
 *   dither - an 8x8 ordered threshold pinned to the card, so grain is spatially
 *            stable and only the shape moves through it
 *   blur   - the same density as soft, restrained material
 * Modes crossfade; nothing is read back from a canvas.
 */

export type TextureMode = "blur" | "dither" | "ascii";

type Props = {
	mode?: TextureMode;
	/** undefined follows the OS; true forces motion; false draws one still frame. */
	animated?: boolean;
	/** 0.4 - 1.8, default 1: how many / how large the islands are. */
	density?: number;
};

/* ---------- tuning ---------- */

const STILL_T = 31;
const FRAME_MS = 32;
const FADE_MS = 720;
const GATHER = 0.2; // how far nearby texture leans toward contact
const DISSOLVE = 0.82; // how much texture thins at the contact point

const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const t = clamp((v - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};

function hash2(x: number, y: number) {
	let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, y: number) {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const xf = x - xi;
	const yf = y - yi;
	const u = xf * xf * (3 - 2 * xf);
	const v = yf * yf * (3 - 2 * yf);
	const a = hash2(xi, yi);
	const b = hash2(xi + 1, yi);
	const c = hash2(xi, yi + 1);
	const d = hash2(xi + 1, yi + 1);
	return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function bayer(n: number): number[][] {
	if (n === 2)
		return [
			[0, 2],
			[3, 1],
		];
	const p = bayer(n / 2);
	const s = n / 2;
	const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
	for (let y = 0; y < s; y++)
		for (let x = 0; x < s; x++) {
			const v = 4 * p[y][x];
			m[y][x] = v;
			m[y][x + s] = v + 2;
			m[y + s][x] = v + 3;
			m[y + s][x + s] = v + 1;
		}
	return m;
}
const BAYER = new Float32Array(64);
{
	const m = bayer(8);
	for (let y = 0; y < 8; y++)
		for (let x = 0; x < 8; x++) BAYER[y * 8 + x] = (m[y][x] + 0.5) / 64;
}

/* Glyph families by density level (1 sparse .. 7 heavy). Letters and marks
   only: no digits, nothing that reads as data. */
const GLYPHS = ["", "·.'-", ":;-,", "+=xt", "oxtc", "oSsX", "%XS&", "#%@S"];
const GLYPH_A = [0, 0.3, 0.36, 0.46, 0.56, 0.64, 0.72, 0.8];
const TILE_A = [0, 0, 0, 0.05, 0.075, 0.1, 0.125, 0.15];
const LEVELS = 7;

type Preset = {
	px: number;
	py: number;
	wx: number;
	wy: number;
	ax: number;
	ay: number;
	th: number;
	scale: number;
	side: number;
};
// slow, calm travel: whole-card crossings take over a minute
const per = (s: number) => (Math.PI * 2) / (s * 1.5);
const PRESETS: Preset[] = [
	{
		px: 0.4,
		py: 1.3,
		wx: per(71),
		wy: per(83),
		ax: 0.46,
		ay: 0.3,
		th: 0.5,
		scale: 1,
		side: 1,
	},
	{
		px: 2.3,
		py: 0.2,
		wx: per(79),
		wy: per(61),
		ax: 0.5,
		ay: 0.32,
		th: -0.9,
		scale: 0.88,
		side: -1,
	},
	{
		px: 4.1,
		py: 3.4,
		wx: per(59),
		wy: per(91),
		ax: 0.44,
		ay: 0.34,
		th: 2.3,
		scale: 1.08,
		side: 1,
	},
	{
		px: 5.4,
		py: 5.0,
		wx: per(88),
		wy: per(73),
		ax: 0.5,
		ay: 0.3,
		th: 1.4,
		scale: 0.78,
		side: -1,
	},
	{
		px: 1.1,
		py: 4.2,
		wx: per(67),
		wy: per(97),
		ax: 0.48,
		ay: 0.3,
		th: -2.2,
		scale: 0.9,
		side: 1,
	},
	{
		px: 3.3,
		py: 2.6,
		wx: per(93),
		wy: per(64),
		ax: 0.4,
		ay: 0.32,
		th: 0.1,
		scale: 0.8,
		side: -1,
	},
];
const MAXB = 14;

type Palette = { tone: string; glyph: string; gain: number };
type Rect = {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	pad: number;
	feather: number;
};

type Layer = {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	mode: TextureMode | null;
	mask: HTMLCanvasElement;
	maskCtx: CanvasRenderingContext2D;
	maskImg: ImageData | null;
	lvl: Uint8Array;
	glyph: Uint8Array;
	shiftX: Float32Array;
	shiftY: Float32Array;
	fade: number | null;
};

export type Engine = {
	setMode: (m: TextureMode) => void;
	setDensity: (d: number) => void;
	setMotion: (on: boolean) => void;
	setVisible: (v: boolean) => void;
	layout: () => void;
	refreshPalette: () => void;
	pulseNear: (x: number, y: number) => void;
	dispose: () => void;
};

function createEngine(
	root: HTMLElement,
	canvases: [HTMLCanvasElement, HTMLCanvasElement],
	copyEl: HTMLElement | null,
	actionEl: HTMLElement | null,
	initialMode: TextureMode,
	initialDensity: number,
): Engine {
	const mk = (canvas: HTMLCanvasElement): Layer => {
		const ctx = canvas.getContext("2d");
		const mask = document.createElement("canvas");
		const maskCtx = mask.getContext("2d");
		if (!ctx || !maskCtx) throw new Error("no 2d context");
		return {
			canvas,
			ctx,
			mode: null,
			mask,
			maskCtx,
			maskImg: null,
			lvl: new Uint8Array(0),
			glyph: new Uint8Array(0),
			shiftX: new Float32Array(0),
			shiftY: new Float32Array(0),
			fade: null,
		};
	};
	const layers: [Layer, Layer] = [mk(canvases[0]), mk(canvases[1])];
	let front = 0;

	let W = 0;
	let H = 0;
	let dpr = 1;
	let u0 = 48;
	let cw = 7;
	let ch = 10;
	let fontPx = 11;
	let fontFamily = "monospace";
	let density = clamp(initialDensity, 0.4, 1.8);
	let rects: Rect[] = [];
	let nIsland = 3;
	let palette: Palette = { tone: "#8a6a48", glyph: "#5b4630", gain: 1 };

	let motion = true;
	let visible = true;
	let clock = STILL_T;
	let raf = 0;
	let last = 0;
	let lastDraw = 0;
	let disposed = false;
	const timers: number[] = [];

	/* contact: smoothed point + presence a (0 rest .. 1 engaged) */
	let tx = 0;
	let ty = 0;
	let px = 0;
	let py = 0;
	let a = 0;
	let engaged = false;
	let hold = 0;
	let sigma = 80;

	/* island geometry, rebuilt per frame */
	const balls = new Float32Array(PRESETS.length * MAXB * 4);
	const ballN = new Uint8Array(PRESETS.length);
	const bbox = new Float32Array(PRESETS.length * 4);
	const centers = new Float32Array(PRESETS.length * 2);
	let dom = -1;

	function readPalette() {
		const probe = layers[0].ctx;
		const cs = getComputedStyle(root);
		const pick = (names: string[], fallback: string) => {
			for (const name of names) {
				const raw = cs.getPropertyValue(name).trim();
				if (!raw) continue;
				probe.fillStyle = "#010203";
				probe.fillStyle = raw;
				if (probe.fillStyle !== "#010203") return raw;
			}
			return fallback;
		};
		const gain = Number.parseFloat(cs.getPropertyValue("--ts-gain")) || 1;
		palette = {
			tone: pick(["--ts-tone", "--ts-accent"], "#8a6a48"),
			glyph: pick(["--ts-glyph", "--ts-ink"], "#5b4630"),
			gain,
		};
		fontFamily = cs.fontFamily || "monospace";
	}

	function relRect(el: HTMLElement | null, pad: number, feather: number) {
		if (!el) return null;
		const r = el.getBoundingClientRect();
		const b = root.getBoundingClientRect();
		if (!r.width || !r.height) return null;
		return {
			x0: r.left - b.left,
			y0: r.top - b.top,
			x1: r.right - b.left,
			y1: r.bottom - b.top,
			pad,
			feather,
		} satisfies Rect;
	}

	function layout() {
		W = root.clientWidth;
		H = root.clientHeight;
		if (!W || !H) return;
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		u0 = clamp(Math.min(W * 0.15, H * 0.17), 26, 58);
		cw = W < 520 ? 6 : 7;
		ch = W < 520 ? 9 : 10;
		fontPx = cw * 1.62;
		sigma = clamp(u0 * 1.5, 56, 92);
		const base = clamp(Math.round(W / 250), 2, 5);
		nIsland = clamp(Math.round(base * density), 1, PRESETS.length);
		rects = [
			relRect(copyEl, 8, clamp(u0 * 1.1, 34, 64)),
			relRect(actionEl, 6, 26),
		].filter((r): r is Rect => r !== null);
		const cols = Math.ceil(W / cw);
		const rows = Math.ceil(H / ch);
		for (const L of layers) {
			L.canvas.width = Math.round(W * dpr);
			L.canvas.height = Math.round(H * dpr);
			L.lvl = new Uint8Array(cols * rows);
			L.glyph = new Uint8Array(cols * rows);
			L.shiftX = new Float32Array(cols * rows);
			L.shiftY = new Float32Array(cols * rows);
			L.maskImg = null;
		}
		readPalette();
		if (!motion) renderAll(STILL_T);
	}

	/* ---------- the field ---------- */

	function buildBalls(t: number) {
		for (let i = 0; i < nIsland; i++) {
			const P = PRESETS[i];
			const cx = W * (0.5 + P.ax * Math.sin(P.wx * t + P.px));
			const cy = H * (0.5 + P.ay * Math.sin(P.wy * t + P.py));
			centers[i * 2] = cx;
			centers[i * 2 + 1] = cy;
			const u = u0 * P.scale * 0.8 * (0.82 + 0.18 * density);
			const step = u * 0.95;
			const th = P.th + 0.55 * Math.sin(0.061 * t + P.px * 1.7);
			let n = 0;
			let b = i * MAXB * 4;
			let x0 = 1e9;
			let y0 = 1e9;
			let x1 = -1e9;
			let y1 = -1e9;
			const put = (x: number, y: number, r: number) => {
				const rr = Math.max(4, r);
				balls[b] = x;
				balls[b + 1] = y;
				balls[b + 2] = 1 / (rr * rr);
				balls[b + 3] = 1 / (rr * 1.8 * (rr * 1.8));
				b += 4;
				n++;
				const e = rr * 1.8;
				if (x - e < x0) x0 = x - e;
				if (y - e < y0) y0 = y - e;
				if (x + e > x1) x1 = x + e;
				if (y + e > y1) y1 = y + e;
			};
			const breathe = (k: number) =>
				1 + 0.11 * Math.sin(0.55 * t + k * 1.3 + P.px);
			// main spine, gently serpentine
			let x = cx - Math.cos(th) * step * 2;
			let y = cy - Math.sin(th) * step * 2;
			const sxs: number[] = [];
			const sys: number[] = [];
			const angs: number[] = [];
			const RK = [0.6, 0.9, 1, 0.78, 0.5];
			for (let k = 0; k < 5; k++) {
				const ang =
					th +
					(k - 2) * 0.22 * Math.sin(0.3 * t + P.py) +
					0.15 * Math.sin(0.47 * t + k * 1.1 + P.px);
				if (k > 0) {
					x += Math.cos(angs[k - 1]) * step;
					y += Math.sin(angs[k - 1]) * step;
				}
				angs.push(ang);
				sxs.push(x);
				sys.push(y);
				put(x, y, u * RK[k] * breathe(k));
			}
			// branch A off the middle
			const da = angs[2] + P.side * (0.9 + 0.25 * Math.sin(0.23 * t + P.py));
			const RA = [0.62, 0.5, 0.36];
			for (let j = 1; j <= 3; j++)
				put(
					sxs[2] + Math.cos(da) * step * 0.8 * j,
					sys[2] + Math.sin(da) * step * 0.8 * j,
					u * RA[j - 1] * breathe(j + 5),
				);
			// shorter branch B the other way
			const db = angs[3] - P.side * (0.75 + 0.2 * Math.sin(0.19 * t + P.px));
			const RB = [0.46, 0.3];
			for (let j = 1; j <= 2; j++)
				put(
					sxs[3] + Math.cos(db) * step * 0.78 * j,
					sys[3] + Math.sin(db) * step * 0.78 * j,
					u * RB[j - 1] * breathe(j + 8),
				);
			// detached fragments that lag and lead the body
			const lead = step * (1.7 + 0.45 * Math.sin(0.21 * t + P.py));
			put(
				sxs[4] +
					Math.cos(angs[4]) * lead -
					Math.sin(angs[4]) * step * 0.3 * Math.sin(0.17 * t),
				sys[4] +
					Math.sin(angs[4]) * lead +
					Math.cos(angs[4]) * step * 0.3 * Math.sin(0.17 * t),
				u * 0.2,
			);
			const lag = step * (1.6 + 0.4 * Math.sin(0.18 * t + P.px));
			put(
				sxs[0] - Math.cos(angs[0]) * lag,
				sys[0] - Math.sin(angs[0]) * lag,
				u * 0.16,
			);
			ballN[i] = n;
			bbox[i * 4] = x0;
			bbox[i * 4 + 1] = y0;
			bbox[i * 4 + 2] = x1;
			bbox[i * 4 + 3] = y1;
		}
	}

	/** Field density 0..1 at (x,y); sets `dom` to the island carrying it. */
	function sample(x: number, y: number): number {
		dom = -1;
		// the title and the action sit in clear paper
		let m = 1;
		for (const r of rects) {
			const dx = Math.max(r.x0 - x, 0, x - r.x1);
			const dy = Math.max(r.y0 - y, 0, y - r.y1);
			const d = Math.sqrt(dx * dx + dy * dy) - r.pad;
			m *= 0.015 + 0.985 * smooth(0, r.feather, d);
		}
		if (m < 0.02) return 0;
		m *= smooth(0, 10, Math.min(x, y, W - x, H - y));

		// contact: nearby texture leans toward it while the point itself thins
		let sx = x;
		let sy = y;
		let thin = 1;
		if (a > 0.002) {
			const dx = x - px;
			const dy = y - py;
			const r2 = dx * dx + dy * dy;
			const k = GATHER * a * Math.exp(-r2 / (2 * sigma * sigma));
			sx = x + dx * k;
			sy = y + dy * k;
			const s2 = sigma * 0.72;
			thin = 1 - DISSOLVE * a * Math.exp(-r2 / (2 * s2 * s2));
		}

		let best = 0;
		for (let i = 0; i < nIsland; i++) {
			const o = i * 4;
			if (
				sx < bbox[o] ||
				sy < bbox[o + 1] ||
				sx > bbox[o + 2] ||
				sy > bbox[o + 3]
			)
				continue;
			let s = 0;
			let h = 0;
			const end = (i * MAXB + ballN[i]) * 4;
			for (let b = i * MAXB * 4; b < end; b += 4) {
				const dx = sx - balls[b];
				const dy = sy - balls[b + 1];
				const d2 = dx * dx + dy * dy;
				const u2 = d2 * balls[b + 2];
				if (u2 < 1) {
					const w = 1 - u2;
					s += w * w;
				}
				const uh = d2 * balls[b + 3];
				if (uh < 1) {
					const w = 1 - uh;
					h += w * w;
				}
			}
			if (h === 0) continue;
			// erosion travels with the island, so ragged edges are carried too
			const lx = (sx - centers[i * 2]) / (u0 * 0.5) + i * 7.3;
			const ly = (sy - centers[i * 2 + 1]) / (u0 * 0.5) + i * 3.1;
			const n =
				0.65 * vnoise(lx, ly) + 0.35 * vnoise(lx * 2.3 + 9, ly * 2.3 - 4);
			const mott = 0.5 + 0.5 * vnoise(lx * 0.8 - 5, ly * 0.8 + 2);
			const body =
				s > 0 ? (0.72 + 0.28 * mott) * smooth(0.1, 0.8, s * 1.2 - 0.6 * n) : 0;
			const dust = 0.3 * smooth(0, 1.5, h) * smooth(0.3, 0.78, n);
			const v = body > dust ? body : dust;
			if (v > best) {
				best = v;
				dom = i;
			}
		}
		return best * m * thin;
	}

	/* ---------- renderers ---------- */

	function drawMask(L: Layer, grid: number, soft: boolean) {
		const mw = Math.ceil(W / grid);
		const mh = Math.ceil(H / grid);
		if (L.mask.width !== mw || L.mask.height !== mh || !L.maskImg) {
			L.mask.width = mw;
			L.mask.height = mh;
			L.maskImg = L.maskCtx.createImageData(mw, mh);
		}
		const data = L.maskImg.data;
		const gain = palette.gain;
		for (let j = 0; j < mh; j++) {
			for (let i = 0; i < mw; i++) {
				const f = sample((i + 0.5) * grid, (j + 0.5) * grid);
				let alpha: number;
				if (soft) {
					alpha = f * 0.22 * gain;
				} else {
					const thr = BAYER[(j & 7) * 8 + (i & 7)];
					alpha = f * 0.8 > thr ? 0.4 * gain : 0;
				}
				data[(j * mw + i) * 4 + 3] = Math.round(clamp(alpha, 0, 1) * 255);
			}
		}
		L.maskCtx.putImageData(L.maskImg, 0, 0);
		const c = L.ctx;
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.clearRect(0, 0, L.canvas.width, L.canvas.height);
		c.imageSmoothingEnabled = soft;
		c.drawImage(L.mask, 0, 0, mw, mh, 0, 0, L.canvas.width, L.canvas.height);
		c.globalCompositeOperation = "source-in";
		c.fillStyle = palette.tone;
		c.fillRect(0, 0, L.canvas.width, L.canvas.height);
		c.globalCompositeOperation = "source-over";
	}

	function drawAscii(L: Layer) {
		const c = L.ctx;
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(0, 0, W, H);
		const cols = Math.ceil(W / cw);
		const rows = Math.ceil(H / ch);
		const lvl = L.lvl;
		const gl = L.glyph;
		for (let r = 0; r < rows; r++) {
			for (let q = 0; q < cols; q++) {
				const i = r * cols + q;
				// Carry the glyph lattice with its island, including fractional
				// motion. A whole-cell offset alone makes every glyph snap at once.
				sample((q + 0.5) * cw, (r + 0.5) * ch);
				const island = dom;
				const centerX = island >= 0 ? centers[island * 2] : 0;
				const centerY = island >= 0 ? centers[island * 2 + 1] : 0;
				const ox = Math.floor(centerX / cw);
				const oy = Math.floor(centerY / ch);
				const dx = centerX - ox * cw;
				const dy = centerY - oy * ch;
				L.shiftX[i] = dx;
				L.shiftY[i] = dy;
				const f = sample((q + 0.5) * cw + dx, (r + 0.5) * ch + dy) * 1.08;
				const thr = 0.035 + 0.22 * hash2((q - ox) * 7 + 1, (r - oy) * 13 + 5);
				if (f <= thr) {
					lvl[i] = 0;
					continue;
				}
				const qv = clamp(f * 7.6, 0, LEVELS + 0.99);
				let cur = lvl[i];
				if (cur === 0 || qv < cur - 0.3 || qv > cur + 1.3)
					cur = Math.max(1, Math.floor(qv));
				lvl[i] = cur;
				// glyph identity rides the island's own coordinates
				gl[i] = Math.floor(hash2(q - ox + 17 * (island + 1), r - oy) * 4);
			}
		}
		const gain = palette.gain;
		c.textAlign = "center";
		c.textBaseline = "middle";
		c.font = `${fontPx}px ${fontFamily}`;
		for (let level = 1; level <= LEVELS; level++) {
			const tile = TILE_A[level] * gain;
			if (tile > 0) {
				c.globalAlpha = tile;
				c.fillStyle = palette.tone;
				c.beginPath();
				for (let r = 0; r < rows; r++)
					for (let q = 0; q < cols; q++)
						if (lvl[r * cols + q] === level)
							c.rect(
								q * cw + L.shiftX[r * cols + q],
								r * ch + L.shiftY[r * cols + q],
								cw - 1,
								ch - 1,
							);
				c.fill();
			}
			c.globalAlpha = Math.min(1, GLYPH_A[level] * gain);
			c.fillStyle = palette.glyph;
			const set = GLYPHS[level];
			for (let r = 0; r < rows; r++)
				for (let q = 0; q < cols; q++) {
					const i = r * cols + q;
					if (lvl[i] === level)
						c.fillText(
							set[gl[i] % set.length],
							(q + 0.5) * cw + L.shiftX[i],
							(r + 0.55) * ch + L.shiftY[i],
						);
				}
		}
		c.globalAlpha = 1;
	}

	function renderLayer(L: Layer) {
		if (L.mode === "ascii") drawAscii(L);
		else if (L.mode === "dither") drawMask(L, 2, false);
		else if (L.mode === "blur") drawMask(L, 8, true);
	}

	function renderAll(t: number) {
		if (!W || !H) return;
		buildBalls(t);
		for (const L of layers) if (L.mode) renderLayer(L);
	}

	/* ---------- modes ---------- */

	function setMode(m: TextureMode) {
		const f = layers[front];
		if (f.mode === m) return;
		const first = f.mode === null;
		const next = first ? f : layers[1 - front];
		const prev = first ? null : f;
		next.mode = m;
		next.lvl.fill(0);
		next.canvas.dataset.on = "1";
		next.canvas.dataset.kind = m;
		if (prev) {
			prev.canvas.dataset.on = "0";
			front = 1 - front;
			const gone = prev;
			if (gone.fade) window.clearTimeout(gone.fade);
			gone.fade = window.setTimeout(
				() => {
					if (disposed || layers[front] === gone) return;
					gone.mode = null;
					gone.canvas
						.getContext("2d")
						?.clearRect(0, 0, gone.canvas.width, gone.canvas.height);
				},
				motion ? FADE_MS + 60 : 0,
			);
			timers.push(gone.fade);
		}
		if (!motion || !raf) renderAll(motion ? clock : STILL_T);
	}

	/* ---------- loop ---------- */

	function step(dt: number) {
		if (hold > 0) hold -= dt;
		const target = engaged || hold > 0 ? 1 : 0;
		a += (target - a) * (1 - Math.exp(-dt * (target > a ? 3.2 : 1.1)));
		if (a < 0.003 && target === 0) a = 0;
		const k = 1 - Math.exp(-dt * 5);
		px += (tx - px) * k;
		py += (ty - py) * k;
	}

	function frame(now: number) {
		raf = 0;
		if (!motion || !visible || document.hidden || disposed) return;
		const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
		last = now;
		clock += dt;
		step(dt);
		if (now - lastDraw >= FRAME_MS) {
			lastDraw = now;
			renderAll(clock);
		}
		schedule();
	}
	function schedule() {
		if (motion && visible && !document.hidden && !raf && !disposed)
			raf = requestAnimationFrame(frame);
	}
	function stop() {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
		last = 0;
	}

	function setMotion(on: boolean) {
		if (on === motion && raf) return;
		motion = on;
		if (on) {
			last = 0;
			schedule();
		} else {
			stop();
			engaged = false;
			hold = 0;
			a = 0;
			renderAll(STILL_T);
		}
	}
	function setVisible(v: boolean) {
		visible = v;
		last = 0;
		if (v) schedule();
		else stop();
	}

	/* ---------- contact ---------- */

	function local(e: PointerEvent) {
		const r = root.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top] as const;
	}
	function engageAt(x: number, y: number) {
		if (a < 0.05) {
			px = x;
			py = y;
		}
		tx = x;
		ty = y;
	}
	const onMove = (e: PointerEvent) => {
		if (!motion || e.pointerType !== "mouse") return;
		const [x, y] = local(e);
		engageAt(x, y);
		engaged = true;
	};
	const onDown = (e: PointerEvent) => {
		if (!motion) return;
		const [x, y] = local(e);
		engageAt(x, y);
		if (e.pointerType === "mouse") engaged = true;
		else hold = 0.9;
	};
	const onLeave = (e: PointerEvent) => {
		if (e.pointerType === "mouse") engaged = false;
	};
	root.addEventListener("pointermove", onMove);
	root.addEventListener("pointerdown", onDown);
	root.addEventListener("pointerleave", onLeave);

	function pulseNear(x: number, y: number) {
		if (!motion) return;
		let bi = -1;
		let bd = 1e12;
		for (let i = 0; i < nIsland; i++) {
			const dx = centers[i * 2] - x;
			const dy = centers[i * 2 + 1] - y;
			const d = dx * dx + dy * dy;
			if (d < bd) {
				bd = d;
				bi = i;
			}
		}
		const cx = bi >= 0 ? clamp(centers[bi * 2], 24, W - 24) : W / 2;
		const cy = bi >= 0 ? clamp(centers[bi * 2 + 1], 24, H - 24) : H / 2;
		engageAt(cx, cy);
		px = cx;
		py = cy;
		hold = 1.1;
	}

	/* ---------- boot ---------- */

	readPalette();
	setMode(initialMode);
	document.fonts?.ready.then(() => {
		if (disposed) return;
		readPalette();
		if (!motion) renderAll(STILL_T);
	});

	return {
		setMode,
		setDensity(d) {
			density = clamp(d, 0.4, 1.8);
			layout();
		},
		setMotion,
		setVisible,
		layout,
		refreshPalette() {
			readPalette();
			if (!motion) renderAll(STILL_T);
		},
		pulseNear,
		dispose() {
			disposed = true;
			stop();
			for (const t of timers) window.clearTimeout(t);
			root.removeEventListener("pointermove", onMove);
			root.removeEventListener("pointerdown", onDown);
			root.removeEventListener("pointerleave", onLeave);
		},
	};
}

export default function TextureStudy({
	mode = "ascii",
	animated,
	density = 1,
}: Props) {
	const rootRef = useRef<HTMLElement>(null);
	const canvasA = useRef<HTMLCanvasElement>(null);
	const canvasB = useRef<HTMLCanvasElement>(null);
	const copyRef = useRef<HTMLDivElement>(null);
	const actionRef = useRef<HTMLButtonElement>(null);
	const engine = useRef<Engine | null>(null);
	const latest = useRef({ mode, density });

	const [osReduce, setOsReduce] = useState(() =>
		typeof window !== "undefined" && window.matchMedia
			? window.matchMedia("(prefers-reduced-motion: reduce)").matches
			: false,
	);
	const motion = animated ?? !osReduce;
	const motionRef = useRef(motion);

	// runs before the mount effect below, which reads these
	useEffect(() => {
		latest.current = { mode, density };
		motionRef.current = motion;
	});

	useEffect(() => {
		if (animated !== undefined || !window.matchMedia) return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const on = () => setOsReduce(mq.matches);
		mq.addEventListener("change", on);
		return () => mq.removeEventListener("change", on);
	}, [animated]);

	useEffect(() => {
		const root = rootRef.current;
		const a = canvasA.current;
		const b = canvasB.current;
		if (!root || !a || !b) return;
		const eng = createEngine(
			root,
			[a, b],
			copyRef.current,
			actionRef.current,
			latest.current.mode,
			latest.current.density,
		);
		engine.current = eng;
		eng.layout();
		eng.setMotion(motionRef.current);

		const ro = new ResizeObserver(() => eng.layout());
		ro.observe(root);
		if (copyRef.current) ro.observe(copyRef.current);
		const io = new IntersectionObserver(([entry]) =>
			eng.setVisible(entry.isIntersecting),
		);
		io.observe(root);
		const onVis = () => eng.setVisible(!document.hidden);
		document.addEventListener("visibilitychange", onVis);

		// theme: class / data attributes on the document, or the OS scheme
		const mo = new MutationObserver(() => eng.refreshPalette());
		for (const el of [document.documentElement, document.body])
			mo.observe(el, {
				attributes: true,
				attributeFilter: ["class", "data-theme", "style"],
			});
		const scheme = window.matchMedia("(prefers-color-scheme: dark)");
		const onScheme = () => eng.refreshPalette();
		scheme.addEventListener("change", onScheme);

		return () => {
			ro.disconnect();
			io.disconnect();
			mo.disconnect();
			document.removeEventListener("visibilitychange", onVis);
			scheme.removeEventListener("change", onScheme);
			eng.dispose();
			engine.current = null;
		};
	}, []);

	useEffect(() => engine.current?.setMode(mode), [mode]);
	useEffect(() => engine.current?.setDensity(density), [density]);
	useEffect(() => engine.current?.setMotion(motion), [motion]);

	const onAction = useCallback(() => {
		const el = actionRef.current;
		if (!el) return;
		engine.current?.pulseNear(
			el.offsetLeft + el.offsetWidth / 2,
			el.offsetTop + el.offsetHeight / 2,
		);
	}, []);

	return (
		<section
			ref={rootRef}
			className="texture-study"
			data-mode={mode}
			data-motion={motion ? "live" : "still"}
			aria-label="Log a brew"
		>
			<canvas ref={canvasA} className="texture-study__canvas" aria-hidden />
			<canvas ref={canvasB} className="texture-study__canvas" aria-hidden />
			<div ref={copyRef} className="texture-study__copy">
				<h2 className="texture-study__title">Log a brew</h2>
				<p className="texture-study__sub">Start from your last brew</p>
			</div>
			<button
				ref={actionRef}
				type="button"
				className="texture-study__action"
				onClick={onAction}
			>
				<span className="texture-study__label" aria-hidden="true">
					Try texture
				</span>
				<span aria-hidden="true">↗</span>
				<span className="texture-study__sr">Try texture</span>
			</button>
		</section>
	);
}
