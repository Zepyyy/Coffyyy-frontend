import type { Scene } from "../engine";
import { lanesFor } from "./margins";

/**
 * A branch of Coffea arabica, drawn as a botanical plate in the gutters.
 *
 * The stem is a closed form: rest curve plus a wave of wind travelling from the
 * wood to the tip. So any part can ask where the stem was a moment ago, and a
 * leaf does exactly that, point by point down its midrib, which is why a blade
 * trails the stem like a jelly's tentacle. Everything that moves is a pure
 * function of t.
 *
 * A leaf is a ribbon in 3D: a midrib, two halves folded in a shallow V, and a
 * roll that varies along its length. Where a half rolls past edge-on, the pale
 * underside comes round, with its veins raised instead of sunk.
 *
 * A branch is hundreds of antialiased strokes, but it moves under a pixel per
 * step on a 2px lattice. So each one paints into its own layer at 8Hz, the two
 * branches on different frames, and the engine's easing carries the dots between
 * paints. The layout and layers are caches of pure functions, not state.
 */

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const mod = (x: number, n: number) => ((x % n) + n) % n;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
const rnd = (n: number) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};
const css = (c: Rgb) => `rgb(${c[0]} ${c[1]} ${c[2]})`;
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
	Math.round(a[0] + (b[0] - a[0]) * k),
	Math.round(a[1] + (b[1] - a[1]) * k),
	Math.round(a[2] + (b[2] - a[2]) * k),
];

/** Green, straw, blush, dusty rose, the near-oxblood of a ripe cherry. */
type Ink = {
	up: string;
	under: string;
	vein: string;
	pale: string;
	edge: string;
	bark: string;
	barkLine: string;
	shoot: string;
	petal: string;
	line: string;
	anther: string;
	crown: string;
	fruit: string[];
	shade: string[];
	/** Tone of a leaf's upper and under faces. */
	upTone: number;
	underTone: number;
	/** On dark paper a highlight is more dots; on light paper, fewer. */
	cut: boolean;
};

const STAGES = {
	light: [
		[162, 174, 116],
		[216, 194, 128],
		[208, 148, 112],
		[182, 104, 100],
		[150, 80, 88],
	] as Rgb[],
	dark: [
		[176, 192, 138],
		[232, 212, 150],
		[228, 170, 136],
		[216, 140, 134],
		[196, 116, 120],
	] as Rgb[],
};

function ramp(stops: Rgb[], dim: number) {
	const out: string[] = [];
	for (let i = 0; i <= 64; i++) {
		const v = (i / 64) * (stops.length - 1);
		const j = Math.min(stops.length - 2, v | 0);
		const c = mix(stops[j], stops[j + 1], v - j);
		out.push(css(mix(c, [0, 0, 0], dim)));
	}
	return out;
}

const INKS: Record<"light" | "dark", Ink> = {
	light: {
		up: css([138, 168, 104]),
		under: css([190, 200, 150]),
		vein: css([112, 134, 84]),
		pale: css([214, 214, 176]),
		edge: css([104, 122, 80]),
		bark: css([172, 136, 104]),
		barkLine: css([118, 88, 70]),
		shoot: css([150, 170, 104]),
		petal: css([238, 230, 212]),
		line: css([150, 132, 110]),
		anther: css([196, 156, 96]),
		crown: css([84, 62, 56]),
		fruit: ramp(STAGES.light, 0),
		shade: ramp(STAGES.light, 0.38),
		upTone: 0.3,
		underTone: 0.14,
		cut: true,
	},
	dark: {
		up: css([128, 152, 110]),
		under: css([198, 208, 166]),
		vein: css([204, 216, 172]),
		pale: css([224, 226, 190]),
		edge: css([186, 204, 156]),
		bark: css([190, 160, 134]),
		barkLine: css([226, 198, 170]),
		shoot: css([176, 192, 138]),
		petal: css([244, 238, 224]),
		line: css([226, 212, 190]),
		anther: css([236, 196, 128]),
		crown: css([244, 226, 200]),
		fruit: ramp(STAGES.dark, 0),
		shade: ramp(STAGES.dark, 0.3),
		upTone: 0.16,
		underTone: 0.3,
		cut: false,
	},
};

// Gusts are bumps that return to exactly zero, so the mod can never show.
function bump(t: number, period: number, width: number) {
	const p = mod(t, period) / width;
	if (p >= 1) return 0;
	const s = Math.sin(Math.PI * p);
	return s * s;
}
const gust = (t: number) => bump(t, 29, 9) + 0.7 * bump(t + 11, 43, 12);
const wind = (t: number) =>
	0.42 * Math.sin(t * 0.19 + 0.4) +
	0.24 * Math.sin(t * 0.31 + 2.1) +
	0.1 * Math.sin(t * 0.53 + 4) +
	1.1 * gust(t);

type Leaf = {
	/** Place along the stem, 0 to 1, and its sample. */
	s: number;
	i: number;
	side: number;
	len: number;
	wid: number;
	/** Rest direction of the petiole. */
	a0: number;
	/** Total curl toward the ground, radians. */
	droop: number;
	roll: number;
	twist: number;
	/** Foreshortening of the whole leaf. */
	pitch: number;
	ph: number;
	/** Seconds behind the stem, at the tip. */
	lag: number;
	back: boolean;
	veins: number;
};

type Fruit = {
	s: number;
	i: number;
	/** Offset from the node, px. */
	ox: number;
	oy: number;
	rot: number;
	rx: number;
	ry: number;
	ripe: number;
	ph: number;
	/** How far the calyx scar has turned toward us, 0 to 1. */
	face: number;
	back: boolean;
};

