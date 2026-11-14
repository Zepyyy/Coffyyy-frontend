import type { Scene } from "../engine";

/**
 * Leaffall: elm boughs hanging into a pond.
 *
 * One breeze runs the whole picture. Each gust loads the boughs, roughens the
 * water as it crosses it, and tears one leaf from a real node. That leaf is a
 * tilted lamina in 3D: it sways down through the open gutter it fell from (the
 * cards hide the field, and the lattice smears anything quick), flattens, and
 * touches the surface where a slowly widening ring pushes the mirrored boughs
 * (and the pond's own engraved lines) aside. It then floats off with the
 * breeze, bare nodes grow their leaf back over the long cycle.
 *
 * Everything is an analytic function of t. The pond is not a sheet laid over the
 * page: it is the two gutters the boughs hang over (their reflection, a pale
 * tint, engraved level lines) plus a small pool that rides under each leaf on
 * the surface. Everywhere else the paper stays bare. The water is a perspective
 * field of engraved level lines, drawn only inside those pools; the mirror is read through the same wave field that
 * bends the lines, so reflection and surface can never disagree.
 */

type C = CanvasRenderingContext2D;
type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const { sin, cos, exp, log, sqrt, floor, ceil, abs, min, max, round } = Math;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
function hash(a: number, b = 0) {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const mod = (a: number, n: number) => ((a % n) + n) % n;
const css = (c: Rgb, a = 1) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;

/* ------------------------------------------------------------------ ink */

type Ink = {
	/** Leaf faces: four gradient stops per variety, as in the original pigment. */
	top: Rgb[][];
	under: Rgb[][];
	vein: Rgb;
	veinUnder: Rgb;
	rim: Rgb;
	rimA: number;
	stalk: Rgb;
	bark: Rgb;
	barkHi: Rgb;
	barkLo: Rgb;
	water: Rgb;
	warm: Rgb;
	bank: Rgb;
	bankWarm: Rgb;
	wash: number;
	hair: number;
	refl: number;
	tone: number;
};

const INKS: Record<"light" | "dark", Ink> = {
	light: {
		top: [
			[
				[178, 147, 80],
				[169, 135, 70],
				[119, 80, 56],
				[178, 129, 80],
			],
			[
				[178, 147, 80],
				[161, 107, 73],
				[119, 80, 56],
				[178, 129, 80],
			],
			[
				[196, 156, 88],
				[186, 122, 66],
				[126, 78, 52],
				[190, 132, 78],
			],
			[
				[160, 146, 84],
				[146, 122, 70],
				[102, 80, 54],
				[160, 124, 78],
			],
		],
		under: [
			[
				[214, 190, 148],
				[188, 156, 112],
				[152, 116, 84],
			],
		],
		vein: [207, 171, 114],
		veinUnder: [120, 84, 60],
		rim: [92, 62, 42],
		rimA: 0.72,
		stalk: [112, 86, 62],
		bark: [118, 96, 76],
		barkHi: [176, 152, 122],
		barkLo: [74, 58, 46],
		water: [86, 134, 148],
		warm: [188, 140, 84],
		bank: [128, 126, 98],
		bankWarm: [176, 128, 78],
		wash: 0.085,
		hair: 0.62,
		refl: 0.8,
		tone: 0.94,
	},
	dark: {
		top: [
			[
				[208, 180, 117],
				[169, 135, 70],
				[112, 91, 66],
				[181, 140, 89],
			],
			[
				[208, 180, 117],
				[161, 107, 73],
				[112, 91, 66],
				[181, 140, 89],
			],
			[
				[224, 190, 120],
				[196, 132, 78],
				[128, 98, 70],
				[206, 150, 96],
			],
			[
				[196, 184, 122],
				[160, 138, 82],
				[110, 94, 66],
				[180, 146, 92],
			],
		],
		under: [
			[
				[232, 214, 178],
				[206, 178, 136],
				[170, 142, 106],
			],
		],
		vein: [208, 181, 131],
		veinUnder: [236, 216, 176],
		rim: [140, 108, 74],
		rimA: 0.7,
		stalk: [170, 148, 116],
		bark: [160, 144, 120],
		barkHi: [214, 198, 168],
		barkLo: [96, 84, 68],
		water: [120, 172, 188],
		warm: [206, 160, 100],
		bank: [160, 160, 130],
		bankWarm: [196, 150, 98],
		wash: 0.08,
		hair: 0.58,
		refl: 0.76,
		tone: 0.88,
	},
};

/* ------------------------------------------------------------ the leaf */

/** Elm blade in unit coordinates: base at (0,0), tip at (1,0), toothed margin,
 * oblique base (the lower side is the wider), ten pairs of straight veins. */
function blade(u: number, s: number) {
	const a = s > 0 ? 0.58 : 0.7;
	const b = s > 0 ? 0.82 : 0.95;
	const pk = (a ** a * b ** b) / (a + b) ** (a + b);
	const wmax = s > 0 ? 0.27 : 0.22;
	let w = (wmax * (u ** a * (1 - u) ** b)) / pk;
	if (s > 0) w += 0.05 * max(0, 1 - u / 0.14) ** 1.5;
	return w;
}

const TEETH = 10;
const OUTLINE = (() => {
	const p = new Path2D();
	p.moveTo(0, 0);
	const side = (s: number) => {
		const pts: [number, number][] = [];
		for (let j = 0; j <= TEETH; j++) {
			const u0 = 0.07 + (0.9 * j) / TEETH;
			const u1 = min(u0 + (0.9 / TEETH) * 0.78, 0.985);
			pts.push([u0, s * (blade(u0, s) - 0.012)]);
			pts.push([u1, s * (blade(u1, s) + 0.028)]);
		}
		return pts;
	};
	for (const [x, y] of side(-1)) p.lineTo(x, y);
	p.lineTo(1.03, 0);
	for (const [x, y] of side(1).reverse()) p.lineTo(x, y);
	p.closePath();
	return p;
})();

const VEINS = (() => {
	const p = new Path2D();
	p.moveTo(0, 0);
	p.quadraticCurveTo(0.5, 0.012, 0.97, 0);
	for (let j = 0; j < 10; j++) {
		const u = 0.13 + 0.078 * j;
		const ue = min(u + 0.14, 0.96);
		for (const s of [-1, 1]) {
			p.moveTo(u, 0.003 * s);
			p.quadraticCurveTo(
				u + 0.07,
				s * blade(u + 0.07, s) * 0.3,
				ue,
				s * (blade(ue, s) - 0.004),
			);
		}
	}
	return p;
})();

type Basis = {
	ux: number;
	uy: number;
	wx: number;
	wy: number;
	/** The face toward the viewer is the top face. */
	top: boolean;
	lit: number;
};

/** Sine of the view elevation at the boughs' own water line. */
const SE = 0.32;
const CE = sqrt(1 - SE * SE);
const LIGHT = [-0.35, 0.8, 0.5];

/**
 * Lamina axes after Rx(phi), Rz(-a), Ry(yaw), projected by an orthographic
 * view that looks slightly down on the water. phi = pi/2 with yaw = 0 is a
 * leaf hanging face-on to the page; phi = 0 is a leaf lying on the water.
 */
function basis(
	a: number,
	phi: number,
	yaw: number,
	mirror: boolean,
	se = SE,
): Basis {
	const ce = sqrt(1 - se * se);
	const cp = cos(phi);
	const sp = sin(phi);
	const ca = cos(a);
	const sa = sin(a);
	const cy = cos(yaw);
	const sy = sin(yaw);
	let ux = ca;
	let uy = -sa;
	let uz = 0;
	let wx = -sp * sa;
	let wy = -sp * ca;
	let wz = cp;
	let nx = cp * sa;
	let ny = cp * ca;
	let nz = sp;
	[ux, uz] = [ux * cy + uz * sy, -ux * sy + uz * cy];
	[wx, wz] = [wx * cy + wz * sy, -wx * sy + wz * cy];
	[nx, nz] = [nx * cy + nz * sy, -nx * sy + nz * cy];
	if (mirror) {
		uy = -uy;
		wy = -wy;
		ny = -ny;
	}
	const top = ny * se + nz * ce > 0;
	const dot = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
	return {
		ux,
		uy: -uy * ce + uz * se,
		wx,
		wy: -wy * ce + wz * se,
		top,
		lit: clamp(0.4 + 0.6 * (top ? dot : -dot), 0, 1),
	};
}

/** Paint one blade with its base at (x, y), css px. */
function paintLeaf(
	g: C,
	k: number,
	b: Basis,
	x: number,
	y: number,
	L: number,
	flip: number,
	variety: number,
	alpha: number,
	ink: Ink,
	shadow = 0,
) {
	g.setTransform(
		k * b.ux * L,
		k * b.uy * L,
		k * b.wx * L * flip,
		k * b.wy * L * flip,
		k * x,
		k * y,
	);
	const sc = clamp(sqrt(abs(b.ux * b.wy - b.uy * b.wx)) * 1.2, 0.35, 1);
	const px = (n: number) => n / (L * sc);
	if (shadow > 0) {
		g.save();
		g.translate(0, px(2.4) / max(0.2, abs(b.wy)));
		g.globalAlpha = shadow;
		g.fillStyle = css(ink.water);
		g.fill(OUTLINE);
		g.restore();
	}
	const stops = b.top ? ink.top[variety] : ink.under[0];
	const grad = g.createLinearGradient(0, -0.3, 0.2, 0.3);
	if (b.top) {
		grad.addColorStop(0, css(stops[0]));
		grad.addColorStop(0.42, css(stops[1]));
		grad.addColorStop(0.55, css(stops[2]));
		grad.addColorStop(1, css(stops[3]));
	} else {
		grad.addColorStop(0, css(stops[0]));
		grad.addColorStop(0.5, css(stops[1]));
		grad.addColorStop(1, css(stops[2]));
	}
	g.globalAlpha = alpha * (0.78 + 0.22 * b.lit);
	g.fillStyle = grad;
	g.fill(OUTLINE);
	g.lineJoin = "round";
	g.lineCap = "round";
	g.globalAlpha = alpha * (b.top ? 0.8 : 0.6);
	g.strokeStyle = css(b.top ? ink.vein : ink.veinUnder);
	g.lineWidth = px(b.top ? 1.5 : 1.8);
	g.stroke(VEINS);
	g.globalAlpha = alpha * ink.rimA;
	g.strokeStyle = css(ink.rim);
	g.lineWidth = px(1.5);
	g.stroke(OUTLINE);
}

/* ----------------------------------------------------------------- wind */

const P = 11;
const slotT = (k: number) => 4.5 + P * k + 2.6 * (2 * hash(k, 1) - 1);
const slotA = (k: number) => 0.55 + 0.6 * hash(k, 2);
const GW = 2.6;
const bump = (x: number, w: number) =>
	x <= -w || x >= w ? 0 : cos((Math.PI * x) / (2 * w)) ** 2;
/** Gust integral from -w to x of the bump. */
const bumpInt = (x: number, w: number) =>
	x <= -w
		? 0
		: x >= w
			? w
			: (x + w) / 2 + (w / (2 * Math.PI)) * sin((Math.PI * x) / w);

function gust(t: number) {
	const s = round((t - 4.5) / P);
	let g = 0;
	for (let k = s - 2; k <= s + 2; k++)
		g += slotA(k) * bump(t - (slotT(k) - 0.5), GW);
	return g;
}
function wind(t: number) {
	return 0.3 + 0.12 * sin(0.23 * t) + 0.07 * sin(0.61 * t + 2) + gust(t);
}
/** Distance the breeze has pushed something between t1 and t2, in wind-seconds. */
function windDelta(t1: number, t2: number) {
	const base = (t: number) =>
		0.3 * t - (0.12 / 0.23) * cos(0.23 * t) - (0.07 / 0.61) * cos(0.61 * t + 2);
	let g = 0;
	const lo = floor((t1 - 4.5) / P) - 2;
	const hi = ceil((t2 - 4.5) / P) + 2;
	for (let k = lo; k <= hi; k++) {
		const c = slotT(k) - 0.5;
		g += slotA(k) * (bumpInt(t2 - c, GW) - bumpInt(t1 - c, GW));
	}
	return base(t2) - base(t1) + g;
}

/* ----------------------------------------------------------------- plan */

type Bough = {
	rx: Float32Array;
	ry: Float32Array;
	w0: number;
	w1: number;
	flex: number;
	lag: number;
};

type Leaf = {
	bough: number;
	node: number;
	side: number;
	size: number;
	variety: number;
	ph: number;
	a0: number;
	pet: number;
	/** Place in the release order, or -1 for leaves that stay. */
	slot: number;
	/** Paint order, far to near. */
	z: number;
};

type Flight = {
	k: number;
	leaf: number;
	T: number;
	D: number;
	x0: number;
	Yc: number;
	vt: number;
	tau0: number;
	dyL: number;
	vw: number;
	amp: number;
	om: number;
	psi: number;
	tilt: number;
	tum: number;
	om2: number;
	psi2: number;
	target: number;
	yawL: number;
	yLand: number;
	xLand: number;
	vd: number;
	vy: number;
	leafA: number;
	delta: number;
};

type Line = { y: number; v: number; cs: number; on: number; sp: number };

type Plan = {
	key: string;
	W: number;
	H: number;
	U: number;
	yh: number;
	yp: number;
	u0: number;
	/** Open gutters beside the content. */
	gl: number;
	gr: number;
	/** Reach of the left and right pools, css px from each page edge. */
	wl: number;
	wr: number;
	wash: HTMLCanvasElement | null;
	land0: number;
	boughs: Bough[];
	leaves: Leaf[];
	order: number[];
	draw: number[];
	lines: Line[];
	flights: Map<number, Flight>;
	size: string;
	mir: HTMLCanvasElement | null;
	mirG: C | null;
	refl: HTMLCanvasElement | null;
	reflG: C | null;
	img: ImageData | null;
	bank: HTMLCanvasElement | null;
	bankKey: string;
	bankTop: number;
	colS: Float32Array[];
	colC: Float32Array[];
	beat: number;
	reflKey: string;
	rect: [number, number, number, number];
};

const LINE_R = 0.92;
const NODES = 7;

function sample(pts: number[], n: number) {
	const x = new Float32Array(n + 1);
	const y = new Float32Array(n + 1);
	for (let i = 0; i <= n; i++) {
		const u = i / n;
		const v = 1 - u;
		x[i] =
			v * v * v * pts[0] +
			3 * v * v * u * pts[2] +
			3 * v * u * u * pts[4] +
			u * u * u * pts[6];
		y[i] =
			v * v * v * pts[1] +
			3 * v * v * u * pts[3] +
			3 * v * u * u * pts[5] +
			u * u * u * pts[7];
	}
	return { x, y };
}

function plan(
	key: string,
	W: number,
	H: number,
	gl: number,
	gr: number,
	shelfBottom: number,
): Plan {
	const U = clamp(min(W / 1440, H / 836), 0.85, 1.4);
	const yp = round(H * 0.52);
	const yh = round(H * 0.3);
	const boughs: Bough[] = [];
	const leaves: Leaf[] = [];
	let uid = 0;
	const add = (
		pts: number[],
		w0: number,
		w1: number,
		flex: number,
		lag: number,
		n: number,
	) => {
		const { x, y } = sample(pts, n);
		boughs.push({ rx: x, ry: y, w0: w0 * U, w1: w1 * U, flex: flex * U, lag });
		return boughs.length - 1;
	};
	const put = (
		b: number,
		node: number,
		side: number,
		size: number,
		release: boolean,
	) => {
		uid++;
		leaves.push({
			bough: b,
			node,
			side,
			size: size * U * (0.88 + 0.24 * hash(uid, 3)),
			variety: floor(hash(uid, 4) * 4),
			ph: hash(uid, 5) * TAU,
			a0:
				node === NODES
					? Math.PI / 2 + (hash(uid, 8) - 0.5) * 0.6
					: Math.PI / 2 - side * (0.5 + 0.55 * hash(uid, 6)),
			pet: (9 + 5 * hash(uid, 7)) * U,
			slot: release ? 0 : -1,
			z: hash(uid, 9),
		});
	};
	type Twig = {
		at: number;
		dx: number;
		end: number;
		bend: number;
		first: number;
	};
	const bough = (
		limb: number[],
		twigs: Twig[],
		sizeScale: number,
		spurs: number[],
	) => {
		const lb = add(limb, 24, 6, 3, 0, 24);
		const L = boughs[lb];
		twigs.forEach((tg, i) => {
			const j = round(tg.at * 24);
			const x0 = L.rx[j];
			const y0 = L.ry[j];
			const len = tg.end - y0;
			const x1 = x0 + tg.bend * U;
			const tw = sample(
				[
					x0,
					y0,
					x0 + tg.dx * U,
					y0 + len * 0.12,
					x1 + tg.dx * 0.35 * U,
					y0 + len * 0.55,
					x1,
					tg.end,
				],
				NODES,
			);
			// Elm twigs zigzag at every node.
			for (let n = 1; n <= NODES; n++)
				tw.x[n] += (n & 1 ? 1 : -1) * 4.5 * U * (1 - 0.5 * (n / NODES));
			boughs.push({
				rx: tw.x,
				ry: tw.y,
				w0: 8 * U,
				w1: 3.2 * U,
				flex: 15 * U,
				lag: 0.6 + 0.3 * i,
			});
			const b = boughs.length - 1;
			for (let n = tg.first; n < NODES; n++)
				put(b, n, n & 1 ? 1 : -1, (100 - 26 * (n / NODES)) * sizeScale, n >= 3);
			put(b, NODES, 0, 76 * sizeScale, true);
		});
		for (const s of spurs) {
			const j = round(s * 24);
			put(lb, j, j & 1 ? 1 : -1, 86 * sizeScale, false);
		}
	};
	// The hero bough comes in over the top left and hangs into the gutter.
	const gx = max(gl, 150 * U);
	bough(
		[
			-70 * U,
			22 * U,
			gx * 0.3,
			-30 * U,
			gx * 0.7,
			40 * U,
			gx + 10 * U,
			140 * U,
		],
		[
			{ at: 0.3, dx: 30, end: yp - 185 * U, bend: 34, first: 2 },
			{ at: 0.6, dx: 22, end: yp - 215 * U, bend: 16, first: 2 },
			{ at: 0.88, dx: 14, end: yp - 170 * U, bend: -10, first: 3 },
		],
		1,
		[0.14, 0.5],
	);
	// A lighter bough answers from the top right.
	const rx = max(gr, 150 * U);
	bough(
		[
			W + 70 * U,
			36 * U,
			W - rx * 0.3,
			-10 * U,
			W - rx * 0.7,
			56 * U,
			W - rx - 10 * U,
			116 * U,
		],
		[
			{ at: 0.42, dx: -24, end: yp - 205 * U, bend: -22, first: 2 },
			{ at: 0.78, dx: -14, end: yp - 165 * U, bend: 8, first: 3 },
		],
		0.9,
		[0.16],
	);
	const releasable = leaves
		.map((l, i) => [l, i] as const)
		.filter(([l]) => l.slot === 0)
		.map(([, i]) => i)
		.sort((a, b) => hash(a, 91) - hash(b, 91));
	releasable.forEach((li, s) => {
		leaves[li].slot = s;
	});
	const lines: Line[] = [];
	const span = H + 30 - yh;
	for (let j = 0; ; j++) {
		const y = yh + span * LINE_R ** j;
		if (y - yh < 44) break;
		const v = (y - yh) / (H - yh);
		lines.push({
			y,
			v,
			cs: (26 + 84 * hash(j, 11)) * (0.3 + 0.7 * v),
			on: 0.5 + 0.2 * hash(j, 12),
			sp: (3 + 6 * hash(j, 13)) * (0.4 + v),
		});
	}
	return {
		key,
		W,
		H,
		U,
		yh,
		yp,
		u0: yp - yh,
		gl,
		gr,
		wl: min(max(gl, 150 * U) + 30 * U, 520 * U),
		wr: min(max(gr, 150 * U) + 30 * U, 520 * U),
		wash: null,
		land0: max(yp + 30 * U, shelfBottom + 36 * U),
		boughs,
		leaves,
		order: releasable,
		draw: leaves.map((_, i) => i).sort((a, b) => leaves[a].z - leaves[b].z),
		lines,
		flights: new Map(),
		size: "",
		mir: null,
		mirG: null,
		refl: null,
		reflG: null,
		img: null,
		bank: null,
		bankKey: "",
		bankTop: 0,
		colS: [],
		colC: [],
		beat: -1,
		reflKey: "",
		rect: [0, 0, 0, 0],
	};
}

/* ---------------------------------------------------------- on the bough */

type Posed = {
	x: number;
	y: number;
	a: number;
	delta: number;
	bx: number;
	by: number;
};

function flexOf(_p: Plan, b: Bough, i: number, t: number) {
	const u = i / (b.rx.length - 1);
	const w = wind(t - b.lag - u * 1.2);
	const d = b.flex * u ** 1.5 * (w - 0.3);
	return [-d * 0.9, d * 0.35] as const;
}

function leafPosed(p: Plan, lf: Leaf, t: number, strain: number): Posed {
	const b = p.boughs[lf.bough];
	const [dx, dy] = flexOf(p, b, lf.node, t);
	const x = b.rx[lf.node] + dx;
	const y = b.ry[lf.node] + dy;
	const w = wind(t - 0.5);
	const pulse = 1 + strain * 1.6;
	const a =
		lf.a0 -
		0.45 * (w - 0.3) +
		0.1 * pulse * sin(1.15 * t + lf.ph) * (0.6 + w) +
		strain * 0.06 * sin(9 * t);
	const delta = 0.35 * sin(0.9 * t + lf.ph * 1.7) * (0.4 + w) * pulse;
	return { x, y, a, delta, bx: x + cos(a) * lf.pet, by: y + sin(a) * lf.pet };
}

/** When a leaf last let go, and how long until it lets go again. */
function leafClock(p: Plan, lf: Leaf, t: number) {
	if (lf.slot < 0)
		return { rho: Number.POSITIVE_INFINITY, until: Number.POSITIVE_INFINITY };
	const n = p.order.length;
	const kNow = floor((t - 4.5) / P) + 1;
	let k = lf.slot + n * floor((kNow - lf.slot) / n);
	if (slotT(k) > t) k -= n;
	return { rho: t - slotT(k), until: slotT(k + n) - t };
}

/* ---------------------------------------------------------------- flight */

const LIFE = 72;
const BARE = 34;
const GROWN = 90;

function flightOf(p: Plan, k: number): Flight {
	const hit = p.flights.get(k);
	if (hit) return hit;
	const li = p.order[mod(k, p.order.length)];
	const lf = p.leaves[li];
	const T = slotT(k);
	const ps = leafPosed(p, lf, T, 1);
	const L = lf.size;
	const hang = basis(ps.a, Math.PI / 2 + ps.delta, 0, false);
	const cx = ps.bx + hang.ux * L * 0.45;
	const cy = ps.by + hang.uy * L * 0.45;
	const Yc = (p.yp - cy) / CE;
	// The lattice cannot light a dot faster than about a third of a second, so a
	// quick leaf smears into a ghost. Keep the fall and sway slow enough to read.
	const vt = (21 + 8 * hash(k, 21)) * p.U;
	const tau0 = 0.8;
	const fall = (s: number) => vt * (s - tau0 * (1 - exp(-s / tau0)));
	let lo = 0;
	let hi = 40;
	for (let i = 0; i < 40; i++) {
		const m = (lo + hi) / 2;
		if (fall(m) < Yc) lo = m;
		else hi = m;
	}
	// Spread across the open strip below the cards, not piled on its edge.
	const yLand = min(
		p.land0 + max(0, p.H - 90 - p.land0) * hash(k, 22),
		p.H - 90,
	);
	const dir = cx < p.W / 2 ? 1 : -1;
	const target = dir > 0 ? 0 : Math.PI;
	const f: Flight = {
		k,
		leaf: li,
		T,
		D: lo,
		x0: cx,
		Yc,
		vt,
		tau0,
		dyL: yLand - p.yp,
		vw: dir * (13 + 12 * hash(k, 23)) * p.U,
		amp: (22 + 22 * hash(k, 24)) * p.U,
		om: TAU / (5 + 1.6 * hash(k, 25)),
		psi: hash(k, 26) * TAU,
		tilt: 0.5 + 0.3 * hash(k, 27),
		// Rocking, not somersaulting: edge-on the leaf is too thin to survive the lattice.
		tum:
			hash(k, 28) < 0.3 ? 0.62 + 0.14 * hash(k, 29) : 0.3 + 0.2 * hash(k, 29),
		om2: TAU / (4.1 + 1.5 * hash(k, 30)),
		psi2: hash(k, 31) * TAU,
		target,
		yawL: (hash(k, 32) - 0.5) * 0.9,
		yLand,
		xLand: 0,
		vd: dir * (18 + 14 * hash(k, 33)) * p.U,
		vy: (hash(k, 34) - 0.4) * 1.6,
		leafA: ps.a,
		delta: ps.delta,
	};
	f.xLand = flightAt(p, f, f.D).X;
	if (p.flights.size > 40) p.flights.clear();
	p.flights.set(k, f);
	return f;
}

/**
 * Cards hide the field, so a falling leaf keeps to the open gutter it fell
 * from: the breeze may only carry it inward as far as the gutter allows, and
 * the sway still swings it. Once it lies on the water the breeze is free again.
 */
function gutterDrift(p: Plan, f: Flight, tau: number, drift: number) {
	const inward = f.x0 < p.W / 2 ? 1 : -1;
	const L = p.leaves[f.leaf].size;
	const pad = 6 * p.U + 0.4 * L + 0.25 * f.amp;
	const room = inward > 0 ? p.gl - pad - f.x0 : f.x0 - (p.W - p.gr + pad);
	const k = 9 * p.U;
	const d0 = 30 * p.U;
	const dmax = d0 + (room - d0) * smooth(0, 3.2, tau);
	const d = drift * inward;
	return inward * (dmax - k * log(1 + exp((dmax - d) / k)));
}

/** World position and lamina pose of a leaf tau seconds after letting go. */
function flightAt(p: Plan, f: Flight, tau: number) {
	const D = f.D;
	const g = 1 - exp(-tau / 1.4);
	const calm = 1 - smooth(D - 2.0, D - 0.2, tau);
	const X =
		f.x0 +
		gutterDrift(p, f, tau, f.vw * windDelta(f.T, f.T + tau)) +
		f.amp * g * calm * sin(f.om * tau + f.psi);
	const Y = max(0, f.Yc - f.vt * (tau - f.tau0 * (1 - exp(-tau / f.tau0))));
	// Mostly even travel toward the viewer: a quick ease would outrun the lattice.
	const s = 0.5 * (tau / D) + 0.5 * smooth(0, D, tau);
	const Z = f.dyL * s;
	const ex = exp(-tau / 0.8);
	const a =
		f.target +
		(f.leafA - f.target) * ex +
		f.tilt * g * calm * cos(f.om * tau + f.psi);
	const flat = smooth(D - 2.4, D - 0.2, tau);
	const phi =
		(Math.PI / 2 - 0.75 + f.delta) * ex +
		lerp(1.15, 0.1, flat) +
		f.tum * g * calm * sin(f.om2 * tau + f.psi2);
	const yaw =
		f.yawL * smooth(0.3, D, tau) +
		0.6 *
			g *
			calm *
			sin(0.8 * tau + f.psi2 * 1.3) *
			(1 - smooth(D - 1.5, D, tau));
	return { X, Y, Z, a, phi, yaw, s };
}

/** Resting pose of a leaf after it lands: it lies flat and the breeze takes it. */
function floatAt(_p: Plan, f: Flight, t: number) {
	const Tl = f.T + f.D;
	const age = t - Tl;
	const X =
		f.xLand +
		f.vd * windDelta(Tl, t) +
		3 * sin(0.33 * age + f.psi) * smooth(0, 3, age);
	const y = f.yLand + f.vy * age + 1.1 * sin(0.5 * age + f.psi2);
	const a =
		f.target +
		0.05 * sin(0.21 * age + f.psi) * (f.target ? -1 : 1) +
		0.0005 * age * (hash(f.k, 41) - 0.5) * 20;
	const phi = 0.1 + 0.04 * sin(0.7 * age + f.psi2);
	const yaw =
		f.yawL +
		0.04 * sin(0.17 * age + f.psi) +
		0.0016 * age * (hash(f.k, 42) - 0.5) * 20;
	return { X, y, a, phi, yaw, age };
}

/* ----------------------------------------------------------------- wood */

/** Sine of the viewing elevation at a row of the water: steeper when nearer. */
function sigma(p: Plan, y: number) {
	return clamp(SE * ((y - p.yh) / p.u0) ** 0.6, 0.12, 0.62);
}

function ribbon(g: C, p: Plan, ink: Ink, b: Bough, t: number) {
	const n = b.rx.length - 1;
	const xs: number[] = [];
	const ys: number[] = [];
	for (let i = 0; i <= n; i++) {
		const [dx, dy] = flexOf(p, b, i, t);
		xs.push(b.rx[i] + dx);
		ys.push(b.ry[i] + dy);
	}
	const L: [number, number][] = [];
	const R: [number, number][] = [];
	for (let i = 0; i <= n; i++) {
		const a = max(0, i - 1);
		const z = min(n, i + 1);
		const dx = xs[z] - xs[a];
		const dy = ys[z] - ys[a];
		const d = Math.hypot(dx, dy) || 1;
		const hw = (b.w0 + (b.w1 - b.w0) * (i / n) ** 0.8) / 2;
		L.push([xs[i] - (dy / d) * hw, ys[i] + (dx / d) * hw]);
		R.push([xs[i] + (dy / d) * hw, ys[i] - (dx / d) * hw]);
	}
	g.beginPath();
	L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
	for (let i = n; i >= 0; i--) g.lineTo(R[i][0], R[i][1]);
	g.closePath();
	g.globalAlpha = ink.tone;
	g.fillStyle = css(ink.bark);
	g.fill();
	// Light along one edge, shade along the other, and a few bark grooves.
	g.lineCap = "round";
	const edge = (
		pts: [number, number][],
		col: Rgb,
		a: number,
		w: number,
		from = 0,
	) => {
		g.beginPath();
		pts.forEach(([x, y], i) => {
			if (i < from) return;
			if (i === from) g.moveTo(x, y);
			else g.lineTo(x, y);
		});
		g.globalAlpha = a;
		g.strokeStyle = css(col);
		g.lineWidth = w;
		g.stroke();
	};
	if (b.w0 > 3.2 * p.U) {
		edge(L, ink.barkHi, 0.7, max(1.4, b.w0 * 0.14));
		edge(R, ink.barkLo, 0.85, max(1.6, b.w0 * 0.2));
		if (b.w0 > 12 * p.U) {
			g.beginPath();
			for (let i = 1; i < n; i++) {
				if (hash(i, 77) < 0.55) continue;
				const hw = (b.w0 + (b.w1 - b.w0) * (i / n) ** 0.8) / 2;
				g.moveTo(xs[i] - hw * 0.2, ys[i] - hw * 0.5);
				g.lineTo(xs[i] + hw * 0.5, ys[i] + hw * 0.7);
			}
			g.globalAlpha = 0.6;
			g.strokeStyle = css(ink.barkLo);
			g.lineWidth = 1.5;
			g.stroke();
		}
	}
}

/** Nodes where a leaf has let go keep a scar and a new bud. */
function nodes(g: C, p: Plan, ink: Ink, t: number) {
	for (const li of p.order) {
		const lf = p.leaves[li];
		const c = leafClock(p, lf, t);
		const grow = smooth(BARE, GROWN, c.rho);
		if (grow > 0.5) continue;
		const b = p.boughs[lf.bough];
		const [dx, dy] = flexOf(p, b, lf.node, t);
		const x = b.rx[lf.node] + dx;
		const y = b.ry[lf.node] + dy;
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + cos(lf.a0) * lf.pet * 0.5, y + sin(lf.a0) * lf.pet * 0.5);
		g.globalAlpha = ink.tone * (1 - grow * 2);
		g.strokeStyle = css(ink.stalk);
		g.lineWidth = 2 * p.U;
		g.lineCap = "round";
		g.stroke();
	}
}

