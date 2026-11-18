import type { Scene } from "../engine";
import { lanesFor } from "./margins";

/**
 * DAY AND NIGHT VINE: one Ipomoea twining up a bamboo cane in the gutter,
 * following the wall clock. Morning glories open at dawn and furl by early
 * afternoon; moonflowers unfurl at dusk and close by morning. Each flower keeps
 * its own offset of tens of minutes, so near the turn of the day the vine is
 * mid-change and a visitor can watch petals untwist.
 *
 * By day a butterfly works the glories; from dusk a hawk moth hovers at the
 * moonflowers, proboscis in the tube, and darts between them. Everything that
 * moves is a pure function of t and the wall clock; pollinators read the same
 * displaced flower positions the petals are drawn at, so they land where the
 * flower actually is.
 *
 * Forms are kept simple on purpose: one silhouette per flower, soft tonal
 * shading, the throat star as a tonal shift. The moth is a soft body with a
 * blurred wing haze and a fine proboscis; the dither does the rest.
 */

type C = CanvasRenderingContext2D;
type Rgb = [number, number, number];
const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const q = clamp((v - a) / (b - a), 0, 1);
	return q * q * (3 - 2 * q);
};
const mix = (a: number, b: number, q: number) => a + (b - a) * q;
const hash = (n: number) => {
	const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return v - Math.floor(v);
};
const wrapPi = (d: number) => {
	let v = d % TAU;
	if (v > Math.PI) v -= TAU;
	if (v < -Math.PI) v += TAU;
	return v;
};
const rgba = (c: Rgb, a = 1) =>
	`rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
const mixC = (a: Rgb, b: Rgb, k: number): Rgb => [
	mix(a[0], b[0], k),
	mix(a[1], b[1], k),
	mix(a[2], b[2], k),
];
const WHITE: Rgb = [255, 255, 255];

/** Thin strokes like cherry: lighter at 1px dots, so lines do not turn to wire. */
let thin = 1;

/* ------------------------------------------------------------------ clock */

const hourOf = (ms: number) => {
	const d = new Date(ms);
	return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

type Life = {
	/** Openness, 0 furled to 1 fully open. */
	o: number;
	/** Fresh flower or bud, and the withered one, each fading on its own. */
	live: number;
	wilt: number;
	/** Bud swelling before its day. */
	s: number;
};

type Sched = { off: number; rd: number; fd: number };

/** Morning glory: opens 6ish, furls by early afternoon (late ones mid-afternoon), withers, falls by midnight. */
function gloryLife(h: number, k: Sched): Life {
	const r0 = 6.05 + k.off * 1.4;
	// About a third are late: shaded flowers that hold open into the
	// afternoon, so the vine is never only green after lunch.
	const f0 = k.off > 0.3 ? 14.6 + (k.off - 0.3) * 4 : 11.9 + k.off * 1.2;
	const o = smooth(r0, r0 + k.rd, h) * (1 - smooth(f0, f0 + k.fd, h));
	const w = smooth(f0 + k.fd, f0 + k.fd + 1.6, h);
	if (h < 12) {
		const a = smooth(0, 0.8, h);
		return {
			o,
			live: a * (1 - w),
			wilt: a * w,
			s: mix(0.55, 1, smooth(0, 5, h)),
		};
	}
	const fade = 1 - smooth(19.5, 23.8, h);
	return { o, live: (1 - w) * fade, wilt: w * fade, s: 1 };
}

/** Moonflower: opens at dusk, open all night, closes at dawn; a new bud swells by day. */
function moonLife(h: number, k: Sched): Life {
	const r0 = 19.0 + k.off * 1.2;
	const f0 = 5.8 + k.off * 1.4;
	if (h < 15) {
		const o = 1 - smooth(f0, f0 + k.fd, h);
		const w = smooth(f0 + k.fd, f0 + k.fd + 1.6, h);
		if (h < 11) return { o, live: 1 - w, wilt: w, s: 1 };
		return {
			o: 0,
			live: smooth(11, 15, h),
			wilt: 1 - smooth(11, 15, h),
			s: mix(0.55, 1, smooth(11, 18, h)),
		};
	}
	return {
		o: smooth(r0, r0 + k.rd, h),
		live: 1,
		wilt: 0,
		s: mix(0.55, 1, smooth(11, 18, h)),
	};
}

/* ---------------------------------------------------------------- palette */

type Pal = {
	rim: Rgb;
	mid: Rgb;
	throat: Rgb;
	shade: Rgb;
	band: Rgb;
	bandA: number;
	shadeA: number;
	ringA: number;
	/** Rim lobing, 0 round to 1 pointed. */
	point: number;
};

const GLORY: Pal[] = [
	{
		rim: [82, 108, 208],
		mid: [120, 148, 228],
		throat: [232, 234, 252],
		shade: [46, 58, 150],
		band: [246, 246, 255],
		bandA: 0.62,
		shadeA: 0.2,
		ringA: 0.24,
		point: 0,
	},
	{
		rim: [118, 82, 192],
		mid: [152, 122, 218],
		throat: [240, 230, 252],
		shade: [66, 42, 138],
		band: [250, 244, 255],
		bandA: 0.6,
		shadeA: 0.2,
		ringA: 0.24,
		point: 0,
	},
	{
		rim: [92, 136, 214],
		mid: [138, 176, 234],
		throat: [236, 244, 252],
		shade: [48, 76, 160],
		band: [248, 250, 255],
		bandA: 0.62,
		shadeA: 0.2,
		ringA: 0.22,
		point: 0,
	},
];
const GLORY_WILT: Pal = {
	rim: [150, 100, 148],
	mid: [178, 134, 164],
	throat: [206, 178, 190],
	shade: [92, 60, 100],
	band: [214, 190, 200],
	bandA: 0.2,
	shadeA: 0.25,
	ringA: 0.2,
	point: 0,
};
const MOON: Pal = {
	rim: [226, 226, 238],
	mid: [248, 245, 234],
	throat: [220, 238, 204],
	shade: [126, 144, 188],
	band: [176, 214, 160],
	bandA: 0.5,
	shadeA: 0.15,
	ringA: 0.2,
	point: 1,
};
const MOON_WILT: Pal = {
	rim: [204, 194, 178],
	mid: [230, 222, 206],
	throat: [214, 204, 168],
	shade: [118, 100, 84],
	band: [196, 184, 150],
	bandA: 0.2,
	shadeA: 0.28,
	ringA: 0.24,
	point: 0.5,
};

/** Dots print lighter on dark paper, so a dye there needs more light in it. */
function themed(p: Pal, dark: boolean): Pal {
	if (!dark) return p;
	return {
		...p,
		rim: mixC(p.rim, WHITE, 0.3),
		mid: mixC(p.mid, WHITE, 0.3),
		throat: mixC(p.throat, WHITE, 0.2),
		shade: mixC(p.shade, WHITE, 0.2),
	};
}

/* ----------------------------------------------------------------- stamps */

const stamps = new Map<string, HTMLCanvasElement>();
function stamp(
	key: string,
	half: number,
	pixel: number,
	paint: (g: C) => void,
): HTMLCanvasElement {
	const id = `${key}|${Math.round(pixel * 20)}|${Math.round(thin * 10)}`;
	let cv = stamps.get(id);
	if (cv) return cv;
	if (stamps.size > 320) stamps.clear();
	cv = document.createElement("canvas");
	const n = Math.max(2, Math.ceil(half * 2 * pixel));
	cv.width = cv.height = n;
	const g = cv.getContext("2d");
	if (g) {
		g.translate(n / 2, n / 2);
		g.scale(n / (half * 2), n / (half * 2));
		paint(g);
	}
	stamps.set(id, cv);
	return cv;
}

/**
 * The five-lobed funnel seen from the front. Openness untwists it: a furled
 * flower is a small pinwheel whose pleats spiral to the centre; opening turns
 * the pleats straight and swings the rim out. Shading is tonal: a pale star
 * down each pleat, one lit and one shaded half, a darker ring at the rim.
 */
function corolla(g: C, R: number, o: number, pal: Pal) {
	const rr = R * (0.3 + 0.7 * o ** 0.85);
	const tw = (1 - o) ** 1.15 * 3.1;
	const off = (rho: number) => tw * (1 - 0.55 * rho);
	const e = 0.93 - 0.07 * pal.point;
	const N = 7;
	const M = 6;
	const secW = TAU / 5;
	const sector = (k: number, f0: number, f1: number) => {
		const base = k * secW - secW / 2;
		const p = new Path2D();
		for (let j = 0; j <= N; j++) {
			const rho = j / N;
			const a = base + f0 * secW + off(rho);
			const x = Math.cos(a) * rr * rho * e;
			const y = Math.sin(a) * rr * rho * e;
			if (j) p.lineTo(x, y);
			else p.moveTo(x, y);
		}
		for (let j = 1; j <= M; j++) {
			const f = f0 + ((f1 - f0) * j) / M;
			const a = base + f * secW + off(1);
			const lobe = Math.sin(Math.PI * f) ** mix(1, 0.6, pal.point);
			const r = rr * (e + (1 - e) * lobe);
			p.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		for (let j = N - 1; j >= 0; j--) {
			const rho = j / N;
			const a = base + f1 * secW + off(rho);
			p.lineTo(Math.cos(a) * rr * rho * e, Math.sin(a) * rr * rho * e);
		}
		p.closePath();
		return p;
	};
	const body = g.createRadialGradient(0, 0, 0, 0, 0, rr);
	body.addColorStop(0, rgba(pal.throat));
	body.addColorStop(0.2, rgba(mixC(pal.throat, pal.mid, 0.4)));
	body.addColorStop(0.5, rgba(pal.mid));
	body.addColorStop(1, rgba(pal.rim));
	const ring = g.createRadialGradient(0, 0, rr * 0.55, 0, 0, rr);
	ring.addColorStop(0, rgba(pal.shade, 0));
	ring.addColorStop(1, rgba(pal.shade, pal.ringA));
	const star = g.createRadialGradient(0, 0, 0, 0, 0, rr);
	star.addColorStop(0, rgba(pal.band, pal.bandA));
	star.addColorStop(0.6, rgba(pal.band, pal.bandA * 0.7));
	star.addColorStop(1, rgba(pal.band, 0));
	// A cool shade toward the lower right across the whole flower.
	const lit = g.createLinearGradient(-rr * 0.8, -rr * 0.8, rr * 0.8, rr * 0.8);
	lit.addColorStop(0.35, rgba(pal.shade, 0));
	lit.addColorStop(1, rgba(pal.shade, pal.ringA * 1.2));
	for (let k = 0; k < 5; k++) {
		g.fillStyle = body;
		g.fill(sector(k, 0, 1));
		g.fillStyle = ring;
		g.fill(sector(k, 0, 1));
		g.fillStyle = rgba(pal.shade, pal.shadeA);
		g.fill(sector(k, 0.5, 1));
		g.fillStyle = lit;
		g.fill(sector(k, 0, 1));
		g.fillStyle = star;
		g.fill(sector(k, 0.4, 0.6));
	}
	// A hairline fold between pleats, kept faint: it reads as a tone, not a line.
	g.strokeStyle = rgba(pal.shade, 0.3);
	g.lineWidth = 0.8 * thin;
	for (let k = 0; k < 5; k++) {
		const a0 = k * secW - secW / 2;
		g.beginPath();
		for (let j = 1; j <= N; j++) {
			const rho = j / N;
			const a = a0 + off(rho);
			const x = Math.cos(a) * rr * rho * e;
			const y = Math.sin(a) * rr * rho * e;
			if (j === 1) g.moveTo(x, y);
			else g.lineTo(x, y);
		}
		g.stroke();
	}
	const eye = g.createRadialGradient(0, 0, 0, 0, 0, rr * 0.16);
	eye.addColorStop(0, rgba(mixC(pal.throat, WHITE, 0.5), 0.95));
	eye.addColorStop(1, rgba(pal.throat, 0));
	g.fillStyle = eye;
	g.beginPath();
	g.arc(0, 0, rr * 0.16, 0, TAU);
	g.fill();
}

/** Heart-shaped blade, tip along +x, notch at the origin. One fold, a few veins. */
function heartPath(L: number, w: number) {
	const p = new Path2D();
	p.moveTo(L, 0);
	p.bezierCurveTo(
		L * 0.72,
		-w * 0.52,
		L * 0.28,
		-w * 0.72,
		-L * 0.1,
		-w * 0.42,
	);
	p.bezierCurveTo(-L * 0.2, -w * 0.22, -L * 0.05, -w * 0.06, 0, 0);
	p.bezierCurveTo(-L * 0.05, w * 0.06, -L * 0.2, w * 0.22, -L * 0.1, w * 0.42);
	p.bezierCurveTo(L * 0.28, w * 0.72, L * 0.72, w * 0.52, L, 0);
	p.closePath();
	return p;
}
function paintLeaf(g: C, L: number, dark: boolean) {
	const w = L * 0.62;
	const lit: Rgb = dark ? [150, 184, 124] : [128, 164, 98];
	const low: Rgb = dark ? [118, 150, 100] : [92, 126, 78];
	const heart = heartPath(L, w);
	const grad = g.createLinearGradient(0, -w, 0, w);
	grad.addColorStop(0, rgba(lit));
	grad.addColorStop(1, rgba(low));
	g.fillStyle = grad;
	g.fill(heart);
	const tipGlow = g.createRadialGradient(
		L * 0.75,
		-w * 0.15,
		0,
		L * 0.75,
		-w * 0.15,
		L * 0.5,
	);
	tipGlow.addColorStop(0, rgba(mixC(lit, WHITE, 0.3), 0.4));
	tipGlow.addColorStop(1, rgba(lit, 0));
	g.fillStyle = tipGlow;
	g.fill(heart);
	g.save();
	g.clip(heart);
	g.strokeStyle = rgba(mixC(low, dark ? WHITE : [40, 60, 40], 0.4), 0.55);
	g.lineWidth = 0.9 * thin;
	g.beginPath();
	g.moveTo(-L * 0.02, 0);
	g.lineTo(L * 0.96, 0);
	for (const s of [-1, 1])
		for (const v of [0.18, 0.42, 0.66]) {
			g.moveTo(L * v, 0);
			g.quadraticCurveTo(
				L * (v + 0.1),
				s * w * 0.2,
				L * (v + 0.2),
				s * w * 0.36,
			);
		}
	g.stroke();
	g.restore();
}

/* ----------------------------------------------------------------- layout */

type Flower = {
	sp: "g" | "m";
	u: number;
	side: number;
	reach: number;
	drop: number;
	ph: number;
	R: number;
	sq: number;
	back: number;
	spin: number;
	variant: number;
	sched: Sched;
	bud: boolean;
	/** Whether this flower's withered form shows at all; most fall unseen. */
	keep: boolean;
};
type LeafSpec = {
	u: number;
	side: number;
	len: number;
	pl: number;
	ph: number;
	drop: number;
	jitter: number;
	/** Foreshortening: 1 flat to us, small is edge-on. */
	fs: number;
};
type Vine = {
	cx: number;
	yb: number;
	yt: number;
	lean: number;
	bow: number;
	pitch: number;
	hph: number;
	helixR: number;
	unit: number;
	amp: number;
	flowers: Flower[];
	leaves: LeafSpec[];
	seed: number;
	facing: number;
};

const vines = new Map<string, Vine>();
function buildVine(
	cx: number,
	yb: number,
	yt: number,
	unit: number,
	cap: number,
	seed: number,
	facing: number,
): Vine {
	const key = `${Math.round(cx)}|${Math.round(yb)}|${Math.round(yt)}|${unit.toFixed(2)}|${Math.round(cap)}|${seed}`;
	const hit = vines.get(key);
	if (hit) return hit;
	if (vines.size > 6) vines.clear();
	const span = yb - yt;
	const flowers: Flower[] = [];
	const leaves: LeafSpec[] = [];
	let kind = hash(seed) > 0.5 ? 1 : 0;
	let lastFlowerY = Number.POSITIVE_INFINITY;
	// Irregular spacing: tight bunches where a spur has branched, long gaps between.
	let u = 0.02;
	let n = 0;
	while (u < 0.985) {
		const bunch = hash(n * 2.3 + seed) < 0.32;
		const gapPx =
			(bunch
				? 22 + 20 * hash(n * 7.1 + seed)
				: 36 + 40 * hash(n * 4.9 + seed)) * unit;
		u += gapPx / span;
		n++;
		if (u > 0.985) break;
		const y = yb - u * span;
		const side = hash(n * 5.3 + seed) > 0.5 ? 1 : -1;
		const young = 1 - 0.55 * u ** 1.5;
		leaves.push({
			u,
			side,
			len: (34 + 26 * hash(n * 3.3 + seed)) * unit * young,
			pl: (5 + 24 * hash(n * 1.7 + seed)) * unit,
			ph: hash(n * 5.1 + seed) * TAU,
			drop: (2 + 20 * hash(n * 2.9 + seed)) * unit,
			jitter: (hash(n * 8.8 + seed) - 0.5) * 1.1,
			fs:
				hash(n * 6.2 + seed) < 0.22
					? 0.28 + 0.2 * hash(n + seed)
					: 0.72 + 0.28 * hash(n * 9.9 + seed),
		});
		const roomed = y < yb - 140 && y > yt + 4 * unit;
		const chance = bunch ? 0.95 : 0.72;
		if (!roomed || hash(n * 9.7 + seed * 3) > chance) continue;
		if (Math.abs(lastFlowerY - y) < 40 * unit) continue;
		lastFlowerY = y;
		kind = 1 - kind;
		const sp: "g" | "m" = kind ? "m" : "g";
		const fside = hash(n * 6.7 + seed * 5) > 0.5 ? 1 : -1;
		const r0 = hash(n * 4.4 + seed * 7);
		const R =
			(sp === "m" ? 44 + 12 * r0 : 33 + 9 * r0) * unit * (0.82 + 0.3 * young);
		const tl = R * (sp === "m" ? 0.6 : 0.4);
		const reach = Math.min(
			(10 + 16 * hash(n * 6.1 + seed)) * unit,
			Math.max(4 * unit, cap - R - tl),
		);
		const bud = hash(n * 2.2 + seed * 9) > 0.86;
		const view = hash(n * 1.9 + seed * 4);
		// Face-on, three-quarter, or in profile as a trumpet.
		const sq =
			view < 0.4
				? 0.88 + 0.1 * r0
				: view < 0.75
					? 0.62 + 0.14 * r0
					: 0.38 + 0.12 * r0;
		flowers.push({
			sp,
			u,
			side: fside,
			reach,
			drop: (4 + 18 * hash(n * 8.3 + seed)) * unit,
			ph: hash(n * 7.7 + seed) * TAU,
			R: bud ? R * 0.5 : R,
			sq,
			back: (fside < 0 ? 0 : Math.PI) + (hash(n * 2.7 + seed) - 0.5) * 2.2,
			spin: hash(n * 3.1 + seed) * TAU,
			variant: Math.floor(hash(n * 1.3 + seed) * 3),
			sched: {
				off: hash(n * 5.9 + seed * 2) - 0.35,
				rd: 0.22 + 0.14 * hash(n * 6.6 + seed),
				fd: 0.24 + 0.14 * hash(n * 4.7 + seed),
			},
			bud,
			keep: hash(n * 11.1 + seed) > 0.55,
		});
	}
	const v: Vine = {
		cx,
		yb,
		yt,
		lean: -facing * 22 * unit,
		bow: facing * 12 * unit,
		pitch: 130 * unit,
		hph: hash(seed) * TAU,
		helixR: 6 * unit,
		unit,
		amp: 7 * unit,
		flowers,
		leaves,
		seed,
		facing,
	};
	vines.set(key, v);
	return v;
}

/* ------------------------------------------------------------------ wind */

const gust = (t: number) =>
	0.78 + 0.22 * Math.sin(t * 0.083 + 1) + 0.1 * Math.sin(t * 0.21);
const sway = (t: number, u: number, ph: number) =>
	gust(t) *
	(0.65 * Math.sin(t * 0.42 + u * 2.4 + ph) +
		0.35 * Math.sin(t * 0.77 + u * 4.1 + ph * 2.1));

/** The cane's x at a height fraction: a lean with a gentle bow. */
const caneX = (V: Vine, u: number) =>
	V.cx + V.lean * u + V.bow * Math.sin(Math.PI * u);

/** Point on the twining stem: x, y and front/back depth. */
function vinePt(V: Vine, u: number, t: number): [number, number, number] {
	const y = V.yb - u * (V.yb - V.yt);
	const d = V.yb - y;
	const th =
		(TAU * d) / V.pitch + V.hph + 0.9 * Math.sin(d / (95 * V.unit) + V.hph);
	const r = V.helixR * (1 + 0.5 * Math.sin(u * 9 + V.hph));
	const x =
		caneX(V, u) + r * Math.sin(th) + V.amp * u ** 1.3 * sway(t, u, V.hph);
	return [x, y, Math.cos(th)];
}

type FPos = {
	x: number;
	y: number;
	cx: number;
	cy: number;
	nx: number;
	ny: number;
	life: Life;
};

function lifeOf(f: Flower, h: number): Life {
	if (f.bud) return { o: 0, live: 1, wilt: 0, s: 1 };
	return f.sp === "g" ? gloryLife(h, f.sched) : moonLife(h, f.sched);
}

function flowerAt(V: Vine, f: Flower, t: number, h: number): FPos {
	const [nx, ny] = vinePt(V, f.u, t);
	const a = 3.5 * V.unit * gust(t);
	const s1 = Math.sin(t * 0.55 + f.ph);
	const s2 = Math.sin(t * 0.93 + f.ph * 2);
	const s3 = Math.sin(t * 0.7 + f.ph + 1);
	const cx = nx + f.side * f.reach + a * (0.6 * s1 + 0.3 * s2);
	const cy = ny + f.drop + a * 0.4 * s3;
	const life = lifeOf(f, h);
	const tl = f.R * (f.sp === "m" ? 0.62 : 0.42);
	const open = Math.sqrt(1 - f.sq * f.sq);
	const closed = 1 - life.o;
	const len =
		(tl * open + closed * f.R * (f.sp === "m" ? 0.55 : 0.42)) * life.s;
	return {
		x: cx - Math.cos(f.back) * len,
		y: cy - Math.sin(f.back) * len,
		cx,
		cy,
		nx,
		ny,
		life,
	};
}

/* --------------------------------------------------------------- the vine */

type Ink = {
	stem: Rgb;
	stemHi: Rgb;
	cane: Rgb;
	caneShade: Rgb;
	sepal: Rgb;
};
const INK: Record<"light" | "dark", Ink> = {
	light: {
		stem: [92, 128, 84],
		stemHi: [150, 182, 120],
		cane: [196, 170, 116],
		caneShade: [140, 116, 78],
		sepal: [120, 156, 96],
	},
	dark: {
		stem: [142, 176, 120],
		stemHi: [196, 220, 160],
		cane: [214, 190, 140],
		caneShade: [168, 144, 104],
		sepal: [160, 192, 130],
	},
};

function strokeVine(c: C, V: Vine, t: number, ink: Ink, front: boolean) {
	const N = Math.ceil((V.yb - V.yt) / 5);
	c.lineCap = "round";
	c.lineJoin = "round";
	for (const [pass, col, alpha] of [
		[0, ink.stem, 1],
		[1, ink.stemHi, 0.55],
	] as const) {
		c.strokeStyle = rgba(col, alpha);
		let prev = vinePt(V, 0, t);
		for (let i = 1; i <= N; i++) {
			const p = vinePt(V, i / N, t);
			if ((prev[2] + p[2]) / 2 > 0 === front) {
				const w = V.unit * (3.0 - 1.5 * (i / N));
				c.lineWidth = pass ? w * 0.36 : w;
				c.beginPath();
				c.moveTo(prev[0] - pass * 0.6, prev[1] - pass * 0.6);
				c.lineTo(p[0] - pass * 0.6, p[1] - pass * 0.6);
				c.stroke();
			}
			prev = p;
		}
	}
}

function drawCane(c: C, V: Vine, ink: Ink) {
	const topU = 1 + (16 * V.unit) / (V.yb - V.yt);
	const w = 3.4 * V.unit;
	const at = (u: number): [number, number] => [
		caneX(V, u),
		V.yb - u * (V.yb - V.yt),
	];
	const path = (dx: number) => {
		c.beginPath();
		for (let i = -1; i <= 24; i++) {
			const [x, y] = at(i < 0 ? -0.02 : (i / 24) * topU);
			if (i < 0) c.moveTo(x + dx, y);
			else c.lineTo(x + dx, y);
		}
		c.stroke();
	};
	c.lineCap = "butt";
	c.lineJoin = "round";
	c.strokeStyle = rgba(ink.caneShade, 0.9);
	c.lineWidth = w;
	path(0);
	c.strokeStyle = rgba(ink.cane, 0.95);
	c.lineWidth = w * 0.55;
	path(-w * 0.15);
	c.strokeStyle = rgba(ink.caneShade, 0.6);
	c.lineWidth = 1.1 * thin;
	for (let y = V.yb - 40 * V.unit; y > V.yt; y -= 96 * V.unit) {
		const [x] = at((V.yb - y) / (V.yb - V.yt));
		c.beginPath();
		c.moveTo(x - w * 0.75, y);
		c.lineTo(x + w * 0.75, y);
		c.stroke();
	}
}

function drawLeaf(
	c: C,
	V: Vine,
	l: LeafSpec,
	t: number,
	ink: Ink,
	dark: boolean,
	pixel: number,
) {
	const [nx, ny] = vinePt(V, l.u, t);
	const s = sway(t, l.u, l.ph);
	const ang0 = Math.atan2(l.drop, l.side * l.pl) + l.jitter * 0.6;
	const ang =
		ang0 + l.side * 0.07 * s * (1 + l.u) + 0.04 * Math.sin(t * 1.3 + l.ph);
	const ex = nx + Math.cos(ang) * l.pl;
	const ey = ny + Math.sin(ang) * l.pl + l.drop * 0.5;
	c.strokeStyle = rgba(ink.stem, 0.9);
	c.lineWidth = 1.5 * V.unit * thin * 1.6;
	c.lineCap = "round";
	c.beginPath();
	c.moveTo(nx, ny);
	c.quadraticCurveTo(nx + Math.cos(ang) * l.pl * 0.6, ny - 3 * V.unit, ex, ey);
	c.stroke();
	const L = Math.max(9, Math.round(l.len / 3) * 3);
	const sv = stamp(`leaf|${L}|${dark ? 1 : 0}`, L * 1.25, pixel, (g) =>
		paintLeaf(g, L, dark),
	);
	const bladeAng =
		ang + l.side * 0.18 + l.jitter + 0.06 * Math.sin(t * 0.9 + l.ph);
	c.save();
	c.translate(ex, ey);
	c.rotate(bladeAng + (l.side < 0 ? Math.PI : 0));
	c.scale(1, (l.side < 0 ? -1 : 1) * l.fs);
	c.drawImage(sv, -L * 1.25, -L * 1.25, L * 2.5, L * 2.5);
	c.restore();
}

/* ---------------------------------------------------------------- flowers */

function drawFlower(
	c: C,
	V: Vine,
	f: Flower,
	t: number,
	h: number,
	ink: Ink,
	dark: boolean,
	pixel: number,
) {
	const P = flowerAt(V, f, t, h);
	const L = P.life;
	const wiltA = f.keep ? L.wilt * 0.85 : 0;
	if (L.live < 0.02 && wiltA < 0.02) return;
	// A short curved stalk, drawn first so the flower sits over it.
	c.strokeStyle = rgba(ink.stem, 0.9);
	c.lineWidth = 1.5 * V.unit * thin * 1.5;
	c.lineCap = "round";
	c.beginPath();
	c.moveTo(P.nx, P.ny);
	c.quadraticCurveTo(
		P.nx + f.side * f.reach * 0.2,
		P.ny + f.drop * 0.9 + 3 * V.unit,
		P.cx,
		P.cy,
	);
	c.stroke();

	const R = Math.round(f.R / 2) * 2;
	const layers: [boolean, number][] = [];
	if (wiltA > 0.02) layers.push([true, wiltA]);
	if (L.live > 0.02) layers.push([false, L.live]);
	for (const [wilt, alpha] of layers) {
		const o = wilt ? 0.06 : Math.round(L.o * 18) / 18;
		const sc = wilt ? 0.68 : L.s;
		const pal = themed(
			wilt
				? f.sp === "g"
					? GLORY_WILT
					: MOON_WILT
				: f.sp === "g"
					? GLORY[f.variant]
					: MOON,
			dark,
		);
		// A withered flower hangs straight down, limp; a live one follows its stalk.
		let bx = Math.cos(f.back);
		let by = Math.sin(f.back);
		let cx = P.x;
		let cy = P.y;
		if (wilt) {
			const nxv = bx * 0.15;
			const nyv = by * 0.15 - 0.85;
			const nl = Math.hypot(nxv, nyv) || 1;
			bx = nxv / nl;
			by = nyv / nl;
			const ln = R * 0.5 * sc;
			cx = P.cx - bx * ln;
			cy = P.cy - by * ln + Math.sin(t * 0.8 + f.ph) * 1.2;
		}
		const ang = Math.atan2(by, bx);
		c.save();
		c.globalAlpha = alpha;
		const tw0 = R * 0.05;
		const tw1 = R * (f.sp === "m" ? 0.1 : 0.13) * (1 + (1 - o) * 0.5) * sc;
		const px = -by;
		const py = bx;
		const tube = new Path2D();
		tube.moveTo(P.cx + px * tw0, P.cy + py * tw0);
		tube.lineTo(cx + px * tw1, cy + py * tw1);
		tube.lineTo(cx - px * tw1, cy - py * tw1);
		tube.lineTo(P.cx - px * tw0, P.cy - py * tw0);
		tube.closePath();
		const tg = c.createLinearGradient(P.cx, P.cy, cx, cy);
		tg.addColorStop(
			0,
			rgba(wilt ? pal.rim : mixC(pal.throat, ink.sepal, 0.35)),
		);
		tg.addColorStop(1, rgba(wilt ? pal.mid : mixC(pal.throat, pal.mid, 0.5)));
		c.fillStyle = tg;
		c.fill(tube);
		c.fillStyle = rgba(ink.sepal, 0.95);
		c.beginPath();
		c.ellipse(P.cx, P.cy, R * 0.1 * sc, R * 0.065 * sc, ang, 0, TAU);
		c.fill();

		const key = `${f.sp}${wilt ? "w" : f.variant}|${R}|${Math.round(o * 18)}|${dark ? 1 : 0}`;
		const half = R * 1.08;
		const sv = stamp(key, half, pixel, (g) => corolla(g, R, o, pal));
		c.translate(cx, cy);
		c.rotate(ang);
		c.scale(wilt ? 1 : mix(1, f.sq, o), 1);
		c.rotate(f.spin);
		c.scale(sc, sc);
		c.drawImage(sv, -half, -half, half * 2, half * 2);
		c.restore();
	}
}

/* ------------------------------------------------------------ pollinators */

function candidates(V: Vine, sp: "g" | "m", h: number) {
	const out: Flower[] = [];
	let best = 0;
	for (const f of V.flowers) {
		if (f.sp !== sp || f.bud) continue;
		const L = lifeOf(f, h);
		const o = L.o * L.live;
		best = Math.max(best, o);
		if (o > 0.6) out.push(f);
	}
	return { out, best };
}

type Visit = { f: Flower | null; ang: number; dx: number; dy: number };

function visitAt(
	V: Vine,
	sp: "g" | "m",
	v: number,
	vStart: number,
	t: number,
	now: number,
	tag: number,
): Visit {
	const h = hourOf(now - (t - vStart) * 1000);
	const { out } = candidates(V, sp, h);
	if (!out.length) return { f: null, ang: 0, dx: 0, dy: 0 };
	const r = hash(v * 3.7 + tag);
	const f = out[(((v + tag) % out.length) + out.length) % out.length];
	if (sp === "m") {
		// Three-quarter hover: heading toward the flower, from the gutter's outer side
		// when the flower is on the page edge of the vine.
		const right = V.facing < 0;
		const ang = right ? -0.5 + 0.45 * r : Math.PI + 0.5 - 0.45 * r;
		const pl = f.R * 0.55 + 14 * V.unit;
		return { f, ang, dx: -Math.cos(ang) * pl, dy: -Math.sin(ang) * pl };
	}
	return {
		f,
		ang: (r - 0.5) * 0.7,
		dx: (r - 0.5) * f.R * 0.5,
		dy: -f.R * (0.12 + 0.2 * hash(v)),
	};
}

const ease = (s: number) => s * s * (3 - 2 * s);

type Mover = {
	x: number;
	y: number;
	ang: number;
	s: number;
	tau: number;
	v: Visit;
	presence: number;
	ext: number;
	T: [number, number];
};

type Lim = [number, number] | null;

function route(
	V: Vine,
	sp: "g" | "m",
	t: number,
	now: number,
	D: number,
	dart: number,
	t0: number,
	tag: number,
	lim: Lim,
): Mover | null {
	const h = hourOf(now);
	const { best } = candidates(V, sp, h);
	const presence = smooth(0.4, 0.8, best);
	if (presence < 0.02) return null;
	const v = Math.floor((t + t0) / D);
	const tau = t + t0 - v * D;
	const vs = v * D - t0;
	const cur = visitAt(V, sp, v, vs, t, now, tag);
	const prev = visitAt(V, sp, v - 1, vs - D, t, now, tag);
	if (!cur.f) return null;
	const spot = (vis: Visit): [number, number] => {
		const P = flowerAt(V, vis.f as Flower, t, h);
		const jx = sp === "m" ? 2.2 * Math.sin(t * 1.9 + v) : 0;
		const jy = sp === "m" ? 2.8 * Math.sin(t * 2.6 + v * 2) : 0;
		return [P.x + vis.dx + jx, P.y + vis.dy + jy];
	};
	const T = flowerAt(V, cur.f, t, h);
	const here = spot(cur);
	let x = here[0];
	let y = here[1];
	let ang = cur.ang;
	let s = 1;
	if (prev.f && tau < dart) {
		s = ease(tau / dart);
		const from = spot(prev);
		x = mix(from[0], here[0], s);
		y = mix(from[1], here[1], s);
		const bump = Math.sin(Math.PI * s) * (sp === "m" ? 24 : 22) * V.unit;
		const dxv = here[0] - from[0];
		const dyv = here[1] - from[1];
		const dl = Math.hypot(dxv, dyv) || 1;
		const side = hash(v * 11.3 + tag) > 0.5 ? 1 : -1;
		x += (-dyv / dl) * bump * side;
		y += (dxv / dl) * bump * side;
		ang = prev.ang + wrapPi(cur.ang - prev.ang) * s;
	} else if (!prev.f && tau < dart) {
		s = ease(tau / dart);
		x = mix(V.cx + V.facing * -200 * V.unit, here[0], s);
		y = mix(here[1] - 100 * V.unit, here[1], s);
	}
	// Keep the whole visitor in the gutter, clear of the content column.
	if (lim) {
		const back = (sp === "m" ? 72 : 30) * V.unit;
		const front = (sp === "m" ? 16 : 30) * V.unit;
		const fwd = Math.cos(ang) >= 0;
		const lo = lim[0] + (fwd ? back : front);
		const hi = lim[1] - (fwd ? front : back);
		x = hi > lo ? clamp(x, lo, hi) : (lim[0] + lim[1]) / 2;
	}
	const ext =
		sp === "m"
			? smooth(0.55, 0.95, s) * (1 - smooth(D - 0.35, D - 0.02, tau))
			: 0;
	return { x, y, ang, s, tau, v: cur, presence, ext, T: [T.x, T.y] };
}

/**
 * A hawk moth at three-quarter view: a tapered spindle, and on each side one
 * narrow swept-back wing, shown as the translucent blur of its beat.
 */
function drawMoth(c: C, m: Mover, unit: number, dark: boolean, t: number) {
	const body: Rgb = dark ? [214, 192, 164] : [128, 98, 74];
	const hazeC: Rgb = dark ? [226, 208, 184] : [150, 124, 100];
	const band: Rgb = dark ? [246, 232, 208] : [218, 196, 166];
	const k = unit * 1.5;
	const sy = clamp(Math.cos(m.ang) * 3, -1, 1) || 0.01;
	const hx = m.x;
	const hy = m.y;
	const ca = Math.cos(m.ang);
	const sa = Math.sin(m.ang);
	const bob = Math.sin(t * 3.1) * 1.2 * k;
	c.save();
	c.globalAlpha = m.presence;
	// Proboscis: a fine line from the head to the throat.
	const tipX = mix(hx + ca * 12 * k, m.T[0], m.ext);
	const tipY = mix(hy + sa * 12 * k, m.T[1], m.ext);
	c.strokeStyle = rgba(body, 0.9);
	c.lineWidth = 1.1 * thin;
	c.lineCap = "round";
	c.beginPath();
	c.moveTo(hx + ca * 2 * k, hy + sa * 2 * k);
	c.lineTo(tipX, tipY);
	c.stroke();
	c.translate(hx, hy + bob);
	c.rotate(m.ang);
	c.scale(1, sy);
	c.rotate(-0.3);
	c.translate(-10 * k, 0);
	// A hawk moth in hover: long, narrow, pointed forewings beating too fast to
	// see, so each is a few overlapping ghost positions, plus a short stout body.
	const beat = t * 38;
	const wing = (a: number, alpha: number) => {
		c.save();
		c.translate(1 * k, -2.5 * k);
		c.rotate(a);
		c.fillStyle = rgba(hazeC, alpha);
		c.beginPath();
		c.moveTo(0, -1.5 * k);
		c.bezierCurveTo(6 * k, -4 * k, 18 * k, -5 * k, 27 * k, -2.5 * k);
		c.bezierCurveTo(20 * k, 1 * k, 9 * k, 3.5 * k, 0, 2.5 * k);
		c.closePath();
		c.fill();
		c.restore();
	};
	// The beat as one soft wedge of blur, with the wing caught at one moment
	// inside it: reads as speed, not as a fan of blades.
	const sweep = (a0: number, a1: number, r: number, alpha: number) => {
		const g = c.createRadialGradient(k, -2.5 * k, 2 * k, k, -2.5 * k, r);
		g.addColorStop(0, rgba(hazeC, alpha));
		g.addColorStop(1, rgba(hazeC, 0));
		c.fillStyle = g;
		c.beginPath();
		c.moveTo(k, -2.5 * k);
		c.arc(k, -2.5 * k, r, a0, a1);
		c.closePath();
		c.fill();
	};
	sweep(-2.75, -1.35, 30 * k, 0.22);
	const sw = Math.sin(beat);
	wing(-2.05 + 0.5 * sw, 0.42);
	// Stout spindle: thorax, then an abdomen tapering to a blunt tip.
	const bp = new Path2D();
	bp.moveTo(8 * k, -1 * k);
	bp.bezierCurveTo(7 * k, -5.5 * k, -3 * k, -6 * k, -10 * k, -4 * k);
	bp.bezierCurveTo(-17 * k, -2 * k, -21 * k, 0.5 * k, -23 * k, 2.5 * k);
	bp.bezierCurveTo(-20 * k, 5.5 * k, -12 * k, 6 * k, -6 * k, 5 * k);
	bp.bezierCurveTo(1 * k, 5 * k, 7 * k, 3.5 * k, 8 * k, -1 * k);
	bp.closePath();
	const bg = c.createLinearGradient(0, -5 * k, 0, 5 * k);
	bg.addColorStop(0, rgba(mixC(body, band, 0.3)));
	bg.addColorStop(1, rgba(body));
	c.fillStyle = bg;
	c.fill(bp);
	c.save();
	c.clip(bp);
	c.strokeStyle = rgba(band, 0.32);
	c.lineWidth = 1.2 * k;
	for (const x of [-11, -15.5, -20]) {
		c.beginPath();
		c.moveTo(x * k, -7 * k);
		c.quadraticCurveTo((x - 1.5) * k, 0, (x + 1) * k, 8 * k);
		c.stroke();
	}
	c.restore();
	c.fillStyle = rgba(body);
	c.beginPath();
	c.arc(8.5 * k, -1 * k, 2.6 * k, 0, TAU);
	c.fill();
	c.restore();
}

function drawButterfly(
	c: C,
	m: Mover,
	unit: number,
	dark: boolean,
	t: number,
	flying: boolean,
) {
	const k = unit * 0.8;
	const open = flying
		? 0.28 + 0.72 * Math.abs(Math.sin(t * 7.5 + m.v.ang))
		: 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(t * 1.6 + m.v.dx));
	c.save();
	c.globalAlpha = m.presence;
	c.translate(m.x, m.y);
	c.rotate(flying ? m.ang * 0.4 + Math.sin(t * 2 + m.v.dx) * 0.15 : m.v.ang);
	c.scale(k, k);
	for (const side of [-1, 1]) {
		c.save();
		c.scale(side * open, 1);
		for (const hind of [true, false]) {
			const p = new Path2D();
			p.moveTo(0, 0);
			if (hind) {
				p.bezierCurveTo(23, -3, 39, 17, 24, 26);
				p.bezierCurveTo(20, 32, 13, 24, 11, 28);
				p.bezierCurveTo(5, 24, 2, 13, 0, 0);
			} else {
				p.bezierCurveTo(11, -21, 31, -36, 37, -29);
				p.bezierCurveTo(44, -17, 30, 1, 17, 9);
				p.closePath();
			}
			const g = c.createLinearGradient(0, 0, 36, -20);
			g.addColorStop(0, dark ? "#5a9296" : "#3c666c");
			g.addColorStop(0.45, dark ? "#d99158" : "#b8784c");
			g.addColorStop(0.85, dark ? "#f0c690" : "#dcab72");
			g.addColorStop(1, dark ? "#8a7886" : "#54485a");
			c.fillStyle = g;
			c.fill(p);
		}
		c.restore();
	}
	c.fillStyle = dark ? "#e0c8a6" : "#8a6c52";
	c.beginPath();
	c.ellipse(0, 2, 2.4, 13, 0, 0, TAU);
	c.fill();
	c.restore();
}

/* ------------------------------------------------------------------ scene */

export const dayvine: Scene = (
	{ dither: c },
	{ t, W, H, anchors, dark, now },
) => {
	const frame = anchors.frame ?? anchors.content;
	const L = lanesFor(W, frame);
	const phone = W < 600;
	const scale = c.getTransform().a;
	thin = clamp(1 / scale / 2, 0.5, 1);
	const ink = INK[dark ? "dark" : "light"];
	const h = hourOf(now);
	const size = clamp(W / 1440, 0.85, 1.4);

	type Place = {
		cx: number;
		unit: number;
		cap: number;
		facing: number;
		top: number;
		seed: number;
		lim: Lim;
	};
	const places: Place[] = [];
	if (phone) {
		places.push({
			cx: W - 16,
			unit: 0.52,
			cap: 66,
			facing: -1,
			top: H * 0.1,
			seed: 2,
			lim: null,
		});
	} else if (L.legacy) {
		places.push({
			cx: W - L.x[0] * 0.5 - 40,
			unit: 0.8,
			cap: 90,
			facing: -1,
			top: H * 0.08,
			seed: 2,
			lim: null,
		});
	} else {
		const fr = frame as { x: number; w: number };
		const gl = fr.x;
		const gr = W - fr.x - fr.w;
		if (L.f[1] > 0)
			places.push({
				cx: L.x[1],
				unit: size * Math.max(0.8, L.f[1]),
				cap: Math.min(gr / 2 - 22, 220 * size),
				facing: -1,
				top: H * 0.07,
				seed: 2,
				lim: [fr.x + fr.w + 16, W - 2],
			});
		if (L.f[0] > 0 && gl > 260)
			places.push({
				cx: L.x[0],
				unit: size * Math.max(0.8, L.f[0]) * 0.86,
				cap: Math.min(gl / 2 - 22, 200 * size),
				facing: 1,
				top: H * 0.26,
				seed: 5,
				lim: [2, fr.x - 16],
			});
	}

	c.imageSmoothingEnabled = true;
	const built = places.map((p) =>
		buildVine(p.cx, H + 8, p.top, p.unit, p.cap, p.seed, p.facing),
	);
	for (const V of built) {
		strokeVine(c, V, t, ink, false);
		drawCane(c, V, ink);
		strokeVine(c, V, t, ink, true);
		for (const l of V.leaves) drawLeaf(c, V, l, t, ink, dark, scale);
		const order = [...V.flowers].sort((a, b) => a.u - b.u);
		for (const f of order) drawFlower(c, V, f, t, h, ink, dark, scale);
	}
	built.forEach((V, i) => {
		const tag = i * 17 + 3;
		const lim = places[i].lim;
		const day = route(V, "g", t, now, 10, 2.4, 3.4 + i * 4, tag, lim);
		if (day) drawButterfly(c, day, V.unit, dark, t, day.tau < 2.4);
		const night = route(V, "m", t, now, 8, 0.8, 4 + i * 3, tag + 1, lim);
		if (night) drawMoth(c, night, V.unit, dark, t);
	});

	// The bottom 90px fades into the paper.
	c.save();
	c.globalCompositeOperation = "destination-out";
	const g = c.createLinearGradient(0, H - 90, 0, H);
	g.addColorStop(0, "rgba(0,0,0,0)");
	g.addColorStop(1, "rgba(0,0,0,1)");
	c.fillStyle = g;
	c.fillRect(0, H - 90, W, 90);
	c.restore();
};
