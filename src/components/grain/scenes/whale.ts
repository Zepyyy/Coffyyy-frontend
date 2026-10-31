import type { Layers, Scene } from "../engine";
import { buildLoop, type Loop, type Point, spineOn } from "./swim";

/**
 * A humpback in side view, crossing the page the way one crosses an aquarium
 * window: huge, slow, and then gone for a long while. A calf rides above and
 * behind its mother's shoulder and moves with her.
 *
 * The route is a long straight run with a soft dip, as a function of the head's
 * x. Everything is a pure function of t, so the still at t=30 is the whale
 * mid-window with the calf in tow.
 */

const SPEED = 25;
/** Empty paper between one crossing and the next, seconds. */
const QUIET = 60;
const STILL_T = 30;
/** Sticky header above the field, CSS pixels. */
const HEADER = 64;
/** Fluke beat, Hz. */
const BEAT = 0.15;
/** Phase of the beat at the still, tuned by eye. */
const PHASE = 0.04;

type Table = ReadonlyArray<readonly [number, number]>;

/** Cubic Hermite through a table of [q, value], tangents by central difference. */
function curve(table: Table, q: number) {
	const n = table.length;
	if (q <= table[0][0]) return table[0][1];
	if (q >= table[n - 1][0]) return table[n - 1][1];
	let i = 0;
	while (table[i + 1][0] < q) i++;
	const slope = (k: number) => {
		const a = table[Math.max(0, k - 1)];
		const b = table[Math.min(n - 1, k + 1)];
		return (b[1] - a[1]) / (b[0] - a[0]);
	};
	const [x0, y0] = table[i];
	const [x1, y1] = table[i + 1];
	const h = x1 - x0;
	const u = (q - x0) / h;
	const m0 = slope(i) * h;
	const m1 = slope(i + 1) * h;
	const u2 = u * u;
	const u3 = u2 * u;
	return (
		(2 * u3 - 3 * u2 + 1) * y0 +
		(u3 - 2 * u2 + u) * m0 +
		(-2 * u3 + 3 * u2) * y1 +
		(u3 - u2) * m1
	);
}

/** Total body depth over length, nose (0) to the root of the flukes (1). */
const DEPTH: Table = [
	[0, 0],
	[0.012, 0.06],
	[0.04, 0.115],
	[0.09, 0.168],
	[0.18, 0.21],
	[0.32, 0.232],
	[0.46, 0.215],
	[0.6, 0.17],
	[0.72, 0.118],
	[0.84, 0.082],
	[0.93, 0.062],
	[1, 0.054],
];
/** Share of that depth that sits above the spine. */
const ABOVE: Table = [
	[0, 0.46],
	[0.2, 0.42],
	[0.55, 0.41],
	[0.8, 0.48],
	[1, 0.5],
];
/** Share of the depth, from the back, that stays dark. The rest is belly. */
const DARK: Table = [
	[0, 0.5],
	[0.1, 0.55],
	[0.3, 0.6],
	[0.5, 0.64],
	[0.62, 0.74],
	[0.72, 0.92],
	[0.8, 1],
	[1, 1],
];

type Profile = { above: Float32Array; below: Float32Array; dark: Float32Array };
const profiles = new Map<number, Profile>();
function profileFor(count: number): Profile {
	let p = profiles.get(count);
	if (p) return p;
	const above = new Float32Array(count);
	const below = new Float32Array(count);
	const dark = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const q = i / (count - 1);
		const depth = curve(DEPTH, q);
		let up = depth * curve(ABOVE, q);
		// The low dorsal nub two thirds back, steeper behind than in front.
		const d = q - 0.655;
		const reach = d < 0 ? 0.06 : 0.04;
		up += 0.019 * Math.exp(-((d / reach) ** 2));
		above[i] = up;
		below[i] = depth - depth * curve(ABOVE, q);
		dark[i] = curve(DARK, q);
	}
	p = { above, below, dark };
	profiles.set(count, p);
	return p;
}

const lerp = (a: number, b: number, v: number) => a + (b - a) * v;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