function hanging(
	g: C,
	p: Plan,
	ink: Ink,
	t: number,
	k: number,
	mirror: boolean,
) {
	for (const i of p.draw) {
		const lf = p.leaves[i];
		const c = leafClock(p, lf, t);
		const grow = lf.slot < 0 ? 1 : smooth(BARE, GROWN, c.rho);
		if (grow < 0.04) continue;
		const strain = lf.slot < 0 ? 0 : smooth(2.4, 0, c.until);
		const ps = leafPosed(p, lf, t, strain);
		const yy = (y: number) => (mirror ? 2 * p.yp - y : y);
		// The stalk.
		g.setTransform(k, 0, 0, mirror ? -k : k, 0, mirror ? 2 * k * p.yp : 0);
		g.beginPath();
		g.moveTo(ps.x, ps.y);
		g.lineTo(ps.bx, ps.by);
		g.globalAlpha = ink.tone;
		g.strokeStyle = css(ink.stalk);
		g.lineWidth = 2.1 * p.U;
		g.lineCap = "round";
		g.stroke();
		const B = basis(ps.a, Math.PI / 2 + ps.delta, 0, mirror);
		const s = 0.4 + 0.6 * grow;
		paintLeaf(
			g,
			k,
			B,
			ps.bx,
			yy(ps.by),
			lf.size * s,
			lf.side >= 0 ? 1 : -1,
			lf.variety,
			ink.tone * (0.4 + 0.6 * grow),
			ink,
		);
	}
}

