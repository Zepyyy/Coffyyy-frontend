import type { Scene } from "../engine";
import { blade, blend, polyline, profile, type Rgb } from "./raster";

/**
 * A golden weeping willow in October, seen from just outside its curtain.
 *
 * Every whip is a hanging chain: a pendulum whose period grows with the root
 * of its length. Gusts are events that cross the page from the left, and each
 * whip answers its own gust as a damped oscillator. So after a gust has passed,
 * long and short whips ring at different rates, drift out of step and back in,
 * and the curtain keeps moving in slow patterns nobody designed. The lower
 * part of a whip reads the swing a moment late, which is why a whip curves as
 * it turns instead of swinging like a rod.
 *
 * Leaves answer the air directly, not the whip: a gust rolls them over and the
 * glaucous underside comes round, so a wave of silver crosses the gold ahead
 * of the swing that follows.
 *
 * Responses are tables computed from the layout and gusts are a fixed
 * schedule, so a frame is a pure function of t: still frames, backward seeks
 * and resizes all reproduce it. Painting goes straight into the dot lattice
 * (see raster.ts) at 12Hz; the old wood is drawn once per paper.
 */

type Ctx = CanvasRenderingContext2D;
type Frame = { x: number; w: number };

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
function hash(a: number, b = 0) {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const css = (c: Rgb) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

/* ------------------------------------------------------------------ ink */

type Ink = {
	/** Autumn faces: lime-gold, butter, old gold, ochre, russet. */
	leaf: Rgb[];
	/** The glaucous underside, which a gust brings round. */
	under: Rgb;
	/** Midrib: sunk and darker above, raised and paler beneath. */
	rib: Rgb;
	ribUnder: Rgb;
	whip: Rgb;
	bark: string;
	fissure: string;
	/** Light paper: the lit ridge is cut back toward paper. */
	cut: boolean;
	ridge: string;
	/** Tone per depth (back, middle, front). */
	face: [number, number, number];
	back: [number, number, number];
	stem: [number, number, number];
};

const INKS: Record<"light" | "dark", Ink> = {
	light: {
		leaf: [
			[184, 172, 72],
			[220, 178, 66],
			[208, 152, 54],
			[198, 130, 60],
			[162, 114, 74],
		],
		under: [166, 184, 160],
		rib: [120, 100, 58],
		ribUnder: [196, 208, 192],
		whip: [150, 128, 84],
		bark: css([116, 102, 90]),
		fissure: css([78, 68, 62]),
		cut: true,
		ridge: css([0, 0, 0]),
		face: [0.2, 0.3, 0.4],
		back: [0.17, 0.25, 0.33],
		stem: [0.22, 0.3, 0.4],
	},
	dark: {
		leaf: [
			[200, 198, 124],
			[228, 202, 120],
			[224, 182, 100],
			[218, 158, 98],
			[196, 150, 118],
		],
		under: [214, 224, 214],
		rib: [244, 226, 166],
		ribUnder: [236, 242, 236],
		whip: [200, 180, 132],
		bark: css([168, 156, 142]),
		fissure: css([0, 0, 0]),
		cut: false,
		ridge: css([226, 210, 186]),
		face: [0.14, 0.22, 0.32],
		back: [0.18, 0.26, 0.36],
		stem: [0.16, 0.24, 0.34],
	},
};

/* ----------------------------------------------------------------- wind */

/** Gusts: a fixed schedule of events, crossing the page from the left. */
const GUST_P = 19;
const gustT = (k: number) => k * GUST_P + 7 * (hash(k, 1) - 0.5) - 2;
const gustA = (k: number) => {
	// Sets: a run of stronger gusts every couple of minutes.
	const set = 0.5 + 0.5 * Math.sin(k * 0.93 + 0.4);
	return (0.3 + 0.8 * set * set) * (0.75 + 0.5 * hash(k, 2));
};
/** How hard one gust pushes as it passes a point: a quick rise, a long ease. */
const push = (tau: number) =>
	tau <= 0 ? 0 : smooth(0, 1.2, tau) * (1 - smooth(1.5, 5.4, tau));
const PUSH_END = 5.4;

/** The breeze between gusts: three slow swells, also travelling. */
const BREEZE: [number, number, number][] = [
	[0.13, 0.26, 0.3],
	[0.23, 0.16, 2.1],
	[0.41, 0.07, 4.4],
];
const breezeAt = (t: number) => {
	let b = 0;
	for (const [w, a, p] of BREEZE) b += a * Math.sin(w * t + p);
	return b;
};

/* ---------------------------------------------------------------- plan */

type Leaf = {
	s: number;
	side: number;
	len: number;
	wid: number;
	/** Rest angle off the whip, radians. */
	ang: number;
	roll: number;
	/** How readily this leaf turns over: stiff ones only in the strongest gusts. */
	flip: number;
	lag: number;
	ph: number;
	col: number;
};

type Strand = {
	ax: number;
	ay: number;
	L: number;
	n: number;
	ds: number;
	depth: number;
	/** Where the whip leaves its twig: angle from vertical and how fast it falls. */
	emerge: number;
	curl: number;
	lean: number;
	omega: number;
	zeta: number;
	/** Seconds the tip runs behind the top. */
	lag: number;
	kappa: number;
	/** Answer to one unit gust, sampled every RESP_DT from its arrival. */
	resp: Float32Array;
	/** Gain and phase lag for each breeze swell. */
	bg: Float32Array;
	bp: Float32Array;
	sway: number;
	swayP: number;
	swayQ: number;
	puff: number;
	puffK: number;
	leaves: Leaf[];
	px: Float32Array;
	py: Float32Array;
	pa: Float32Array;
};

type Limb = {
	pts: Float32Array;
	w0: number;
	w1: number;
	depth: number;
};

type Plan = {
	U: number;
	/** Gust and breeze speed across the page, px/s; where gusts set out. */
	c: number;
	cb: number;
	x0: number;
	strands: Strand[];
	limbs: Limb[];
	wood: HTMLCanvasElement;
	wg: Ctx;
	woodKey: string;
	/** The wood, read back once, and the lattice-sized raster painted from it. */
	woodData: Uint8ClampedArray | null;
	woodFrom: number;
	woodTo: number;
	raster: ImageData | null;
	stamp: Uint32Array;
	painted: string;
};

const RESP_DT = 0.05;

/** A damped pendulum's answer to one gust, from rest, by RK4. */
function respond(omega: number, zeta: number) {
	const tmax = Math.min(90, PUSH_END + 5.5 / (zeta * omega));
	const n = Math.ceil(tmax / RESP_DT) + 1;
	const out = new Float32Array(n);
	const sub = 4;
	const h = RESP_DT / sub;
	const w2 = omega * omega;
	const c = 2 * zeta * omega;
	let x = 0;
	let v = 0;
	let tau = 0;
	const acc = (tt: number, xx: number, vv: number) =>
		w2 * (push(tt) - xx) - c * vv;
	for (let i = 1; i < n; i++) {
		for (let k = 0; k < sub; k++) {
			const a1 = acc(tau, x, v);
			const x2 = x + (h / 2) * v;
			const v2 = v + (h / 2) * a1;
			const a2 = acc(tau + h / 2, x2, v2);
			const x3 = x + (h / 2) * v2;
			const v3 = v + (h / 2) * a2;
			const a3 = acc(tau + h / 2, x3, v3);
			const x4 = x + h * v3;
			const v4 = v + h * a3;
			const a4 = acc(tau + h, x4, v4);
			x += (h / 6) * (v + 2 * v2 + 2 * v3 + v4);
			v += (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
			tau += h;
		}
		out[i] = x;
	}
	return out;
}

function bezier(p: number[], steps: number) {
	const out = new Float32Array((steps + 1) * 2);
	for (let i = 0; i <= steps; i++) {
		const u = i / steps;
		const v = 1 - u;
		const a = v * v * v;
		const b = 3 * v * v * u;
		const c = 3 * v * u * u;
		const d = u * u * u;
		out[i * 2] = a * p[0] + b * p[2] + c * p[4] + d * p[6];
		out[i * 2 + 1] = a * p[1] + b * p[3] + c * p[5] + d * p[7];
	}
	return out;
}

/** Lowest y of any limb above x: where a whip can hang from. */
function limbY(limbs: Limb[], x: number) {
	let best = Number.NEGATIVE_INFINITY;
	for (const b of limbs) {
		const p = b.pts;
		for (let i = 0; i + 3 < p.length; i += 2) {
			const xa = p[i];
			const xb = p[i + 2];
			if ((x - xa) * (x - xb) > 0 || xa === xb) continue;
			const f = (x - xa) / (xb - xa);
			const y = p[i + 1] + (p[i + 3] - p[i + 1]) * f;
			if (y > best) best = y;
		}
	}
	return best;
}

function canvas() {
	const el = document.createElement("canvas");
	const ctx = el.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("no 2d context");
	return { el, ctx };
}

function plan(W: number, H: number, frame: Frame, top: number): Plan {
	const phone = W < 600;
	const U = phone ? 1 : clamp(Math.min(W / 1440, H / 900), 0.72, 1.5);
	const fx0 = phone ? 0 : frame.x;
	const fx1 = phone ? W : frame.x + frame.w;

	// Two old limbs come over the top from either side and dip lowest above
	// the gutters, so the curtain is longest where the page is open. Over the
	// column they climb out of the page, above the first line of text.
	const limbs: Limb[] = phone
		? [
				{
					pts: bezier(
						[
							-50,
							top * 0.78,
							W * 0.08,
							top * 1.02,
							W * 0.2,
							top * 0.1,
							W * 0.45,
							-60,
						],
						32,
					),
					w0: 26,
					w1: 8,
					depth: 1,
				},
				{
					pts: bezier(
						[
							W + 50,
							top * 0.7,
							W * 0.92,
							top * 0.94,
							W * 0.8,
							top * 0.05,
							W * 0.55,
							-66,
						],
						32,
					),
					w0: 22,
					w1: 7,
					depth: 0,
				},
			]
		: [
				{
					pts: bezier(
						[
							-W * 0.05,
							H * 0.1,
							fx0 * 0.5,
							H * 0.21,
							fx0 + frame.w * 0.02,
							top * 0.5,
							fx0 + frame.w * 0.34,
							-H * 0.1,
						],
						40,
					),
					w0: 46 * U,
					w1: 12 * U,
					depth: 1,
				},
				{
					pts: bezier(
						[
							W * 1.05,
							H * 0.06,
							fx1 + (W - fx1) * 0.45,
							H * 0.16,
							fx1 - frame.w * 0.03,
							top * 0.4,
							fx1 - frame.w * 0.32,
							-H * 0.1,
						],
						40,
					),
					w0: 38 * U,
					w1: 10 * U,
					depth: 0,
				},
			];

	// The hem: long in the gutters, drawn up over the column like a curtain
	// tied back, so the journal stands in the opening.
	const gutterHem = H * (phone ? 0.94 : 0.93);
	const centreHem = Math.max(36, top - 8);
	const hem = (x: number) => {
		const into = Math.min(x - fx0, fx1 - x);
		// Phones have no gutter: the curtain keeps to the margins, full length.
		if (phone) return into < W * 0.2 ? gutterHem : centreHem;
		// Tied back at the column's edge, so no tip hangs between lines of text.
		const q = smooth(-0.14 * fx0, 24 * U, into);
		return gutterHem + (centreHem - gutterHem) * q;
	};

	const strands: Strand[] = [];
	const c = 240 * U;
	const cb = 110 * U;
	const x0 = -200 * U;
	const counts = phone ? [10, 9, 7] : [20, 15, 10];
	const leafLen = phone ? [30, 38, 50] : [28 * U, 36 * U, 46 * U];
	let id = 1;
	for (let depth = 0; depth < 3; depth++) {
		const count = counts[depth];
		for (let j = 0; j < count; j++) {
			id++;
			// Denser where the curtain is long; a gap here and there.
			// Whips leave a twig in clumps, so the curtain has partings and
			// thick places rather than an even fringe.
			const clump = Math.floor(j / 3);
			const u = clamp(
				(clump * 3 + 1.5 + 2.2 * (hash(clump * 31 + depth, 3) - 0.5)) / count +
					(hash(id, 3) - 0.5) * (2.2 / count),
				0,
				1,
			);
			const spans = phone
				? [
						[-0.03 * W, 0.12 * W],
						[0.88 * W, 1.03 * W],
					]
				: [
						[-0.02 * W, fx0 + 26 * U],
						[fx1 - 26 * U, 1.02 * W],
					];
			const len0 = spans[0][1] - spans[0][0];
			const len1 = spans[1][1] - spans[1][0];
			const at = u * (len0 + len1);
			const ax = at < len0 ? spans[0][0] + at : spans[1][0] + (at - len0);
			const perch = limbY(limbs, ax);
			const hung = Number.isFinite(perch);
			const ay = hung ? perch - 3 * U : -30 - 20 * hash(id, 4);
			// Most whips reach the hem; some are this year's short growth.
			const reach =
				hash(id, 18) < 0.24
					? 0.48 + 0.3 * hash(id, 5)
					: 0.86 + 0.22 * hash(id, 5);
			const want = hem(ax) * reach - ay;
			// No room above the first line of text: leave the column bare.
			if (want < 140 * U) continue;
			const L = want * (depth === 0 ? 0.92 : 1);
			const ds = (phone ? 9 : 10) * U;
			const n = Math.max(6, Math.round(L / ds));
			// Period grows with the root of the length; slow, as seen from afar.
			const period =
				5.2 * Math.sqrt(L / (480 * U)) * (0.92 + 0.16 * hash(id, 6));
			const omega = TAU / period;
			const zeta = 0.06 + 0.04 * hash(id, 7);
			const bg = new Float32Array(BREEZE.length);
			const bp = new Float32Array(BREEZE.length);
			BREEZE.forEach(([w], k) => {
				const re = omega * omega - w * w;
				const im = 2 * zeta * omega * w;
				bg[k] = (omega * omega) / Math.hypot(re, im);
				bp[k] = Math.atan2(im, re);
			});
			// Whips spring up and out of the limb, then arch over and fall:
			// the fountain that names a weeping willow at a glance.
			const side = hash(id, 19) < (ax < W / 2 ? 0.62 : 0.38) ? 1 : -1;
			const leaves: Leaf[] = [];
			const gap = (depth === 2 ? 9 : depth === 1 ? 10 : 12) * U;
			let s = 14 * U + hash(id, 8) * gap;
			let k = 0;
			while (s < L - 4) {
				const lid = id * 977 + k;
				const tip = smooth(L * 0.72, L, s);
				const size =
					leafLen[depth] * (0.8 + 0.4 * hash(lid, 1)) * (1 - 0.55 * tip);
				leaves.push({
					s,
					side: k % 2 ? 1 : -1,
					len: size,
					wid: size * (0.13 + 0.03 * hash(lid, 2)),
					ang: 0.1 + 0.36 * hash(lid, 3) ** 1.4,
					roll: (hash(lid, 4) - 0.5) * 1.1 + (hash(lid, 9) < 0.12 ? 2.4 : 0),
					flip: 0.7 + 2.5 * hash(lid, 10) ** 1.3,
					lag: 0.08 + 0.5 * hash(lid, 5),
					ph: hash(lid, 6) * TAU,
					col: clamp(
						hash(id, 11) * 2.6 + 0.9 + (hash(lid, 7) - 0.5) * 1.5,
						0,
						4.49,
					),
				});
				s += gap * (0.85 + 0.3 * hash(lid, 8));
				k++;
			}
			strands.push({
				ax,
				ay,
				L,
				n,
				ds: L / n,
				depth,
				emerge: side * (hung ? 1.3 + 1.05 * hash(id, 9) : 0.4),
				curl: (26 + 46 * hash(id, 10)) * U * (phone ? 0.45 : 1),
				lean: (hash(id, 12) - 0.5) * 0.04,
				omega,
				zeta,
				lag: period * (0.1 + 0.06 * hash(id, 13)),
				kappa:
					(depth === 2 ? 0.11 : depth === 1 ? 0.095 : 0.08) *
					(0.85 + 0.3 * hash(id, 14)),
				resp: respond(omega, zeta),
				bg,
				bp,
				sway: (0.012 + 0.012 * hash(id, 15)) * (phone ? 1.2 : 1),
				swayP: hash(id, 16) * TAU,
				swayQ: hash(id, 17) * TAU,
				puff: 0.7 + 0.6 * hash(id, 20),
				puffK: TAU / (120 + 140 * hash(id, 21)) / U,
				leaves,
				px: new Float32Array(n + 1),
				py: new Float32Array(n + 1),
				pa: new Float32Array(n),
			});
		}
	}
	const wood = canvas();
	return {
		U,
		c,
		cb,
		x0,
		strands,
		limbs,
		wood: wood.el,
		wg: wood.ctx,
		woodKey: "",
		woodData: null,
		woodFrom: 0,
		woodTo: 0,
		raster: null,
		stamp: new Uint32Array(0),
		painted: "",
	};
}

/* ---------------------------------------------------------------- pose */

/** Gusts that can still be heard in a whip at time t. */
function gustsNear(t: number, span: number) {
	const lo = Math.floor((t - span - 12) / GUST_P) - 1;
	const hi = Math.ceil(t / GUST_P) + 1;
	return [lo, hi];
}

/** The whip's swing angle at time t, radians. */
function swing(p: Plan, st: Strand, t: number, lo: number, hi: number) {
	const arrive = (st.ax - p.x0) / p.c;
	let g = 0;
	const r = st.resp;
	const last = r.length - 1;
	for (let k = lo; k <= hi; k++) {
		const tau = t - gustT(k) - arrive;
		if (tau <= 0) continue;
		const q = tau / RESP_DT;
		if (q >= last) continue;
		const i = q | 0;
		g += gustA(k) * (r[i] + (r[i + 1] - r[i]) * (q - i));
	}
	const tb = t - st.ax / p.cb;
	let b = 0;
	for (let k = 0; k < BREEZE.length; k++) {
		const [w, a, ph] = BREEZE[k];
		b += a * st.bg[k] * Math.sin(w * tb + ph - st.bp[k]);
	}
	// What turbulence leaves behind: each whip ringing at its own rate.
	const own =
		st.sway *
		(0.55 + 0.45 * Math.sin(0.047 * t + st.swayQ)) *
		Math.sin(st.omega * t + st.swayP);
	return st.kappa * (g + b) + own;
}

/** The air a leaf feels: the gust itself, not the whip's answer to it. */
function air(p: Plan, x: number, t: number, lo: number, hi: number) {
	const arrive = (x - p.x0) / p.c;
	let a = 0;
	for (let k = lo; k <= hi; k++) a += gustA(k) * push(t - gustT(k) - arrive);
	return a + 0.35 * breezeAt(t - x / p.cb);
}

const KNOTS = 6;
const knotScratch = new Float32Array(KNOTS + 1);

function poseStrand(p: Plan, st: Strand, t: number, lo: number, hi: number) {
	const { n, ds, L, px, py, pa } = st;
	px[0] = st.ax;
	py[0] = st.ay;
	// The swing at a few knots down the whip, each read a little later.
	const knots = KNOTS;
	const kv = knotScratch;
	for (let j = 0; j <= knots; j++)
		kv[j] = swing(p, st, t - st.lag * (j / knots) ** 0.85, lo, hi);
	for (let i = 0; i < n; i++) {
		const s = (i + 0.5) * ds;
		const q = (s / L) * knots;
		const j = Math.min(knots - 1, q | 0);
		const phi = kv[j] + (kv[j + 1] - kv[j]) * (q - j);
		const a =
			st.emerge * Math.exp(-s / st.curl) +
			st.lean +
			smooth(0, L * 0.2 + 30 * p.U, s) * phi;
		pa[i] = a;
		px[i + 1] = px[i] + ds * Math.sin(a);
		py[i + 1] = py[i] + ds * Math.cos(a);
	}
}

/* --------------------------------------------------------------- paint */

/** A willow blade: wedge base, widest before the middle, a drawn-out tip. */
const WILLOW = profile(
	[0, 0.1, 0.27, 0.45, 0.65, 0.85, 1],
	[0.25, 0.6, 0.94, 1, 0.78, 0.4, 0],
);

function paintWood(p: Plan, g: Ctx, ink: Ink) {
	g.lineCap = "round";
	g.lineJoin = "round";
	for (const b of p.limbs) {
		const pts = b.pts;
		const m = pts.length / 2 - 1;
		const seed = b.depth * 17 + 3;
		// Old willow wood is lumpy: burrs and the stubs of lost shoots.
		const half = (i: number) =>
			((b.w0 + (b.w1 - b.w0) * (i / m) ** 0.8) / 2) *
			(1 +
				0.1 * Math.sin(i * 0.61 + seed) +
				0.08 * Math.sin(i * 1.7 + seed * 2));
		const ux = new Float32Array(m + 1);
		const uy = new Float32Array(m + 1);
		const hw = new Float32Array(m + 1);
		for (let i = 0; i <= m; i++) {
			const a = Math.max(0, i - 1);
			const z = Math.min(m, i + 1);
			const dx = pts[z * 2] - pts[a * 2];
			const dy = pts[z * 2 + 1] - pts[a * 2 + 1];
			const d = Math.hypot(dx, dy) || 1;
			// The normal that points down: the side away from the sky.
			const sx = -dy / d;
			const sy = dx / d;
			const flip = sy < 0 ? -1 : 1;
			ux[i] = sx * flip;
			uy[i] = sy * flip;
			hw[i] = half(i);
		}
		const at = (i: number, o: number): [number, number] => [
			pts[i * 2] + ux[i] * o * hw[i],
			pts[i * 2 + 1] + uy[i] * o * hw[i],
		];
		g.beginPath();
		for (let i = 0; i <= m; i++) {
			const [x, y] = at(i, 1);
			if (i === 0) g.moveTo(x, y);
			else g.lineTo(x, y);
		}
		for (let i = m; i >= 0; i--) g.lineTo(...at(i, -1));
		g.closePath();
		g.globalCompositeOperation = "destination-out";
		g.globalAlpha = 0.92;
		g.fillStyle = "#000";
		g.fill();
		g.globalCompositeOperation = "source-over";
		g.globalAlpha = b.depth ? 0.1 : 0.07;
		g.fillStyle = ink.bark;
		g.fill();

		// Engraved form: hatching across the shaded underside, sparse long
		// furrows down the middle, and a firm contour underneath. On dark
		// paper the light is what gets drawn, so the hatching moves up top.
		const shadeSide = ink.cut ? 1 : -1;
		g.beginPath();
		const step = Math.max(2, Math.round(m / 70));
		for (let i = 1; i < m; i += step) {
			if (hw[i] < 3) continue;
			const k = hash(i * 7 + seed, 5);
			const [x0, y0] = at(i, shadeSide * 0.98);
			const reach = 0.35 + 0.5 * k;
			const j = Math.min(m, i + 2);
			const [x1, y1] = at(j, shadeSide * (1 - 2 * reach) * 0.98);
			g.moveTo(x0, y0);
			g.lineTo(x1, y1);
		}
		g.globalAlpha = b.depth ? 0.8 : 0.58;
		g.strokeStyle = ink.cut ? ink.fissure : ink.ridge;
		g.lineWidth = 2.2;
		g.stroke();

		g.beginPath();
		for (let r = 0; r < 3; r++) {
			const off = -0.45 + r * 0.38;
			let pen = false;
			for (let i = 0; i <= m; i++) {
				const weave = 0.14 * Math.sin(i * 0.8 + r * 2.3 + seed);
				const [x, y] = at(i, off + weave);
				if (hash(r * 131 + i, seed) < 0.22 || hw[i] < 4) {
					pen = false;
					continue;
				}
				if (!pen) g.moveTo(x, y);
				else g.lineTo(x, y);
				pen = true;
			}
		}
		g.globalAlpha = b.depth ? 0.6 : 0.42;
		g.strokeStyle = ink.cut ? ink.fissure : ink.bark;
		g.lineWidth = 2;
		g.stroke();

		g.beginPath();
		for (let i = 0; i <= m; i++) {
			const [x, y] = at(i, shadeSide);
			if (i === 0) g.moveTo(x, y);
			else g.lineTo(x, y);
		}
		g.globalAlpha = b.depth ? 0.9 : 0.66;
		g.strokeStyle = ink.cut ? ink.fissure : ink.ridge;
		g.lineWidth = 2.6;
		g.stroke();
		g.beginPath();
		for (let i = 0; i <= m; i++) {
			const [x, y] = at(i, -shadeSide);
			if (i === 0) g.moveTo(x, y);
			else g.lineTo(x, y);
		}
		g.globalAlpha = b.depth ? 0.5 : 0.36;
		g.strokeStyle = ink.bark;
		g.lineWidth = 2;
		g.stroke();
	}
	g.globalAlpha = 1;
	g.globalCompositeOperation = "source-over";
}

function paintStrands(
	p: Plan,
	R: ImageData,
	ink: Ink,
	t: number,
	depth: number,
	lo: number,
	hi: number,
	scale: number,
) {
	const list = p.strands.filter((s) => s.depth === depth);
	const stemTone = ink.stem[depth];
	const faceTone = ink.face[depth];
	const backTone = ink.back[depth];
	for (const st of list) {
		poseStrand(p, st, t, lo, hi);
		const { px, py, pa, ds, n } = st;
		polyline(R, p.stamp, px, py, n, scale, ink.whip, stemTone, depth === 2);
		const wind0 = air(p, st.ax, t, lo, hi);
		const windLate = air(p, st.ax, t - 0.58, lo, hi);
		for (const f of st.leaves) {
			const q = f.s / ds;
			const i = Math.min(n - 1, q | 0);
			const fr = q - i;
			const bx = px[i] + (px[i + 1] - px[i]) * fr;
			const by = py[i] + (py[i + 1] - py[i]) * fr;
			// Leaves deeper in the whip feel the gust a beat later.
			const w = wind0 + (windLate - wind0) * (f.lag / 0.58);
			// The gust arrives in puffs: patchy down the whip and from whip to whip.
			const puff =
				st.puff * (1 + 0.3 * Math.sin(f.s * st.puffK - 2.4 * t + st.swayQ));
			const gust = w > 0 ? w * puff : 0;
			const flutter = (0.05 + 0.2 * gust) * Math.sin(t * 1.7 + f.ph);
			const roll =
				f.roll +
				f.flip * (gust < 1.2 ? gust : 1.2) +
				flutter +
				0.12 * Math.sin(t * 0.31 + f.ph);
			const cr = Math.cos(roll);
			// Hung from the whip, blown a little downwind as the gust takes it.
			const a =
				pa[i] +
				f.side * f.ang * (1 - 0.35 * (gust < 1 ? gust : 1)) +
				0.3 * w +
				0.06 * Math.sin(t * 0.53 + f.ph);
			const dx = Math.sin(a);
			const dy = Math.cos(a);
			const open = cr < 0 ? -cr : cr;
			const under = cr < 0;
			blade(
				R,
				(bx + dx * 2) * scale,
				(by + dy * 2) * scale,
				dx,
				dy,
				f.len * scale,
				f.wid * scale * (open > 0.14 ? open : 0.14),
				WILLOW,
				under ? ink.under : ink.leaf[f.col | 0],
				under ? backTone : faceTone,
				depth > 0 && open > 0.4 ? (under ? ink.ribUnder : ink.rib) : null,
				(under ? backTone : faceTone) * 1.5,
			);
		}
	}
}

function paint(p: Plan, ink: Ink, t: number, scale: number) {
	const R = p.raster as ImageData;
	const span = Math.max(...p.strands.map((s) => s.resp.length)) * RESP_DT;
	const [lo, hi] = gustsNear(t, span + 10);
	R.data.fill(0);
	paintStrands(p, R, ink, t, 0, lo, hi, scale);
	// The limbs hold the far whips up and stand in front of them.
	const wd = p.woodData as Uint8ClampedArray;
	const d = R.data;
	for (let i = p.woodFrom; i < p.woodTo; i += 4) {
		const a = wd[i + 3];
		if (a) blend(d, i, wd[i], wd[i + 1], wd[i + 2], a / 255);
	}
	paintStrands(p, R, ink, t, 1, lo, hi, scale);
	paintStrands(p, R, ink, t, 2, lo, hi, scale);
}

/* --------------------------------------------------------------- scene */

const RATE = 12;
let memoKey = "";
let memo: Plan | null = null;

export const willow: Scene = ({ dither: c }, { t, W, H, anchors, dark }) => {
	const frame = anchors.frame ??
		anchors.content ?? {
			x: Math.max(0, (W - 976) / 2),
			w: Math.min(976, W),
		};
	// Over the column the curtain stops short of the first line of text.
	const top = anchors.content ? anchors.content.y : H * 0.12;
	const key = `${W}|${H}|${frame.x | 0}|${frame.w | 0}|${top | 0}`;
	if (key !== memoKey || !memo) {
		memoKey = key;
		memo = plan(W, H, frame, top);
	}
	const p = memo;
	const theme = dark ? "dark" : "light";
	const ink = INKS[theme];
	const scale = c.getTransform().a;
	const w = c.canvas.width;
	const h = c.canvas.height;
	const woodKey = `${theme}|${w}|${h}|${scale}`;
	if (woodKey !== p.woodKey) {
		p.woodKey = woodKey;
		p.wood.width = w;
		p.wood.height = h;
		p.wg.setTransform(scale, 0, 0, scale, 0, 0);
		paintWood(p, p.wg, ink);
		const wd = p.wg.getImageData(0, 0, w, h).data;
		let first = wd.length;
		let last = 0;
		for (let i = 3; i < wd.length; i += 4)
			if (wd[i]) {
				if (i < first) first = i;
				last = i;
			}
		p.woodData = wd;
		p.woodFrom = first - 3;
		p.woodTo = last + 1;
		p.raster = new ImageData(w, h);
		p.stamp = new Uint32Array(w * h);
		p.painted = "";
	}
	const beat = Math.floor(t * RATE);
	const paintKey = `${beat}|${woodKey}`;
	if (paintKey !== p.painted) {
		p.painted = paintKey;
		paint(p, ink, beat / RATE, scale);
	}
	c.putImageData(p.raster as ImageData, 0, 0);
};
