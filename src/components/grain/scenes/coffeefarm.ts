import type { Scene } from "../engine";

/**
 * A highland coffee farm at harvest, early in the morning.
 *
 * Light paper: a low golden sun on the left, two volcanoes across the valley
 * with cloud wrapped round the near one's waist, green hills combed into
 * terraces of coffee shrubs that follow the contours, red cherries on the
 * branches, airy shade trees. A red-roofed farmhouse sits on the left shoulder
 * with its drying patio, the beans spread in sections at different stages,
 * and a dirt road winds down across the valley.
 *
 * Dark paper: the same farm under the moon. The house windows are lit, a
 * lantern hangs on the patio, a pickup comes home with its headlights on,
 * and a couple of lanterns are carried along the terraces.
 *
 * Life overlaps at different paces: pickers working along their rows
 * (reaching, bending, stepping on, walking back to empty the basket into a
 * sack), someone raking the beans in slow strokes, the truck on the road with
 * a little dust, mist lifting off the valley, chimney smoke, birds circling a
 * thermal, cloud drifting round the volcano, shade-tree crowns stirring.
 *
 * The land is painted once per size and paper, in four depth layers; life is
 * drawn between them each frame, so pickers stand waist-deep in their rows.
 * Everything is a function of t.
 */

type Rgb = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
	lerp(a[0], b[0], k),
	lerp(a[1], b[1], k),
	lerp(a[2], b[2], k),
];
const rgba = (c: Rgb, a: number) =>
	`rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${clamp(a, 0, 1).toFixed(3)})`;