function airborne(
	g: C,
	p: Plan,
	ink: Ink,
	f: Flight,
	tau: number,
	k: number,
	mirror: boolean,
) {
	const s = flightAt(p, f, tau);
	const lf = p.leaves[f.leaf];
	const L = lf.size;
	const se = lerp(SE, sigma(p, f.yLand), s.s);
	const B = basis(s.a, s.phi, s.yaw, mirror, se);
	const cx = s.X;
	const cy = mirror ? p.yp + s.Y * CE + s.Z : p.yp - s.Y * CE + s.Z;
	paintLeaf(
		g,
		k,
		B,
		cx - B.ux * L * 0.45,
		cy - B.uy * L * 0.45,
		L,
		lf.side >= 0 ? 1 : -1,
		lf.variety,
		ink.tone,
		ink,
	);
}

/* ----------------------------------------------------------------- water */

const WAVES = [
	{ m: 1, kx: 0.0105, w: 0.55, ax: 2.2, ay: 1.5 },
	{ m: 2.2, kx: -0.034, w: 0.93, ax: 1.1, ay: 0.8 },
	{ m: 0.6, kx: 0.021, w: 0.31, ax: 1.4, ay: 1.1 },
];

let WX = 0;
let WY = 0;
/** The travelling surface at a css point: displacement in css px. */
function waveAt(
	p: Plan,
	ph0: number,
	yc: number,
	xc: number,
	t: number,
	gm: number,
) {
	const lu = log(max(yc - p.yh, 24) / p.u0);
	let x = 0;
	let y = 0;
	for (const wv of WAVES) {
		const ph = wv.m * ph0 * lu - wv.w * t + wv.kx * xc;
		x += wv.ax * sin(ph);
		y += wv.ay * cos(ph);
	}
	const amp = clamp((yc - p.yh) / p.u0, 0.2, 1.7) * gm;
	WX = x * amp;
	WY = y * amp;
}