type Bloom = {
	s: number;
	i: number;
	ox: number;
	oy: number;
	r: number;
	spin: number;
	tilt: number;
	dir: number;
	ph: number;
	bud: boolean;
};

type Branch = {
	n: number;
	len: number;
	rx: Float32Array;
	ry: Float32Array;
	tx: Float32Array;
	ty: Float32Array;
	px: Float32Array;
	py: Float32Array;
	/** Half width of the stem at each sample. */
	hw: Float32Array;
	/** Samples carrying a bark tick. */
	ticks: Uint8Array;
	/** Tip travel, px; seconds for a gust to run the branch; wind's head start. */
	amp: number;
	T: number;
	wp: number;
	nodes: number[];
	leaves: Leaf[];
	fruit: Fruit[];
	blooms: Bloom[];
	clipX: number;
	clipW: number;
	scale: number;
	/** Painted copy, its offset into the field, and which frame it holds. */
	layer: HTMLCanvasElement;
	g: Ctx;
	painted: string;
};

const N_STEM = 72;

type Pt = [number, number];

function sampleCurve(p: Pt[]) {
	const fine = 240;
	const xs = new Float32Array(fine + 1);
	const ys = new Float32Array(fine + 1);
	const dist = new Float32Array(fine + 1);
	for (let i = 0; i <= fine; i++) {
		const u = i / fine;
		const v = 1 - u;
		xs[i] =
			v * v * v * p[0][0] +
			3 * v * v * u * p[1][0] +
			3 * v * u * u * p[2][0] +
			u * u * u * p[3][0];
		ys[i] =
			v * v * v * p[0][1] +
			3 * v * v * u * p[1][1] +
			3 * v * u * u * p[2][1] +
			u * u * u * p[3][1];
		if (i)
			dist[i] = dist[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
	}
	const len = dist[fine];
	const rx = new Float32Array(N_STEM + 1);
	const ry = new Float32Array(N_STEM + 1);
	for (let i = 0, j = 0; i <= N_STEM; i++) {
		const want = (i / N_STEM) * len;
		while (j < fine - 1 && dist[j + 1] < want) j++;
		const k = (want - dist[j]) / Math.max(1e-4, dist[j + 1] - dist[j]);
		rx[i] = xs[j] + (xs[j + 1] - xs[j]) * k;
		ry[i] = ys[j] + (ys[j + 1] - ys[j]) * k;
	}
	const tx = new Float32Array(N_STEM + 1);
	const ty = new Float32Array(N_STEM + 1);
	for (let i = 0; i <= N_STEM; i++) {
		const a = Math.max(0, i - 1);
		const b = Math.min(N_STEM, i + 1);
		const d = Math.hypot(rx[b] - rx[a], ry[b] - ry[a]) || 1;
		tx[i] = (rx[b] - rx[a]) / d;
		ty[i] = (ry[b] - ry[a]) / d;
	}
	return { rx, ry, tx, ty, len };
}

type Plan = {
	curve: Pt[];
	/** Hard limits for rest shapes: x of the content edge side. */
	limit: number;
	/** +1 when the content lies at larger x. */
	inward: number;
	leafLen: number;
	seed: number;
	wp: number;
	/** Node index ranges, as fractions of the stem. */
	fruitTo: number;
	bloomFrom: number;
	bloomTo: number;
	amp: number;
	clipX: number;
	clipW: number;
	maxNodes: number;
	/** Share of old-wood leaves already dropped. */
	bare: number;
};

/** Lanceolate: wedge base, widest before the middle, a drawn-out drip tip. */
const blade = (q: number) =>
	3 * q ** 0.72 * (1 - q) ** 0.88 * (1 - 0.22 * smooth(0.72, 1, q));

/** Furthest a resting leaf reaches along `inward`, width included. */
function reach(
	x0: number,
	a0: number,
	droop: number,
	len: number,
	wid: number,
	inward: number,
) {
	let x = x0;
	let most = x0 * inward;
	for (let k = 0; k <= 12; k++) {
		const q = k / 12;
		const a = a0 + droop * q * (0.55 + 0.45 * q);
		most = Math.max(most, x * inward + Math.abs(Math.sin(a)) * wid * blade(q));
		x += (Math.cos(a) * len) / 12;
	}
	return most;
}

const droopFor = (a0: number, k: number) =>
	clamp(
		Math.atan2(Math.sin(Math.PI / 2 - a0), Math.cos(Math.PI / 2 - a0)),
		-1.3,
		1.3,
	) * k;

function buildBranch(plan: Plan): Branch {
	const { rx, ry, tx, ty, len } = sampleCurve(plan.curve);
	const scale = plan.leafLen / 140;
	const { seed } = plan;
	const nodes: number[] = [];
	const gap = Math.max(plan.leafLen * 0.74, len / plan.maxNodes);
	// Internodes shorten toward the growing tip, which ends in a young pair.
	let at = gap * 0.9;
	while (at < len * 0.95) {
		nodes.push(at / len);
		at += gap * (1.06 - 0.52 * (at / len));
	}
	nodes.push(0.992);
	const leaves: Leaf[] = [];
	const fruit: Fruit[] = [];
	const blooms: Bloom[] = [];
	nodes.forEach((s, n) => {
		const i = Math.round(s * N_STEM);
		const heading = Math.atan2(ty[i], tx[i]);
		const youth = smooth(0.6, 1, s);
		for (const side of [1, -1]) {
			const id = seed * 31 + n * 2 + (side > 0 ? 1 : 0);
			// Old wood has often dropped a leaf or two, and shows its fruit for it.
			if (s < 0.5 && rnd(id + 0.3) < plan.bare) continue;
			const size = (0.84 + 0.28 * rnd(id + 1)) * (1 - 0.66 * youth);
			const droopK = 0.42 + 0.3 * rnd(id + 5);
			const ratio = 0.165 + 0.04 * rnd(id + 4);
			let lenL = plan.leafLen * size;
			let spread = (1.14 - 0.5 * youth + 0.24 * (rnd(id + 2) - 0.5)) * side;
			// Lean along the stem rather than cross the content edge, then shrink.
			const over = () => {
				const a = heading + spread;
				return (
					reach(
						rx[i],
						a,
						droopFor(a, droopK),
						lenL,
						lenL * ratio,
						plan.inward,
					) -
					plan.limit * plan.inward
				);
			};
			for (let k = 0; k < 7 && over() > 0; k++) spread *= 0.84;
			for (let k = 0; k < 8 && over() > 0; k++) lenL *= 0.92;
			const a0 = heading + spread;
			const under = rnd(id + 3) < 0.3;
			leaves.push({
				s,
				i,
				side,
				len: lenL,
				wid: lenL * ratio,
				a0,
				droop: droopFor(a0, droopK),
				roll: under ? 0.75 + 0.3 * rnd(id + 6) : -0.2 + 0.7 * rnd(id + 6),
				twist: under ? 1.5 + 0.8 * rnd(id + 7) : 0.3 + 0.9 * rnd(id + 7),
				pitch: 0.84 + 0.16 * rnd(id + 8),
				ph: rnd(id + 9) * TAU,
				lag: 1.5 + 1.2 * rnd(id + 10),
				back: rnd(id + 11) < 0.55,
				veins: lenL > 92 ? 7 : lenL > 60 ? 5 : 4,
			});
		}
		if (s < plan.fruitTo) {
			const cue = 1 - s / plan.fruitTo;
			const count = 6 + Math.round(4 * rnd(seed + n * 7.1) * (0.5 + cue));
			for (let k = 0; k < count; k++) {
				const id = seed * 53 + n * 19 + k;
				const around = (k / count) * TAU + rnd(id) * 0.5;
				const front = Math.sin(around);
				const out = Math.cos(around) * (12 + 4 * rnd(id + 1)) * scale;
				const along = (rnd(id + 2) - 0.5) * 22 * scale;
				const ox = tx[i] * along - ty[i] * out;
				const oy = ty[i] * along + tx[i] * out;
				fruit.push({
					s,
					i,
					ox,
					oy,
					rot: Math.atan2(oy + 4 * scale, ox) + (rnd(id + 3) - 0.5) * 0.7,
					rx: Math.max(6, (12 + 1.8 * rnd(id + 4)) * scale),
					ry: Math.max(5, (9.8 + 1.2 * rnd(id + 5)) * scale),
					ripe: clamp(0.8 * cue + 0.36 * (rnd(id + 6) - 0.5) + 0.14, 0, 1),
					ph: rnd(id + 7) * TAU,
					face: 0.25 + 0.75 * Math.max(0, front),
					back: front < -0.1,
				});
			}
		}
		if (s >= plan.bloomFrom && s < plan.bloomTo) {
			for (const side of [1, -1]) {
				const id = seed * 71 + n * 23 + side;
				const open = 1;
				const buds = 1 + Math.round(rnd(id + 1));
				for (let k = 0; k < open + buds; k++) {
					const bud = k >= open;
					const m = id + k * 9;
					// A small fan out of the axil, away from the stem.
					const fan = ((k + 0.5) / (open + buds) - 0.5) * 2.1 + 0.25;
					const out = Math.cos(fan) * (bud ? 18 : 34) * scale;
					const along = Math.sin(fan) * (bud ? 26 : 30) * scale;
					const ox = tx[i] * along - ty[i] * out * side;
					const oy = ty[i] * along + tx[i] * out * side;
					blooms.push({
						s,
						i,
						ox,
						oy,
						r: Math.max(12, (bud ? 25 : 31 + 3 * rnd(m + 2)) * scale),
						spin: rnd(m + 3) * TAU,
						tilt: 0.6 + 0.34 * rnd(m + 4),
						dir: Math.atan2(oy, ox),
						ph: rnd(m + 5) * TAU,
						bud,
					});
				}
			}
		}
	});
	fruit.sort((a, b) => Number(b.back) - Number(a.back));
	const hw = new Float32Array(N_STEM + 1);
	const w0 = 8.5 * Math.max(0.7, scale);
	const w1 = 2.6;
	for (let i = 0; i <= N_STEM; i++) {
		const u = i / N_STEM;
		let swell = 0;
		for (const node of nodes)
			swell = Math.max(swell, 1 - (Math.abs(u - node) * len) / 9);
		hw[i] = (w0 + (w1 - w0) * u ** 0.72 + swell * 2.4 * scale) / 2;
	}
	const ticks: number[] = [];
	const bars = Math.round(len / 8);
	for (let k = 0; k < bars; k++) {
		const u = (k + 0.5) / bars;
		if (rnd(k * 3.1 + seed) < 1.1 - u * 1.4) ticks.push(Math.round(u * N_STEM));
	}
	const layer = document.createElement("canvas");
	const g = layer.getContext("2d", { willReadFrequently: true });
	if (!g) throw new Error("no 2d context");
	return {
		n: N_STEM,
		len,
		rx,
		ry,
		tx,
		ty,
		px: new Float32Array(N_STEM + 1),
		py: new Float32Array(N_STEM + 1),
		hw,
		ticks: Uint8Array.from(ticks),
		amp: plan.amp,
		T: 3.6,
		wp: plan.wp,
		nodes,
		leaves,
		fruit,
		blooms,
		clipX: plan.clipX,
		clipW: plan.clipW,
		scale,
		layer,
		g,
		painted: "",
	};
}

function planBranches(
	W: number,
	H: number,
	gl: number,
	gr: number,
	phone: boolean,
): Branch[] {
	const out: Branch[] = [];
	if (phone) {
		// No gutters here, and scraps in the gaps between cards read as litter. So
		// the stem keeps to the page's slim margin: cherries sit on it, and leaves
		// lean in under the frosted cards, where they soften to a tint.
		const side = (edge: number, y: number, seed: number, wp: number) => {
			const x = (u: number) => (edge ? W + u : -u);
			out.push(
				buildBranch({
					curve: [
						[x(17), y],
						[x(2), y + H * 0.06],
						[x(-6), y + H * 0.12],
						[x(1), y + H * 0.2],
					],
					limit: edge ? -1e4 : 1e4,
					inward: edge ? -1 : 1,
					leafLen: 66,
					seed,
					wp,
					fruitTo: 1,
					bloomFrom: 2,
					bloomTo: 2,
					amp: 3,
					clipX: 0,
					clipW: W,
					maxNodes: 4,
					bare: 0,
				}),
			);
		};
		side(1, H * 0.47, 3, 0);
		side(0, H * 0.68, 4, -3.1);
		return out;
	}
	const leafFor = (g: number) => clamp(g * 0.6, 64, 150);
	// Wind can carry a blade this much past its resting reach.
	const clear = 20;
	if (gl >= 90) {
		const g = Math.min(gl, 420);
		const x = (u: number) => u * g;
		out.push(
			buildBranch({
				curve: [
					[x(-0.14), H * 0.07],
					[x(0.62), H * 0.02],
					[x(0.74), H * 0.5],
					[x(0.42), H * 0.92],
				],
				limit: gl - clear,
				inward: 1,
				leafLen: leafFor(gl),
				seed: 1,
				wp: 0,
				fruitTo: 0.62,
				bloomFrom: 0.66,
				bloomTo: 0.84,
				amp: clamp(g * 0.07, 6, 22),
				clipX: 0,
				clipW: gl - 6,
				maxNodes: 11,
				bare: 0.3,
			}),
		);
	}
	if (gr >= 90) {
		const g = Math.min(gr, 420);
		const x = (u: number) => W - u * g;
		out.push(
			buildBranch({
				curve: [
					[x(-0.14), H * 0.88],
					[x(0.5), H * 0.84],
					[x(0.72), H * 0.6],
					[x(0.5), H * 0.26],
				],
				limit: W - gr + clear,
				inward: -1,
				leafLen: leafFor(gr) * 0.92,
				seed: 2,
				wp: -2.6,
				fruitTo: 0.3,
				bloomFrom: 0.42,
				bloomTo: 0.86,
				amp: clamp(g * 0.06, 5, 18),
				clipX: W - gr + 6,
				clipW: gr - 6,
				maxNodes: 8,
				bare: 0.15,
			}),
		);
	}
	return out;
}

let memoKey = "";
let memo: Branch[] = [];

function branchesFor(
	W: number,
	H: number,
	gl: number,
	gr: number,
	phone: boolean,
) {
	const key = `${W}|${H}|${gl | 0}|${gr | 0}|${phone}`;
	if (key !== memoKey) {
		memoKey = key;
		memo = planBranches(W, H, gl, gr, phone);
	}
	return memo;
}

/** Sideways travel of the stem at s, at time t. */
const shift = (b: Branch, s: number, t: number) =>
	b.amp * s ** 1.6 * wind(t - s * b.T + b.wp);

function poseStem(b: Branch, t: number) {
	for (let i = 0; i <= b.n; i++) {
		const d = shift(b, i / b.n, t);
		b.px[i] = b.rx[i] - b.ty[i] * d;
		b.py[i] = b.ry[i] + b.tx[i] * d;
	}
}

const NL = 26;
const FIRST = 3;
const mx = new Float32Array(NL + 1);
const my = new Float32Array(NL + 1);
const nx = new Float32Array(NL + 1);
const ny = new Float32Array(NL + 1);
/** Signed half widths, and the cosine of each half's facing. */
const eL = new Float32Array(NL + 1);
const eR = new Float32Array(NL + 1);
const fL = new Float32Array(NL + 1);
const fR = new Float32Array(NL + 1);

const FOLD = 0.34;

function poseLeaf(b: Branch, f: Leaf, t: number) {
	const hw = b.hw[f.i] * 2;
	const nowShift = shift(b, f.s, t);
	const nowSlope =
		(shift(b, f.s + 0.02, t) - shift(b, f.s - 0.02, t)) / (0.04 * b.len);
	const nX = -b.ty[f.i];
	const nY = b.tx[f.i];
	let x = b.px[f.i] + Math.cos(f.a0) * hw * 0.3;
	let y = b.py[f.i] + Math.sin(f.a0) * hw * 0.3;
	const step = (f.len * f.pitch) / NL;
	for (let k = 0; k <= NL; k++) {
		const q = k / NL;
		const tp = t - f.lag * q;
		const local = tp - f.s * b.T + b.wp;
		const g = gust(local);
		// The memory: stem pose a moment ago, for points further down the blade.
		const was = shift(b, f.s, tp) - nowShift;
		const slope =
			(shift(b, f.s + 0.02, tp) - shift(b, f.s - 0.02, tp)) / (0.04 * b.len);
		// Wind turns a blade to point downwind, more if it lies across the wind.
		const across = Math.sin(f.a0);
		const flutter =
			(0.035 + 0.075 * g) * q * q * Math.sin(t * 1.15 + f.ph + q * 3.2);
		const a =
			f.a0 +
			f.droop * q * (0.55 + 0.45 * q) +
			(slope - nowSlope) * 2.4 +
			nowSlope -
			0.2 * g * across * (0.35 + q) +
			flutter +
			0.03 * Math.sin(t * 0.23 + f.ph);
		const ca = Math.cos(a);
		const sa = Math.sin(a);
		mx[k] = x + nX * was * 0.8;
		my[k] = y + nY * was * 0.8;
		nx[k] = -sa;
		ny[k] = ca;
		x += ca * step;
		y += sa * step;
		const bq = clamp((k - FIRST + 1) / (NL - FIRST + 1), 0, 1);
		if (k < FIRST) {
			eL[k] = eR[k] = 0;
			fL[k] = fR[k] = 1;
			continue;
		}
		const shape = blade(bq);
		const roll =
			f.roll +
			f.twist * (q - 0.4) +
			0.24 * Math.sin(t * 0.21 + f.ph - q * 1.1) +
			0.5 * g * (0.3 + q) * (f.side > 0 ? 1 : -1);
		const cl = Math.cos(roll + FOLD);
		const cr = Math.cos(roll - FOLD);
		fL[k] = cl;
		fR[k] = cr;
		const w = f.wid * shape;
		// An entire margin: long slow waves, never teeth.
		eL[k] = w * cl * (1 + 0.1 * Math.sin(q * 9.5 + f.ph));
		eR[k] = -w * cr * (1 + 0.1 * Math.sin(q * 8.3 + f.ph * 1.7));
	}
}

function tracePart(
	c: Ctx,
	e: Float32Array,
	a: number,
	b: number,
	sx: number,
	sy: number,
	ex: number,
	ey: number,
) {
	c.beginPath();
	c.moveTo(sx, sy);
	for (let k = a; k <= b; k++) c.lineTo(mx[k], my[k]);
	c.lineTo(ex, ey);
	for (let k = b; k >= a; k--)
		c.lineTo(mx[k] + nx[k] * e[k], my[k] + ny[k] * e[k]);
	c.closePath();
}

/** One half of a blade, split wherever it turns edge-on. */
function fillHalf(
	c: Ctx,
	ink: Ink,
	e: Float32Array,
	face: Float32Array,
	bias: number,
) {
	let a = FIRST;
	let sx = mx[FIRST - 1];
	let sy = my[FIRST - 1];
	for (let k = FIRST; k <= NL; k++) {
		const end = k === NL;
		const flips = !end && face[k] > 0 !== face[k + 1] > 0;
		if (!end && !flips) continue;
		let ex = mx[k];
		let ey = my[k];
		if (flips) {
			const u = face[k] / (face[k] - face[k + 1]);
			ex += (mx[k + 1] - ex) * u;
			ey += (my[k + 1] - ey) * u;
		}
		tracePart(c, e, a, k, sx, sy, ex, ey);
		const mid = (a + k) >> 1;
		const up = face[mid] > 0;
		c.globalCompositeOperation = "destination-out";
		c.globalAlpha = 0.9;
		c.fillStyle = "#000";
		c.fill();
		c.globalCompositeOperation = "source-over";
		const open = Math.abs(face[mid]);
		const tone = (up ? ink.upTone : ink.underTone) * (1.3 - 0.5 * open + bias);
		c.globalAlpha = clamp(tone, 0.06, 0.8);
		c.fillStyle = up ? ink.up : ink.under;
		c.fill();
		a = k + 1;
		sx = ex;
		sy = ey;
	}
}

let vx = 0;
let vy = 0;
function veinAt(e: Float32Array, q: number, u: number) {
	const p = clamp(q, 0, 1) * NL;
	const i = Math.min(NL - 1, p | 0);
	const f = p - i;
	const m0 = mx[i] + (mx[i + 1] - mx[i]) * f;
	const m1 = my[i] + (my[i + 1] - my[i]) * f;
	const ex = (nx[i] + (nx[i + 1] - nx[i]) * f) * (e[i] + (e[i + 1] - e[i]) * f);
	const ey = (ny[i] + (ny[i + 1] - ny[i]) * f) * (e[i] + (e[i + 1] - e[i]) * f);
	vx = m0 + ex * u;
	vy = m1 + ey * u;
}

const faceAt = (face: Float32Array, q: number) =>
	face[Math.min(NL, Math.round(clamp(q, 0, 1) * NL))];

/** Lateral veins, sweeping forward to loop along the margin. */
function traceVeins(
	c: Ctx,
	e: Float32Array,
	face: Float32Array,
	f: Leaf,
	salt: number,
	wantUp: boolean,
) {
	const start = FIRST / NL;
	for (let j = 0; j < f.veins; j++) {
		const r = (j + 0.75 + (salt ? 0.32 : 0)) / (f.veins + 0.5);
		const q0 = start + (1 - start) * 0.9 * r ** 1.08;
		if (faceAt(face, q0 + 0.05) > 0 !== wantUp) continue;
		for (let k = 0; k <= 4; k++) {
			const u = k / 4;
			const q = q0 + (0.13 + 0.14 * (1 - r)) * u ** 1.7;
			veinAt(e, q, 0.03 + u * 0.74);
			if (k === 0) c.moveTo(vx, vy);
			else c.lineTo(vx, vy);
		}
	}
}

function drawLeaf(c: Ctx, b: Branch, f: Leaf, ink: Ink, t: number) {
	poseLeaf(b, f, t);
	const s = b.scale;

	// Petiole, thick and short, leaving the node in a curve.
	c.beginPath();
	c.moveTo(mx[0], my[0]);
	for (let k = 1; k <= FIRST + 2; k++) c.lineTo(mx[k], my[k]);
	c.globalAlpha = 0.95;
	c.strokeStyle = ink.barkLine;
	c.lineWidth = Math.max(2.4, 3.6 * s);
	c.stroke();

	// The half facing the light is paler, as on any folded leaf.
	const lit = (ny[10] * -0.75 + nx[10] * -0.5) * 0.5;
	fillHalf(c, ink, eR, fR, -lit);
	fillHalf(c, ink, eL, fL, lit);

	// The tone gathers along the midrib, where the blade folds away from us.
	c.beginPath();
	c.moveTo(mx[FIRST], my[FIRST]);
	for (let k = FIRST; k <= NL; k++)
		c.lineTo(mx[k] + nx[k] * eL[k] * 0.42, my[k] + ny[k] * eL[k] * 0.42);
	for (let k = NL; k >= FIRST; k--)
		c.lineTo(mx[k] + nx[k] * eR[k] * 0.42, my[k] + ny[k] * eR[k] * 0.42);
	c.closePath();
	c.globalAlpha = 0.14;
	c.fillStyle = ink.up;
	c.fill();

	// A long gloss down the half turned to the light.
	const shiny = lit > 0 ? eL : eR;
	const face = lit > 0 ? fL : fR;
	const sheen = smooth(0.55, 0.95, face[12]) * 0.8;
	if (sheen > 0.01) {
		c.beginPath();
		for (let k = 7; k <= 19; k++) {
			const x = mx[k] + nx[k] * shiny[k] * 0.58;
			const y = my[k] + ny[k] * shiny[k] * 0.58;
			if (k === 7) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.lineWidth = Math.max(2, f.wid * 0.2);
		if (ink.cut) {
			c.globalCompositeOperation = "destination-out";
			c.globalAlpha = sheen;
			c.strokeStyle = "#000";
		} else {
			c.globalAlpha = sheen * 0.4;
			c.strokeStyle = ink.pale;
		}
		c.stroke();
		c.globalCompositeOperation = "source-over";
	}

	// Sunk on the glossy upper face...
	c.strokeStyle = ink.vein;
	c.globalAlpha = 0.86;
	c.lineWidth = Math.max(2.1, 2.5 * s);
	c.beginPath();
	traceVeins(c, eL, fL, f, 0, true);
	traceVeins(c, eR, fR, f, 1, true);
	c.stroke();
	// ...raised and fine on the pale underside.
	c.globalAlpha = 0.66;
	c.lineWidth = Math.max(1.9, 2.2 * s);
	c.beginPath();
	traceVeins(c, eL, fL, f, 0, false);
	traceVeins(c, eR, fR, f, 1, false);
	c.stroke();

	// The margin, one engraved line.
	c.beginPath();
	for (let k = FIRST - 1; k <= NL; k++) {
		const x = mx[k] + nx[k] * eL[k];
		const y = my[k] + ny[k] * eL[k];
		if (k === FIRST - 1) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	for (let k = NL; k >= FIRST - 1; k--)
		c.lineTo(mx[k] + nx[k] * eR[k], my[k] + ny[k] * eR[k]);
	c.globalAlpha = 0.86;
	c.strokeStyle = ink.edge;
	c.lineWidth = Math.max(2, 2.2 * s);
	c.stroke();

	// Midrib: a cord that thins to the tip.
	c.strokeStyle = ink.edge;
	c.globalAlpha = 0.95;
	for (const [to, w] of [
		[NL, 2.2],
		[(NL * 0.62) | 0, 3.2],
	] as const) {
		c.beginPath();
		c.moveTo(mx[FIRST - 1], my[FIRST - 1]);
		for (let k = FIRST; k <= to; k++) c.lineTo(mx[k], my[k]);
		c.lineWidth = Math.max(2, w * s);
		c.stroke();
	}
}

function drawStem(c: Ctx, b: Branch, ink: Ink) {
	const { px, py, n, tx, ty, hw } = b;
	const trace = (from: number, to: number) => {
		c.beginPath();
		for (let i = from; i <= to; i++) {
			const x = px[i] - ty[i] * hw[i];
			const y = py[i] + tx[i] * hw[i];
			if (i === from) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		for (let i = to; i >= from; i--)
			c.lineTo(px[i] + ty[i] * hw[i], py[i] - tx[i] * hw[i]);
		c.closePath();
	};
	trace(0, n);
	c.globalCompositeOperation = "destination-out";
	c.globalAlpha = 0.9;
	c.fillStyle = "#000";
	c.fill();
	c.globalCompositeOperation = "source-over";
	c.globalAlpha = 1;
	c.fillStyle = ink.bark;
	c.fill();
	trace(Math.round(n * 0.62), n);
	c.fillStyle = ink.shoot;
	c.fill();
	c.strokeStyle = ink.barkLine;
	c.lineWidth = 1.5;

	// Bark: short ticks across the shadow side, thinning out up the shoot.
	c.beginPath();
	for (const i of b.ticks) {
		const h = hw[i];
		c.moveTo(px[i] + ty[i] * h, py[i] - tx[i] * h);
		c.lineTo(
			px[i] - ty[i] * h * 0.2 + tx[i] * 2.5,
			py[i] + tx[i] * h * 0.2 + ty[i] * 2.5,
		);
	}
	c.globalAlpha = 0.9;
	c.lineWidth = 2;
	c.stroke();

	// Interpetiolar stipules: the small triangle across a coffee node.
	c.beginPath();
	for (const node of b.nodes) {
		const i = Math.round(node * n);
		const h = hw[i];
		const size = 5 * Math.max(0.8, b.scale);
		for (const side of [1, -1]) {
			const x = px[i] - ty[i] * h * side;
			const y = py[i] + tx[i] * h * side;
			c.moveTo(x - tx[i] * size, y - ty[i] * size);
			c.lineTo(x + tx[i] * size, y + ty[i] * size);
			c.lineTo(
				x + tx[i] * size * 1.4 - ty[i] * size * side,
				y + ty[i] * size * 1.4 + tx[i] * size * side,
			);
			c.closePath();
		}
	}
	c.globalAlpha = 0.85;
	c.fillStyle = ink.barkLine;
	c.fill();
}

/** Ripeness creeps on a five minute swell, so the mix of stages always holds. */
function drawFruit(c: Ctx, b: Branch, f: Fruit, ink: Ink, t: number) {
	const d = (shift(b, f.s, t - 1) - shift(b, f.s, t)) * 0.5;
	const sway = 0.05 * Math.sin(t * 0.41 + f.ph);
	const nodeX = b.px[f.i];
	const nodeY = b.py[f.i];
	const x = nodeX + f.ox - b.ty[f.i] * d;
	const y = nodeY + f.oy + b.tx[f.i] * d;
	const rot = f.rot + sway;
	const ripe = clamp(f.ripe + 0.11 * Math.sin((t * TAU) / 300 + f.ph), 0, 1);
	const stage = (ripe * 64) | 0;

	// Pedicel back to the stem.
	c.beginPath();
	c.moveTo(nodeX, nodeY);
	c.lineTo(x, y);
	c.globalAlpha = 0.8;
	c.strokeStyle = ink.barkLine;
	c.lineWidth = 2;
	c.stroke();

	c.beginPath();
	c.ellipse(x, y, f.rx, f.ry, rot, 0, TAU);
	c.globalCompositeOperation = "destination-out";
	c.globalAlpha = 0.95;
	c.fillStyle = "#000";
	c.fill();
	c.globalCompositeOperation = "source-over";
	c.globalAlpha = 0.86;
	c.fillStyle = ink.fruit[stage];
	c.fill();

	// Form shadow as engraved crescents, always from the upper left light.
	const away = 0.9 - rot;
	for (let k = 0; k < 2; k++) {
		const m = 0.9 - k * 0.24;
		c.beginPath();
		c.ellipse(x, y, f.rx * m, f.ry * m, rot, away - 1.2, away + 1.2);
		c.globalAlpha = 0.62 - k * 0.2;
		c.strokeStyle = ink.shade[stage];
		c.lineWidth = Math.max(2, 2.8 * b.scale);
		c.stroke();
	}
	// Gloss.
	c.beginPath();
	c.ellipse(
		x - f.rx * 0.34,
		y - f.ry * 0.46,
		f.rx * 0.2,
		f.ry * 0.14,
		-0.6,
		0,
		TAU,
	);
	if (ink.cut) {
		c.globalCompositeOperation = "destination-out";
		c.globalAlpha = 0.86;
		c.fillStyle = "#000";
	} else {
		c.globalAlpha = 0.6;
		c.fillStyle = ink.pale;
	}
	c.fill();
	c.globalCompositeOperation = "source-over";

	c.beginPath();
	c.ellipse(x, y, f.rx, f.ry, rot, 0, TAU);
	c.globalAlpha = 0.85;
	c.strokeStyle = ink.shade[stage];
	c.lineWidth = 1.9;
	c.stroke();

	// The crown: the calyx scar at the far end, turned a little toward us.
	const cr = 1 - 0.42 * f.face;
	const cx = x + Math.cos(rot) * f.rx * cr;
	const cy = y + Math.sin(rot) * f.rx * cr;
	const size = Math.max(2.4, 3.4 * b.scale);
	c.beginPath();
	c.ellipse(cx, cy, size * (0.6 + 0.4 * f.face), size, rot, 0, TAU);
	c.globalAlpha = 1;
	c.fillStyle = ink.crown;
	c.fill();
}

function drawBloom(c: Ctx, b: Branch, f: Bloom, ink: Ink, t: number) {
	const d = (shift(b, f.s, t - 1.2) - shift(b, f.s, t)) * 0.6;
	const nodeX = b.px[f.i];
	const nodeY = b.py[f.i];
	const x = nodeX + f.ox - b.ty[f.i] * d;
	const y = nodeY + f.oy + b.tx[f.i] * d;
	const wob = 0.05 * Math.sin(t * 0.37 + f.ph);

	// Pedicel, then the flower.
	c.beginPath();
	c.moveTo(nodeX, nodeY);
	c.lineTo(x, y);
	c.globalAlpha = 0.85;
	c.strokeStyle = ink.barkLine;
	c.lineWidth = 2;
	c.stroke();

	const paper = (tone: number) => {
		c.globalCompositeOperation = "destination-out";
		c.globalAlpha = 1;
		c.fillStyle = "#000";
		c.fill();
		c.globalCompositeOperation = "source-over";
		c.globalAlpha = tone;
		c.fillStyle = ink.petal;
		c.fill();
	};
	const edge = ink.cut ? 0.2 : 0.62;
	// A pencil line on light paper. On dark, a cut that parts one petal from the next.
	const rim = () => {
		if (ink.cut) {
			c.globalAlpha = 1;
			c.strokeStyle = ink.line;
		} else {
			c.globalCompositeOperation = "destination-out";
			c.globalAlpha = 1;
			c.strokeStyle = "#000";
		}
		c.lineWidth = 2;
		c.stroke();
		c.globalCompositeOperation = "source-over";
	};

	if (f.bud) {
		// A bud is a long white club, the corolla still furled.
		const a = f.dir + wob;
		const ca = Math.cos(a);
		const sa = Math.sin(a);
		const r = f.r;
		const wx = -sa * r * 0.38;
		const wy = ca * r * 0.38;
		c.beginPath();
		c.moveTo(x, y);
		c.bezierCurveTo(
			x + ca * r * 0.5 + wx * 0.3,
			y + sa * r * 0.5 + wy * 0.3,
			x + ca * r * 0.9 + wx,
			y + sa * r * 0.9 + wy,
			x + ca * r,
			y + sa * r,
		);
		c.bezierCurveTo(
			x + ca * r * 0.9 - wx,
			y + sa * r * 0.9 - wy,
			x + ca * r * 0.5 - wx * 0.3,
			y + sa * r * 0.5 - wy * 0.3,
			x,
			y,
		);
		c.closePath();
		paper(edge);
		rim();
		return;
	}

	// Five narrow petals turning like a pinwheel, foreshortened by the tilt.
	const spin = f.spin + wob;
	const dirC = Math.cos(f.dir);
	const dirS = Math.sin(f.dir);
	const project = (u: number, v: number) => {
		const pu = u * f.tilt;
		vx = x + dirC * pu - dirS * v;
		vy = y + dirS * pu + dirC * v;
	};
	const R = f.r;
	// Each petal a blunt lobe that curves as it leaves the throat. Every one lies
	// over the last: the contorted corolla of the madder family.
	for (let k = 0; k < 5; k++) {
		const a = spin + (k / 5) * TAU;
		c.beginPath();
		for (const edgeSide of [1, -1]) {
			for (let j = 0; j <= 8; j++) {
				const u = edgeSide > 0 ? j / 8 : 1 - j / 8;
				const along = R * (0.05 + 0.95 * u);
				const ang = a + 0.34 * u * u;
				const w = R * 0.3 * Math.sin(Math.PI * u ** 0.8) ** 0.75 * edgeSide;
				project(
					Math.cos(ang) * along - Math.sin(ang) * w,
					Math.sin(ang) * along + Math.cos(ang) * w,
				);
				if (j === 0 && edgeSide > 0) c.moveTo(vx, vy);
				else c.lineTo(vx, vy);
			}
		}
		c.closePath();
		paper(edge);
		rim();
	}

	// Stamens stand in the throat: only the anthers carry any weight.
	c.beginPath();
	for (let k = 0; k < 5; k++) {
		const a = spin + ((k + 0.5) / 5) * TAU;
		project(Math.cos(a) * R * 0.16, Math.sin(a) * R * 0.16);
		c.moveTo(vx, vy);
		project(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
		c.lineTo(vx, vy);
	}
	c.globalAlpha = 1;
	c.strokeStyle = ink.anther;
	c.lineWidth = 2.2;
	c.stroke();
}

function paint(g: Ctx, b: Branch, ink: Ink, t: number) {
	poseStem(b, t);
	g.lineCap = "butt";
	g.lineJoin = "bevel";
	for (const f of b.leaves) if (f.back) drawLeaf(g, b, f, ink, t);
	for (const f of b.fruit) if (f.back) drawFruit(g, b, f, ink, t);
	drawStem(g, b, ink);
	for (const f of b.leaves) if (!f.back) drawLeaf(g, b, f, ink, t);
	for (const f of b.fruit) if (!f.back) drawFruit(g, b, f, ink, t);
	for (const f of b.blooms) drawBloom(g, b, f, ink, t);
	g.globalAlpha = 1;
	g.globalCompositeOperation = "source-over";
}

/** Paints per second. The engine runs at 24, so a branch paints every third. */
const RATE = 8;

export const cherry: Scene = ({ dither: c }, { t, W, H, anchors, dark }) => {
	const L = lanesFor(W, anchors.content);
	const phone = W < 600;
	// Lanes centre each gutter, so a gutter is twice its lane. Without an anchor
	// the page's own column applies.
	const fallback = Math.max(0, (W - 1024) / 2);
	const gl = L.legacy ? fallback : L.f[0] ? L.x[0] * 2 : 0;
	const gr = L.legacy ? fallback : L.f[1] ? (W - L.x[1]) * 2 : 0;
	const theme = dark ? "dark" : "light";
	const ink = INKS[theme];
	const scale = c.getTransform().a;
	const branches = branchesFor(W, H, gl, gr, phone);
	c.imageSmoothingEnabled = false;
	branches.forEach((b, index) => {
		// Whole lattice cells, so the blit is one to one.
		const x0 = Math.floor(b.clipX * scale);
		const w = Math.ceil(b.clipW * scale);
		const h = Math.ceil(H * scale);
		const offset = index / branches.length;
		const beat = Math.floor(t * RATE + offset);
		const key = `${beat}|${theme}|${w}|${h}|${scale}`;
		if (key !== b.painted) {
			b.painted = key;
			const { layer, g } = b;
			if (layer.width !== w || layer.height !== h) {
				layer.width = w;
				layer.height = h;
			}
			g.setTransform(1, 0, 0, 1, 0, 0);
			g.clearRect(0, 0, w, h);
			g.setTransform(scale, 0, 0, scale, -x0, 0);
			paint(g, b, ink, (beat - offset) / RATE);
		}
		c.drawImage(b.layer, x0 / scale, 0, w / scale, h / scale);
	});
};