function hash(a: number, b = 0) {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function noise1(x: number, seed: number) {
	const i = Math.floor(x);
	const f = x - i;
	const u = f * f * (3 - 2 * f);
	return lerp(hash(i, seed), hash(i + 1, seed), u);
}
function fbm1(x: number, seed: number, oct = 4) {
	let s = 0;
	let a = 0.5;
	let n = 0;
	for (let i = 0; i < oct; i++) {
		s += a * noise1(x, seed + i * 17);
		n += a;
		x *= 2.07;
		a *= 0.5;
	}
	return s / n;
}
/** Catmull-Rom through [u, y] points, sorted by u. */
function spline(pts: [number, number][], u: number) {
	if (u <= pts[0][0]) return pts[0][1];
	const n = pts.length;
	if (u >= pts[n - 1][0]) return pts[n - 1][1];
	let i = 0;
	while (u > pts[i + 1][0]) i++;
	const p0 = pts[Math.max(0, i - 1)][1];
	const p1 = pts[i][1];
	const p2 = pts[i + 1][1];
	const p3 = pts[Math.min(n - 1, i + 2)][1];
	const f = (u - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
	const f2 = f * f;
	const f3 = f2 * f;
	return (
		0.5 *
		(2 * p1 +
			(-p0 + p2) * f +
			(2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 +
			(-p0 + 3 * p1 - 3 * p2 + p3) * f3)
	);
}

/* ------------------------------------------------------------------ ink */

type Pal = {
	night: boolean;
	skyTop: Rgb;
	skyLow: Rgb;
	skyA: [number, number];
	sun: Rgb;
	glow: Rgb;
	far: [Rgb, Rgb];
	volc: [Rgb, Rgb];
	haze: Rgb;
	/** Body alpha per depth layer: far, volcano, mid, hill, near. */
	body: number[];
	mid: [Rgb, Rgb];
	midRow: Rgb;
	hill: [Rgb, Rgb];
	near: [Rgb, Rgb];
	leaf: Rgb;
	leafLit: Rgb;
	leafLitA: number;
	leafShade: Rgb;
	/** Hedge rows: shaded flank, leafy middle, sunlit top, bright crest. */
	hedge: [Rgb, Rgb, Rgb, Rgb];
	hedgeA: [number, number, number, number];
	earth: Rgb;
	earthA: number;
	cherry: Rgb;
	cherryDeep: Rgb;
	cherryGold: Rgb;
	cloud: Rgb;
	cloudShade: Rgb;
	mist: Rgb;
	wall: Rgb;
	wallShade: Rgb;
	roof: Rgb;
	roofShade: Rgb;
	window: Rgb;
	smoke: Rgb;
	patio: Rgb;
	patioEdge: Rgb;
	beans: Rgb[];
	road: Rgb;
	roadEdge: Rgb;
	trunk: Rgb;
	trunkLit: Rgb;
	crown: Rgb;
	crownLit: Rgb;
	skin: Rgb;
	hat: Rgb;
	hatShade: Rgb;
	trousers: Rgb;
	shirts: Rgb[];
	basket: Rgb;
	basketLit: Rgb;
	sack: Rgb;
	truck: Rgb;
	truckShade: Rgb;
	glass: Rgb;
	tyre: Rgb;
	dust: Rgb;
	bird: Rgb;
	lamp: Rgb;
	rim: Rgb;
};

const CUT: Rgb = [0, 0, 0];

const PALS: Record<"light" | "dark", Pal> = {
	light: {
		night: false,
		skyTop: [168, 200, 226],
		skyLow: [252, 228, 188],
		skyA: [0.34, 0.5],
		sun: [255, 222, 160],
		glow: [252, 212, 150],
		far: [
			[172, 180, 214],
			[226, 206, 206],
		],
		volc: [
			[140, 152, 196],
			[222, 196, 190],
		],
		haze: [240, 230, 220],
		body: [0.9, 0.95, 1, 1, 1],
		mid: [
			[138, 172, 156],
			[198, 206, 158],
		],
		midRow: [96, 140, 110],
		hill: [
			[128, 162, 104],
			[206, 200, 128],
		],
		near: [
			[112, 150, 92],
			[196, 190, 116],
		],
		leaf: [58, 120, 76],
		leafLit: [150, 184, 96],
		leafLitA: 0.85,
		leafShade: [40, 84, 66],
		hedge: [
			[44, 86, 68],
			[84, 130, 82],
			[160, 188, 106],
			[222, 220, 156],
		],
		hedgeA: [1, 1, 1, 1],
		earth: [210, 178, 136],
		earthA: 0.85,
		cherry: [206, 60, 52],
		cherryDeep: [150, 36, 48],
		cherryGold: [232, 160, 70],
		cloud: [255, 252, 248],
		cloudShade: [212, 208, 228],
		mist: [252, 248, 242],
		wall: [246, 236, 218],
		wallShade: [210, 190, 172],
		roof: [196, 82, 60],
		roofShade: [140, 56, 50],
		window: [104, 92, 90],
		smoke: [222, 216, 222],
		patio: [234, 224, 208],
		patioEdge: [176, 158, 138],
		beans: [
			[184, 82, 68],
			[148, 92, 70],
			[214, 186, 136],
		],
		road: [226, 192, 146],
		roadEdge: [176, 140, 104],
		trunk: [132, 116, 104],
		trunkLit: [196, 180, 156],
		crown: [86, 140, 92],
		crownLit: [176, 196, 112],
		skin: [184, 128, 96],
		hat: [238, 214, 156],
		hatShade: [182, 150, 100],
		trousers: [92, 98, 116],
		shirts: [
			[110, 140, 186],
			[198, 104, 88],
			[218, 206, 184],
			[128, 150, 100],
			[214, 166, 104],
		],
		basket: [164, 120, 72],
		basketLit: [220, 180, 118],
		sack: [222, 204, 164],
		truck: [126, 178, 176],
		truckShade: [86, 126, 132],
		glass: [214, 228, 234],
		tyre: [60, 58, 62],
		dust: [232, 206, 166],
		bird: [100, 96, 110],
		lamp: [255, 196, 110],
		rim: [255, 236, 190],
	},
	dark: {
		night: true,
		skyTop: [52, 64, 130],
		skyLow: [96, 110, 168],
		skyA: [0.62, 0.4],
		sun: [240, 236, 220],
		glow: [150, 166, 220],
		far: [
			[80, 92, 150],
			[118, 128, 180],
		],
		volc: [
			[70, 80, 136],
			[118, 128, 182],
		],
		haze: [104, 116, 170],
		body: [0.55, 0.6, 0.32, 0.24, 0.2],
		mid: [
			[80, 100, 150],
			[110, 130, 176],
		],
		midRow: [140, 156, 200],
		hill: [
			[80, 106, 140],
			[120, 144, 180],
		],
		near: [
			[76, 100, 132],
			[116, 140, 174],
		],
		leaf: CUT,
		leafLit: [150, 172, 214],
		leafLitA: 0.42,
		leafShade: CUT,
		hedge: [CUT, [74, 90, 140], [140, 160, 210], [196, 206, 236]],
		hedgeA: [1, 0.28, 0.36, 0.42],
		earth: [120, 116, 150],
		earthA: 0.3,
		cherry: [200, 110, 120],
		cherryDeep: [150, 90, 110],
		cherryGold: [200, 160, 120],
		cloud: [140, 152, 200],
		cloudShade: [90, 100, 150],
		mist: [150, 164, 214],
		wall: [120, 124, 156],
		wallShade: CUT,
		roof: [150, 104, 120],
		roofShade: CUT,
		window: [255, 196, 112],
		smoke: [140, 150, 196],
		patio: [110, 116, 150],
		patioEdge: CUT,
		beans: [
			[140, 96, 118],
			[112, 98, 122],
			[150, 150, 176],
		],
		road: [140, 140, 170],
		roadEdge: CUT,
		trunk: CUT,
		trunkLit: [130, 140, 180],
		crown: CUT,
		crownLit: [130, 150, 196],
		skin: CUT,
		hat: CUT,
		hatShade: CUT,
		trousers: CUT,
		shirts: [CUT],
		basket: CUT,
		basketLit: [150, 150, 180],
		sack: [130, 130, 160],
		truck: CUT,
		truckShade: CUT,
		glass: [90, 100, 140],
		tyre: CUT,
		dust: [140, 140, 180],
		bird: [140, 150, 190],
		lamp: [255, 196, 110],
		rim: [170, 186, 226],
	},
};

/* ----------------------------------------------------------------- plan */

type Row = {
	/** Base of the hedge along x. */
	y: Float32Array;
	/** Hedge height along x; 0 where the row is broken. */
	h: Float32Array;
	/** Leafy wobble of the inner bands, 0..1. */
	m: Float32Array;
	gap: number;
	/** Width of one bush in the hedge. */
	S: number;
	off: number;
	seed: number;
	/** An earth track runs here instead of a hedge. */
	track: boolean;
};

type Layer = {
	top: Float32Array;
	rows: Row[];
	canvas: HTMLCanvasElement;
};

type Picker = {
	layer: 3 | 4;
	row: number;
	x0: number;
	dir: 1 | -1;
	off: number;
	shirt: number;
	steps: number;
};

type Tree = { layer: 3 | 4; x: number; y: number; h: number; seed: number };

type Plan = {
	W: number;
	H: number;
	z: number;
	sun: { x: number; y: number; r: number };
	sky: HTMLCanvasElement;
	mid: Layer;
	hill: Layer;
	near: Layer;
	house: { x: number; y: number; w: number; h: number; roof: number };
	patio: { x0: number; x1: number; y0: number; y1: number; skew: number };
	road: { x: number; y: number; w: number; d: number }[];
	roadLen: number;
	roadAt: Float32Array;
	path: (y: number) => number;
	trees: Tree[];
	pickers: Picker[];
	key: string;
};

const curve = (W: number, H: number, f: (u: number, x: number) => number) => {
	const a = new Float32Array(Math.ceil(W) + 2);
	for (let x = 0; x < a.length; x++) a[x] = f(x / W, x) * H;
	return a;
};
const at = (a: Float32Array, x: number) =>
	a[clamp(Math.round(x), 0, a.length - 1)];

function cone(
	u: number,
	cx: number,
	hw: number,
	summit: number,
	base: number,
	crater: number,
) {
	const d = Math.abs(u - cx) / hw;
	if (d >= 1) return base;
	const flat = crater / hw;
	const top = (1 - flat) ** 1.7;
	const prof = d < flat ? top - 0.004 * (1 - d / flat) : (1 - d) ** 1.7;
	return base - ((base - summit) * prof) / top;
}

/** The far ridge with the small volcano, and the near volcano. */
const farTop = (u: number) =>
	Math.min(
		0.515 + 0.03 * (fbm1(u * 6, 3) - 0.5) - 0.02 * Math.sin(u * 5),
		cone(u, 0.25, 0.27, 0.355, 0.54, 0.008) + 0.004 * (fbm1(u * 40, 4) - 0.5),
	);
const volcTop = (u: number) =>
	cone(u, 0.84, 0.42, 0.262, 0.58, 0.014) + 0.004 * (fbm1(u * 30, 8) - 0.5);
const midTop = (u: number) =>
	0.545 +
	0.035 * (fbm1(u * 4.5, 12) - 0.5) +
	0.012 * Math.sin(u * 9 + 1) -
	0.02 * smooth(0.6, 1, u);
const HILL: [number, number][] = [
	[0, 0.556],
	[0.08, 0.56],
	[0.17, 0.574],
	[0.3, 0.628],
	[0.45, 0.684],
	[0.56, 0.678],
	[0.7, 0.632],
	[0.84, 0.6],
	[1, 0.585],
];
const NEAR: [number, number][] = [
	[0, 0.765],
	[0.1, 0.75],
	[0.24, 0.775],
	[0.42, 0.815],
	[0.58, 0.82],
	[0.74, 0.785],
	[0.88, 0.76],
	[1, 0.75],
];
const ROAD: [number, number][] = [
	[0.165, 0.611],
	[0.23, 0.624],
	[0.31, 0.653],
	[0.38, 0.69],
	[0.45, 0.722],
	[0.52, 0.735],
	[0.6, 0.716],
	[0.68, 0.688],
	[0.77, 0.662],
	[0.88, 0.646],
	[0.97, 0.64],
	[1.06, 0.636],
];

type RowSpec = {
	first: number;
	gap: number;
	grow: number;
	/** Hedge height as a share of the gap. */
	tall: number;
	/** Bush width as a share of hedge height. */
	bush: number;
	/** Rows end once the whole row is below this. */
	stop: (x: number) => number;
	/** Where a hedge may grow. */
	keep: (x: number, y: number, h: number, k: number) => boolean;
	track?: (k: number) => boolean;
	seed: number;
};

function makeRows(W: number, top: Float32Array, o: RowSpec) {
	const rows: Row[] = [];
	const n = top.length;
	let d = o.first;
	let gap = o.gap;
	for (let k = 0; k < 60; k++) {
		const hh = gap * o.tall;
		const S = hh * o.bush;
		const off = hash(k, o.seed) * S * 7;
		const y = new Float32Array(n);
		const h = new Float32Array(n);
		const m = new Float32Array(n);
		const track = o.track?.(k) ?? false;
		let visible = false;
		for (let x = 0; x < n; x++) {
			// Rows follow the contour, loosening a touch with depth.
			y[x] = top[x] + d + (fbm1(x / (W * 0.08), o.seed + k) - 0.5) * gap * 0.3;
			if (y[x] - hh < o.stop(x)) visible = true;
			m[x] = noise1(x / (S * 0.5), o.seed * 3 + k);
			if (track || !o.keep(x, y[x], hh, k)) continue;
			const ph = (x + off) / S;
			const i = Math.floor(ph);
			const f = ph - i;
			const lump = Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2));
			h[x] =
				hh *
				(0.74 +
					0.26 * lump * (0.75 + 0.5 * hash(i, o.seed * 7 + k)) +
					0.05 * (noise1(x / 2.3, o.seed + k * 3) - 0.5));
		}
		if (!visible) break;
		// Round off the ends of each run of hedge.
		const end = S * 0.6;
		let run = 0;
		const left = new Float32Array(n);
		for (let x = 0; x < n; x++) left[x] = run = h[x] > 0 ? run + 1 : 0;
		run = 0;
		for (let x = n - 1; x >= 0; x--) {
			run = h[x] > 0 ? run + 1 : 0;
			const e = clamp(Math.min(left[x], run) / end, 0, 1);
			h[x] *= Math.sqrt(1 - (1 - e) ** 2);
		}
		rows.push({ y, h, m, gap, S, off, seed: o.seed * 100 + k, track });
		d += gap;
		gap *= o.grow;
	}
	return rows;
}

function plan(W: number, H: number, gutter: number): Plan {
	const z = clamp(H / 900, 0.72, 1.5);
	const hillTop = curve(
		W,
		H,
		(u) => spline(HILL, u) + 0.006 * (fbm1(u * 9, 21) - 0.5),
	);
	const nearTop = curve(
		W,
		H,
		(u) => spline(NEAR, u) + 0.008 * (fbm1(u * 7, 31) - 0.5),
	);
	const midTopA = curve(W, H, midTop);

	// The farm fills the left gutter: house on the shoulder, the drying patio
	// spread in front of it.
	const fx0 = Math.max(8, gutter * 0.04);
	const fx1 = Math.max(fx0 + 170 * z, gutter - 14);
	const house = {
		x: fx0 + 10 * z,
		y: H * 0.598,
		w: Math.min(104 * z, (fx1 - fx0) * 0.58),
		h: 30 * z,
		roof: 18 * z,
	};
	const patio = {
		x0: fx0,
		x1: fx1 - 12 * z,
		y0: house.y + 6 * z,
		y1: house.y + 6 * z + 50 * z,
		skew: 12 * z,
	};

	// The road leaves the patio's corner, sampled finely, with arc length.
	const road: Plan["road"] = [];
	const roadAt = new Float32Array(Math.ceil(W) + 2).fill(Number.NaN);
	let len = 0;
	const rx0 = patio.x1 + patio.skew * 0.5;
	const ry0 = (patio.y0 + patio.y1) * 0.5;
	for (let i = 0; i <= 400; i++) {
		const u = lerp(rx0 / W, 1.06, i / 400);
		const x = u * W;
		// Ease from the patio's edge into the road's own line.
		const join = smooth(0, 0.08, u - rx0 / W);
		const y = lerp(ry0, spline(ROAD, u) * H, join);
		if (road.length) {
			const p = road[road.length - 1];
			len += Math.hypot(x - p.x, y - p.y);
		}
		road.push({ x, y, w: 7 * z, d: len });
		if (x >= 0 && x < roadAt.length) roadAt[x | 0] = y;
	}
	for (let x = 1; x < roadAt.length; x++)
		if (Number.isNaN(roadAt[x]) && !Number.isNaN(roadAt[x - 1]))
			roadAt[x] = roadAt[x - 1];

	const rw = 7 * z;
	const offRoad = (x: number, y: number, h: number) => {
		const ry = at(roadAt, x);
		if (Number.isNaN(ry)) return true;
		return y < ry - rw * 0.5 - 2 || y - h > ry + rw * 0.5 + 2;
	};
	const offFarm = (x: number, y: number, h: number) =>
		x > fx1 + 18 * z ||
		y - h > patio.y1 + 12 * z ||
		y < house.y - house.h - house.roof - 6 * z;
	// The valley floor stays open meadow; elsewhere the slopes are planted in
	// blocks, with pasture between.
	const plantDepth = (x: number) => {
		const u = x / W;
		const valley = smooth(0.3, 0.42, u) * (1 - smooth(0.6, 0.72, u));
		return lerp(H * 0.3, H * 0.02, valley);
	};
	const hillRows = makeRows(W, hillTop, {
		first: 5 * z,
		gap: 7.5 * z,
		grow: 1.04,
		tall: 0.62,
		bush: 1.5,
		stop: (x) => at(nearTop, x) + 4,
		keep: (x, y, h, k) =>
			y - at(hillTop, x) < plantDepth(x) &&
			fbm1(x / (W * 0.09) + k * 0.11, 300) > 0.36 + 0.08 * Math.sin(k * 0.8) &&
			offRoad(x, y, h) &&
			offFarm(x, y, h),
		track: (k) => k % 6 === 4,
		seed: 3,
	});

	// A footpath runs straight down the near slope between the bushes.
	const nearMid = H * 0.8;
	const path = (y: number) =>
		W * (0.355 - 0.05 * clamp((y - nearMid) / (H * 0.2), -1, 1));
	const nearRows = makeRows(W, nearTop, {
		first: 10 * z,
		gap: 22 * z,
		grow: 1.27,
		tall: 0.54,
		bush: 1.25,
		stop: () => H + 30,
		keep: (x, y, h) =>
			Math.abs(x - path(y - h * 0.5)) > 6 * z + (y - nearMid) * 0.04,
		seed: 4,
	});

	const sun = { x: W * 0.09, y: H * 0.43, r: clamp(H * 0.026, 14, 30) };

	const trees: Tree[] = [];
	const plant = (layer: 3 | 4, x: number, row: number, h: number) => {
		const rows = layer === 3 ? hillRows : nearRows;
		const r = rows[Math.min(rows.length - 1, row)];
		trees.push({
			layer,
			x,
			y: at(r.y, x) + r.gap * 0.45,
			h: h * z,
			seed: trees.length + 1,
		});
	};
	trees.push({
		layer: 3,
		x: house.x + house.w + 14 * z,
		y: house.y + 1,
		h: 96 * z,
		seed: 40,
	});
	plant(3, W * 0.37, 1, 64);
	plant(3, W * 0.6, 2, 72);
	plant(3, W * 0.775, 5, 84);
	plant(3, W * 0.965, 1, 90);
	plant(4, W * 0.235, 0, 160);
	plant(4, W * 0.47, 1, 170);
	plant(4, W * 0.8, 0, 185);

	const pickers: Picker[] = [
		{ layer: 4, row: 0, x0: W * 0.035, dir: 1, off: 0, shirt: 1, steps: 7 },
		{ layer: 4, row: 1, x0: W * 0.955, dir: -1, off: 23, shirt: 0, steps: 6 },
		{ layer: 4, row: 2, x0: W * 0.68, dir: -1, off: 41, shirt: 2, steps: 6 },
		{ layer: 3, row: 3, x0: W * 0.86, dir: 1, off: 12, shirt: 3, steps: 6 },
		{ layer: 3, row: 8, x0: W * 0.94, dir: -1, off: 50, shirt: 4, steps: 7 },
		{ layer: 3, row: 7, x0: W * 0.27, dir: 1, off: 31, shirt: 0, steps: 7 },
	];

	const canvas = () => document.createElement("canvas");
	return {
		W,
		H,
		z,
		sun,
		sky: canvas(),
		mid: { top: midTopA, rows: [], canvas: canvas() },
		hill: { top: hillTop, rows: hillRows, canvas: canvas() },
		near: { top: nearTop, rows: nearRows, canvas: canvas() },
		house,
		patio,
		road,
		roadLen: len,
		roadAt,
		path,
		trees,
		pickers,
		key: "",
	};
}

/* ----------------------------------------------------------------- paint */

/** Black in a night palette cuts a silhouette out of whatever is beneath. */
function filler(c: Ctx, pal: Pal) {
	return (col: Rgb, a = 1) => {
		if (pal.night && col === CUT) {
			c.globalCompositeOperation = "destination-out";
			c.fillStyle = `rgb(0 0 0 / ${clamp(a, 0, 1).toFixed(3)})`;
		} else {
			c.globalCompositeOperation = "source-over";
			c.fillStyle = rgba(col, a);
		}
	};
}
function stroker(c: Ctx, pal: Pal) {
	return (col: Rgb, a = 1) => {
		if (pal.night && col === CUT) {
			c.globalCompositeOperation = "destination-out";
			c.strokeStyle = `rgb(0 0 0 / ${clamp(a, 0, 1).toFixed(3)})`;
		} else {
			c.globalCompositeOperation = "source-over";
			c.strokeStyle = rgba(col, a);
		}
	};
}

function sized(cv: HTMLCanvasElement, W: number, H: number, scale: number) {
	cv.width = Math.ceil(W * scale);
	cv.height = Math.ceil(H * scale);
	const g = cv.getContext("2d");
	if (!g) return null;
	g.setTransform(scale, 0, 0, scale, 0, 0);
	g.clearRect(0, 0, W, H);
	return g;
}

type BodyOpts = {
	shade: Rgb;
	lit: Rgb;
	alpha: number;
	/** How far below the crest the haze is thickest, px. */
	hazeDepth: number;
	haze: number;
	sunX: number;
	gain: number;
	gully?: { x: number; y: number };
	/** Lighten the faces toward this colour at the crest. */
	rim?: number;
};

/** A land mass under a crest line, each face lit by its slope to the sun. */
function paintBody(
	g: Ctx,
	scale: number,
	top: Float32Array,
	pal: Pal,
	o: BodyOpts,
) {
	const cw = g.canvas.width;
	const ch = g.canvas.height;
	const img = g.getImageData(0, 0, cw, ch);
	const d = img.data;
	for (let x = 0; x < cw; x++) {
		const X = x / scale;
		const xi = Math.min(top.length - 2, X | 0);
		const yTop = top[xi];
		const span = 10;
		const slope =
			(top[Math.min(top.length - 1, xi + span)] - top[Math.max(0, xi - span)]) /
			(2 * span);
		// The sun is low on the left: every face is lit from that side.
		const toward = -1;
		const face = smooth(0, 1, 0.5 + slope * toward * o.gain);
		for (let y = Math.max(0, Math.floor(yTop * scale)); y < ch; y++) {
			const Y = (y + 0.5) / scale;
			const cover = clamp((Y - yTop) * scale + 0.5, 0, 1);
			if (cover <= 0) continue;
			const down = (Y - yTop) / o.hazeDepth;
			let light = face * (1 - 0.45 * smooth(0, 1.2, down));
			if (o.gully) {
				const gx = (X - o.gully.x) / (Y - o.gully.y + 24);
				const n = noise1(gx * 16, 77) - 0.5;
				const n2 = noise1(gx * 41, 78) - 0.5;
				light += (n * 0.5 + n2 * 0.3) * (1 - smooth(0.2, 1.4, down));
			}
			let c = mix(o.shade, o.lit, clamp(light, 0, 1));
			if (o.rim) c = mix(c, pal.haze, o.rim * (1 - smooth(0, 3, Y - yTop)));
			c = mix(c, pal.haze, smooth(0.25, 1.6, down) * o.haze);
			const i = (y * cw + x) * 4;
			const a = cover * o.alpha;
			const da = d[i + 3] / 255;
			const oa = a + da * (1 - a);
			if (oa <= 0) continue;
			const k = a / oa;
			d[i] += (c[0] - d[i]) * k;
			d[i + 1] += (c[1] - d[i + 1]) * k;
			d[i + 2] += (c[2] - d[i + 2]) * k;
			d[i + 3] = oa * 255;
		}
	}
	g.putImageData(img, 0, 0);
}

function paintSky(p: Plan, pal: Pal, scale: number) {
	const { W, H, sun } = p;
	const g = sized(p.sky, W, H * 0.62, scale);
	if (!g) return;
	const sky = g.createLinearGradient(0, 0, 0, H * 0.58);
	sky.addColorStop(0, rgba(pal.skyTop, pal.skyA[0]));
	sky.addColorStop(
		0.55,
		rgba(mix(pal.skyTop, pal.skyLow, 0.6), pal.skyA[1] * 0.6),
	);
	sky.addColorStop(1, rgba(pal.skyLow, pal.skyA[1]));
	g.fillStyle = sky;
	g.fillRect(0, 0, W, H * 0.62);
	// A wide warm wash, then a long low band of haze the sun sits in.
	const glow = g.createRadialGradient(
		sun.x,
		sun.y,
		sun.r,
		sun.x,
		sun.y,
		H * 0.62,
	);
	glow.addColorStop(0, rgba(pal.glow, pal.night ? 0.4 : 0.62));
	glow.addColorStop(0.3, rgba(pal.glow, pal.night ? 0.14 : 0.3));
	glow.addColorStop(1, rgba(pal.glow, 0));
	g.fillStyle = glow;
	g.fillRect(0, 0, W, H * 0.62);
	g.save();
	g.translate(sun.x, sun.y + sun.r * 0.6);
	g.scale(1, 0.13);
	const band = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.45);
	band.addColorStop(
		0,
		rgba(mix(pal.glow, pal.sun, 0.5), pal.night ? 0.3 : 0.55),
	);
	band.addColorStop(0.5, rgba(pal.glow, pal.night ? 0.1 : 0.2));
	band.addColorStop(1, rgba(pal.glow, 0));
	g.fillStyle = band;
	g.fillRect(-W * 0.45, -W * 0.45, W * 0.9, W * 0.9);
	g.restore();
	const bloom = g.createRadialGradient(
		sun.x,
		sun.y,
		sun.r * 0.6,
		sun.x,
		sun.y,
		sun.r * 4,
	);
	bloom.addColorStop(0, rgba(pal.sun, pal.night ? 0.35 : 0.6));
	bloom.addColorStop(0.35, rgba(pal.glow, pal.night ? 0.12 : 0.28));
	bloom.addColorStop(1, rgba(pal.glow, 0));
	g.fillStyle = bloom;
	g.fillRect(sun.x - sun.r * 4, sun.y - sun.r * 4, sun.r * 8, sun.r * 8);
	// The disc, pale at the heart, its rim melting into the haze.
	const disc = g.createRadialGradient(
		sun.x,
		sun.y,
		0,
		sun.x,
		sun.y,
		sun.r * 1.25,
	);
	const core: Rgb = pal.night ? pal.sun : [255, 248, 228];
	disc.addColorStop(0, rgba(core, 1));
	disc.addColorStop(0.6, rgba(mix(core, pal.sun, 0.5), 1));
	disc.addColorStop(0.78, rgba(pal.sun, 0.9));
	disc.addColorStop(1, rgba(pal.sun, 0));
	g.fillStyle = disc;
	g.fillRect(
		sun.x - sun.r * 1.3,
		sun.y - sun.r * 1.3,
		sun.r * 2.6,
		sun.r * 2.6,
	);

	const far = curve(W, H, farTop);
	paintBody(g, scale, far, pal, {
		shade: pal.far[0],
		lit: pal.far[1],
		alpha: pal.body[0],
		hazeDepth: H * 0.09,
		haze: pal.night ? 0.3 : 0.6,
		sunX: sun.x,
		gain: 3,
		gully: { x: W * 0.25, y: H * 0.355 },
	});
	const volc = curve(W, H, volcTop);
	paintBody(g, scale, volc, pal, {
		shade: pal.volc[0],
		lit: pal.volc[1],
		alpha: pal.body[1],
		hazeDepth: H * 0.16,
		haze: pal.night ? 0.25 : 0.55,
		sunX: sun.x,
		gain: 2.6,
		gully: { x: W * 0.84, y: H * 0.262 },
	});
}