type Ring = {
	id: number;
	x: number;
	y: number;
	sq: number;
	R: number;
	sw: number;
	lam: number;
	amp: number;
};

let RX = 0;
let RY = 0;
function ringsAt(rs: Ring[], x: number, y: number) {
	RX = 0;
	RY = 0;
	for (const r of rs) {
		const ex = x - r.x;
		const ey = (y - r.y) / r.sq;
		const d = sqrt(ex * ex + ey * ey);
		const off = (d - r.R) / r.sw;
		if (off > 2.6 || off < -2.6 || d < 1) continue;
		const m = r.amp * exp(-off * off) * cos((TAU * (d - r.R)) / r.lam);
		RX += (m * ex * 13) / d;
		RY += (m * ey * 6) / d;
	}
}

function activeRings(p: Plan, t: number, ks: number[]): Ring[] {
	const out: Ring[] = [];
	for (const k of ks) {
		const f = flightOf(p, k);
		const a = t - (f.T + f.D);
		if (a <= 0 || a > 17) continue;
		out.push({
			id: k,
			x: f.xLand,
			y: f.yLand,
			sq: sigma(p, f.yLand),
			R: (10 + 36 * a) * p.U,
			sw: (13 + 4 * a) * p.U,
			lam: (23 + 1.6 * a) * p.U,
			amp: exp(-a / 5.5) * smooth(0, 0.3, a) * (1 - smooth(12, 17, a)),
		});
	}
	return out;
}

