import type { Scene } from "../engine";
import { buildLoop, type Loop, type Point, type Spine, spineOn } from "./swim";

/**
 * Koi from above, drawn as a natural-history plate that happens to move.
 * Each fish is built back to front from the spine in swim.ts: a tail of rays
 * that trails the body, pelvic and pectoral fans that scull and lag, a lattice
 * of scale rows that bends with the body and shrinks toward the tail, a dorsal
 * fin raked along the back, then the head. Colour sits in the scales, so
 * patch edges are scalloped by scale rows rather than cut like a logo.
 */

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const t = clamp((v - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
function hash(n: number) {
	let h = Math.imul(n | 0, 2654435761);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type Rgb = [number, number, number];
/** A colour for light paper and one for dark paper, tuned separately. */
type Pair = [Rgb, Rgb];
const rgba = (c: Rgb, a: number) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;
const ink = (a: number) => `rgb(0 0 0 / ${a})`;

type Patch = { u: number; l: number; ru: number; rl: number };

type Route = { desk: Point[]; phone: Point[] };

type Variety = {
	style: "kohaku" | "ogon" | "asagi";
	/** Nose to tail tip at full size. */
	length: number;
	speed: number;
	/** Where on the loop the nose is at the reduced-motion still, desk then phone. */
	still: [number, number];
	route: Route;
	/** Fraction of the length that is body; the rest is tail. */
	body: number;
	seed: number;
	patches: Patch[];
};

/**
 * Routes are fractions of the water, which starts at the shelf. Desktop fish
 * use the margins and the band under the cards; on a phone the cards cover
 * almost everything, so the fish swim large beneath the frosted glass and show
 * crisply in the gaps between cards.
 */
const FISH: Variety[] = [
	{
		style: "kohaku",
		length: 470,
		speed: 38,
		still: [0.19, 0.2],
		body: 0.7,
		seed: 3,
		route: {
			desk: [
				[0.89, 0.02],
				[0.9, 0.4],
				[0.87, 0.68],
				[0.7, 0.82],
				[0.42, 0.8],
				[0.14, 0.74],
				[0.085, 0.45],
				[0.1, 0.16],
				[0.3, 0.08],
				[0.6, 0.14],
				[0.82, 0.06],
			],
			phone: [
				[0.5, 0.02],
				[0.9, 0.2],
				[0.88, 0.62],
				[0.55, 0.86],
				[0.14, 0.7],
				[0.1, 0.28],
			],
		},
		patches: [
			{ u: 0.1, l: -0.2, ru: 0.12, rl: 0.8 },
			{ u: 0.34, l: 0.25, ru: 0.15, rl: 0.85 },
			{ u: 0.47, l: -0.4, ru: 0.12, rl: 0.6 },
			{ u: 0.7, l: 0.1, ru: 0.13, rl: 0.9 },
			{ u: 0.9, l: -0.1, ru: 0.08, rl: 0.5 },
		],
	},
	{
		style: "ogon",
		length: 340,
		speed: 31,
		still: [0.18, 0.5],
		body: 0.72,
		seed: 7,
		route: {
			desk: [
				[0.75, 0.66],
				[0.5, 0.74],
				[0.26, 0.66],
				[0.2, 0.4],
				[0.45, 0.28],
				[0.72, 0.36],
				[0.84, 0.52],
			],
			phone: [
				[0.2, 0.85],
				[0.75, 0.7],
				[0.85, 0.3],
				[0.45, 0.1],
				[0.15, 0.4],
			],
		},
		patches: [],
	},
	{
		style: "asagi",
		length: 270,
		speed: 27,
		still: [0.08, 0.2],
		body: 0.71,
		seed: 11,
		route: {
			desk: [
				[0.09, 0.3],
				[0.1, 0.6],
				[0.3, 0.76],
				[0.5, 0.62],
				[0.4, 0.3],
				[0.2, 0.15],
			],
			phone: [
				[0.75, 0.1],
				[0.9, 0.5],
				[0.7, 0.9],
				[0.35, 0.8],
				[0.3, 0.35],
			],
		},
		patches: [],
	},
];

const BONE: Pair = [
	[226, 208, 176],
	[230, 220, 198],
];
const ROSE: Pair[] = [
	[
		[224, 150, 132],
		[232, 172, 152],
	],
	[
		[214, 112, 92],
		[232, 140, 116],
	],
	[
		[206, 88, 58],
		[234, 120, 82],
	],
];
const AMBER: Pair = [
	[216, 150, 52],
	[238, 190, 100],
];
const AMBER_DEEP: Pair = [
	[176, 116, 40],
	[240, 206, 142],
];
const LAVENDER: Pair = [
	[122, 116, 190],
	[176, 170, 232],
];
const LAVENDER_NET: Pair = [
	[84, 90, 146],
	[196, 196, 240],
];
const FLANK: Pair = [
	[210, 146, 130],
	[228, 164, 148],
];
const WATER: Pair = [
	[118, 130, 190],
	[166, 178, 226],
];

// Scratch result of `place`, so a frame of geometry does not allocate.
let ox = 0;
let oy = 0;

/** A point at fractional vertebra `f`, `d` pixels out along the normal. */
function place(s: Spine, f: number, d: number) {
	const last = s.x.length - 1;
	const g = clamp(f, 0, last - 1e-4);
	const i = Math.floor(g);
	const u = g - i;
	ox = lerp(s.x[i], s.x[i + 1], u) + lerp(s.nx[i], s.nx[i + 1], u) * d;
	oy = lerp(s.y[i], s.y[i + 1], u) + lerp(s.ny[i], s.ny[i + 1], u) * d;
}

/** Half-width of the body from nose (0) to peduncle (1), as a fraction of its widest. */
function profile(u: number) {
	const head =
		u >= 0.3 ? 1 : Math.sqrt(Math.max(0, 1 - ((0.3 - u) / 0.3) ** 2));
	const s = clamp((u - 0.34) / 0.66, 0, 1);
	return head * (0.2 + 0.8 * (1 - s * s * (3 - 2 * s)));
}

type Gear = {
	s: Spine;
	iB: number;
	wMax: number;
	length: number;
	bodyPx: number;
	dark: boolean;
};

const half = (g: Gear, f: number) => g.wMax * profile(clamp(f / g.iB, 0, 1));

function bodyPath(c: CanvasRenderingContext2D, g: Gear, to = 1) {
	const steps = Math.ceil(g.iB * to * 4);
	c.beginPath();
	for (let k = 0; k <= steps; k++) {
		const f = (g.iB * to * k) / steps;
		place(g.s, f, half(g, f));
		if (k === 0) c.moveTo(ox, oy);
		else c.lineTo(ox, oy);
	}
	for (let k = steps; k >= 0; k--) {
		const f = (g.iB * to * k) / steps;
		place(g.s, f, -half(g, f));
		c.lineTo(ox, oy);
	}
	c.closePath();
}

/** A fan of rays with translucent webbing between them. */
function fan(
	c: CanvasRenderingContext2D,
	rx: number,
	ry: number,
	angle: number,
	spread: number,
	len: number,
	rays: number,
	phase: number,
	flex: number,
	web: string,
	webTip: string,
	rayAlpha: number,
) {
	const tips: Point[] = [];
	const ctrl: Point[] = [];
	for (let k = 0; k < rays; k++) {
		const q = k / (rays - 1);
		// A rounded paddle: the leading rays are longest, the trailing ones short.
		const L =
			len * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, q * 0.85 + 0.12)));
		const bend = flex * Math.sin(phase - q * 2.4) * (0.4 + q);
		const a = angle + (q - 0.5) * spread + bend * 0.5;
		tips.push([rx + Math.cos(a) * L, ry + Math.sin(a) * L]);
		const am = angle + (q - 0.5) * spread + bend * 0.15;
		ctrl.push([rx + Math.cos(am) * L * 0.55, ry + Math.sin(am) * L * 0.55]);
	}
	const gx = (tips[0][0] + tips[rays - 1][0]) / 2;
	const gy = (tips[0][1] + tips[rays - 1][1]) / 2;
	const grad = c.createLinearGradient(rx, ry, gx, gy);
	grad.addColorStop(0, web);
	grad.addColorStop(1, webTip);
	c.beginPath();
	c.moveTo(rx, ry);
	for (const [x, y] of tips) c.lineTo(x, y);
	c.closePath();
	c.fillStyle = grad;
	c.fill();
	c.beginPath();
	for (let k = 0; k < rays; k++) {
		c.moveTo(rx, ry);
		c.quadraticCurveTo(ctrl[k][0], ctrl[k][1], tips[k][0], tips[k][1]);
	}
	c.strokeStyle = ink(rayAlpha);
	c.lineWidth = 2;
	c.stroke();
	// The fin's trailing edge, a little firmer than the webbing.
	c.beginPath();
	tips.forEach(([x, y], k) => {
		if (k === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	});
	c.strokeStyle = ink(rayAlpha * 0.5);
	c.lineWidth = 1.6;
	c.stroke();
}

/** Where on the body a variety puts its colour, 0..1 with scalloped noise. */
function kohakuField(v: Variety, u: number, l: number, h: number) {
	let best = -1;
	for (const p of v.patches) {
		const du = (u - p.u) / p.ru;
		const dl = (l - p.l) / p.rl;
		best = Math.max(best, 1 - du * du - dl * dl);
	}
	return best + (h - 0.5) * 0.55;
}

function drawFish(
	c: CanvasRenderingContext2D,
	v: Variety,
	index: number,
	s: Spine,
	t: number,
	dark: boolean,
	size: number,
	boost: number,
) {
	const n = s.x.length;
	const iB = (n - 1) * v.body;
	const bodyPx = v.length * size * v.body;
	const g: Gear = {
		s,
		iB,
		wMax: bodyPx * 0.138,
		length: v.length * size,
		bodyPx,
		dark,
	};
	const px = (p: Pair) => p[dark ? 1 : 0];
	const seg = bodyPx / iB;
	// Under frosted glass a fish is a soft stain, so phones print it denser.
	const A = (a: number) => Math.min(1, a * boost);

	// Tail first: a split fan of rays that follows the body and lags behind it.
	{
		const rays = v.length * size > 330 ? 13 : 10;
		const last = n - 1;
		const tailTone =
			v.style === "ogon"
				? px(AMBER)
				: v.style === "asagi"
					? px(LAVENDER)
					: px(ROSE[0]);
		const reach = (last - iB) * seg * 0.46;
		const roots: Point[] = [];
		const paths: Point[][] = [];
		for (let k = 0; k < rays; k++) {
			const q = (k / (rays - 1)) * 2 - 1;
			const end = iB + (last - iB) * (1 - 0.34 * (1 - Math.abs(q)) ** 1.5);
			place(s, iB, q * g.wMax * 0.17);
			roots.push([ox, oy]);
			const pts: Point[] = [[ox, oy]];
			const steps = Math.max(5, Math.ceil(end - iB));
			for (let j = 1; j <= steps; j++) {
				const f = iB + ((end - iB) * j) / steps;
				const x = j / steps;
				const flutter =
					Math.sin(t * 1.5 - f * 0.34 + q * 1.7 + index) * 0.09 * x * x * reach;
				place(s, f, q * reach * x ** 0.85 * 1.05 + flutter * q);
				pts.push([ox, oy]);
			}
			paths.push(pts);
		}
		const tipA = paths[0][paths[0].length - 1];
		const tipB = paths[rays - 1][paths[rays - 1].length - 1];
		const grad = c.createLinearGradient(
			roots[0][0],
			roots[0][1],
			(tipA[0] + tipB[0]) / 2,
			(tipA[1] + tipB[1]) / 2,
		);
		grad.addColorStop(0, rgba(tailTone, A(0.34)));
		grad.addColorStop(1, rgba(tailTone, A(0.1)));
		c.beginPath();
		for (const [x, y] of paths[0]) c.lineTo(x, y);
		for (let k = 1; k < rays; k++) {
			const p = paths[k];
			c.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
		}
		for (let j = paths[rays - 1].length - 1; j >= 0; j--)
			c.lineTo(paths[rays - 1][j][0], paths[rays - 1][j][1]);
		c.closePath();
		c.fillStyle = grad;
		c.fill();
		c.lineWidth = 1.9;
		c.strokeStyle = ink(0.78);
		c.beginPath();
		for (const p of paths) {
			p.forEach(([x, y], j) => {
				if (j === 1) c.moveTo(x, y);
				else if (j > 1) c.lineTo(x, y);
			});
		}
		c.stroke();
		// Segmented rays: a crossbar of growth rings a third and two thirds out.
		for (const at of [0.42, 0.7]) {
			c.beginPath();
			paths.forEach((p, k) => {
				const e = Math.round((p.length - 1) * at);
				if (k === 0) c.moveTo(p[e][0], p[e][1]);
				else c.lineTo(p[e][0], p[e][1]);
			});
			c.strokeStyle = ink(0.3);
			c.lineWidth = 1.8;
			c.stroke();
		}
	}

	// Pelvic fins sit under the belly and beat faster than the chest fins.
	for (const side of [1, -1]) {
		const f = iB * 0.56;
		place(s, f, side * half(g, f) * 0.55);
		const back = Math.atan2(
			s.y[Math.round(f) + 3] - s.y[Math.round(f)],
			s.x[Math.round(f) + 3] - s.x[Math.round(f)],
		);
		const ph = t * 2.2 + side * 0.9 + index;
		fan(
			c,
			ox,
			oy,
			back - side * (0.55 + 0.16 * Math.sin(ph)),
			0.9,
			bodyPx * 0.15,
			6,
			ph,
			0.16,
			ink(A(0.12)),
			ink(A(0.03)),
			0.7,
		);
	}

	// Body: bone under everything, then colour in scale cells, then keyline.
	bodyPath(c, g);
	c.fillStyle =
		boost > 1 ? ink(0.2) : rgba(px(BONE), v.style === "kohaku" ? 0.2 : 0.1);
	c.fill();
	c.save();
	bodyPath(c, g);
	c.clip();

	const pitchAt = (u: number) => Math.max(9, bodyPx * (0.054 - 0.022 * u));
	const rowH = Math.max(8, bodyPx * 0.04);
	const rows = Math.ceil((2 * g.wMax) / rowH);
	// Cells bucketed by colour and alpha so a body is a handful of fills.
	const buckets = new Map<number, { color: Rgb; alpha: number; q: number[] }>();
	const arcs: number[] = [];
	const addCell = (
		color: Rgb,
		alpha: number,
		f0: number,
		f1: number,
		d0: number,
		d1: number,
	) => {
		const lit = A(alpha);
		const key =
			(color[0] * 7 + color[1] * 13 + color[2]) * 64 + Math.round(lit * 40);
		let b = buckets.get(key);
		if (!b) {
			b = { color, alpha: lit, q: [] };
			buckets.set(key, b);
		}
		const q = b.q;
		for (const [f, d] of [
			[f0, d0],
			[f1, d0],
			[f1, d1],
			[f0, d1],
		] as const) {
			const w = half(g, f);
			place(s, f, clamp(d, -w, w));
			q.push(ox, oy);
		}
	};
	for (let r = 0; r < rows; r++) {
		const d0 = -g.wMax + r * rowH;
		const d1 = d0 + rowH;
		const dc = (d0 + d1) / 2;
		let f = (r % 2) * 0.5 * (pitchAt(0) / seg) - pitchAt(0) / seg;
		let col = 0;
		while (f < iB) {
			const pf = pitchAt(f / iB) / seg;
			const f0 = Math.max(0, f);
			const f1 = Math.min(iB, f + pf);
			f += pf;
			col++;
			if (f1 - f0 < 0.15) continue;
			const fc = (f0 + f1) / 2;
			const u = fc / iB;
			const w = half(g, fc);
			if (Math.abs(dc) > w * 0.98) continue;
			const l = dc / w;
			const h = hash(v.seed * 4093 + r * 131 + col * 7);
			if (v.style === "kohaku") {
				const val = kohakuField(v, u, l, h);
				if (val > 0.12) {
					const k = val > 0.62 ? 2 : val > 0.34 ? 1 : 0;
					const tone = px(ROSE[k]);
					addCell(tone, 0.42 + k * 0.12 + h * 0.08, f0, f1, d0, d1);
				}
			} else if (v.style === "ogon") {
				const sheen =
					0.5 + 0.5 * Math.sin(u * 11 - t * 0.55 + l * 2.2 + v.seed);
				const a = (0.4 + h * 0.16 + sheen * 0.12) * (1 - 0.3 * Math.abs(l));
				const deep = u < 0.2 ? 0.35 : 0;
				addCell(px(deep ? AMBER_DEEP : AMBER), a + deep * 0.3, f0, f1, d0, d1);
			} else {
				const back = 1 - smooth(0.35, 0.95, Math.abs(l));
				if (back > 0.05)
					addCell(
						px(LAVENDER),
						(0.36 + h * 0.16) * back + 0.06,
						f0,
						f1,
						d0,
						d1,
					);
				const flank =
					smooth(0.52, 0.8, Math.abs(l)) * (1 - smooth(0.4, 0.7, u));
				if (flank > 0.05)
					addCell(px(FLANK), 0.22 * flank + h * 0.06, f0, f1, d0, d1);
			}
			if (u > 0.2) {
				// The exposed rear margin of each scale: a small arc, bulging tailward.
				const bulge = (f1 - f0) * 0.55;
				const cf = f1 + bulge;
				for (const [af, ad] of [
					[f1, d0],
					[cf, dc],
					[f1, d1],
				] as const) {
					const ww = half(g, af);
					place(s, af, clamp(ad, -ww, ww));
					arcs.push(ox, oy);
				}
			}
		}
	}
	for (const b of buckets.values()) {
		c.beginPath();
		const q = b.q;
		for (let i = 0; i < q.length; i += 8) {
			c.moveTo(q[i], q[i + 1]);
			c.lineTo(q[i + 2], q[i + 3]);
			c.lineTo(q[i + 4], q[i + 5]);
			c.lineTo(q[i + 6], q[i + 7]);
			c.closePath();
		}
		c.fillStyle = rgba(b.color, b.alpha);
		c.fill();
	}
	// The lattice itself, ink under a coloured edge on the varieties that have one.
	c.beginPath();
	for (let i = 0; i < arcs.length; i += 6) {
		c.moveTo(arcs[i], arcs[i + 1]);
		c.quadraticCurveTo(arcs[i + 2], arcs[i + 3], arcs[i + 4], arcs[i + 5]);
	}
	c.strokeStyle = ink(v.style === "asagi" ? 0.2 : 0.4);
	c.lineWidth = 2;
	c.stroke();
	if (v.style !== "kohaku") {
		c.strokeStyle = rgba(
			v.style === "ogon" ? px(AMBER_DEEP) : px(LAVENDER_NET),
			v.style === "ogon" ? 0.32 : 0.62,
		);
		c.lineWidth = 1.6;
		c.stroke();
	}

	// Contour: a darker rim inside the keyline gives the back its roundness.
	bodyPath(c, g);
	c.strokeStyle = ink(0.07);
	c.lineWidth = 16;
	c.stroke();
	c.strokeStyle = ink(0.1);
	c.lineWidth = 7;
	c.stroke();
	c.restore();

	// The head carries no scales, only a plate and the gill covers.
	const headEnd = 0.2;
	bodyPath(c, g, headEnd);
	c.fillStyle = ink(0.07);
	c.fill();
	bodyPath(c, g);
	c.strokeStyle = ink(0.85);
	c.lineWidth = 2.2;
	c.lineJoin = "round";
	c.stroke();

	// Lateral line: a faint stitched line down the flank.
	for (const side of [1, -1]) {
		c.beginPath();
		for (let f = iB * 0.24; f <= iB * 0.9; f += 1.2) {
			place(s, f, side * half(g, f) * 0.18);
			if (f === iB * 0.24) c.moveTo(ox, oy);
			else c.lineTo(ox, oy);
		}
		c.setLineDash([1.5, 6]);
		c.strokeStyle = ink(0.34);
		c.lineWidth = 2;
		c.stroke();
		c.setLineDash([]);
	}

	// Gill covers: the arc behind the eye on each side.
	for (const side of [1, -1]) {
		const a = iB * 0.1;
		const b = iB * 0.19;
		const e = iB * 0.235;
		c.beginPath();
		place(s, a, side * half(g, a) * 0.96);
		c.moveTo(ox, oy);
		place(s, b + 0.6, side * half(g, b) * 1.0);
		const cx = ox;
		const cy = oy;
		place(s, e, side * half(g, e) * 0.5);
		c.quadraticCurveTo(cx, cy, ox, oy);
		c.strokeStyle = ink(0.85);
		c.lineWidth = 2;
		c.stroke();
		// A second, softer margin: the operculum's lip.
		c.beginPath();
		place(s, a + 0.8, side * half(g, a) * 0.76);
		c.moveTo(ox, oy);
		place(s, b + 0.2, side * half(g, b) * 0.66);
		const lx = ox;
		const ly = oy;
		place(s, e - 0.4, side * half(g, e) * 0.38);
		c.quadraticCurveTo(lx, ly, ox, oy);
		c.strokeStyle = ink(0.42);
		c.lineWidth = 1.8;
		c.stroke();
	}

	// Dorsal fin: a raked row of rays standing off the spine, leaning with the turn.
	{
		const f0 = iB * 0.34;
		const f1 = iB * 0.8;
		const rays = Math.round(((f1 - f0) * seg) / 7.5);
		const lean = 1.0 * Math.sin(t * 0.37 + v.seed);
		const tips: Point[] = [];
		const bases: Point[] = [];
		c.beginPath();
		for (let k = 0; k <= rays; k++) {
			const x = k / rays;
			const f = lerp(f0, f1, x);
			const height =
				bodyPx *
				0.14 *
				smooth(0, 0.22, x) *
				(1 - 0.62 * x ** 1.2) *
				(1 - smooth(0.9, 1, x) * 0.5);
			place(s, f, 0);
			const bx = ox;
			const by = oy;
			place(s, f + 0.5, 0);
			const dx = ox - bx;
			const dy = oy - by;
			const dl = Math.hypot(dx, dy) || 1;
			place(s, f, 0);
			const nxv = -dy / dl;
			const nyv = dx / dl;
			const tx = bx + (dx / dl) * height * 0.62 + nxv * lean * height * 0.9;
			const ty = by + (dy / dl) * height * 0.62 + nyv * lean * height * 0.9;
			bases.push([bx, by]);
			tips.push([tx, ty]);
			c.moveTo(bx, by);
			c.lineTo(tx, ty);
		}
		c.strokeStyle = ink(0.8);
		c.lineWidth = 1.8;
		c.stroke();
		c.beginPath();
		bases.forEach(([x, y], k) => {
			if (k === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		});
		for (let k = tips.length - 1; k >= 0; k--) c.lineTo(tips[k][0], tips[k][1]);
		c.closePath();
		c.fillStyle = ink(0.1);
		c.fill();
		c.beginPath();
		bases.forEach(([x, y], k) => {
			if (k === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		});
		c.strokeStyle = ink(0.26);
		c.lineWidth = 2;
		c.stroke();
	}

	// Pectoral fins, sculling slowly with each ray a little behind the last.
	for (const side of [1, -1]) {
		const f = iB * 0.235;
		place(s, f, side * half(g, f) * 0.86);
		const i = Math.round(f);
		const back = Math.atan2(s.y[i + 3] - s.y[i], s.x[i + 3] - s.x[i]);
		const ph = t * 1.15 + (side < 0 ? 1.3 : 0) + index * 1.7;
		const open = 0.7 + 0.32 * Math.sin(ph);
		const tone =
			v.style === "ogon"
				? px(AMBER)
				: v.style === "asagi"
					? px(FLANK)
					: px(ROSE[0]);
		fan(
			c,
			ox,
			oy,
			back - side * open,
			1.0,
			bodyPx * 0.25,
			8,
			ph,
			0.24,
			rgba(tone, A(0.3)),
			rgba(tone, A(0.08)),
			0.8,
		);
	}

	// Head: nostrils, wide-set eyes, and barbels that swing.
	{
		const fx = iB * 0.055;
		for (const side of [1, -1]) {
			place(s, fx, side * half(g, fx) * 0.36);
			c.beginPath();
			c.arc(ox, oy, 1.9, 0, TAU);
			c.fillStyle = ink(0.85);
			c.fill();
		}
		const fe = iB * 0.105;
		const radius = Math.max(2.8, g.length * 0.0105);
		for (const side of [1, -1]) {
			place(s, fe, side * half(g, fe) * 0.92);
			c.beginPath();
			c.arc(ox, oy, radius + 2, 0, TAU);
			c.strokeStyle = ink(0.32);
			c.lineWidth = 1.8;
			c.stroke();
			c.beginPath();
			c.arc(ox, oy, radius, 0, TAU);
			c.fillStyle = ink(1);
			c.fill();
		}
		const fwd = Math.atan2(s.y[0] - s.y[2], s.x[0] - s.x[2]);
		for (const side of [1, -1]) {
			for (const [at, out, len] of [
				[0.012, 0.2, 0.07],
				[0.03, 0.62, 0.052],
			] as const) {
				place(s, iB * at, side * half(g, iB * at) * 0.62);
				let x = ox;
				let y = oy;
				let a = fwd + side * out;
				const piece = (bodyPx * len) / 6;
				c.beginPath();
				c.moveTo(x, y);
				for (let k = 1; k <= 6; k++) {
					a +=
						side *
						0.16 *
						Math.sin(t * 2.3 + k * 0.7 + side * 1.9 + at * 40 + index * 2.1);
					x += Math.cos(a) * piece;
					y += Math.sin(a) * piece;
					c.lineTo(x, y);
				}
				c.strokeStyle = ink(0.62);
				c.lineWidth = 1.8;
				c.stroke();
			}
		}
	}
}

function headAt(loop: Loop, d: number): Point {
	const s = spineOn(loop, d, 1, 2, { waves: 0, reach: 0, beat: 0 }, 0);
	return [s.x[0], s.y[0]];
}

function ripples(
	c: CanvasRenderingContext2D,
	loop: Loop,
	v: Variety,
	start: number,
	index: number,
	t: number,
	dark: boolean,
	size: number,
) {
	const period = 2.9 + index * 0.55;
	const life = 5.2;
	const tone = WATER[dark ? 1 : 0];
	for (let k = 0; k * period < life + period; k++) {
		const te = (Math.floor(t / period) - k) * period + index * 0.7;
		const age = t - te;
		if (age < 0 || age > life) continue;
		const [x, y] = headAt(loop, start + v.speed * te);
		const fade = (1 - age / life) ** 0.9 * smooth(0, 0.5, age);
		const r = 5 + age * 12 * size;
		c.beginPath();
		c.arc(x, y, r, 0, TAU);
		c.strokeStyle = rgba(tone, 0.95 * fade);
		c.lineWidth = 2.6;
		c.stroke();
		if (age > 0.9) {
			c.beginPath();
			c.arc(x, y, r * 0.6, 0, TAU);
			c.strokeStyle = rgba(tone, 0.55 * fade);
			c.lineWidth = 2.2;
			c.stroke();
		}
	}
}

let cached = "";
let loops: Loop[] = [];

export const koi: Scene = (layers, { t, W, H, anchors, dark }) => {
	// Routes are fixed once the shelf is known, so a card opening later on
	// cannot make a fish jump.
	const shelf = anchors.shelf;
	const key = `${W}x${H}:${shelf ? 1 : 0}`;
	const narrow = W < 640;
	const size = narrow ? 0.9 : Math.min(1, 0.6 + W / 2600);
	const top = shelf ? shelf.y : H * 0.3;
	const depth = Math.max(200, H - top - 40);
	if (key !== cached) {
		cached = key;
		loops = FISH.map((f) =>
			buildLoop(
				(narrow ? f.route.phone : f.route.desk).map(
					([x, y]) => [W * x, top + y * depth] as Point,
				),
			),
		);
	}
	const c = layers.dither;
	c.lineCap = "round";
	c.lineJoin = "round";

	// The reduced-motion still (t=30) is where each fish is composed to be.
	const starts = FISH.map(
		(f, i) => f.still[narrow ? 1 : 0] * loops[i].length - f.speed * 30,
	);
	// Three fish would only muddy the stains under the glass of a phone.
	const swimmers = narrow ? FISH.slice(0, 2) : FISH;
	swimmers.forEach((fish, index) => {
		ripples(c, loops[index], fish, starts[index], index, t, dark, size);
	});
	// Larger fish swim deeper; draw the small ones last so they cross over.
	swimmers.forEach((_, index) => {
		const fish = FISH[index];
		const loop = loops[index];
		const length = fish.length * size;
		const n = clamp(Math.round(length / 8), 30, 62);
		const s = spineOn(
			loop,
			starts[index] + fish.speed * t,
			length,
			n,
			{
				waves: 0.85,
				reach: length * 0.062,
				beat: 0.4 + index * 0.03,
				stiff: 0.25,
			},
			t,
		);
		drawFish(c, fish, index, s, t, dark, size, narrow ? 1.3 : 1);
	});
};