function paintMid(p: Plan, pal: Pal, scale: number) {
	const { W, H } = p;
	const g = sized(p.mid.canvas, W, H * 0.8, scale);
	if (!g) return;
	const top = p.mid.top;
	paintBody(g, scale, top, pal, {
		shade: pal.mid[0],
		lit: pal.mid[1],
		alpha: pal.body[2],
		hazeDepth: H * 0.08,
		haze: pal.night ? 0.2 : 0.45,
		sunX: p.sun.x,
		gain: 4,
		rim: 0.4,
	});
	// Distant terraces: soft combed stripes along the contour.
	const stroke = stroker(g, pal);
	for (let k = 1; k < 16; k++) {
		const d = 2.2 * k + 0.12 * k * k;
		g.lineWidth = 1.2 + k * 0.08;
		stroke(pal.midRow, (pal.night ? 0.25 : 0.32) * (1 - k / 22));
		g.beginPath();
		for (let x = 0; x <= W; x += 4) {
			const y = top[x | 0] + d + Math.sin(x * 0.02 + k) * 0.6;
			if (x === 0) g.moveTo(x, y);
			else g.lineTo(x, y);
		}
		g.stroke();
	}
	g.globalCompositeOperation = "source-over";
	// Far shade trees: tiny flat crowns on thin stems.
	const fill = filler(g, pal);
	for (let i = 0; i < W / 26; i++) {
		const x = hash(i, 51) * W;
		const y = top[x | 0] + 3 + hash(i, 52) * 26;
		const h = 5 + 4 * hash(i, 53);
		fill(pal.night ? pal.leafLit : pal.midRow, pal.night ? 0.3 : 0.7);
		g.fillRect(x - 0.4, y - h, 0.9, h);
		g.beginPath();
		g.ellipse(x, y - h, 3.4 + 2 * hash(i, 54), 1.4, 0, 0, TAU);
		g.fill();
	}
	g.globalCompositeOperation = "source-over";
}