/* ------------------------------------------------------------ water wash */

/** The engine's own 8x8 threshold matrix, so the wash can skip dots it could not light. */
const BAYER8 = (() => {
	const m = [[0]];
	let n = 1;
	while (n < 8) {
		const q = m.map((r) => r.slice());
		for (let y = 0; y < n; y++) {
			m[y] = [];
			for (let x = 0; x < n; x++) {
				m[y][x] = 4 * q[y][x];
				m[y][x + n] = 4 * q[y][x] + 2;
			}
		}
		for (let y = 0; y < n; y++) {
			m[y + n] = [];
			for (let x = 0; x < n; x++) {
				m[y + n][x] = 4 * q[y][x] + 3;
				m[y + n][x + n] = 4 * q[y][x] + 1;
			}
		}
		n *= 2;
	}
	return m;
})();

/**
 * A pale tint under the whole pond. The dither only lights a dot where the
 * tone clears its threshold, so the tint is stored as a tile that is clear
 * everywhere else. The look is the same; the page stays empty of live cells
 * the lattice would otherwise have to ease for nothing.
 */
const washTiles = new Map<string, CanvasPattern | null>();
function washTile(c: C, ink: Ink, level: number) {
	const key = `${ink.water}|${level}`;
	let pat = washTiles.get(key);
	if (pat !== undefined) return pat;
	const tile = document.createElement("canvas");
	tile.width = tile.height = 8;
	const g = tile.getContext("2d");
	if (!g) return null;
	const img = g.createImageData(8, 8);
	const a = level / 200;
	for (let y = 0; y < 8; y++)
		for (let x = 0; x < 8; x++) {
			if ((BAYER8[y][x] + 0.5) / 64 > a + 0.06) continue;
			const o = (y * 8 + x) * 4;
			img.data[o] = ink.water[0];
			img.data[o + 1] = ink.water[1];
			img.data[o + 2] = ink.water[2];
			img.data[o + 3] = round(a * 255);
		}
	g.putImageData(img, 0, 0);
	pat = c.createPattern(tile, "repeat");
	washTiles.set(key, pat);
	return pat;
}

