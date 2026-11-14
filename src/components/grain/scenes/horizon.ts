import type { Scene } from "../engine";

/**
 * Horizon: daybreak behind three landforms, seen from a near slope.
 *
 * Interpretation: the reference gave framing and depth (a luminous place far
 * away, land stepping toward us, calm sky above), not a subject or a palette.
 * This is a cool indigo morning, not a sunset, and it lives in the open band
 * of the page below the cards: the whole sky above is plain paper, so quiet
 * zones never expose a cutout.
 *
 * World: the light sits low in a saddle of the far range, left of centre.
 *  - FAR: pale, serrated, one great peak in the right margin and a spire in
 *    the left. Its sun-facing side is lit; the shaded side is hatched.
 *  - MID: one long shoulder climbing out of the left margin, descending to
 *    the valley across the page.
 *  - NEAR: a dark knoll in the right foreground, overlapping the great peak's
 *    foot, running out into scree. The heaviest ink on the page.
 *  Each form fades into mist at its foot, so depth comes from tone and
 *  overlap, not from parallel bands.
 *  Light paper: the sun is gold with a rose breath of horizon glow; ridges are
 *    indigo ink that deepens toward us; mist lifts ink off the slopes.
 *  Dark paper: the same land under a gibbous moon, silver crests, teal air,
 *    a thin scatter of stars.
 *
 * Time: terrain and light never move. Air does. Low cloud lenses sail across
 * the light and veil it for a while, a mist bank drifts through each valley
 * and thickens and clears on its own period, and the horizon glow warms and
 * cools over several minutes. Everything is analytic in t; only per-viewport
 * terrain tables are cached.
 */

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const q = clamp((v - a) / (b - a), 0, 1);
	return q * q * (3 - 2 * q);
};
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;

function hash(n: number) {
	let h = Math.imul(n | 0, 2654435761);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, seed: number) {
	const i = Math.floor(x);
	const f = x - i;
	const u = f * f * f * (f * (f * 6 - 15) + 10);
	return lerp(hash(i * 7919 + seed), hash((i + 1) * 7919 + seed), u);
}
function fbm(x: number, seed: number, oct: number) {
	let sum = 0;
	let amp = 0.5;
	let norm = 0;
	let f = 1;
	for (let o = 0; o < oct; o++) {
		sum += amp * vnoise(x * f, seed + o * 101);
		norm += amp;
		amp *= 0.5;
		f *= 2.05;
	}
	return sum / norm;
}