/* ---------------------------------------------------------------- hedges */

type Ink = {
	c: [Rgb, Rgb, Rgb, Rgb];
	a: [number, number, number, number];
	crest: boolean;
	/** Share of bushes carrying a visible cluster of cherries. */
	cherries: number;
	step: number;
};

function inkFor(
	pal: Pal,
	haze: number,
	crest: boolean,
	cherries: number,
	step: number,
): Ink {
	const c = pal.hedge.map((col) =>
		col === CUT ? CUT : mix(col, pal.haze, haze),
	) as Ink["c"];
	return { c, a: pal.hedgeA, crest, cherries, step };
}

/** Calls back with each unbroken run of hedge inside [from, to]. */
function runs(
	row: Row,
	from: number,
	to: number,
	cb: (a: number, e: number) => void,
) {
	const n = row.h.length;
	const hi = Math.min(n - 1, Math.ceil(to));
	let x = Math.max(0, Math.floor(from));
	while (x <= hi) {
		if (row.h[x] <= 0) {
			x++;
			continue;
		}
		let e = x;
		while (e < hi && row.h[e + 1] > 0) e++;
		cb(x, e);
		x = e + 1;
	}
}

/** Sample points on a fixed grid, so a partial redraw matches the cache. */
function grid(a: number, e: number, step: number) {
	const xs = [a];
	for (let q = Math.ceil((a + 1) / step) * step; q < e; q += step) xs.push(q);
	xs.push(e);
	return xs;
}

/**
 * A row of coffee as one continuous hedge: a shaded flank, a leafy middle,
 * a sunlit top, each bush rounder on its sunward side.
 */
function hedge(g: Ctx, pal: Pal, row: Row, ink: Ink, from: number, to: number) {
	if (row.track) return;
	const fill = filler(g, pal);
	const { y, h, m, S, off } = row;
	// Each bush's far side (from the sun) sits in its own shade.
	const lee = (q: number) => {
		const f = (q + off) / S;
		return smooth(0.45, 0.95, f - Math.floor(f));
	};
	runs(row, from, to, (a, e) => {
		const xs = grid(a, e, ink.step);
		const band = (bot: (q: number) => number) => {
			g.beginPath();
			for (let i = 0; i < xs.length; i++) {
				const q = xs[i];
				if (i) g.lineTo(q, y[q] - h[q]);
				else g.moveTo(q, y[q] - h[q]);
			}
			for (let i = xs.length - 1; i >= 0; i--) {
				const q = xs[i];
				g.lineTo(q, y[q] - h[q] * (1 - bot(q)));
			}
			g.closePath();
			g.fill();
		};
		fill(ink.c[0], ink.a[0]);
		band(() => 1);
		fill(ink.c[1], ink.a[1]);
		band((q) => 0.5 + 0.2 * m[q] - 0.2 * lee(q));
		fill(ink.c[2], ink.a[2]);
		band((q) => 0.2 + 0.12 * (1 - m[q]) - 0.12 * lee(q));
		if (ink.crest) {
			fill(ink.c[3], ink.a[3]);
			band((q) => 0.05 * (1 - lee(q)) + 0.02 * m[q]);
		}
	});
	cherries(g, pal, row, ink, from, to);
	g.globalCompositeOperation = "source-over";
}

/** A few small clusters of ripe cherries in the shaded flank. */
function cherries(
	g: Ctx,
	pal: Pal,
	row: Row,
	ink: Ink,
	from: number,
	to: number,
) {
	if (ink.cherries <= 0) return;
	const fill = filler(g, pal);
	const r = clamp(row.gap * 0.028, 0.9, 2);
	const i0 = Math.floor((from + row.off) / row.S) - 1;
	const i1 = Math.ceil((to + row.off) / row.S) + 1;
	for (let i = i0; i <= i1; i++) {
		if (hash(i, row.seed + 5) > ink.cherries) continue;
		const xc = (i + 0.15 + 0.6 * hash(i, row.seed + 6)) * row.S - row.off;
		const xi = Math.round(xc);
		if (xi < 0 || xi >= row.h.length) continue;
		const h = row.h[xi];
		if (h < row.gap * 0.3) continue;
		const yc = row.y[xi] - h * (0.3 + 0.2 * hash(i, row.seed + 7));
		const n = 3 + ((hash(i, row.seed + 8) * 4) | 0);
		for (let q = 0; q < n; q++) {
			// Strung along a twig, sagging.
			const s = q / (n - 1) - 0.5;
			const dx = s * r * 5 + (hash(i * 7 + q, row.seed + 9) - 0.5) * r;
			const dy =
				s * s * r * 3 + (hash(i * 7 + q, row.seed + 10) - 0.5) * r * 1.4;
			const ripe = hash(i * 7 + q, row.seed + 11);
			const col =
				ripe < 0.62 ? pal.cherry : ripe < 0.9 ? pal.cherryDeep : pal.cherryGold;
			fill(col, pal.night ? 0.55 : 1);
			g.beginPath();
			g.arc(xc + dx, yc + dy, r, 0, TAU);
			g.fill();
		}
	}
}

/** The worn earth of the aisle below a hedge, and the hedge's shadow on it. */
function aisle(
	g: Ctx,
	pal: Pal,
	row: Row,
	deep: number,
	haze: number,
	only: boolean,
) {
	const fill = filler(g, pal);
	const strip = (a: number, e: number, d0: number, d1: number) => {
		const xs = grid(a, e, 4);
		g.beginPath();
		for (let i = 0; i < xs.length; i++) {
			const q = xs[i];
			const yy = row.y[q] + row.gap * d0;
			if (i) g.lineTo(q, yy);
			else g.moveTo(q, yy);
		}
		for (let i = xs.length - 1; i >= 0; i--) {
			const q = xs[i];
			g.lineTo(q, row.y[q] + row.gap * d1);
		}
		g.closePath();
		g.fill();
	};
	const each = (cb: (a: number, e: number) => void) =>
		only ? runs(row, 0, row.h.length, cb) : cb(0, row.h.length - 1);
	fill(mix(pal.earth, pal.haze, haze), pal.earthA);
	each((a, e) => strip(a, e, 0, deep));
	if (!pal.night) {
		fill(mix(pal.hedge[0], pal.earth, 0.35 + haze), 0.5);
		each((a, e) => strip(a, e, 0, deep * 0.22));
	}
	g.globalCompositeOperation = "source-over";
}

/* ------------------------------------------------------------ the hill */

const hillInk = (pal: Pal, k: number, n: number) =>
	inkFor(
		pal,
		(pal.night ? 0.12 : 0.5) * (1 - k / n) + (pal.night ? 0.06 : 0.14),
		false,
		0,
		3,
	);
const nearInk = (pal: Pal, k: number) =>
	inkFor(pal, 0, k > 0, k < 3 ? 0.32 - k * 0.08 : 0, 2);

function paintHill(p: Plan, pal: Pal, scale: number) {
	const { W, H, z } = p;
	const L = p.hill;
	const g = sized(L.canvas, W, H, scale);
	if (!g) return;
	paintBody(g, scale, L.top, pal, {
		shade: pal.hill[0],
		lit: pal.hill[1],
		alpha: pal.body[3],
		hazeDepth: H * 0.2,
		haze: pal.night ? 0.05 : 0.12,
		sunX: p.sun.x,
		gain: 5,
		rim: pal.night ? 0.5 : 0.3,
	});
	// The road, a pale ribbon with a worn centre and a shaded downhill edge.
	const strokeRoad = (col: Rgb, a: number, w: number, dy: number) => {
		const stroke = stroker(g, pal);
		stroke(col, a);
		g.lineWidth = w;
		g.lineCap = "round";
		g.lineJoin = "round";
		g.beginPath();
		p.road.forEach((pt, i) => {
			if (i === 0) g.moveTo(pt.x, pt.y + dy);
			else g.lineTo(pt.x, pt.y + dy);
		});
		g.stroke();
	};
	const rw = p.road[0].w;
	strokeRoad(pal.roadEdge, pal.night ? 0.8 : 0.55, rw + 2, 1.2);
	strokeRoad(pal.road, pal.night ? 0.35 : 1, rw, 0);
	strokeRoad(
		mix(pal.road, [255, 250, 240], 0.4),
		pal.night ? 0.15 : 0.6,
		rw * 0.35,
		-0.5,
	);
	g.globalCompositeOperation = "source-over";

	const rows = L.rows;
	for (let k = 0; k < rows.length; k++) {
		const row = rows[k];
		const ink = hillInk(pal, k, rows.length);
		if (row.track) {
			// A farm track along the terrace, where the rows either side grow.
			const prev = rows[k - 1];
			const next = rows[k + 1];
			const stroke = stroker(g, pal);
			stroke(
				mix(pal.earth, pal.haze, 0.25 * (1 - k / rows.length)),
				pal.night ? 0.3 : 0.9,
			);
			g.lineWidth = Math.max(1.4, row.gap * 0.3);
			g.lineCap = "round";
			g.beginPath();
			let on = false;
			for (let x = 0; x < row.y.length; x += 3) {
				const ok = (prev && prev.h[x] > 0) || (next && next.h[x] > 0);
				const yy = row.y[x] - row.gap * 0.3;
				if (ok && !on) g.moveTo(x, yy);
				else if (ok) g.lineTo(x, yy);
				on = ok;
			}
			g.stroke();
			g.globalCompositeOperation = "source-over";
			continue;
		}
		hedge(g, pal, row, ink, 0, W);
		aisle(
			g,
			pal,
			row,
			0.55,
			(pal.night ? 0.1 : 0.4) * (1 - k / rows.length) + 0.1,
			true,
		);
	}
	paintFarm(g, p, pal, z);
}