/** How much of the pond a column belongs to: full in the gutters, gone by the cards. */
function poolX(p: Plan, x: number) {
	const l = 1 - smooth(p.wl * 0.4, p.wl + 20 * p.U, x);
	const r = 1 - smooth(p.wr * 0.4, p.wr + 20 * p.U, p.W - x);
	return max(l, r);
}
/** Far water behind the hanging leaves is faint; the surface they reach is not. */
function poolY(p: Plan, y: number) {
	return (
		smooth(p.yh - 6, p.yh + 50 * p.U, y) *
		(0.4 + 0.6 * smooth(p.yp - 40 * p.U, p.yp + 90 * p.U, y))
	);
}

type Pool = { x: number; y: number; rx: number; ry: number; a: number };

/** How much pond there is at a css point: the gutters, or a leaf's own pool. */
function pondAt(p: Plan, pools: Pool[], x: number, y: number) {
	let m = poolX(p, x) * poolY(p, y);
	for (const q of pools) {
		const dx = (x - q.x) / q.rx;
		const dy = (y - q.y) / q.ry;
		const d = dx * dx + dy * dy;
		if (d < 1) m = max(m, q.a * (1 - d) ** 1.4);
	}
	return m;
}

/** The gutters' pale tint, drawn once per size: it never moves. */
function buildWash(p: Plan, ink: Ink, w: number, h: number, k: number) {
	const el = p.wash ?? document.createElement("canvas");
	p.wash = el;
	el.width = w;
	el.height = h;
	const g = el.getContext("2d");
	if (!g) return;
	g.clearRect(0, 0, w, h);
	const { W, H, yh } = p;
	const span = H - yh;
	const tone = (y: number) => {
		const v = (y - yh) / span;
		return (
			ink.wash *
			(v < 0.03
				? (0.6 * v) / 0.03
				: v < 0.3
					? 0.6 + (0.4 * (v - 0.03)) / 0.27
					: 1 + 0.15 * ((v - 0.3) / 0.7))
		);
	};
	const bw = 12;
	const step = 10;
	for (let x0 = 0; x0 < W; x0 += bw) {
		const px = poolX(p, x0 + bw / 2);
		if (px < 0.04) continue;
		const xa = round(x0 * k);
		const xb = round(min(W, x0 + bw) * k);
		let runY = yh;
		let runLevel = -1;
		const flush = (y: number) => {
			if (runLevel <= 0) return;
			const pat = washTile(g, ink, runLevel);
			if (!pat) return;
			g.fillStyle = pat;
			g.fillRect(xa, round(runY * k), xb - xa, round(y * k) - round(runY * k));
		};
		for (let y = yh; y < H; y += step) {
			const ym = min(H, y + step / 2);
			const level = round(tone(ym) * poolY(p, ym) * px * 200);
			if (level !== runLevel) {
				flush(y);
				runY = y;
				runLevel = level;
			}
		}
		flush(H);
	}
}

/** A leaf on the water holds a small, stepped pool of tint under it. */
function poolWash(c: C, ink: Ink, k: number, pools: Pool[]) {
	for (const q of pools) {
		for (const [s, m] of [
			[1, 0.45],
			[0.68, 0.85],
			[0.38, 1.25],
		] as const) {
			const level = round(ink.wash * 200 * q.a * m);
			if (level < 2) continue;
			const pat = washTile(c, ink, level);
			if (!pat) continue;
			c.fillStyle = pat;
			c.beginPath();
			c.ellipse(q.x * k, q.y * k, q.rx * s * k, q.ry * s * k, 0, 0, TAU);
			c.fill();
		}
	}
}

function drawWater(
	c: C,
	p: Plan,
	ink: Ink,
	t: number,
	k: number,
	rings: Ring[],
	gmAt: (x: number) => number,
	ph0: number,
	pools: Pool[],
) {
	const { W } = p;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalAlpha = 1;
	if (p.wash) c.drawImage(p.wash, 0, 0);
	poolWash(c, ink, k, pools);
	c.setTransform(k, 0, 0, k, 0, 0);
	c.lineCap = "butt";
	const drift = windDelta(0, t);
	p.lines.forEach((ln, j) => {
		const y = ln.y;
		const near = rings.filter(
			(r) => abs(y - r.y) < (r.R + 2.7 * r.sw) * r.sq + 6,
		);
		const cs = max(14, ln.cs);
		const off = ln.sp * (0.5 * t + 6 * drift);
		const s0 = floor(-off / cs) - 1;
		const s1 = ceil((W - off) / cs) + 1;
		const cool = [new Path2D(), new Path2D()];
		const warm = [new Path2D(), new Path2D()];
		let any = false;
		for (let s = s0; s <= s1; s++) {
			const h = hash(j * 977 + s, 3);
			if (h > ln.on) continue;
			const x0 = s * cs + off;
			const len = cs * (0.5 + 0.45 * hash(j * 977 + s, 4));
			// Level lines exist only where there is pond to carry them.
			const pond = pondAt(p, pools, x0 + len / 2, y);
			if (pond < 0.2) continue;
			any = true;
			const tier = pond > 0.6 ? 0 : 1;
			const path = (hash(j * 977 + s, 5) < 0.2 ? warm : cool)[tier];
			for (let q = 0; q < 3; q++) {
				const x = x0 + (len * q) / 2;
				waveAt(p, ph0, y, x, t, gmAt(x));
				if (near.length) ringsAt(near, x, y);
				else {
					RX = 0;
					RY = 0;
				}
				const px = x + WX * 0.5 + RX;
				const py = y + WY * 0.6 + RY;
				if (q === 0) path.moveTo(px, py);
				else path.lineTo(px, py);
			}
		}
		if (!any) return;
		const a = ink.hair * (0.38 + 0.62 * ln.v ** 0.6);
		c.lineWidth = 1.5 + 2.4 * ln.v;
		for (let tier = 0; tier < 2; tier++) {
			const f = tier ? 0.5 : 1;
			c.globalAlpha = a * f;
			c.strokeStyle = css(ink.water);
			c.stroke(cool[tier]);
			c.globalAlpha = a * 0.8 * f;
			c.strokeStyle = css(ink.warm);
			c.stroke(warm[tier]);
		}
	});
	c.globalAlpha = 1;
}

/** Far shore: dry reeds along a low bank, cached; the water gives it back. */
function buildBank(p: Plan, ink: Ink, k: number, w: number) {
	const up = 50;
	const el = p.bank ?? document.createElement("canvas");
	p.bank = el;
	el.width = w;
	el.height = ceil((up + 6) * k);
	p.bankTop = p.yh - up;
	const g = el.getContext("2d");
	if (!g) return;
	g.setTransform(k, 0, 0, k, 0, -p.bankTop * k);
	g.clearRect(0, 0, el.width, el.height);
	const W = p.W;
	// The bank itself: a low, broken band.
	for (let x = 0; x < W; ) {
		const len = 14 + 70 * hash(x | 0, 51);
		const dy = (hash((x | 0) + 7, 52) - 0.5) * 3;
		// The bank only shows where the pond does.
		if (hash((x | 0) + 5, 55) < 0.2 + 0.8 * poolX(p, x + len / 2)) {
			g.globalAlpha = 0.34 + 0.2 * hash((x | 0) + 3, 53);
			g.fillStyle = css(ink.bank);
			g.fillRect(x, p.yh - 4 + dy, len, 6 - dy);
		}
		x += len + 2 + 10 * hash((x | 0) + 11, 54);
	}
	const n = round(W / 8);
	g.lineCap = "round";
	for (let i = 0; i < n; i++) {
		const x0 = hash(i, 61) * W;
		if (hash(i, 68) > 0.12 + 0.88 * poolX(p, x0)) continue;
		const h0 = (7 + 21 * hash(i, 62) ** 1.6) * p.U;
		const warm = hash(i, 63) < 0.28;
		const stems = 3 + floor(hash(i, 64) * 4);
		g.beginPath();
		for (let s = 0; s < stems; s++) {
			const lean = (hash(i * 9 + s, 65) - 0.5) * 0.7;
			const hh = h0 * (0.6 + 0.4 * hash(i * 9 + s, 66));
			const bx = x0 + (s - stems / 2) * 1.6;
			g.moveTo(bx, p.yh - 2);
			g.quadraticCurveTo(
				bx + lean * hh * 0.3,
				p.yh - hh * 0.6,
				bx + lean * hh,
				p.yh - hh,
			);
		}
		g.globalAlpha = 0.55 + 0.3 * hash(i, 67);
		g.strokeStyle = css(warm ? ink.bankWarm : ink.bank);
		g.lineWidth = 1.8;
		g.stroke();
		if (warm && h0 > 14) {
			g.beginPath();
			g.ellipse(x0, p.yh - h0 - 2, 1.6, 4, 0.2, 0, TAU);
			g.fillStyle = css(ink.bankWarm);
			g.globalAlpha = 0.85;
			g.fill();
		}
	}
}