type RGB = [number, number, number];
const css = (c: RGB, a: number) =>
	`rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const mixRgb = (a: RGB, b: RGB, q: number): RGB => [
	lerp(a[0], b[0], q),
	lerp(a[1], b[1], q),
	lerp(a[2], b[2], q),
];

/** Pointed bump: apex at c, own half-widths either side. */
const tri = (u: number, c: number, wl: number, wr: number, p: number) => {
	const d = u - c;
	const q = 1 - Math.abs(d) / (d < 0 ? wl : wr);
	return q > 0 ? q ** p : 0;
};
const gauss = (d: number) => Math.exp(-d * d);

type Geo = {
	sunU: number;
	uL: number;
	uR: number;
	/** How far the whole land has sunk, fraction of H; see SHELF_CLEAR. */
	drop: number;
};

type Form = {
	/** Mean crest height as a fraction of H, before the land sinks. */
	base: number;
	/** Share of the drop this form follows: far sinks most, near least. */
	sink: number;
	/** Height of the crest above its base, as a fraction of H. */
	rise: (u: number, g: Geo) => number;
	/** Crest weathering, fraction of H. */
	rough: number;
	/** Crags: how strongly noise reshapes the form, and its frequency in u. */
	crag: number;
	cragFreq: number;
	/** Rolling (smooth) rather than broken (ridged) relief. */
	soft: boolean;
	seed: number;
	/** Light paper: ink at the crest, and how far the foot fades, in H. */
	ink: number;
	foot: number;
	/** Dark paper: haze at the foot. */
	haze: number;
	/** Rim strength. */
	rim: number;
	/** How far horizon light tints the body, in W. */
	reach: number;
	/** Hatch strength on lit faces. */
	hatch: number;
	/** Mist drift, px per second; 0 means no bank. */
	wind: number;
};

const FORMS: Form[] = [
	{
		// FAR: pale and serrated; the light stands in its saddle.
		base: 0.785,
		sink: 1,
		rise: (u, g) => {
			let r = (0.28 + g.drop) * tri(u, g.uR - 0.02, 0.27, 0.12, 1.3);
			r = Math.max(r, (0.17 + g.drop) * tri(u, g.uR - 0.17, 0.08, 0.1, 1.2));
			r = Math.max(
				r,
				(0.15 + g.drop) * tri(u, g.uL + 0.075, 0.07, 0.085, 1.25),
			);
			r = Math.max(r, (0.07 + g.drop * 0.5) * tri(u, 0.37, 0.14, 0.1, 1.1));
			r = Math.max(r, 0.045 * tri(u, g.sunU + 0.2, 0.1, 0.1, 1));
			return r * (1 - 0.94 * gauss((u - g.sunU) / 0.085)) + 0.01;
		},
		rough: 0.014,
		crag: 0.34,
		cragFreq: 15,
		soft: false,
		seed: 11,
		ink: 0.26,
		foot: 0.05,
		haze: 0.3,
		rim: 1,
		reach: 0.5,
		hatch: 1,
		wind: 6,
	},
	{
		// MID: a long shoulder from the left margin, sliding to the valley.
		base: 0.855,
		sink: 0.85,
		rise: (u, g) => {
			let r = (0.26 + g.drop * 0.85) * tri(u, g.uL - 0.015, 0.12, 0.27, 1.12);
			r = Math.max(r, 0.045 * tri(u, g.uL + 0.34, 0.12, 0.2, 1));
			return Math.max(r, 0.07 * tri(u, g.uR - 0.34, 0.12, 0.13, 1.1));
		},
		rough: 0.01,
		crag: 0.32,
		cragFreq: 9,
		soft: false,
		seed: 29,
		ink: 0.46,
		foot: 0.07,
		haze: 0.2,
		rim: 0.85,
		reach: 0.36,
		hatch: 0.7,
		wind: 11,
	},
	{
		// NEAR: the dark knoll in the right foreground, scree running left.
		base: 0.955,
		sink: 0.5,
		rise: (u, g) => {
			let r = (0.255 + g.drop * 0.5) * tri(u, g.uR + 0.012, 0.24, 0.1, 1.2);
			r = Math.max(
				r,
				(0.115 + g.drop * 0.5) * tri(u, g.uR - 0.2, 0.12, 0.13, 1.1),
			);
			r = Math.max(r, 0.045 * tri(u, g.uL + 0.045, 0.12, 0.12, 1.1));
			return Math.max(r, 0.025 * tri(u, 0.5, 0.2, 0.2, 1));
		},
		rough: 0.007,
		crag: 0.3,
		cragFreq: 6,
		soft: true,
		seed: 47,
		ink: 0.68,
		foot: 0.13,
		haze: 0.07,
		rim: 0.6,
		reach: 0.2,
		hatch: 0.75,
		wind: 0,
	},
];

const STEP = 4;

type Layer = {
	form: Form;
	n: number;
	ys: Float32Array;
	/** How much each crest segment faces the light. */
	lit: Float32Array;
	grit: Float32Array;
	bucket: Int8Array;
	crest: Path2D;
	body: Path2D;
	/** Cheaper bodies for the fills that never reach below their own foot. */
	erase: Path2D;
	inkLight: Path2D;
	inkDark: Path2D;
	/** Fall-line scars on lit faces. */
	hatch: Path2D;
	/** Shadow facets under crest segments that turn from the light. */
	facets: Path2D;
	min: number;
};
type Star = { x: number; y: number; a: number; ph: number; big: boolean };
type Mist = { w: number; u: number; period: number; ph: number; k: number };
type World = {
	key: string;
	geo: Geo;
	layers: Layer[];
	stars: Star[];
	mist: Mist[];
};

/**
 * The far saddle, and the light in it, never rise above this many px from the
 * canvas top. That is the bottom of the bean shelf when the taste-notes banner
 * is up (about 1440x900, header excluded), so the disc stays in the open band
 * with or without the banner. Taller viewports already clear it and keep the
 * original framing; shorter ones sink the land at most MAX_DROP.
 */
const SHELF_CLEAR = 742;
const MAX_DROP = 0.11;

const worldKey = (W: number, H: number, g: Geo) =>
	`${W}x${H}x${g.sunU.toFixed(3)}x${g.uL.toFixed(3)}x${g.uR.toFixed(3)}x${g.drop.toFixed(3)}`;

function build(W: number, H: number, geo: Geo): World {
	const sunX = geo.sunU * W;
	const layers: Layer[] = FORMS.map((form, li) => {
		const n = Math.ceil(W / STEP) + 2;
		const ys = new Float32Array(n + 1);
		for (let i = 0; i <= n; i++) {
			const u = ((i - 1) * STEP) / W;
			const rock = fbm(u * W * 0.03, form.seed + 77, 4) - 0.5;
			const fine = hash(i * 17 + form.seed) - 0.5;
			const cn = form.soft
				? fbm(u * form.cragFreq, form.seed + 5, 3)
				: 0.65 *
						(1 - Math.abs(2 * vnoise(u * form.cragFreq, form.seed + 5) - 1)) +
					0.35 *
						(1 -
							Math.abs(2 * vnoise(u * form.cragFreq * 2.3, form.seed + 9) - 1));
			const m = 1 + form.crag * (2 * cn - (form.soft ? 1 : 0.9));
			ys[i] =
				H *
					(form.base +
						geo.drop * form.sink -
						form.rise(u, geo) * m +
						form.rough * rock) +
				fine * 1.6;
		}
		const lit = new Float32Array(n);
		const grit = new Float32Array(n);
		const hatch = new Path2D();
		const facets = new Path2D();
		const gl = H * 0.045;
		for (let i = 0; i < n; i++) {
			const x = (i - 1) * STEP;
			const slope = (ys[i + 1] - ys[i]) / STEP;
			// Down-right is positive; a face looks at the light if it descends
			// toward it from the left, or climbs away from it on the right.
			const facing = x < sunX ? slope : -slope;
			lit[i] = clamp(0.36 + 1.0 * facing, 0, 1.25);
			grit[i] = 0.75 + 0.5 * hash(i * 31 + form.seed);
			const h = hash(i * 53 + form.seed * 7);
			if (i === 0 || i === n - 1) continue;
			if (facing > 0.34 && h < 0.12 + 0.2 * facing) {
				const len =
					gl * (0.35 + 0.9 * hash(i * 29 + form.seed)) * (li === 2 ? 0.55 : 1);
				const lean = x < sunX ? -0.3 : 0.3;
				hatch.moveTo(x, ys[i] + 2);
				hatch.lineTo(x + lean * len, ys[i] + len);
			} else if (li < 2 && facing < -0.18 && h < 0.42) {
				const len = gl * (0.3 + 1.1 * Math.min(1, -facing)) * (0.4 + hash(i));
				const lean = x < sunX ? -0.55 : 0.55;
				facets.moveTo(x, ys[i] + 2);
				facets.lineTo(x + lean * len, ys[i] + len);
			}
		}
		const crest = new Path2D();
		let min = H;
		for (let i = 0; i <= n; i++) {
			const x = (i - 1) * STEP;
			if (i === 0) crest.moveTo(x, ys[i]);
			else crest.lineTo(x, ys[i]);
			if (ys[i] < min) min = ys[i];
		}
		const mk = (bottom: number) => {
			const b = new Path2D();
			b.moveTo(-STEP, bottom);
			for (let i = 0; i <= n; i++)
				b.lineTo((i - 1) * STEP, Math.min(ys[i], bottom));
			b.lineTo(n * STEP, bottom);
			b.closePath();
			return b;
		};
		const body = mk(H + 8);
		// Nothing drawn behind a form reaches below 0.99 H, so erasing stops there.
		const footY = H * (form.base + geo.drop * form.sink + form.foot);
		return {
			form,
			n,
			ys,
			lit,
			grit,
			bucket: new Int8Array(n),
			crest,
			body,
			erase: mk(H * 0.99),
			inkLight: mk(Math.min(H + 8, min + 0.8 * (footY - min) + 3)),
			inkDark: mk(Math.min(H + 8, footY + H * 0.05 + 2)),
			hatch,
			facets,
			min,
		};
	});
	const stars: Star[] = [];
	for (let i = 0; i < 56; i++) {
		stars.push({
			x: hash(i * 5 + 1) * W,
			y: (0.03 + 0.5 * hash(i * 5 + 2) ** 0.85) * H,
			a: 0.3 + 0.55 * hash(i * 5 + 3),
			ph: hash(i * 5 + 4) * TAU,
			big: hash(i * 5 + 5) > 0.92,
		});
	}
	// One bank per valley that has one: far/mid, each on its own period.
	const mist: Mist[] = layers.map((_, li) => ({
		w: W * (0.2 + 0.08 * hash(li + 200)),
		u: hash(li + 210),
		period: 83 + 61 * hash(li + 230),
		ph: hash(li + 240) * TAU,
		k: 0.8 + 0.4 * hash(li + 220),
	}));
	return {
		key: worldKey(W, H, geo),
		geo,
		layers,
		stars,
		mist,
	};
}

let cache: World | null = null;

type Stop = [number, RGB, number];
const ramp = (stops: Stop[], v: number): [RGB, number] => {
	if (v <= stops[0][0]) return [stops[0][1], stops[0][2]];
	for (let i = 1; i < stops.length; i++) {
		if (v <= stops[i][0]) {
			const [v0, c0, a0] = stops[i - 1];
			const [v1, c1, a1] = stops[i];
			const q = (v - v0) / (v1 - v0);
			return [mixRgb(c0, c1, q), lerp(a0, a1, q)];
		}
	}
	const l = stops[stops.length - 1];
	return [l[1], l[2]];
};

/** Crest light: moon silver on dark paper, gold edge on indigo on light. */
const RIM_DARK: Stop[] = [
	[0, [92, 108, 138], 0.3],
	[0.25, [118, 154, 188], 0.5],
	[0.55, [160, 208, 230], 0.86],
	[0.85, [214, 238, 248], 1],
	[1.1, [244, 252, 255], 1],
];
const RIM_LIGHT: Stop[] = [
	[0, [52, 60, 112], 0.42],
	[0.25, [74, 78, 128], 0.5],
	[0.55, [186, 138, 60], 0.9],
	[0.85, [220, 166, 44], 1],
	[1.1, [240, 190, 60], 1],
];
const BUCKETS = 6;

// Light paper palette: indigo land, gold light, rose air.
const INK_FAR: RGB = [98, 112, 206];
const INK_MID: RGB = [78, 84, 192];
const INK_NEAR: RGB = [62, 56, 150];
const GOLD: RGB = [240, 184, 56];
const ROSE: RGB = [222, 124, 138];
// Dark paper palette.
const TEAL: RGB = [122, 178, 206];

export const horizon: Scene = ({ dither: c }, { t, W, H, dark, anchors }) => {
	const fr = anchors.frame;
	const mL = fr ? clamp(fr.x, 0, W * 0.4) : W * 0.16;
	const mR = fr ? clamp(W - fr.x - fr.w, 0, W * 0.4) : W * 0.16;
	const geo: Geo = {
		sunU: Math.round(0.575 * 1000) / 1000,
		uL: Math.max(0.05, mL / 2 / W),
		uR: Math.min(0.95, 1 - mR / 2 / W),
		drop: clamp(SHELF_CLEAR / H - FORMS[0].base, 0, MAX_DROP),
	};
	const key = worldKey(W, H, geo);
	if (!cache || cache.key !== key) cache = build(W, H, geo);
	const world = cache;
	const { layers } = world;
	const far = layers[0];

	// --- Light and air ------------------------------------------------------
	// The horizon glow warms and cools slowly; clarity sets how hazy the air is.
	const dawn = 0.5 - 0.5 * Math.cos(TAU * ((t + 40) / 300));
	const clarity = 0.5 + 0.5 * Math.sin((TAU * t) / 211 + 1.1);
	const power = 0.84 + 0.16 * dawn + 0.05 * clarity;
	const sunX = geo.sunU * W;
	const r = H * 0.046;
	const iSun = clamp(Math.round(sunX / STEP) + 1, 0, far.n);
	const horizonY = far.ys[iSun];
	const sunY = horizonY - r * 0.55;
	const ramps = dark ? RIM_DARK : RIM_LIGHT;
	const lightRgb = dark ? TEAL : GOLD;

	c.save();
	c.lineJoin = "bevel";
	c.lineCap = "butt";

	const glow = (
		x: number,
		y: number,
		rx: number,
		ry: number,
		stops: [number, string][],
	) => {
		c.save();
		c.translate(x, y);
		c.scale(1, ry / rx);
		const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
		for (const [o, col] of stops) g.addColorStop(o, col);
		c.fillStyle = g;
		c.fillRect(-rx, -rx, rx * 2, rx * 2);
		c.restore();
	};

	// --- Cloud lenses: sail across the light, veiling it for a while --------
	// Each lens is a paper-coloured hole in the glow with a lit underside.
	const lenses = [0, 1].map((k) => {
		const len = W * (0.16 + 0.07 * hash(k + 40));
		const span = W * 1.35;
		const speed = 5 + 3.5 * k;
		const x0 = ((hash(k + 50) * span + t * speed) % span) - W * 0.2;
		const y = sunY + r * (0.1 - 1.55 * k) + (k ? -H * 0.006 : 0);
		const cx = x0 + len / 2;
		const over = gauss((cx - sunX) / (len * 0.62 + r * 1.2));
		return { x0, len, y, cx, over, h: r * (0.34 + 0.12 * k) };
	});
	const veil = clamp(
		lenses.reduce((s, l) => s + l.over * 0.62, 0),
		0,
		0.8,
	);

	// --- Stars (dark only), thinning toward the glare -----------------------
	if (dark) {
		c.fillStyle = "rgb(205,222,240)";
		for (const s of world.stars) {
			const near2 = Math.hypot(
				(s.x - sunX) / (W * 0.45),
				(s.y - sunY) / (H * 0.55),
			);
			const fade = smooth(0.2, 0.9, near2) * (1 - smooth(0.4, 0.62, s.y / H));
			if (fade <= 0.02) continue;
			c.globalAlpha = s.a * fade * (0.8 + 0.2 * Math.sin(t * 0.35 + s.ph));
			const z = s.big ? 4 : 2;
			c.fillRect(s.x, s.y, z, z);
		}
		c.globalAlpha = 1;
	}

	// --- The light ----------------------------------------------------------
	const glowK = (0.85 + 0.15 * dawn) * (1 - 0.55 * veil);
	if (dark) {
		glow(sunX, sunY, W * 0.34, H * 0.12, [
			[0, css(TEAL, 0.32 * glowK)],
			[0.45, css(TEAL, 0.12 * glowK)],
			[1, css(TEAL, 0)],
		]);
		glow(sunX, sunY, r * 2.6, r * 2.3, [
			[0, css(TEAL, 0.3 * glowK)],
			[0.5, css(TEAL, 0.12 * glowK)],
			[1, css(TEAL, 0)],
		]);
		// A crescent riding the saddle: one bright limb, the rest a faint
		// earthshine disc. Reads as a silhouette, with no hollow rim.
		c.fillStyle = css([150, 180, 208], 0.2 * (1 - 0.5 * veil));
		c.beginPath();
		c.arc(sunX, sunY, r, 0, TAU);
		c.fill();
		c.save();
		c.beginPath();
		c.arc(sunX, sunY, r, 0, TAU);
		c.clip();
		c.beginPath();
		c.arc(sunX, sunY, r * 1.03, 0, TAU);
		c.arc(sunX - r * 0.46, sunY - r * 0.1, r * 0.93, 0, TAU);
		c.clip("evenodd");
		const mg = c.createLinearGradient(sunX - r * 0.4, 0, sunX + r, 0);
		mg.addColorStop(0, css([196, 220, 238], 0.85 * (1 - 0.7 * veil)));
		mg.addColorStop(1, css([248, 253, 255], 1 - 0.7 * veil));
		c.fillStyle = mg;
		c.fillRect(sunX - r, sunY - r, r * 2, r * 2);
		c.restore();
	} else {
		const hot = mixRgb(ROSE, GOLD, 0.3 + 0.7 * dawn);
		// Horizon glow: wide and low, so the saddle burns and the sky above
		// stays plain paper.
		glow(sunX, horizonY - H * 0.01, W * 0.4, H * 0.115, [
			[0, css(ROSE, 0.24 * glowK)],
			[0.5, css(ROSE, 0.1 * glowK)],
			[1, css(ROSE, 0)],
		]);
		glow(sunX, sunY, r * 3.4, r * 2.7, [
			[0, css(hot, 0.46 * glowK)],
			[0.3, css(GOLD, 0.26 * glowK)],
			[1, css(GOLD, 0)],
		]);
		// The sun: a gold disc, brighter at the top, veiled when cloud crosses.
		const sg = c.createLinearGradient(0, sunY - r, 0, sunY + r);
		sg.addColorStop(0, css([250, 208, 84], 0.62 * (1 - 0.7 * veil)));
		sg.addColorStop(1, css(GOLD, 0.9 * (1 - 0.7 * veil)));
		c.fillStyle = sg;
		c.beginPath();
		c.arc(sunX, sunY, r, 0, TAU);
		c.fill();
	}
	for (const l of lenses) {
		const prox = gauss((l.cx - sunX) / (W * 0.15));
		if (prox < 0.06) continue;
		const edge = smooth(0.3, 0.7, prox);
		c.globalCompositeOperation = "destination-out";
		glow(l.cx, l.y, l.len * 0.6, l.h, [
			[0, `rgba(0,0,0,${(0.86 * Math.min(1, prox * 1.6)).toFixed(3)})`],
			[0.6, `rgba(0,0,0,${(0.5 * Math.min(1, prox * 1.6)).toFixed(3)})`],
			[1, "rgba(0,0,0,0)"],
		]);
		c.globalCompositeOperation = "source-over";
		// A lit underside: the lens catches the light from below.
		const g = c.createLinearGradient(l.x0, 0, l.x0 + l.len, 0);
		g.addColorStop(0, css(lightRgb, 0));
		g.addColorStop(0.5, css(lightRgb, 0.7 * edge * power));
		g.addColorStop(1, css(lightRgb, 0));
		c.strokeStyle = g;
		c.lineWidth = 2;
		c.beginPath();
		c.moveTo(l.x0 + l.len * 0.08, l.y + l.h * 0.45);
		c.quadraticCurveTo(
			l.cx,
			l.y + l.h * 0.75,
			l.x0 + l.len * 0.92,
			l.y + l.h * 0.4,
		);
		c.stroke();
	}

	// --- Landforms, far to near ---------------------------------------------
	const inkOf = [INK_FAR, INK_MID, INK_NEAR];
	layers.forEach((L, li) => {
		const { form, n, ys, lit, grit, bucket } = L;
		// Occlusion: what is behind a nearer form is simply gone.
		c.globalCompositeOperation = "destination-out";
		c.fillStyle = "#000";
		c.fill(L.erase);
		c.globalCompositeOperation = "source-over";

		// Body: ink at the crest fading to mist at the foot (light paper), or
		// valley air glowing at the foot with a dark crest above it (dark paper).
		const top = L.min;
		const foot = H * (form.base + geo.drop * form.sink + form.foot);
		const atmos = 1.05 - 0.2 * dawn;
		if (dark) {
			const bot = foot + H * 0.05;
			const f = clamp((foot - top) / (bot - top), 0.2, 0.98);
			const g = c.createLinearGradient(0, top, 0, bot);
			g.addColorStop(0, css([110, 138, 168], 0));
			g.addColorStop(f * 0.55, css([110, 138, 168], form.haze * 0.2 * atmos));
			g.addColorStop(f, css([108, 140, 170], form.haze * 0.7 * atmos));
			g.addColorStop(1, css([108, 140, 170], 0));
			c.fillStyle = g;
			c.fill(L.inkDark);
		} else {
			const ink = inkOf[li];
			const g = c.createLinearGradient(0, top, 0, foot);
			g.addColorStop(0, css(ink, Math.min(0.92, form.ink)));
			g.addColorStop(0.36, css(ink, form.ink * 0.42));
			g.addColorStop(0.66, css(ink, form.ink * 0.1));
			g.addColorStop(0.8, css(ink, 0));
			c.fillStyle = g;
			c.fill(L.inkLight);
		}

		// Horizon light in the air, strongest at the saddle, thinning outward.
		if (form.reach > 0.15) {
			c.save();
			c.clip(L.body);
			const R = W * form.reach;
			c.translate(sunX, horizonY + H * 0.01);
			c.scale(1, 0.2);
			const g = c.createRadialGradient(0, 0, 0, 0, 0, R);
			const k = power * (0.55 + 0.45 * form.rim) * 0.26;
			g.addColorStop(0, css(lightRgb, k));
			g.addColorStop(0.5, css(lightRgb, k * 0.4));
			g.addColorStop(1, css(lightRgb, 0));
			c.fillStyle = g;
			c.fillRect(-R, -R, R * 2, R * 2);
			c.restore();
		}

		// Shadow facets on faces that turn from the light, and hatching on the
		// lit ones. The hatch takes the light's colour, the facets the ink's.
		c.lineWidth = 2;
		c.strokeStyle = dark ? css([84, 104, 134], 1) : css(inkOf[li], 1);
		c.globalAlpha = (dark ? 0.3 : 0.36) * (li === 0 ? 1 : 0.8);
		c.stroke(L.facets);
		c.lineWidth = 1.6;
		c.strokeStyle = dark ? css([170, 214, 234], 1) : css([196, 142, 44], 1);
		c.globalAlpha = 0.5 * form.hatch * power;
		c.stroke(L.hatch);
		c.globalAlpha = 1;

		// Rim: crest segments, bucketed by lit intensity.
		for (let i = 0; i < n; i++) {
			const x = (i - 1) * STEP;
			const prox = gauss((x - sunX) / (W * 0.3));
			const wide = gauss((x - sunX) / (W * 0.9));
			const I =
				form.rim *
				(0.14 + 0.55 * prox + 0.31 * wide) *
				(0.3 + 0.7 * lit[i]) *
				grit[i] *
				(0.55 + 0.6 * power);
			bucket[i] = clamp(Math.floor((I / 1.15) * BUCKETS), 0, BUCKETS - 1);
		}
		if (!dark && li === 2) {
			// A sliver of paper under the crest keeps the rim readable on ink.
			c.globalCompositeOperation = "destination-out";
			c.strokeStyle = "#000";
			c.lineWidth = 3;
			c.globalAlpha = 0.5;
			c.translate(0, 1.6);
			c.stroke(L.crest);
			c.translate(0, -1.6);
			c.globalAlpha = 1;
			c.globalCompositeOperation = "source-over";
		}
		for (let b = 0; b < BUCKETS; b++) {
			const v = ((b + 0.5) / BUCKETS) * 1.15;
			const [col, a] = ramp(ramps, v);
			c.beginPath();
			let any = false;
			let prev = -2;
			for (let i = 0; i < n; i++) {
				if (bucket[i] !== b) continue;
				any = true;
				if (prev !== i - 1) c.moveTo((i - 1) * STEP, ys[i]);
				c.lineTo(i * STEP + 0.6, ys[i + 1]);
				prev = i;
			}
			if (!any) continue;
			const core = 2 + 2 * smooth(0.3, 1, v) * form.rim;
			if (v > 0.55 && li < 2) {
				c.strokeStyle = css(col, a * 0.26);
				c.lineWidth = core + 4;
				c.stroke();
			}
			c.strokeStyle = css(col, a);
			c.lineWidth = core;
			c.stroke();
		}

		// Mist bank: drifts in the valley in front of this form, behind the next.
		// It thickens and clears on its own period. On light paper it lifts ink
		// off the slope; on dark paper it glows.
		if (form.wind > 0) {
			const m = world.mist[li];
			const span = W + m.w * 2;
			const x = ((m.u * span + t * form.wind * m.k) % span) - m.w;
			const iw = clamp(Math.round(x / STEP) + 1, 0, n);
			const y = ys[iw] + H * 0.024;
			const body = smooth(-0.3, 0.8, Math.sin((TAU * t) / m.period + m.ph));
			const a = (0.2 + 0.5 * body) * (0.7 + 0.3 * (1 - clarity));
			const prox = gauss((x - sunX) / (W * 0.3));
			if (dark) {
				// Held inside the form's own body, so it never leaks into the sky.
				const tint = mixRgb([118, 138, 160], [150, 206, 228], prox * power);
				c.save();
				c.clip(L.body);
				glow(x, y, m.w, H * 0.058, [
					[0, css(tint, a * 0.5)],
					[0.35, css(tint, a * 0.26)],
					[0.7, css(tint, a * 0.07)],
					[1, css(tint, 0)],
				]);
				c.restore();
			} else {
				c.globalCompositeOperation = "destination-out";
				glow(x, y, m.w, H * 0.04, [
					[0, `rgba(0,0,0,${Math.min(0.9, a * 1.4).toFixed(3)})`],
					[0.6, `rgba(0,0,0,${(a * 0.65).toFixed(3)})`],
					[1, "rgba(0,0,0,0)"],
				]);
				c.globalCompositeOperation = "source-over";
				// The bank holds light: rose far from the sun, gold beside it.
				glow(x, y - H * 0.004, m.w * 0.9, H * 0.034, [
					[0, css(mixRgb(ROSE, GOLD, prox), a * (0.2 + 0.14 * prox))],
					[1, css(ROSE, 0)],
				]);
			}
		}
	});

	c.restore();
};