function paintFarm(g: Ctx, p: Plan, pal: Pal, z: number) {
	const fill = filler(g, pal);
	const { house: h, patio: pt } = p;
	const night = pal.night;
	// A worn yard round the buildings.
	if (!night) {
		const cx = (pt.x0 + pt.x1) / 2;
		const cy = (h.y + pt.y1) / 2;
		const rx = (pt.x1 - pt.x0) * 0.62;
		g.save();
		g.translate(cx, cy);
		g.scale(1, ((pt.y1 - h.y + 30 * z) / rx) * 0.6);
		const gr = g.createRadialGradient(0, 0, rx * 0.3, 0, 0, rx);
		gr.addColorStop(0, rgba(mix(pal.earth, pal.hill[1], 0.4), 0.7));
		gr.addColorStop(1, rgba(mix(pal.earth, pal.hill[1], 0.6), 0));
		g.fillStyle = gr;
		g.fillRect(-rx, -rx, rx * 2, rx * 2);
		g.restore();
	}
	// The patio: a pale slab cut into the slope, held by a stone wall.
	const depth = pt.y1 - pt.y0;
	const sx = (y: number) => pt.skew * (1 - (y - pt.y0) / depth);
	const quad = (x0: number, x1: number, y0: number, y1: number) => {
		g.beginPath();
		g.moveTo(x0 + sx(y0), y0);
		g.lineTo(x1 + sx(y0), y0);
		g.lineTo(x1 + sx(y1), y1);
		g.lineTo(x0 + sx(y1), y1);
		g.closePath();
	};
	const wall = 7 * z;
	fill(pal.patioEdge, night ? 1 : 0.95);
	g.fillRect(pt.x0, pt.y1, pt.x1 - pt.x0, wall);
	if (!night) {
		fill(mix(pal.patioEdge, [60, 50, 40], 0.25), 0.6);
		for (let r = 0; r < 2; r++)
			for (let x = pt.x0 + (r ? 6 : 0) * z; x < pt.x1 - 2; x += 12 * z)
				g.fillRect(x, pt.y1 + (r ? wall * 0.5 : 0) + 1, 0.9, wall * 0.5 - 1);
		fill(mix(pal.patioEdge, [60, 50, 40], 0.2), 0.5);
		g.fillRect(pt.x0, pt.y1 + wall * 0.5, pt.x1 - pt.x0, 0.8);
	}
	fill(pal.patio, night ? 0.45 : 1);
	quad(pt.x0, pt.x1, pt.y0, pt.y1);
	g.fill();
	if (!night) {
		fill([255, 252, 244], 0.8);
		g.fillRect(pt.x0, pt.y1 - 1.2 * z, pt.x1 - pt.x0, 1.2 * z);
	}
	// Beans spread in beds at their stages, raked into long ridges.
	const inset = 5 * z;
	const secs = pal.beans.length;
	const span = (pt.x1 - pt.x0 - inset * 2) / secs;
	for (let s = 0; s < secs; s++) {
		const x0 = pt.x0 + inset + s * span + 2 * z;
		const x1 = x0 + span - 4 * z;
		const y0 = pt.y0 + inset * 0.8;
		const y1 = pt.y1 - inset;
		const col = pal.beans[s];
		fill(col, night ? 0.5 : 1);
		quad(x0, x1, y0, y1);
		g.fill();
		const pitch = 3.6 * z;
		for (let y = y0 + pitch * 0.6; y < y1 - 1; y += pitch) {
			fill(mix(col, [40, 24, 20], 0.28), night ? 0.3 : 0.6);
			quad(x0 + 1, x1 - 1, y + 0.9 * z, y + 1.9 * z);
			g.fill();
			fill(mix(col, [255, 246, 228], 0.35), night ? 0.25 : 0.7);
			quad(x0 + 1, x1 - 1, y, y + 0.9 * z);
			g.fill();
		}
	}

	// The house, set back on the shoulder: cream walls, a red hipped roof.
	const y = h.y;
	// Its shadow on the patio, cast right by the low sun.
	if (!night) {
		fill(mix(pal.patioEdge, pal.patio, 0.3), 0.5);
		g.beginPath();
		g.moveTo(h.x + h.w, y);
		g.lineTo(h.x + h.w + 22 * z, y);
		g.lineTo(h.x + h.w + 16 * z, y + 6 * z);
		g.lineTo(h.x + h.w, y + 6 * z);
		g.fill();
	}
	fill(pal.wall, night ? 0.5 : 1);
	g.fillRect(h.x, y - h.h, h.w, h.h);
	// The end wall away from the sun.
	fill(pal.wallShade, night ? 1 : 0.9);
	g.fillRect(h.x + h.w * 0.78, y - h.h, h.w * 0.22, h.h);
	// A veranda shadow under the eaves, deeper on the porch.
	fill(pal.wallShade, night ? 0.6 : 0.5);
	g.fillRect(h.x, y - h.h, h.w * 0.78, h.h * 0.28);
	// Plinth.
	fill(mix(pal.wallShade, [80, 60, 50], 0.2), night ? 0.8 : 0.7);
	g.fillRect(h.x, y - 2.4 * z, h.w * 0.78, 2.4 * z);
	// Windows with shutters, and the door.
	const shutter: Rgb = night ? CUT : [104, 146, 150];
	const ww = 6 * z;
	const wins = [0.1, 0.3, 0.58];
	for (let i = 0; i < wins.length; i++) {
		const wx = h.x + h.w * wins[i];
		const wy = y - h.h * 0.66;
		if (night) {
			const gl = g.createRadialGradient(
				wx + ww / 2,
				wy + ww / 2,
				0,
				wx + ww / 2,
				wy + ww / 2,
				18 * z,
			);
			gl.addColorStop(0, rgba(pal.window, 0.6));
			gl.addColorStop(1, rgba(pal.window, 0));
			g.globalCompositeOperation = "source-over";
			g.fillStyle = gl;
			g.fillRect(wx - 18 * z, wy - 18 * z, 42 * z, 36 * z);
		}
		fill(pal.window, night ? 1 : 0.9);
		g.fillRect(wx, wy, ww, ww * 1.15);
		fill(shutter, night ? 1 : 0.95);
		g.fillRect(wx - 2.4 * z, wy, 2.2 * z, ww * 1.15);
		g.fillRect(wx + ww + 0.2 * z, wy, 2.2 * z, ww * 1.15);
	}
	const dx = h.x + h.w * 0.44;
	fill(night ? pal.window : [120, 92, 76], night ? 0.9 : 0.9);
	g.fillRect(dx, y - h.h * 0.72, 6.4 * z, h.h * 0.72);
	// Veranda posts.
	fill(pal.wall, night ? 0.4 : 1);
	for (let i = 0; i <= 5; i++)
		g.fillRect(h.x + 1 + (i * (h.w * 0.78 - 3)) / 5, y - h.h, 1.5 * z, h.h);
	// Roof: front slope lit, hip end in shade, tile courses.
	const o = 6 * z;
	const ry = y - h.h;
	fill(pal.roof, night ? 0.55 : 1);
	g.beginPath();
	g.moveTo(h.x - o, ry + 1.5 * z);
	g.lineTo(h.x + h.w + o, ry + 1.5 * z);
	g.lineTo(h.x + h.w - h.roof * 1.1, ry - h.roof);
	g.lineTo(h.x + h.roof * 1.1, ry - h.roof);
	g.closePath();
	g.fill();
	fill(pal.roofShade, night ? 1 : 0.85);
	g.beginPath();
	g.moveTo(h.x + h.w + o, ry + 1.5 * z);
	g.lineTo(h.x + h.w - h.roof * 1.1, ry - h.roof);
	g.lineTo(h.x + h.w - h.roof * 0.4, ry + 1.5 * z);
	g.closePath();
	g.fill();
	if (!night) {
		fill(mix(pal.roof, [255, 230, 200], 0.35), 0.8);
		g.beginPath();
		g.moveTo(h.x - o, ry + 1.5 * z);
		g.lineTo(h.x + h.roof * 1.1, ry - h.roof);
		g.lineTo(h.x + h.roof * 1.1 + 3 * z, ry - h.roof);
		g.lineTo(h.x - o + 5 * z, ry + 1.5 * z);
		g.closePath();
		g.fill();
		fill(pal.roofShade, 0.35);
		for (let k = 1; k < 5; k++) {
			const ty = ry + 1.5 * z - ((h.roof + 1.5 * z) * k) / 5;
			const inset = h.roof * 1.1 * (k / 5);
			g.fillRect(
				h.x - o + inset,
				ty,
				h.w + 2 * o - inset * 2 - h.roof * 0.3,
				0.9,
			);
		}
		// Eave shadow line.
		fill(pal.roofShade, 0.8);
		g.fillRect(h.x - o, ry + 1.5 * z, h.w + 2 * o, 1.1 * z);
	}
	// Chimney.
	fill(pal.wallShade, 1);
	g.fillRect(h.x + h.w * 0.66, ry - h.roof - 3 * z, 5 * z, 10 * z);
	fill(pal.roofShade, night ? 1 : 0.9);
	g.fillRect(h.x + h.w * 0.66 - 0.8 * z, ry - h.roof - 4 * z, 6.6 * z, 1.6 * z);
	// Sacks of picked cherries waiting at the patio's corner.
	g.globalCompositeOperation = "source-over";
	const kx = pt.x1 + pt.skew * 0.2 - 8 * z;
	drawSack(g, pal, kx - 6 * z, pt.y0 + 6 * z, 1.25 * z);
	drawSack(g, pal, kx, pt.y0 + 7 * z, 1.3 * z);
	g.globalCompositeOperation = "source-over";
}

function paintNear(p: Plan, pal: Pal, scale: number) {
	const { W, H, z } = p;
	const L = p.near;
	const g = sized(L.canvas, W, H, scale);
	if (!g) return;
	paintBody(g, scale, L.top, pal, {
		shade: pal.near[0],
		lit: pal.near[1],
		alpha: pal.body[4],
		hazeDepth: H * 0.25,
		haze: 0,
		sunX: p.sun.x,
		gain: 5,
		rim: pal.night ? 0.5 : 0.25,
	});
	// The footpath down between the bushes.
	const fill = filler(g, pal);
	fill(pal.earth, pal.night ? pal.earthA : 0.9);
	g.beginPath();
	const y0 = at(L.top, p.path(L.top[0])) + 2;
	const half = (y: number) => (6 * z + (y - H * 0.8) * 0.04) * 0.9;
	for (let y = y0; y <= H + 4; y += 4) g.lineTo(p.path(y) - half(y), y);
	for (let y = H + 4; y >= y0; y -= 4) g.lineTo(p.path(y) + half(y), y);
	g.closePath();
	g.fill();
	g.globalCompositeOperation = "source-over";
	for (let k = 0; k < L.rows.length; k++) {
		const row = L.rows[k];
		hedge(g, pal, row, nearInk(pal, k), 0, W);
		aisle(g, pal, row, 0.6, 0, false);
	}
}

/* ------------------------------------------------------------- per frame */

function drawMask(c: Ctx, p: Plan, top: Float32Array) {
	c.globalCompositeOperation = "destination-out";
	c.fillStyle = "#000";
	c.beginPath();
	c.moveTo(0, p.H);
	for (let x = 0; x <= p.W; x += 3) c.lineTo(x, top[x | 0] + 0.5);
	c.lineTo(p.W, top[p.W | 0] + 0.5);
	c.lineTo(p.W, p.H);
	c.closePath();
	c.fill();
	c.globalCompositeOperation = "source-over";
}

function blob(
	c: Ctx,
	x: number,
	y: number,
	rx: number,
	ry: number,
	col: Rgb,
	a: number,
) {
	if (a <= 0.004) return;
	c.save();
	c.translate(x, y);
	c.scale(1, ry / rx);
	const gr = c.createRadialGradient(0, 0, 0, 0, 0, rx);
	gr.addColorStop(0, rgba(col, a));
	gr.addColorStop(0.55, rgba(col, a * 0.6));
	gr.addColorStop(1, rgba(col, 0));
	c.fillStyle = gr;
	c.fillRect(-rx, -rx, rx * 2, rx * 2);
	c.restore();
}