type Rig = {
	key: string;
	L: number;
	/** Head-x window in which any part of the animal can be on the page. */
	xIn: number;
	xOut: number;
	xStart: number;
	/** Distance the head runs per cycle, crossing plus quiet. */
	cyclePx: number;
	mother: Loop;
	calf: Loop;
	/** Head x at the still. */
	still: number;
};

let rig: Rig | null = null;

/** Height of the route for a head at x: a soft descent, then a rise. */
function routeY(
	r: { y0: number; dip: number; L: number; W: number; peak: number },
	x: number,
) {
	// A broad arc, wider than the page, so the body is nearly level at the low.
	const s = clamp01(0.5 + (x - r.peak) / (r.W + 3 * r.L));
	const bump = Math.sin(Math.PI * s) ** 2;
	return r.y0 + r.dip * bump;
}

function buildRig(W: number, H: number): Rig {
	const L = Math.max(340, Math.min(570, W * 0.46));
	const phone = W < 700;
	// Lowest, and in open paper below the cards, at the still. On the way in and
	// out it rides higher, under the frosted cards.
	const dip = phone ? H * 0.1 : L * 0.2;
	// The sticky header takes the top of the field's first screen.
	const y0 = (phone ? H * 0.5 : H - HEADER - L * 0.255) - dip;
	const still = (phone ? W * 0.5 : W * 0.62) + L / 2;
	const xStart = -L - 260;
	const xEnd = W + L * 1.35 + 260;
	const drop = L * 0.16;
	const shape = { y0, dip, L, W, peak: still };
	const make = (lift: number) => {
		const pts: Point[] = [];
		for (let x = xStart - 300; x <= xEnd + 300; x += 240)
			pts.push([x, routeY(shape, x) - lift]);
		// A short way home, well off the page: never drawn.
		const [lx, ly] = pts[pts.length - 1];
		pts.push([lx + 200, ly + 900], [xStart - 500, ly + 900]);
		return buildLoop(pts);
	};
	return {
		key: `${W}x${H}`,
		L,
		xIn: -90,
		xOut: W + L * 1.3 + 80,
		xStart,
		cyclePx: W + L * 1.3 + 80 - xStart + QUIET * SPEED,
		mother: make(0),
		calf: make(drop),
		still,
	};
}

type Spine = ReturnType<typeof spineOn>;

const fillPath = (
	c: CanvasRenderingContext2D,
	xs: ArrayLike<number>,
	ys: ArrayLike<number>,
	a: number,
	b: number,
) => {
	c.moveTo(xs[a], ys[a]);
	for (let i = a + 1; i <= b; i++) c.lineTo(xs[i], ys[i]);
};

const FLIPPER_BEAT = 0.07;