/* ------------------------------------------------------ mirror + reflect */

function reflect(
	p: Plan,
	ink: Ink,
	t: number,
	k: number,
	w: number,
	h: number,
	rings: Ring[],
	gmCol: Float32Array,
	maskCol: Float32Array,
	ph0: number,
) {
	const g = p.mirG;
	const rg = p.reflG;
	if (!g || !rg) return;
	const y0 = ceil(p.yp * k);
	const rows = h - y0;
	if (rows <= 2) return;
	const src = g.getImageData(0, y0, w, rows).data;
	if (!p.img || p.img.width !== w || p.img.height !== rows)
		p.img = new ImageData(w, rows);
	const out = p.img.data;
	const [wr, wg, wb] = ink.water;
	const gh = p.H - p.yp;
	const lnr = log(1 / LINE_R);
	const span = p.H + 30 - p.yh;
	const sa = [0, 0, 0];
	const ca = [0, 0, 0];
	out.fill(0);
	// Most of the mirror is empty: find which 16px blocks of each row hold
	// anything, and only read the displaced surface where something can arrive.
	const nb = ceil(w / 16);
	const occ = new Uint8Array(rows * nb);
	for (let r = 0; r < rows; r++)
		for (let x = 0; x < w; x++)
			if (src[(r * w + x) * 4 + 3] >= 6) occ[r * nb + (x >> 4)] = 1;
	let gmMax = 0;
	for (let x = 0; x < w; x++) if (gmCol[x] > gmMax) gmMax = gmCol[x];
	const live = new Uint8Array(nb);
	for (let r = 0; r < rows; r++) {
		const yc = (y0 + r) / k;
		const dist = yc - p.yp;
		const lu = log(max(yc - p.yh, 24) / p.u0);
		for (let i = 0; i < 3; i++) {
			const ph = WAVES[i].m * ph0 * lu - WAVES[i].w * t;
			sa[i] = sin(ph);
			ca[i] = cos(ph);
		}
		const amp =
			clamp((yc - p.yh) / p.u0, 0.2, 1.7) *
			(1 + 0.9 * clamp(dist / 300, 0, 1.5)) *
			k;
		const spacing = (yc - p.yh) * (1 / LINE_R - 1);
		const spRows = spacing * k;
		const gapW = spRows >= 3.2 ? clamp(1.1 / spRows, 0.1, 0.38) : 0;
		const jl = log(span / (yc - p.yh)) / lnr;
		// The mirror thins quickly: the boughs read, the far end does not linger.
		const fade = (1 - 0.8 * smooth(0.04, 0.85, dist / gh)) * ink.refl;
		const tint = 0.08 + 0.3 * clamp(dist / gh, 0, 1);
		let ringsNear = false;
		for (const rg2 of rings) {
			if (abs(yc - rg2.y) < (rg2.R + 2.7 * rg2.sw) * rg2.sq + 6)
				ringsNear = true;
		}
		// How far the surface can move a pixel, and so how far to look.
		const by = ceil(amp * gmMax * 3.4 + (ringsNear ? 6 * k : 0)) + 1;
		const bx = amp * gmMax * 4.7 + (ringsNear ? 13 * k : 0) + 1;
		live.fill(0);
		for (let q = max(0, r - by); q <= min(rows - 1, r + by); q++)
			for (let bk = 0; bk < nb; bk++) if (occ[q * nb + bk]) live[bk] = 1;
		const reach = ceil(bx / 16);
		const row = r * w;
		for (let bk = 0; bk < nb; bk++) {
			let on = false;
			for (let q = max(0, bk - reach); q <= min(nb - 1, bk + reach); q++)
				if (live[q]) on = true;
			if (!on) continue;
			const xe = min(w, bk * 16 + 16);
			for (let x = bk * 16; x < xe; x++) {
				const s0 = sa[0] * p.colC[0][x] + ca[0] * p.colS[0][x];
				const c0 = ca[0] * p.colC[0][x] - sa[0] * p.colS[0][x];
				const s1 = sa[1] * p.colC[1][x] + ca[1] * p.colS[1][x];
				const c1 = ca[1] * p.colC[1][x] - sa[1] * p.colS[1][x];
				const s2 = sa[2] * p.colC[2][x] + ca[2] * p.colS[2][x];
				const c2 = ca[2] * p.colC[2][x] - sa[2] * p.colS[2][x];
				const gm = gmCol[x];
				let dx =
					amp * gm * (WAVES[0].ax * s0 + WAVES[1].ax * s1 + WAVES[2].ax * s2);
				let dy =
					amp * gm * (WAVES[0].ay * c0 + WAVES[1].ay * c1 + WAVES[2].ay * c2);
				if (ringsNear) {
					ringsAt(rings, x / k, yc);
					dx += RX * k;
					dy += RY * k;
				}
				const sx = x + round(dx);
				const sy = r + round(dy);
				if (sx < 0 || sx >= w || sy < 0 || sy >= rows) continue;
				const j = (sy * w + sx) * 4;
				const a = src[j + 3];
				if (a < 6) continue;
				// Engraved gaps follow the same displaced level lines as the surface.
				let m = 1;
				if (gapW > 0 && maskCol[x] > 0.02) {
					let f = jl + dy / k / spacing;
					f -= floor(f);
					if (f < gapW) m = 0.22;
					else if (f < gapW + 0.1) m = 0.22 + (0.78 * (f - gapW)) / 0.1;
					// Level lines only run inside the pond.
					m = 1 + (m - 1) * maskCol[x];
				}
				// Under about 4% the lattice lights nothing: do not make a live cell.
				const al = a * fade * m;
				if (al < 10) continue;
				const o = (row + x) * 4;
				out[o] = src[j] + (wr - src[j]) * tint;
				out[o + 1] = src[j + 1] + (wg - src[j + 1]) * tint;
				out[o + 2] = src[j + 2] + (wb - src[j + 2]) * tint;
				out[o + 3] = al;
			}
		}
	}
	rg.putImageData(p.img, 0, 0);
}

/* ---------------------------------------------------------------- scene */

let memo: Plan | null = null;
const RATE = 12;