/** Cloud gathered round the volcano's waist, drifting and reforming. */
function drawClouds(c: Ctx, p: Plan, pal: Pal, t: number) {
	const { W, H } = p;
	const n = 9;
	for (let i = 0; i < n; i++) {
		const span = W * 0.62;
		const x =
			W * 0.5 + ((hash(i, 401) * span + t * (3 + 2 * hash(i, 402))) % span);
		const edge =
			smooth(0, 0.18, (x - W * 0.5) / span) *
			smooth(1, 0.8, (x - W * 0.5) / span);
		const y = H * (0.405 + 0.05 * hash(i, 403)) + Math.sin(t * 0.05 + i) * 3;
		const rx = W * (0.07 + 0.06 * hash(i, 404));
		const ry = H * (0.016 + 0.012 * hash(i, 405));
		blob(
			c,
			x,
			y + ry * 0.5,
			rx,
			ry,
			pal.cloudShade,
			(pal.night ? 0.32 : 0.4) * edge,
		);
		blob(
			c,
			x - rx * 0.1,
			y,
			rx * 0.85,
			ry * 0.9,
			pal.cloud,
			(pal.night ? 0.3 : 0.75) * edge,
		);
	}
	// Thin streaks drifting across the low sun.
	const { sun } = p;
	for (let i = 0; i < 3; i++) {
		const x = sun.x + ((t * (1.6 + i * 0.5) + i * 70) % 220) - 110;
		const y = sun.y + sun.r * (0.15 + 0.45 * i);
		const fade = smooth(0, 30, 110 - Math.abs(x - sun.x));
		blob(
			c,
			x,
			y,
			W * 0.05 + i * 12,
			2.2 + i,
			pal.cloud,
			(pal.night ? 0.3 : 0.6) * fade,
		);
	}
	// A thin cap of cloud near the far volcano.
	for (let i = 0; i < 4; i++) {
		const x = W * (0.12 + 0.07 * i) + Math.sin(t * 0.04 + i * 2) * 12;
		const y = H * (0.42 + 0.012 * i);
		blob(c, x, y, W * 0.06, H * 0.012, pal.cloud, pal.night ? 0.2 : 0.5);
	}
}

/** Mist lifting off the valley floor: each wisp rises, spreads and thins. */
function drawMist(
	c: Ctx,
	p: Plan,
	pal: Pal,
	t: number,
	n: number,
	seed: number,
	y0: number,
	y1: number,
	amt: number,
) {
	const { W, H } = p;
	for (let i = 0; i < n; i++) {
		const life = 46 + 20 * hash(i, seed);
		const ph = ((t + hash(i, seed + 1) * life) / life) % 1;
		const cyc = Math.floor((t + hash(i, seed + 1) * life) / life);
		const u = hash(i * 13 + cyc, seed + 2);
		// More of it in the valley, some along the whole floor.
		const ux =
			u < 0.6
				? 0.25 + 0.5 * hash(i * 7 + cyc, seed + 3)
				: hash(i * 7 + cyc, seed + 4);
		const x = ux * W + ph * 30;
		const y = lerp(y0, y1, hash(i * 5 + cyc, seed + 5)) * H - ph * H * 0.05;
		const rx = W * (0.09 + 0.08 * hash(i, seed + 6)) * (0.8 + ph * 0.6);
		const ry = H * 0.016 * (0.8 + ph);
		const a = amt * smooth(0, 0.25, ph) * (1 - smooth(0.55, 1, ph));
		blob(c, x, y, rx, ry, pal.mist, a);
	}
}

function drawSmoke(c: Ctx, p: Plan, pal: Pal, t: number) {
	const { house: h, z } = p;
	const x0 = h.x + h.w * 0.66 + 2 * z;
	const y0 = h.y - h.h - h.roof - 4 * z;
	for (let k = 0; k < 16; k++) {
		const ph = (t * 0.07 + k / 16) % 1;
		const rise = ph * 110 * z;
		const x = x0 + rise * 0.55 * ph + Math.sin(ph * 6 + t * 0.3) * 3 * z;
		const y = y0 - rise;
		const r = (2 + ph * 12) * z;
		const a = (1 - ph) * smooth(0, 0.08, ph) * (pal.night ? 0.3 : 0.4);
		blob(c, x, y, r, r, pal.smoke, a);
	}
}

/** Birds circling a thermal over the far slope. */
function drawBirds(c: Ctx, p: Plan, pal: Pal, t: number) {
	const { W, H, z } = p;
	const cx = W * 0.905;
	const cy = H * 0.17;
	for (let i = 0; i < 4; i++) {
		const r = (36 + 22 * hash(i, 61)) * z;
		const sp = 0.22 + 0.06 * hash(i, 62);
		const a = t * sp + hash(i, 63) * TAU;
		const x = cx + Math.cos(a) * r;
		const y = cy + Math.sin(a) * r * 0.32 + (hash(i, 64) - 0.5) * 30 * z;
		// Mostly gliding; a few beats now and then.
		const beat = smooth(0.7, 0.9, noise1(t * 0.25 + i * 7, 65));
		const flap = Math.sin(t * 9 + i) * beat;
		const s = (2.6 + 0.8 * hash(i, 66)) * z;
		const dir = Math.sin(a) > 0 ? -1 : 1;
		c.fillStyle = rgba(pal.bird, pal.night ? 0.5 : 0.75);
		c.beginPath();
		c.moveTo(x - s * 1.6, y - s * (0.5 + flap * 0.6));
		c.quadraticCurveTo(x - s * 0.6, y - s * 0.5, x, y + s * 0.15);
		c.quadraticCurveTo(
			x + s * 0.6,
			y - s * 0.5,
			x + s * 1.6,
			y - s * (0.5 + flap * 0.6),
		);
		c.quadraticCurveTo(
			x + s * 0.6,
			y - s * 0.1,
			x + dir * s * 0.3,
			y + s * 0.35,
		);
		c.quadraticCurveTo(
			x - s * 0.6,
			y - s * 0.1,
			x - s * 1.6,
			y - s * (0.5 + flap * 0.6),
		);
		c.fill();
	}
}

/** A shade tree: a slim trunk forking into a flat, airy umbrella crown. */
function drawTree(c: Ctx, pal: Pal, tr: Tree, t: number) {
	const fill = filler(c, pal);
	const stroke = stroker(c, pal);
	const { x, y, h, seed } = tr;
	const r = (k: number) => hash(seed, k);
	const lean = (r(1) - 0.5) * h * 0.12;
	const fork = y - h * 0.62;
	const crownY = y - h * 0.86;
	const wide = h * (0.42 + 0.12 * r(2));
	// Trunk and the forks that hold the crown.
	stroke(pal.trunk, 1);
	c.lineCap = "round";
	c.lineWidth = Math.max(1.6, h * 0.028);
	c.beginPath();
	c.moveTo(x, y);
	c.quadraticCurveTo(x + lean * 0.3, y - h * 0.35, x + lean, fork);
	c.stroke();
	c.lineWidth = Math.max(1, h * 0.016);
	for (let k = 0; k < 4; k++) {
		const tx = x + lean + (k / 3 - 0.5) * wide * 1.3;
		c.beginPath();
		c.moveTo(x + lean, fork);
		c.quadraticCurveTo(
			x + lean + (tx - x - lean) * 0.3,
			crownY + h * 0.08,
			tx,
			crownY + h * 0.03,
		);
		c.stroke();
	}
	if (!pal.night) {
		stroke(pal.trunkLit, 0.7);
		c.lineWidth = Math.max(0.8, h * 0.01);
		c.beginPath();
		c.moveTo(x - h * 0.01, y);
		c.quadraticCurveTo(
			x + lean * 0.3 - h * 0.01,
			y - h * 0.35,
			x + lean - h * 0.01,
			fork,
		);
		c.stroke();
	}
	// The crown: overlapping flat clusters, open between them, stirring.
	const n = 7 + ((r(3) * 4) | 0);
	for (let pass = 0; pass < 2; pass++)
		for (let k = 0; k < n; k++) {
			const u = (k + 0.5) / n - 0.5;
			const sway =
				Math.sin(t * (0.7 + 0.3 * r(10 + k)) + k * 1.7 + seed) * h * 0.006;
			const cx =
				x + lean + u * wide * 2 + (r(20 + k) - 0.5) * wide * 0.25 + sway;
			const cy = crownY + Math.abs(u) * h * 0.1 + (r(30 + k) - 0.5) * h * 0.06;
			const rx = wide * (0.22 + 0.12 * r(40 + k)) * (1 - Math.abs(u) * 0.5);
			const ry = h * (0.05 + 0.025 * r(50 + k));
			if (pass === 0) {
				fill(pal.crown, pal.night ? 0.95 : 0.82);
				c.beginPath();
				c.ellipse(cx, cy, rx, ry, 0, 0, TAU);
				c.fill();
			} else {
				const lift = Math.sin(t * 0.9 + k * 2.3 + seed) * 0.08;
				fill(
					pal.crownLit,
					(pal.night ? 0.4 : 0.8) * (0.7 + lift) * (0.6 + 0.4 * (0.5 - u)),
				);
				c.beginPath();
				c.ellipse(
					cx - rx * 0.18,
					cy - ry * 0.4,
					rx * 0.72,
					ry * 0.5,
					0,
					0,
					TAU,
				);
				c.fill();
			}
		}
	c.globalCompositeOperation = "source-over";
}

type Pose = {
	bend: number;
	/** Arm angle from hanging (0) forward to overhead (~2.6). */
	reach: number;
	walk: number;
	walking: boolean;
	tip: number;
	tool: "basket" | "rake" | "lantern";
	rake?: number;
};

/**
 * A small figure in a wide straw hat, about 20 units tall, standing on (0,0)
 * and facing +x before mirroring. Sun from the left.
 */
