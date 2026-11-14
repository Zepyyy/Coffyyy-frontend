import type { Scene } from "../engine";
import { blend, type Rgb } from "./raster";

/**
 * A meteor shower over the Milky Way.
 *
 * The Milky Way rises up the left side of the page: a soft band of light,
 * mottled with star clouds, warmest where it swells toward the galactic core
 * at the bottom, and split by a dark dust lane. It is crowded with stars;
 * the open sky beyond it holds only a few bright ones, each with its glow.
 * On light paper the band prints as ink; on dark paper it is light. Nothing
 * twinkles.
 *
 * Meteors all leave one radiant beyond the upper right of the page, so the
 * shower fans out across the sky in one direction. Several families overlap,
 * each on its own slot clock: quick streaks in bursts and lulls, brighter
 * coloured meteors that leave a straight train fading from its oldest end,
 * long slow earthgrazers at the flat edge of the fan, and a rare fireball
 * that flares and breaks apart.
 *
 * The sky is painted once per paper; meteors are drawn over it each frame.
 * Everything is a function of t.
 */

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
function hash(a: number, b = 0) {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const mixRgb = (a: Rgb, b: Rgb, k: number): Rgb => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k,
];
const rgba = (c: Rgb, a: number) =>
	`rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${clamp(a, 0, 1).toFixed(3)})`;

/* ---------------------------------------------------------------- noise */