export const leaffall: Scene = ({ dither: c }, env) => {
	const { t, W, H, anchors, dark } = env;
	if (W < 960) return;
	c.save();
	const frame = anchors.frame ??
		anchors.content ?? { x: max(0, (W - 976) / 2), w: min(976, W) };
	const shelf = anchors.shelf;
	const sb = shelf ? shelf.y + shelf.h : H * 0.62;
	const key = `${W}|${H}|${frame.x | 0}|${frame.w | 0}|${round(sb / 8)}`;
	if (!memo || memo.key !== key)
		memo = plan(key, W, H, frame.x, W - frame.x - frame.w, sb);
	const p = memo;
	const ink = INKS[dark ? "dark" : "light"];
	const k = c.getTransform().a;
	const w = c.canvas.width;
	const h = c.canvas.height;
	// Reflected anatomy is naturally soft; evaluate its displacement on a
	// coarser surface, keeping the actual leaves and wave crests full resolution.
	const mw = ceil(w / 2),
		mh = ceil(h / 2),
		mk = k / 2;
	const size = `${w}|${h}|${k}|${dark}`;
	const ph0 = (TAU * p.u0) / (44 * p.U);
	if (size !== p.size) {
		p.size = size;
		for (const key2 of ["mir", "refl"] as const) {
			const el = document.createElement("canvas");
			el.width = mw;
			el.height = mh;
			p[key2] = el;
		}
		p.mirG = p.mir?.getContext("2d", { willReadFrequently: true }) ?? null;
		p.reflG = p.refl?.getContext("2d") ?? null;
		p.img = null;
		p.colS = WAVES.map((wv) =>
			Float32Array.from({ length: mw }, (_, x) => sin((wv.kx * x) / mk)),
		);
		p.colC = WAVES.map((wv) =>
			Float32Array.from({ length: mw }, (_, x) => cos((wv.kx * x) / mk)),
		);
		p.beat = -1;
		buildBank(p, ink, k, w);
		buildWash(p, ink, w, h, k);
	}
	const kNow = floor((t - 4.5) / P) + 1;
	const ks: number[] = [];
	for (let i = kNow - 10; i <= kNow + 1; i++) ks.push(i);
	// Breeze sampled across the page: gusts reach the water from the left.
	const gmArr = new Float32Array(33);
	for (let i = 0; i <= 32; i++)
		gmArr[i] = 0.7 + 0.9 * gust(t - (i * W) / 32 / 230);
	const gmAt = (x: number) => {
		const q = clamp((x / W) * 32, 0, 31.999);
		const i = floor(q);
		return gmArr[i] + (gmArr[i + 1] - gmArr[i]) * (q - i);
	};
	const rings = activeRings(p, t, ks);
	// The mirror and its displaced read, twelve times a second.
	const beat = floor(t * RATE);
	if (beat !== p.beat && p.mirG) {
		p.beat = beat;
		const tb = beat / RATE;
		const g = p.mirG;
		g.setTransform(1, 0, 0, 1, 0, 0);
		g.clearRect(0, 0, mw, mh);
		g.setTransform(mk, 0, 0, -mk, 0, 2 * mk * p.yp);
		for (const b of p.boughs) ribbon(g, p, ink, b, tb);
		nodes(g, p, ink, tb);
		hanging(g, p, ink, tb, mk, true);
		for (const kk of ks) {
			const f = flightOf(p, kk);
			const tau = tb - f.T;
			if (tau > 0 && tau < f.D) airborne(g, p, ink, f, tau, mk, true);
		}
		const gmCol = new Float32Array(mw);
		for (let x = 0; x < mw; x++) gmCol[x] = gmAt(x / mk);
		const maskCol = new Float32Array(mw);
		for (let x = 0; x < mw; x++) maskCol[x] = poolX(p, x / mk);
		reflect(p, ink, tb, mk, mw, mh, rings, gmCol, maskCol, ph0);
	}
	c.save();
	c.setTransform(1, 0, 0, 1, 0, 0);
	if (p.bank) c.drawImage(p.bank, 0, round(p.bankTop * k));
	// The bank's own reflection: strips, each read across the waterline.
	if (p.bank) {
		const rows = round(26 * k * 2);
		const top = round(p.bankTop * k);
		const yhL = round(p.yh * k);
		for (let r = 0; r < rows; r++) {
			const srcRow = yhL - 1 - r - top;
			if (srcRow < 0) break;
			waveAt(p, ph0, p.yh + (r + 1) / k, W / 2, t, 1);
			c.globalAlpha = 0.5 * (1 - r / rows);
			c.drawImage(
				p.bank,
				0,
				srcRow,
				p.bank.width,
				1,
				round(WX * k * 1.5 * (0.3 + r / rows)),
				yhL + 1 + r,
				p.bank.width,
				1,
			);
		}
	}
	c.restore();
	// Leaves on the water, oldest first, each with the pool it floats in.
	const floats: {
		f: Flight;
		q: ReturnType<typeof floatAt>;
		lf: Leaf;
		L: number;
		age: number;
	}[] = [];
	const pools: Pool[] = [];
	for (const kk of ks) {
		const f = flightOf(p, kk);
		const age = t - (f.T + f.D);
		if (age < 0 || age > LIFE) continue;
		const q = floatAt(p, f, t);
		const lf = p.leaves[f.leaf];
		const near = clamp(((q.y - p.yh) / p.u0) ** 0.55, 0.75, 1.35);
		const L = lf.size * near;
		floats.push({ f, q, lf, L, age });
		const rx = L * 1.25;
		pools.push({
			x: q.X,
			y: q.y,
			rx,
			ry: max(rx * sigma(p, q.y) * 0.95, 12 * p.U),
			a: smooth(0, 1.6, age) * (1 - smooth(LIFE - 24, LIFE - 4, age)),
		});
	}
	drawWater(c, p, ink, t, k, rings, gmAt, ph0, pools);
	c.save();
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalAlpha = 1;
	if (p.refl)
		c.drawImage(
			p.refl,
			0,
			0,
			mw,
			mh - ceil(p.yp * mk),
			0,
			ceil(p.yp * k),
			w,
			h - ceil(p.yp * k),
		);
	c.restore();
	// Rings: broken crests on the water plane, strongest where there is pond to
	// carry them and a faint trace where there is not.
	c.setTransform(k, 0, 0, k, 0, 0);
	c.lineCap = "round";
	c.strokeStyle = css(ink.water);
	for (const r of rings) {
		for (let j = 0; j < 3; j++) {
			const R = r.R - j * r.lam * 0.9;
			if (R < 4) continue;
			const part = [0, 1, 2, 3, 4, 5].map(() => new Path2D());
			const N = 64;
			for (let i = 0; i < N; i++) {
				if (hash(i * 7 + j * 131, r.id) < 0.2) continue;
				const q0 = (i / N) * TAU;
				const q1 = ((i + 1) / N) * TAU;
				const w0 = 1 + 0.05 * sin(3 * q0 + r.id) + 0.03 * sin(5 * q0 + j);
				const w1 = 1 + 0.05 * sin(3 * q1 + r.id) + 0.03 * sin(5 * q1 + j);
				const x0 = r.x + cos(q0) * R * w0;
				const y0 = r.y + sin(q0) * R * w0 * r.sq;
				const pond = pondAt(p, pools, x0, y0);
				const tier = pond > 0.5 ? 0 : pond > 0.2 ? 1 : 2;
				const path = part[tier + (sin(q0) > 0 ? 0 : 3)];
				path.moveTo(x0, y0);
				path.lineTo(r.x + cos(q1) * R * w1, r.y + sin(q1) * R * w1 * r.sq);
			}
			const a = min(0.95, r.amp * 1.5) * (1 - j * 0.25);
			c.lineWidth = 3.4 - j * 0.6;
			for (let i = 0; i < 6; i++) {
				c.globalAlpha = a * [1, 0.6, 0.3][i % 3] * (i < 3 ? 1 : 0.5);
				c.stroke(part[i]);
			}
		}
	}
	c.globalAlpha = 1;

	for (const { q, lf, L, age } of floats) {
		const B = basis(q.a, q.phi, q.yaw, false, sigma(p, q.y));
		paintLeaf(
			c,
			k,
			B,
			q.X - B.ux * L * 0.45,
			q.y - B.uy * L * 0.45,
			L,
			lf.side >= 0 ? 1 : -1,
			lf.variety,
			ink.tone *
				(1 - smooth(LIFE - 18, LIFE, age)) *
				(0.6 + 0.4 * smooth(0, 0.8, age)),
			ink,
			0.28,
		);
	}
	// The boughs, then whatever is in the air.
	c.setTransform(k, 0, 0, k, 0, 0);
	for (const b of p.boughs) ribbon(c, p, ink, b, t);
	nodes(c, p, ink, t);
	hanging(c, p, ink, t, k, false);
	for (const kk of ks) {
		const f = flightOf(p, kk);
		const tau = t - f.T;
		if (tau > 0 && tau < f.D) airborne(c, p, ink, f, tau, k, false);
	}
	c.setTransform(k, 0, 0, k, 0, 0);
	c.globalAlpha = 1;
	c.restore();
};