function drawPerson(
	c: Ctx,
	pal: Pal,
	x: number,
	y: number,
	k: number,
	face: number,
	pose: Pose,
	shirt: Rgb,
	t: number,
) {
	const fill = filler(c, pal);
	const stroke = stroker(c, pal);
	const night = pal.night;
	// Light comes from world-left: in local (mirrored) space that is -face.
	const litX = -face;
	c.save();
	c.translate(x, y);
	c.scale(k * face, k);
	const sw = pose.walking ? Math.sin(pose.walk) : 0;
	// Legs.
	fill(pal.trousers);
	const leg = (dx: number, sx: number) => {
		c.beginPath();
		c.moveTo(dx - 1.1, -9.2);
		c.lineTo(dx + 1.1, -9.2);
		c.lineTo(dx + sx + 0.8, 0);
		c.lineTo(dx + sx - 0.9, 0);
		c.closePath();
		c.fill();
	};
	leg(-0.6, -sw * 2);
	leg(0.6, sw * 2);
	// Upper body, bent forward at the hip.
	c.save();
	c.translate(0, -9);
	c.rotate(pose.bend);
	fill(shirt);
	c.beginPath();
	c.moveTo(-2.2, 0.6);
	c.bezierCurveTo(-2.8, -2.5, -2.6, -5.6, -1.2, -6.6);
	c.lineTo(1.4, -6.6);
	c.bezierCurveTo(2.7, -5.6, 2.6, -2.5, 2.1, 0.6);
	c.closePath();
	c.fill();
	if (!night) {
		fill(mix(shirt, [255, 244, 220], 0.45), 0.75);
		c.beginPath();
		const lx = litX * 1.9;
		c.moveTo(lx, 0.4);
		c.bezierCurveTo(lx * 1.3, -2.5, lx * 1.25, -5.4, lx * 0.5, -6.4);
		c.lineTo(lx * 0.3, -6);
		c.bezierCurveTo(lx * 0.8, -4.6, lx * 0.8, -2, lx * 0.6, 0.4);
		c.closePath();
		c.fill();
	}
	// Head, under a wide straw hat.
	fill(pal.skin);
	c.beginPath();
	c.arc(0.5, -8, 1.75, 0, TAU);
	c.fill();
	fill(pal.hatShade);
	c.beginPath();
	c.ellipse(0.6, -9.2, 4.6, 1.15, 0.04, 0, TAU);
	c.fill();
	fill(pal.hat);
	c.beginPath();
	c.ellipse(0.6, -9.5, 4.4, 0.85, 0.04, 0, TAU);
	c.fill();
	c.beginPath();
	c.ellipse(0.6, -9.7, 2.1, 1.9, 0, Math.PI, TAU);
	c.fill();
	if (night) {
		fill(pal.rim, 0.5);
		c.beginPath();
		c.ellipse(0.6 + litX * 0.6, -10.4, 1.4, 0.9, 0, Math.PI, TAU);
		c.fill();
	} else {
		fill(pal.hatShade, 0.6);
		c.fillRect(-1.5, -10.1, 4.2, 0.55);
	}
	// The working arm: shoulder to hand.
	const sx = 0.9;
	const sy = -5.6;
	const a = pose.reach;
	const hx = sx + Math.sin(a) * 5.4;
	const hy = sy + Math.cos(a) * 5.4;
	stroke(shirt);
	c.lineCap = "round";
	c.lineWidth = 1.5;
	c.beginPath();
	c.moveTo(sx, sy);
	c.quadraticCurveTo(
		sx + Math.sin(a) * 2.2 + 0.6,
		sy + Math.cos(a) * 2.2 + 0.6,
		hx,
		hy,
	);
	c.stroke();
	fill(pal.skin);
	c.beginPath();
	c.arc(hx, hy, 0.8, 0, TAU);
	c.fill();
	c.restore();
	// Hip-level tool.
	if (pose.tool === "basket") {
		c.save();
		c.translate(2.4, -8.6);
		c.rotate(-pose.tip * 1.5);
		fill(pal.basket);
		c.beginPath();
		c.moveTo(-1, -1.5);
		c.lineTo(3.4, -1.5);
		c.lineTo(2.8, 2.2);
		c.lineTo(-0.4, 2.2);
		c.closePath();
		c.fill();
		fill(pal.basketLit, night ? 0.5 : 0.9);
		c.fillRect(-1, -1.5, 4.4, 0.7);
		if (!night) {
			fill(mix(pal.basket, [60, 40, 30], 0.3), 0.5);
			c.fillRect(-0.6, 0.2, 3.6, 0.5);
			c.fillRect(-0.4, 1.3, 3.2, 0.5);
		}
		c.restore();
	}
	if (pose.tool === "rake") {
		const push = pose.rake ?? 0;
		const hx = 3.4 + push * 1.6;
		const hy = -11.5;
		const rx = 11 + push * 5;
		stroke(pal.night ? pal.rim : pal.basket, pal.night ? 0.5 : 1);
		c.lineWidth = 0.8;
		c.beginPath();
		c.moveTo(hx - 1.4, hy - 1.2);
		c.lineTo(rx, -0.6);
		c.stroke();
		fill(pal.night ? pal.rim : pal.basket, pal.night ? 0.5 : 1);
		c.fillRect(rx - 0.5, -2.2, 1.4, 2.2);
		// Hands on the shaft.
		fill(pal.skin);
		c.beginPath();
		c.arc(hx, hy + 1.1, 0.8, 0, TAU);
		c.arc(hx + 3, hy + 4, 0.8, 0, TAU);
		c.fill();
	}
	c.restore();
	c.globalCompositeOperation = "source-over";
	if (pose.tool === "lantern") {
		const lx = x + face * 3.5 * k;
		const ly = y - 6.5 * k + Math.sin(pose.walk * 2) * 0.4 * k;
		lamp(c, pal, lx, ly, 26 * k * 0.6, t);
	}
}

function lamp(c: Ctx, pal: Pal, x: number, y: number, r: number, t: number) {
	const breathe = 0.9 + 0.1 * Math.sin(t * 1.3);
	blob(c, x, y, r, r, pal.lamp, 0.45 * breathe);
	c.fillStyle = rgba(pal.lamp, 1);
	c.fillRect(x - 1.2, y - 1.6, 2.4, 3);
}

/** A picker's day, as a loop: empty the basket, work out along the row
 * reaching and stepping, then walk back to the sack. */
function pickerPose(pk: Picker, t: number, k: number) {
	const stepLen = 5.5 * k;
	const P = 72;
	const local = (t + pk.off) % P;
	const home = pk.x0 + pk.dir * 7 * k;
	const far = home + pk.dir * stepLen * pk.steps;
	const pose: Pose = {
		bend: 0.2,
		reach: 0.3,
		walk: 0,
		walking: false,
		tip: 0,
		tool: "basket",
	};
	let x = home;
	let face: number = pk.dir;
	let falling = -1;
	if (local < 6) {
		// Tip the basket into the sack.
		face = -pk.dir;
		pose.bend = 0.35;
		pose.tip = smooth(0.8, 2, local) * (1 - smooth(4, 5.4, local));
		pose.reach = 1.2 * pose.tip;
		falling = local - 1.6;
	} else if (local < 54) {
		const j = (local - 6) / (48 / pk.steps);
		const n = Math.floor(j);
		const f = j - n;
		const go = smooth(0.78, 1, f);
		x = home + pk.dir * stepLen * (n + go);
		const high = hash(n, pk.off * 7) < 0.5;
		pose.bend = high ? 0.08 : 0.45;
		const work = 1 - smooth(0.7, 0.8, f);
		const pluck = Math.sin(f * TAU * 3.2 + n);
		pose.reach = lerp(
			0.35,
			high ? 2.1 + 0.25 * pluck : 1.25 + 0.3 * pluck,
			work * smooth(0, 0.08, f),
		);
		if (go > 0 && go < 1) {
			pose.walking = true;
			pose.walk = go * TAU;
		}
	} else {
		// Walk back along the aisle.
		const f = smooth(54, 70, local);
		x = lerp(far, home, f);
		face = -pk.dir;
		pose.bend = 0.12;
		pose.walking = local < 70;
		pose.walk = (Math.abs(far - home) * f) / (2.2 * k);
		pose.reach = 0.25 + Math.sin(pose.walk) * 0.15;
	}
	return { x, face, pose, k, falling };
}

function drawSack(c: Ctx, pal: Pal, x: number, y: number, k: number) {
	const fill = filler(c, pal);
	fill(pal.sack, pal.night ? 0.4 : 1);
	c.beginPath();
	c.moveTo(x - 2.6 * k, y);
	c.bezierCurveTo(
		x - 3.2 * k,
		y - 3 * k,
		x - 2.4 * k,
		y - 6 * k,
		x - 1.6 * k,
		y - 6.6 * k,
	);
	c.lineTo(x + 1.6 * k, y - 6.6 * k);
	c.bezierCurveTo(
		x + 2.4 * k,
		y - 6 * k,
		x + 3.2 * k,
		y - 3 * k,
		x + 2.6 * k,
		y,
	);
	c.closePath();
	c.fill();
	if (!pal.night) {
		fill(mix(pal.sack, [120, 90, 60], 0.4), 0.7);
		c.beginPath();
		c.moveTo(x + 0.8 * k, y);
		c.bezierCurveTo(
			x + 2.2 * k,
			y - 3 * k,
			x + 2 * k,
			y - 5.5 * k,
			x + 1.6 * k,
			y - 6.6 * k,
		);
		c.lineTo(x + 2.4 * k, y - 6 * k);
		c.bezierCurveTo(x + 3.2 * k, y - 3 * k, x + 2.6 * k, y, x + 2.6 * k, y);
		c.closePath();
		c.fill();
		fill(pal.cherry, 0.9);
		c.beginPath();
		c.ellipse(x, y - 6.6 * k, 1.6 * k, 0.6 * k, 0, 0, TAU);
		c.fill();
	}
	c.globalCompositeOperation = "source-over";
}

/** How large a figure stands in a given row. */
function figure(p: Plan, layer: 3 | 4, row: Row) {
	return layer === 3 ? 1.4 * p.z : clamp(row.gap * 0.09, 2.2 * p.z, 3.4 * p.z);
}

function drawPickers(c: Ctx, p: Plan, pal: Pal, t: number, layer: 3 | 4) {
	const L = layer === 3 ? p.hill : p.near;
	const night = pal.night;
	for (let i = 0; i < p.pickers.length; i++) {
		const pk = p.pickers[i];
		if (pk.layer !== layer) continue;
		// By night only two lanterns walk the rows.
		if (night && i !== 0 && i !== 4) continue;
		const ri = Math.min(L.rows.length - 2, pk.row);
		const row = L.rows[ri];
		const aisle = (x: number) =>
			at(row.y, x) + row.gap * (layer === 3 ? 0.8 : 0.86);
		const k = figure(p, layer, L.rows[ri + 1]);
		let x: number;
		let face: number;
		let pose: Pose;
		if (night) {
			const span = 90 * k;
			const ph = ((t + pk.off) / 50) % 2;
			const f = ph < 1 ? smooth(0, 1, ph) : 1 - smooth(1, 2, ph);
			x = pk.x0 + pk.dir * span * f;
			face = ph < 1 ? pk.dir : -pk.dir;
			const moving = Math.abs((ph % 1) - 0.5) < 0.48;
			pose = {
				bend: 0.06,
				reach: 0.9,
				walk: (span * f) / (2.2 * k),
				walking: moving,
				tip: 0,
				tool: "lantern",
			};
		} else {
			const s = pickerPose(pk, t, k);
			x = s.x;
			face = s.face;
			pose = s.pose;
			drawSack(c, pal, pk.x0, at(row.y, pk.x0) + row.gap * 0.5, k * 0.9);
			// Cherries tumbling from the basket into the sack.
			if (s.falling > 0 && s.falling < 1.8) {
				for (let q = 0; q < 6; q++) {
					const f = (s.falling * 1.6 + q * 0.27) % 1;
					const bx =
						lerp(x - pk.dir * 3 * k, pk.x0, f) + (hash(q, 7) - 0.5) * 2 * k;
					const by = lerp(
						aisle(x) - 9 * k,
						at(row.y, pk.x0) + row.gap * 0.5 - 5.6 * k,
						f * f,
					);
					c.fillStyle = rgba(q % 3 ? pal.cherry : pal.cherryDeep, 0.95);
					c.beginPath();
					c.arc(bx, by, Math.max(0.8, 0.45 * k), 0, TAU);
					c.fill();
				}
			}
		}
		const y = aisle(x);
		drawPerson(
			c,
			pal,
			x,
			y,
			k,
			face,
			pose,
			pal.shirts[pk.shirt % pal.shirts.length],
			t,
		);
		// The rows in front hide their legs: they stand among the bushes.
		const pad = 12 * k;
		const lo = Math.min(x, pk.x0) - pad;
		const hi = Math.max(x, pk.x0) + pad;
		c.save();
		c.beginPath();
		c.rect(lo, 0, hi - lo, p.H);
		c.clip();
		for (let j = ri + 1; j <= ri + 2 && j < L.rows.length; j++) {
			const ink =
				layer === 3 ? hillInk(pal, j, L.rows.length) : nearInk(pal, j);
			hedge(c, pal, L.rows[j], ink, lo - 2 * ink.step, hi + 2 * ink.step);
		}
		c.restore();
	}
}