/** Draws one whale. Tone is alpha; `big` adds what only a large body can hold. */
function drawWhale(
	layers: Layers,
	s: Spine,
	L: number,
	t: number,
	big: boolean,
	swing: number,
) {
	const c = layers.dither;
	const n = s.x.length;
	const last = n - 1;
	const prof = profileFor(n);
	const px = new Float32Array(n * 2);
	const py = new Float32Array(n * 2);
	// Outline: back from nose to tail, then belly from tail to nose.
	const topX = new Float32Array(n);
	const topY = new Float32Array(n);
	const botX = new Float32Array(n);
	const botY = new Float32Array(n);
	const darkX = new Float32Array(n);
	const darkY = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const up = prof.above[i] * L;
		const dn = prof.below[i] * L;
		topX[i] = s.x[i] - s.nx[i] * up;
		topY[i] = s.y[i] - s.ny[i] * up;
		botX[i] = s.x[i] + s.nx[i] * dn;
		botY[i] = s.y[i] + s.ny[i] * dn;
		const k = prof.dark[i];
		darkX[i] = lerp(topX[i], botX[i], k);
		darkY[i] = lerp(topY[i], botY[i], k);
		px[i] = topX[i];
		py[i] = topY[i];
		px[2 * n - 1 - i] = botX[i];
		py[2 * n - 1 - i] = botY[i];
	}
	const body = () => {
		c.beginPath();
		fillPath(c, px, py, 0, 2 * n - 1);
		c.closePath();
	};

	// Tail stock direction, and flukes seen from a little above.
	const tx = s.x[last - 3] - s.x[last];
	const ty = s.y[last - 3] - s.y[last];
	const td = Math.hypot(tx, ty) || 1;
	const ux = -tx / td;
	const uy = -ty / td;
	const vx = s.nx[last];
	const vy = s.ny[last];
	const root = [s.x[last], s.y[last]];
	const FLUKE: Array<[number, number]> = [
		[-0.016, 0.0],
		[0.0, 0.05],
		[0.026, 0.11],
		[0.066, 0.17],
		[0.13, 0.215],
		[0.118, 0.17],
		[0.104, 0.12],
		[0.09, 0.07],
		[0.08, 0.03],
		[0.074, 0],
	];
	const sees = 0.36;
	const fluke = (side: number) => {
		for (const [a, b] of FLUKE)
			c.lineTo(
				root[0] + ux * a * L + vx * b * L * sees * side,
				root[1] + uy * a * L + vy * b * L * sees * side,
			);
	};
	c.beginPath();
	c.moveTo(root[0] - ux * 0.016 * L, root[1] - uy * 0.016 * L);
	fluke(1);
	for (let k = FLUKE.length - 1; k >= 0; k--) {
		const [a, b] = FLUKE[k];
		c.lineTo(
			root[0] + ux * a * L - vx * b * L * sees,
			root[1] + uy * a * L - vy * b * L * sees,
		);
	}
	c.closePath();
	c.fillStyle = "rgb(0 0 0 / 0.86)";
	c.fill();

	// Body: pale first, then the dark back laid over it.
	body();
	c.fillStyle = "rgb(0 0 0 / 0.26)";
	c.fill();
	c.save();
	body();
	c.clip();
	c.beginPath();
	fillPath(c, topX, topY, 0, last);
	for (let i = last; i >= 0; i--) c.lineTo(darkX[i], darkY[i]);
	c.closePath();
	c.fillStyle = "rgb(0 0 0 / 0.84)";
	c.fill();

	// Throat pleats, chin to navel: the signature.
	const stripes = big ? 7 : 4;
	const a0 = Math.round(last * 0.06);
	c.lineCap = "round";
	c.lineJoin = "round";
	c.lineWidth = Math.max(2.2, L * (big ? 0.0052 : 0.008));
	c.strokeStyle = "rgb(0 0 0 / 0.7)";
	for (let k = 0; k < stripes; k++) {
		const w = (k + 0.5) / stripes;
		const end = Math.round(last * (0.4 + 0.13 * w));
		c.beginPath();
		for (let i = a0; i <= end; i++) {
			const x = lerp(darkX[i], botX[i], w);
			const y = lerp(darkY[i], botY[i], w);
			if (i === a0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.stroke();
	}
	c.restore();

	// The long pectoral flipper, dipping and sweeping slowly.
	const fr = Math.round(last * 0.3);
	const fx = lerp(s.x[fr], botX[fr], 0.45);
	const fy = lerp(s.y[fr], botY[fr], 0.45);
	const bx = s.x[fr - 2] - s.x[fr + 2];
	const by = s.y[fr - 2] - s.y[fr + 2];
	const bd = Math.hypot(bx, by) || 1;
	// Unit vectors: forward along the body, and down from it.
	const fwx = bx / bd;
	const fwy = by / bd;
	const dwx = -fwy;
	const dwy = fwx;
	const alpha = 0.5 + 0.2 * Math.sin(Math.PI * 2 * (FLIPPER_BEAT * t + swing));
	const dirx = -fwx * Math.cos(alpha) + dwx * Math.sin(alpha);
	const diry = -fwy * Math.cos(alpha) + dwy * Math.sin(alpha);
	// The leading edge faces the head.
	const lx = fwx * Math.sin(alpha) + dwx * Math.cos(alpha);
	const ly = fwy * Math.sin(alpha) + dwy * Math.cos(alpha);
	const fl = L * 0.28;
	const half = (u: number) =>
		Math.max(1.6, L * 0.0235) *
		Math.sin(Math.PI * clamp01(u) ** 0.72) ** 0.7 *
		(u < 0.12 ? 0.6 + 4 * u : 1);
	c.beginPath();
	const steps = 16;
	for (let i = 0; i <= steps; i++) {
		const u = i / steps;
		const scallop = 1 + 0.18 * Math.sin(u * Math.PI * 7) * (u > 0.15 ? 1 : 0);
		const wd = half(u) * scallop;
		const x = fx + dirx * u * fl + lx * wd;
		const y = fy + diry * u * fl + ly * wd;
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	for (let i = steps; i >= 0; i--) {
		const u = i / steps;
		const wd = half(u) * 0.8;
		c.lineTo(fx + dirx * u * fl - lx * wd, fy + diry * u * fl - ly * wd);
	}
	c.closePath();
	c.fillStyle = "rgb(0 0 0 / 0.78)";
	c.fill();

	// Outline, then a small dark eye in a pale ring.
	body();
	c.lineWidth = 1.8;
	c.strokeStyle = "rgb(0 0 0 / 0.62)";
	c.stroke();
	const e = Math.round(last * 0.105);
	const ex = lerp(topX[e], darkX[e], 0.8);
	const ey = lerp(topY[e], darkY[e], 0.8);
	const er = Math.max(2.4, L * 0.0085);
	c.save();
	c.globalCompositeOperation = "destination-out";
	c.beginPath();
	c.arc(ex, ey, er * 1.45, 0, 7);
	c.fill();
	c.restore();
	c.fillStyle = "rgb(0 0 0 / 0.95)";
	c.beginPath();
	c.arc(ex, ey, er * 0.78, 0, 7);
	c.fill();

	// Only the great mass of the back is big enough for the letters.
	if (big) {
		const a = layers.ascii;
		const from = Math.round(last * 0.16);
		const to = Math.round(last * 0.76);
		const inset = L * 0.026;
		a.beginPath();
		for (let i = from; i <= to; i++) {
			const x = topX[i] + s.nx[i] * inset;
			const y = topY[i] + s.ny[i] * inset;
			if (i === from) a.moveTo(x, y);
			else a.lineTo(x, y);
		}
		for (let i = to; i >= from; i--)
			a.lineTo(darkX[i] - s.nx[i] * inset, darkY[i] - s.ny[i] * inset);
		a.closePath();
		a.fillStyle = "rgb(0 0 0 / 0.72)";
		a.fill();
	}
}

export const whale: Scene = (layers, { t, W, H }) => {
	if (!rig || rig.key !== `${W}x${H}`) rig = buildRig(W, H);
	const r = rig;
	const cyclePx = r.cyclePx;
	// The head is mid-window at the still, whatever the viewport.
	const stillHeadX = r.still;
	const phase = stillHeadX - r.xStart - SPEED * STILL_T;
	const p = (((SPEED * t + phase) % cyclePx) + cyclePx) % cyclePx;
	const headX = r.xStart + p;
	if (headX < r.xIn || headX > r.xOut) return;

	const stroke = (len: number) => ({
		waves: 0.5,
		reach: len * 0.058,
		beat: BEAT,
		stiff: 0.25,
	});
	// The calf first, so its mother can pass over any overlap.
	const lc = r.L * 0.34;
	const calf = spineOn(
		r.calf,
		p + 300 - r.L * 0.4,
		lc,
		56,
		stroke(lc),
		t - (PHASE + 0.1) / BEAT,
	);
	drawWhale(layers, calf, lc, t, false, 0.3);

	const mother = spineOn(
		r.mother,
		p + 300,
		r.L,
		120,
		stroke(r.L),
		t - PHASE / BEAT,
	);
	drawWhale(layers, mother, r.L, t, true, 0);
};