function vnoise(x: number, y: number, seed: number) {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	const fx = x - xi;
	const fy = y - yi;
	const u = fx * fx * (3 - 2 * fx);
	const v = fy * fy * (3 - 2 * fy);
	const a = hash(xi * 7919 + seed, yi);
	const b = hash((xi + 1) * 7919 + seed, yi);
	const c = hash(xi * 7919 + seed, yi + 1);
	const d = hash((xi + 1) * 7919 + seed, yi + 1);
	return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
function fbm(x: number, y: number, seed: number, oct = 4) {
	let s = 0;
	let a = 0.5;
	let n = 0;
	for (let i = 0; i < oct; i++) {
		s += a * vnoise(x, y, seed + i * 131);
		n += a;
		x *= 2.03;
		y *= 2.03;
		a *= 0.5;
	}
	return s / n;
}

/* ------------------------------------------------------------------ ink */

type Ink = {
	/** Milky Way: cool outer arms, warm core, its crowded stars. */
	arm: Rgb;
	core: Rgb;
	dust: Rgb;
	star: Rgb[];
	streak: Rgb[];
	train: Rgb;
	hot: Rgb;
};

const INKS: Record<"light" | "dark", Ink> = {
	light: {
		arm: [84, 96, 170],
		core: [196, 118, 64],
		dust: [70, 74, 110],
		star: [
			[48, 54, 92],
			[86, 70, 70],
			[150, 92, 52],
			[56, 88, 140],
		],
		streak: [
			[58, 84, 150],
			[36, 116, 104],
			[184, 104, 40],
			[128, 66, 128],
		],
		train: [40, 116, 112],
		hot: [36, 34, 44],
	},
	dark: {
		arm: [168, 182, 226],
		core: [240, 208, 168],
		dust: [210, 220, 240],
		star: [
			[230, 236, 250],
			[252, 238, 210],
			[255, 200, 156],
			[200, 218, 255],
		],
		streak: [
			[196, 218, 255],
			[150, 236, 200],
			[255, 196, 124],
			[230, 190, 255],
		],
		train: [130, 220, 200],
		hot: [255, 252, 240],
	},
};

/* ------------------------------------------------------------------ sky */

type Plan = {
	W: number;
	H: number;
	radiant: { x: number; y: number };
	sky: ImageData | null;
	skyKey: string;
};

let memo: Plan | null = null;
let memoKey = "";

function plan(W: number, H: number): Plan {
	return {
		W,
		H,
		radiant: { x: W * 1.04, y: -H * 0.32 },
		sky: null,
		skyKey: "",
	};
}

/** The band's spine, bottom (v=0) to top (v=1): up the left side of the page. */
const spineX = (W: number, v: number) =>
	lerp(W * 0.3, -W * 0.05, v) - W * 0.05 * Math.sin(Math.PI * v);

function paintSky(
	p: Plan,
	R: ImageData,
	scale: number,
	ink: Ink,
	dark: boolean,
) {
	const { W, H } = p;
	const { width: w, height: h, data } = R;
	data.fill(0);
	const top = -H * 0.08;
	const bottom = H * 1.08;
	const half0 = clamp(W * 0.08, 90, 180);
	const gain = dark ? 1 : 1.1;
	/** Brightness of the band at a point, before the stars. */
	const band = (x: number, y: number) => {
		const v = (bottom - y) / (bottom - top);
		const half = half0 * (1 + 0.45 * Math.exp(-(((v - 0.12) / 0.2) ** 2)));
		const u = (x - spineX(W, v)) / half;
		if (u * u > 9) return null;
		const glow =
			Math.exp(-u * u * 1.5) * (0.55 + 0.45 * fbm(x * 0.005, y * 0.005, 3, 4));
		const clouds =
			smooth(0.46, 0.78, fbm(x * 0.016, y * 0.016, 41, 5)) *
			Math.exp(-u * u * 1.1);
		const bulge = Math.exp(-(((v - 0.1) / 0.16) ** 2)) * Math.exp(-u * u * 0.8);
		// The dust lane meanders just off the spine and frays into filaments.
		const off = 0.12 + 0.5 * (fbm(v * 2.4, 3.1, 7, 3) - 0.5);
		const lw = 0.16 + 0.12 * fbm(v * 4, 8.2, 9, 2);
		const ul = (u - off) / lw;
		const lane =
			Math.exp(-ul * ul) *
			(0.55 + 0.45 * smooth(0.35, 0.65, fbm(x * 0.03, y * 0.03, 13, 4)));
		const light =
			(0.2 * glow + 0.3 * clouds + 0.32 * bulge) * (1 - 0.88 * lane);
		return {
			light,
			warm: clamp(bulge * 1.4 + clouds * 0.3, 0, 1),
			dens: glow + clouds,
		};
	};
	for (let j = 0; j < h; j++) {
		const y = (j + 0.5) / scale;
		for (let i = 0; i < w; i++) {
			const x = (i + 0.5) / scale;
			const b = band(x, y);
			if (!b || b.light < 0.01) continue;
			const col = mixRgb(ink.arm, ink.core, b.warm);
			blend(data, (j * w + i) * 4, col[0], col[1], col[2], b.light * gain);
		}
	}
	// Stars: crowded in the band, a few bright ones elsewhere with a glow.
	const dot = (x: number, y: number, col: Rgb, a: number) => {
		const ix = Math.floor(x * scale);
		const iy = Math.floor(y * scale);
		if (ix < 0 || iy < 0 || ix >= w || iy >= h) return;
		blend(data, (iy * w + ix) * 4, col[0], col[1], col[2], a);
	};
	const count = Math.round((W * H) / 90);
	for (let n = 0; n < count; n++) {
		const x = hash(n, 501) * W;
		const y = hash(n, 502) * H;
		const b = band(x, y);
		const d = b ? b.dens : 0;
		if (hash(n, 503) > 0.9 * smooth(0.15, 1.2, d)) continue;
		const col = ink.star[Math.floor(hash(n, 505) * ink.star.length)];
		dot(x, y, col, (0.25 + 0.6 * hash(n, 504) ** 3) * gain);
	}
	// A few bright stars in the open sky, each with a soft halo.
	for (let n = 0; n < 34; n++) {
		const x = hash(n, 601) * W;
		const y = hash(n, 602) * H;
		const col = ink.star[Math.floor(hash(n, 603) * ink.star.length)];
		const r = 1.5 + 2.5 * hash(n, 604) ** 2;
		for (let oy = -r * 2; oy <= r * 2; oy += 1 / scale)
			for (let ox = -r * 2; ox <= r * 2; ox += 1 / scale) {
				const q = (ox * ox + oy * oy) / (r * r);
				const a = (q < 0.08 ? 0.95 : 0.35 * Math.exp(-q * 1.6)) * gain;
				if (a > 0.02) dot(x + ox, y + oy, col, a);
			}
	}
}

/* -------------------------------------------------------------- meteors */

type Meteor = {
	/** Start, unit heading, speed px/s, path length, birth time. */
	x: number;
	y: number;
	dx: number;
	dy: number;
	v: number;
	len: number;
	t0: number;
	/** Peak brightness 0..1, width px, colour index, train seconds. */
	peak: number;
	width: number;
	col: number;
	train: number;
	tail: number;
	breakup: boolean;
	seed: number;
};

/** Slow activity: flurries and lulls, never a fixed beat. */
const activity = (t: number) =>
	0.25 +
	0.75 *
		smooth(
			0.35,
			0.9,
			0.5 + 0.3 * Math.sin(t * 0.21 + 1) + 0.25 * Math.sin(t * 0.53 + 2.4),
		);

function launch(
	p: Plan,
	t0: number,
	seed: number,
	kind: "streak" | "bright" | "grazer" | "fireball",
): Meteor {
	const { W, H, radiant } = p;
	const r = (j: number) => hash(seed, j);
	// The fan: everything heads down and to the left from the radiant.
	const centre = Math.atan2(H * 0.9 - radiant.y, W * 0.15 - radiant.x);
	const spread = kind === "grazer" ? 0.06 : 0.32;
	const bias = kind === "grazer" ? -0.38 : 0;
	const ang = centre + bias + (r(1) * 2 - 1) * spread;
	const dx = Math.cos(ang);
	const dy = Math.sin(ang);
	// Meteors light up some way out from the radiant, never on it.
	const far = Math.hypot(W, H);
	const d0 =
		kind === "grazer"
			? far * (0.2 + 0.15 * r(2))
			: far * (0.18 + 0.55 * r(2) ** 1.3);
	const base = {
		x: radiant.x + dx * d0,
		y: radiant.y + dy * d0,
		dx,
		dy,
		t0,
		seed,
		breakup: false,
		col: Math.floor(r(9) * 4),
	};
	if (kind === "streak")
		return {
			...base,
			v: 300 + 260 * r(3),
			len: 120 + 300 * r(4) ** 1.4,
			peak: 0.55 + 0.45 * r(5) ** 2,
			width: 1.4 + 1.4 * r(6),
			col: r(9) < 0.7 ? 0 : Math.floor(r(10) * 4),
			train: r(7) < 0.2 ? 0.6 + 0.8 * r(8) : 0,
			tail: 70 + 120 * r(11),
		};
	if (kind === "bright")
		return {
			...base,
			v: 220 + 120 * r(3),
			len: 320 + 360 * r(4),
			peak: 0.85,
			width: 2.2 + 1.4 * r(6),
			col: r(9) < 0.5 ? 1 : 2 + Math.floor(r(10) * 2),
			train: 2.5 + 3 * r(8),
			tail: 160 + 120 * r(11),
		};
	if (kind === "grazer")
		return {
			...base,
			v: 150 + 60 * r(3),
			len: W * (0.55 + 0.25 * r(4)),
			peak: 0.7,
			width: 1.8,
			col: 2,
			train: 2,
			tail: 260,
		};
	return {
		...base,
		v: 190 + 50 * r(3),
		len: Math.min(far * 0.75, 700 + 400 * r(4)),
		peak: 1,
		width: 4,
		col: 1,
		train: 7 + 3 * r(8),
		tail: 320,
		breakup: true,
	};
}

/** Each family fires from its own slot clock, so nothing beats in time. */
function meteorsAt(p: Plan, t: number): Meteor[] {
	const out: Meteor[] = [];
	const look = 11;
	const family = (
		kind: "streak" | "bright" | "grazer" | "fireball",
		slot: number,
		salt: number,
		chance: (s: number) => number,
	) => {
		const k1 = Math.floor(t / slot);
		const k0 = Math.floor((t - look) / slot);
		for (let k = k0; k <= k1; k++) {
			if (hash(k, salt) > chance(k * slot)) continue;
			const t0 = k * slot + hash(k, salt + 1) * slot;
			if (t0 > t) continue;
			const m = launch(p, t0, k * 977 + salt, kind);
			if (t - t0 < m.len / m.v + m.train + 0.6) out.push(m);
		}
	};
	family("streak", 0.32, 11, (s) => 0.9 * activity(s));
	family("streak", 1.3, 13, () => 0.6);
	family("bright", 3.7, 17, (s) => 0.4 + 0.5 * activity(s));
	family("grazer", 17, 19, () => 0.75);
	family("fireball", 37, 23, () => 0.9);
	return out;
}

function drawMeteor(
	c: CanvasRenderingContext2D,
	m: Meteor,
	t: number,
	ink: Ink,
) {
	const age = t - m.t0;
	const life = m.len / m.v;
	const col = ink.streak[m.col];
	const along = Math.min(age, life) * m.v;
	// Brightness: a quick ignition, a swell, a flare for the big ones, burn-out.
	const f = clamp(age / life, 0, 1);
	let glow = m.peak * smooth(0, 0.12, f) * (1 - smooth(0.82, 1, f));
	if (m.breakup) glow *= 1 + 0.8 * Math.exp(-(((f - 0.72) / 0.08) ** 2));

	// The persistent train: ionised air left along the path, twisted by wind.
	if (m.train > 0 && age > 0.05) {
		const fade = 1 - smooth(life * 0.6, life + m.train, age);
		if (fade > 0.01) {
			// It stays where it formed and fades from its oldest end first.
			const ex = m.x + m.dx * along;
			const ey = m.y + m.dy * along;
			const g = c.createLinearGradient(m.x, m.y, ex, ey);
			const tc = mixRgb(col, ink.train, 0.35);
			for (let i = 0; i <= 4; i++) {
				const s = (i / 4) * along;
				const since = age - s / m.v;
				const a =
					0.42 *
					m.peak *
					(1 - smooth(0.05, m.train, since)) *
					smooth(0, 0.15, since);
				g.addColorStop(i / 4, rgba(tc, a));
			}
			c.strokeStyle = g;
			c.lineCap = "round";
			c.lineWidth = m.width * 1.3;
			c.beginPath();
			c.moveTo(m.x, m.y);
			c.lineTo(ex, ey);
			c.stroke();
		}
	}
	if (glow <= 0.01 || age > life) return;
	const hx = m.x + m.dx * along;
	const hy = m.y + m.dy * along;
	const tl = Math.min(along, m.tail);
	const tx = hx - m.dx * tl;
	const ty = hy - m.dy * tl;
	// A soft wake first, then the bright core, both fading toward the tail.
	for (const [wide, k] of [
		[m.width * 2.6, 0.3],
		[m.width * 1.1, 1],
	] as const) {
		const g = c.createLinearGradient(tx, ty, hx, hy);
		g.addColorStop(0, rgba(col, 0));
		g.addColorStop(0.6, rgba(col, glow * 0.6 * k));
		g.addColorStop(1, rgba(col, glow * k));
		c.strokeStyle = g;
		c.lineCap = "round";
		c.lineWidth = wide;
		c.beginPath();
		c.moveTo(tx, ty);
		c.lineTo(hx, hy);
		c.stroke();
	}
	// A hot head inside its own glow.
	const hr = m.width * (m.breakup ? 6 : 3);
	const halo = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
	halo.addColorStop(0, rgba(col, glow * 0.7));
	halo.addColorStop(1, rgba(col, 0));
	c.fillStyle = halo;
	c.beginPath();
	c.arc(hx, hy, hr, 0, TAU);
	c.fill();
	c.fillStyle = rgba(ink.hot, glow * 0.9);
	c.beginPath();
	c.arc(hx, hy, m.width * 1.1 + (m.breakup ? 2 : 0), 0, TAU);
	c.fill();
	if (m.breakup && f > 0.72) {
		// Fragments: the head splits and the pieces slip apart and burn out.
		for (let k = 0; k < 3; k++) {
			const spread = (k - 1) * 0.05 + (hash(m.seed, k) - 0.5) * 0.03;
			const lag = (f - 0.72) * m.len * (0.04 + 0.05 * k);
			const fx = hx - m.dx * lag - m.dy * spread * (f - 0.72) * m.len;
			const fy = hy - m.dy * lag + m.dx * spread * (f - 0.72) * m.len;
			c.fillStyle = rgba(col, glow * 0.8);
			c.beginPath();
			c.arc(fx, fy, 1.6, 0, TAU);
			c.fill();
		}
	}
}

/* ---------------------------------------------------------------- scene */

export const nocturne: Scene = ({ dither: c }, { t, W, H, dark }) => {
	const key = `${W}|${H}`;
	if (key !== memoKey || !memo) {
		memoKey = key;
		memo = plan(W, H);
	}
	const p = memo;
	const theme = dark ? "dark" : "light";
	const ink = INKS[theme];
	const scale = c.getTransform().a;
	const w = c.canvas.width;
	const h = c.canvas.height;
	const skyKey = `${theme}|${w}|${h}|${scale}`;
	if (skyKey !== p.skyKey) {
		p.skyKey = skyKey;
		p.sky = new ImageData(w, h);
		paintSky(p, p.sky, scale, ink, dark);
	}
	c.putImageData(p.sky as ImageData, 0, 0);
	for (const m of meteorsAt(p, t)) drawMeteor(c, m, t, ink);
};