function drawRaker(c: Ctx, p: Plan, pal: Pal, t: number) {
	const { patio: pt, z } = p;
	const k = 2 * z;
	if (pal.night) {
		// A lantern on a post at the patio's corner.
		const lx = pt.x1 - 2 * z;
		const ly = pt.y1 - 16 * z;
		c.fillStyle = rgba(pal.rim, 0.5);
		c.fillRect(lx - 0.7, ly, 1.4, 16 * z);
		lamp(c, pal, lx, ly, 60 * z, t);
		return;
	}
	// Working slowly along the slab and back, stroke by stroke, pausing at
	// each end.
	const span = pt.x1 - pt.x0 - 44 * z;
	const ph = (t / 80) % 2;
	const g = (v: number) => smooth(0.06, 0.94, v);
	const f = ph < 1 ? g(ph) : g(2 - ph);
	const face = ph < 1 ? -1 : 1;
	const x = pt.x0 + 18 * z + span * f;
	const dep = 0.62;
	const yy = pt.y0 + (pt.y1 - pt.y0) * dep;
	const xs = x + pt.skew * (1 - dep);
	const stroke = Math.sin(t * 1.4);
	drawPerson(
		c,
		pal,
		xs,
		yy,
		k,
		face,
		{
			bend: 0.3 + 0.1 * stroke,
			reach: 1,
			walk: 0,
			walking: false,
			tip: 0,
			tool: "rake",
			rake: stroke,
		},
		pal.shirts[2],
		t,
	);
}

/** The pickup's day: parked at the patio, down the road, away, and back. */
function drawTruck(c: Ctx, p: Plan, pal: Pal, t: number) {
	const P = 190;
	const local = t % P;
	let s: number;
	let dir: number;
	let moving = 0;
	if (local < 16) {
		s = 0;
		dir = 1;
	} else if (local < 95) {
		const f = smooth(16, 95, local);
		s = f * p.roadLen;
		dir = 1;
		moving = Math.sin(((local - 16) / 79) * Math.PI);
	} else if (local < 111) {
		s = p.roadLen;
		dir = -1;
	} else {
		const f = smooth(111, 190, local);
		s = (1 - f) * p.roadLen;
		dir = -1;
		moving = Math.sin(((local - 111) / 79) * Math.PI);
	}
	const road = p.road;
	let i = 1;
	while (i < road.length - 1 && road[i].d < s) i++;
	const a = road[i - 1];
	const b = road[i];
	const f = clamp((s - a.d) / Math.max(0.001, b.d - a.d), 0, 1);
	const x = lerp(a.x, b.x, f);
	const y = lerp(a.y, b.y, f) + 1;
	const ang = Math.atan2(b.y - a.y, b.x - a.x);
	const k = 1.25 * p.z;
	// Dust kicked up behind, hanging and thinning.
	if (moving > 0.05 && !pal.night)
		for (let q = 0; q < 12; q++) {
			const age = (t * 0.9 + q / 12) % 1;
			const back = (q / 12) * 60 * k + age * 8;
			const j = Math.max(0, i - Math.round(back / 4) * (dir > 0 ? 1 : -1));
			const pt =
				road[clamp(dir > 0 ? j : i + Math.round(back / 4), 0, road.length - 1)];
			const r = (3 + age * 9) * k;
			blob(
				c,
				pt.x,
				pt.y - r * 0.5 - age * 6,
				r * 1.4,
				r,
				pal.dust,
				moving * 0.35 * (1 - age) * (1 - q / 12),
			);
		}
	if (x < -40 || x > p.W + 40) return;
	const fill = filler(c, pal);
	c.save();
	c.translate(x, y);
	c.rotate(clamp(dir > 0 ? ang : ang - Math.PI, -0.3, 0.3) * (dir > 0 ? 1 : 1));
	c.scale(k * dir, k);
	const bump = moving > 0.05 ? Math.sin(t * 13) * 0.25 : 0;
	c.translate(0, bump);
	// Bed with sacks, cab, hood. Faces +x.
	fill(pal.truck);
	c.beginPath();
	c.moveTo(-11, -2);
	c.lineTo(-11, -6.2);
	c.lineTo(1, -6.2);
	c.lineTo(1.6, -11);
	c.quadraticCurveTo(2, -12, 3.4, -12);
	c.lineTo(6.4, -12);
	c.quadraticCurveTo(7.4, -12, 8, -9);
	c.lineTo(8.6, -7.4);
	c.lineTo(12, -6.8);
	c.quadraticCurveTo(13, -6.4, 13, -5);
	c.lineTo(13, -2);
	c.closePath();
	c.fill();
	fill(pal.truckShade, pal.night ? 1 : 0.9);
	c.fillRect(-11, -3.6, 24, 1.8);
	// Sacks in the bed.
	fill(pal.sack, pal.night ? 0.3 : 1);
	for (let q = 0; q < 3; q++) {
		c.beginPath();
		c.ellipse(-8.4 + q * 3.3, -7.2, 1.9, 1.6, 0, 0, TAU);
		c.fill();
	}
	// Window.
	fill(pal.glass, pal.night ? 0.4 : 1);
	c.beginPath();
	c.moveTo(3, -7.6);
	c.lineTo(3.2, -10.8);
	c.lineTo(6.2, -10.8);
	c.lineTo(7.2, -7.6);
	c.closePath();
	c.fill();
	// Wheels.
	fill(pal.tyre);
	c.beginPath();
	c.arc(-6.6, -1.8, 2.2, 0, TAU);
	c.arc(8.4, -1.8, 2.2, 0, TAU);
	c.fill();
	if (!pal.night) {
		fill([200, 196, 190], 0.9);
		c.beginPath();
		c.arc(-6.6, -1.8, 0.8, 0, TAU);
		c.arc(8.4, -1.8, 0.8, 0, TAU);
		c.fill();
		fill([255, 255, 250], 0.5);
		c.fillRect(-11, -6.2, 12, 0.7);
		c.fillRect(1.8, -12, 5, 0.6);
	}
	c.restore();
	c.globalCompositeOperation = "source-over";
	if (pal.night && moving > 0.02) {
		// Headlights reaching down the road.
		const hx = x + dir * 13 * k;
		const hy = y - 4.5 * k;
		blob(c, hx, hy, 8 * k, 8 * k, pal.lamp, 0.6);
		blob(c, hx + dir * 20 * k, hy + 2 * k, 26 * k, 7 * k, pal.lamp, 0.22);
		c.fillStyle = rgba(pal.lamp, 1);
		c.fillRect(hx - 1, hy - 1, 2, 2);
	}
}

/* ---------------------------------------------------------------- scene */

function makeFarm(): Scene {
	let memo: Plan | null = null;
	let memoKey = "";
	return ({ dither: c }, { t, W, H, dark, anchors }) => {
		const frame = anchors.frame ?? anchors.content;
		const gutter = Math.round(
			frame && frame.x > 60 ? frame.x : clamp(W * 0.16, 150, 260),
		);
		const key = `${W}|${H}|${gutter}`;
		if (key !== memoKey || !memo) {
			memoKey = key;
			memo = plan(W, H, gutter);
		}
		const p = memo;
		const pal = PALS[dark ? "dark" : "light"];
		const scale = c.getTransform().a;
		const paintKey = `${dark}|${scale}`;
		if (paintKey !== p.key) {
			p.key = paintKey;
			paintSky(p, pal, scale);
			paintMid(p, pal, scale);
			paintHill(p, pal, scale);
			paintNear(p, pal, scale);
		}
		// Blit only the band each layer occupies: below its crest (less a
		// margin for the farm roof), down to its foot.
		const crest = (a: Float32Array) => {
			let m = Number.POSITIVE_INFINITY;
			for (let i = 0; i < a.length; i += 4) m = Math.min(m, a[i]);
			return Math.max(0, Math.floor(m - 70 * p.z));
		};
		const img = (cv: HTMLCanvasElement, top?: Float32Array) => {
			const y0 = top ? crest(top) : 0;
			const h = cv.height / scale - y0;
			if (h <= 0) return;
			c.drawImage(
				cv,
				0,
				y0 * scale,
				cv.width,
				h * scale,
				0,
				y0,
				cv.width / scale,
				h,
			);
		};

		img(p.sky);
		drawClouds(c, p, pal, t);
		drawBirds(c, p, pal, t);
		if (pal.night) drawMask(c, p, p.mid.top);
		img(p.mid.canvas, p.mid.top);
		drawMist(c, p, pal, t, 14, 700, 0.56, 0.66, pal.night ? 0.32 : 0.55);
		if (pal.night) drawMask(c, p, p.hill.top);
		img(p.hill.canvas, p.hill.top);
		drawSmoke(c, p, pal, t);
		for (const tr of p.trees) if (tr.layer === 3) drawTree(c, pal, tr, t);
		drawRaker(c, p, pal, t);
		drawTruck(c, p, pal, t);
		drawPickers(c, p, pal, t, 3);
		drawMist(c, p, pal, t, 7, 800, 0.7, 0.78, pal.night ? 0.2 : 0.35);
		if (pal.night) drawMask(c, p, p.near.top);
		img(p.near.canvas, p.near.top);
		for (const tr of p.trees) if (tr.layer === 4) drawTree(c, pal, tr, t);
		drawPickers(c, p, pal, t, 4);
	};
}

export const coffeefarm = makeFarm();
