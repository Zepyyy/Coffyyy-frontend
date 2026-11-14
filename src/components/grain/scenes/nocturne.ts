import { backgroundFrame, type Scene } from "../engine";

/**
 * A meteor-shower night over a cratered moon. Everything is a function of t.
 *
 * Several lifecycles run at once, each with its own pace, colour and pattern:
 *
 * One sky, one flow. Every meteor family runs from the upper right toward the
 * lower left, fanning out of a single radiant far beyond the top right corner,
 * so paths differ by a few degrees and never cross at a wide angle. Grazers sit
 * at the shallow end of that fan, fireballs in its middle; the satellite and
 * the string of lights follow the same heading, slowly.
 *
 *   shower      fast cool streaks from that radiant. Flurries and lulls follow
 *               a slow activity curve, so they come in bursts, in pairs, and
 *               sometimes split or leave a train.
 *   fireball    rare and heavy. Flares, breaks in three, sheds embers, and
 *               leaves a train that shears away in the wind for seconds.
 *   grazer      slow, long, warm. Skims the open lower half towards the moon,
 *               burns out short of it, trailing fragments and cooling embers.
 *   satellite   one steady light drifting down the left margin, under the
 *               planet's knot, fading into shadow.
 *   pearls      a straight string of lights on the same heading, rarely.
 *   cirrus      thin bands drifting across the moon, thinning its relief and
 *               lit by it; they also pass over the stars near it.
 *   stars       sparse and clustered, brightest in the margins, washed out by
 *               the moon's glare. A planet holds the upper left. A few scintillate.
 *
 * Each family draws its events from its own slot clock (index k hashes to the
 * same event every time), so nothing repeats on a visible beat. The first
 * family fires in measured bursts; the others are staggered so that a quiet
 * stretch in one is usually an event in another.
 */

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const lerp = (a: number, b: number, v: number) => a + (b - a) * v;
const smooth = (a: number, b: number, v: number) => {
	const t = clamp((v - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const rand = (n: number) => {
	const v = Math.sin(n * 127.13 + 21.7) * 43758.5453;
	return v - Math.floor(v);
};
const rgba = (c: Rgb, a: number) =>
	`rgb(${c[0]} ${c[1]} ${c[2]} / ${clamp(a, 0, 1).toFixed(3)})`;

const PALETTE = {
	dark: {
		moonLow: [85, 104, 130],
		moonHigh: [225, 218, 194],
		cool: [150, 190, 226],
		coolHot: [236, 246, 255],
		green: [146, 226, 196],
		amber: [255, 190, 118],
		warm: [255, 176, 100],
		warmHot: [255, 238, 204],
		ember: [255, 142, 84],
		train: [124, 204, 192],
		star: [226, 232, 242],
		starWarm: [248, 216, 172],
		planet: [252, 230, 186],
		sat: [238, 240, 228],
	},
	light: {
		moonLow: [63, 77, 101],
		moonHigh: [155, 148, 133],
		cool: [68, 98, 152],
		coolHot: [52, 78, 128],
		green: [52, 128, 112],
		amber: [196, 128, 58],
		warm: [188, 118, 52],
		warmHot: [150, 100, 44],
		ember: [176, 90, 52],
		train: [58, 124, 118],
		star: [74, 90, 118],
		starWarm: [150, 104, 64],
		planet: [172, 120, 62],
		sat: [88, 96, 104],
	},
} satisfies Record<string, Record<string, Rgb>>;
type Pal = (typeof PALETTE)["dark"];

/** Everything is placed against the journal's reading column and the moon. */
type World = {
	W: number;
	H: number;
	/** Reading column edges. */
	x0: number;
	x1: number;
	moon: { x: number; y: number; r: number };
	/** Meteor radiant, far beyond the top right corner. */
	rad: { x: number; y: number };
	/** Distance from the radiant to the middle of the page. */
	far: number;
};

/** The sky's flow, in radians below horizontal, running towards the left. */
const FLOW = 0.6;

function worldFor(
	W: number,
	H: number,
	frame: { x: number; w: number } | undefined,
): World {
	const f = frame ?? backgroundFrame(W, { x: 0, y: 0, w: W, h: H });
	const x0 = f.x;
	const x1 = f.x + f.w;
	const r = clamp(Math.round(H * 0.28), 190, 300);
	// Far enough that paths across the page differ by a dozen degrees at most.
	const far = Math.hypot(W, H) * 2.2;
	return {
		W,
		H,
		x0,
		x1,
		moon: { x: clamp(x0 * 0.43, 70, 230), y: H * 0.8, r },
		rad: {
			x: W * 0.5 + Math.cos(FLOW) * far,
			y: H * 0.42 - Math.sin(FLOW) * far,
		},
		far,
	};
}

/** Shower activity, 0 to 1. Three incommensurate swells: bursts and lulls. */
const activity = (t: number) =>
	clamp(
		0.5 +
			0.3 * Math.sin((t / 43.7) * TAU + 0.6) +
			0.22 * Math.sin((t / 71.9) * TAU + 2.1) +
			0.14 * Math.sin((t / 29.3) * TAU + 4),
		0,
		1,
	);

/**
 * Hashed events of one family. Slot k starts somewhere inside its own span and
 * fires with probability `p(start)`; an event may outlive its slot.
 */
function slotsOf(
	t: number,
	span: number,
	reach: number,
	salt: number,
	p: (start: number) => number,
	shift = 0,
) {
	const out: { k: number; t0: number; g: (i: number) => number }[] = [];
	const u = t - shift;
	for (let k = Math.floor((u - reach) / span); k <= Math.floor(u / span); k++) {
		if (k < 0) continue;
		const g = (i: number) => rand(k * 5.113 + i * 1.931 + salt * 37.7);
		const t0 = (k + g(0) * 0.92) * span + shift;
		if (t < t0 || t > t0 + reach) continue;
		if (g(1) > p(t0)) continue;
		out.push({ k, t0, g });
	}
	return out;
}

/** A flare: quick to ignite, slow to die, so a big halo never blinks in two frames. */
const flareAt = (x: number, attack: number, decay: number) =>
	Math.exp(-((x / (x < 0 ? attack : decay)) ** 2));

/** A straight path: an origin, and an angle below horizontal heading left. */
type Track = { x: number; y: number; a: number };

/** The point `s` px along a track, pushed `side` px off it (down and right). */
const onTrack = (p: Track, s: number, side = 0) =>
	[
		p.x - Math.cos(p.a) * s + Math.sin(p.a) * side,
		p.y + Math.sin(p.a) * s + Math.cos(p.a) * side,
	] as const;

/** Heading of the ray from the radiant through (x, y), plus a little scatter. */
const heading = (w: World, x: number, y: number, scatter: number) =>
	Math.atan2(y - w.rad.y, w.rad.x - x) + scatter;

/** Room left on a track before it leaves through the bottom or left of the page. */
const room = (w: World, p: Track) =>
	Math.min((w.H * 0.93 - p.y) / Math.sin(p.a), (p.x + 10) / Math.cos(p.a));

/**
 * A tapered tail, bright at the head and fading to nothing. Three nested
 * layers give it a soft shoulder, which is what a 2px lattice needs in order
 * to read as a stroke rather than a dotted line.
 */
function streak(
	c: Ctx,
	hx: number,
	hy: number,
	ux: number,
	uy: number,
	len: number,
	half: number,
	col: Rgb,
	a: number,
) {
	if (len < 2 || a <= 0.004) return;
	const tx = hx - ux * len;
	const ty = hy - uy * len;
	const g = c.createLinearGradient(hx, hy, tx, ty);
	for (const [layer, wide, k] of [
		[0, 3, 0.4],
		[1, 1.8, 0.62],
		[2, 1, 1],
	] as const) {
		const alpha = a * k;
		const hold = layer === 2 ? 0.2 : 0.3;
		g.addColorStop(0, rgba(col, alpha));
		g.addColorStop(hold, rgba(col, alpha * 0.82));
		g.addColorStop(0.62, rgba(col, alpha * 0.4));
		g.addColorStop(1, rgba(col, 0));
		c.fillStyle = g;
		const r = half * wide;
		c.beginPath();
		c.moveTo(hx - uy * r, hy + ux * r);
		c.lineTo(tx, ty);
		c.lineTo(hx + uy * r, hy - ux * r);
		c.closePath();
		c.fill();
	}
}

function dot(c: Ctx, x: number, y: number, r: number, col: Rgb, a: number) {
	if (a <= 0.004) return;
	c.fillStyle = rgba(col, a);
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
}

function glow(c: Ctx, x: number, y: number, r: number, col: Rgb, a: number) {
	if (a <= 0.004) return;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, rgba(col, a));
	g.addColorStop(0.4, rgba(col, a * 0.42));
	g.addColorStop(1, rgba(col, 0));
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
}

/* ---------------------------------------------------------------- moon -- */

let material: { key: string; canvas: HTMLCanvasElement } | undefined;

/**
 * Sun direction is fixed in sphere space; relief and terminator share it.
 * Dark paper reads light as dots, so the lit surface is dense there. On light
 * paper dots are ink, so the same shading is drawn as engraving: shadow is
 * dense, and craters show as shadowed walls against open lit ground.
 */
function moonBitmap(r: number, dark: boolean) {
	const key = `${r}:${dark}`;
	if (material?.key === key) return material.canvas;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = r * 2;
	const ctx = canvas.getContext("2d");
	if (!ctx) return canvas;
	const size = canvas.width,
		pixels = ctx.createImageData(size, size);
	const craters = Array.from({ length: 72 }, (_, i) => ({
		x: (rand(i * 5) - 0.5) * 1.85,
		y: (rand(i * 5 + 1) - 0.5) * 1.85,
		radius: 0.018 + rand(i * 5 + 2) ** 2 * 0.105,
	}));
	const pal = dark ? PALETTE.dark : PALETTE.light;
	// Crater slopes are gathered per crater over its own box, not per pixel.
	const gxs = new Float32Array(size * size),
		gys = new Float32Array(size * size),
		basins = new Float32Array(size * size);
	for (const crater of craters) {
		const reach = crater.radius * Math.sqrt(1.7);
		const px0 = Math.max(0, Math.floor((crater.x - reach + 1) * r)),
			px1 = Math.min(size - 1, Math.ceil((crater.x + reach + 1) * r)),
			py0 = Math.max(0, Math.floor((crater.y - reach + 1) * r)),
			py1 = Math.min(size - 1, Math.ceil((crater.y + reach + 1) * r));
		for (let py = py0; py <= py1; py++)
			for (let px = px0; px <= px1; px++) {
				const x = (px - r) / r,
					y = (py - r) / r;
				if (x * x + y * y >= 1) continue;
				const dx = x - crater.x,
					dy = y - crater.y;
				const d2 = (dx * dx + dy * dy) / (crater.radius * crater.radius);
				if (d2 > 1.7) continue;
				const d = Math.sqrt(d2),
					rim = Math.exp(-(((d - 1) / 0.12) ** 2));
				// Continuous scooped floor and raised rim, lit by the same sun as sphere.
				const slope =
					(d < 1 ? 0.26 * d * (1 - d * d) : 0) -
					(0.045 * rim * 2 * (d - 1)) / (0.12 * 0.12);
				const i = py * size + px;
				gxs[i] += (slope * dx) / Math.max(0.001, d * crater.radius);
				gys[i] += (slope * dy) / Math.max(0.001, d * crater.radius);
				basins[i] += d < 0.8 ? 0.08 * (1 - d) : 0;
			}
	}
	for (let py = 0; py < size; py++)
		for (let px = 0; px < size; px++) {
			const x = (px - r) / r,
				y = (py - r) / r,
				q = x * x + y * y;
			if (q >= 1) continue;
			const z = Math.sqrt(1 - q);
			const at = py * size + px;
			let nx = x - gxs[at],
				ny = y - gys[at],
				nz = z;
			const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
			nx /= length;
			ny /= length;
			nz /= length;
			const sun = Math.max(0, nx * 0.82 - ny * 0.36 + nz * 0.38);
			const sphere = Math.max(0, x * 0.82 - y * 0.36 + z * 0.38);
			const maria =
				Math.max(
					0,
					Math.sin(x * 8 + Math.sin(y * 5)) * Math.sin(y * 7 - x * 2),
				) * 0.22;
			const grit = (rand(px + py * size) - 0.5) * 0.07;
			const tone = Math.max(
				0,
				Math.min(1, sun * (1 - maria - basins[at]) + grit * sun),
			);
			const edge = Math.min(1, (1 - q) * r);
			const index = at * 4;
			let ink = 0.055 + 0.85 * Math.pow(tone, 0.75);
			if (!dark) {
				// Relief is what the sphere's own shading does not explain.
				const relief = sphere - tone;
				ink = clamp(
					0.06 +
						0.42 * (1 - sphere) ** 1.2 +
						1.7 * relief +
						0.3 * maria +
						0.18 * smooth(0.9, 1, Math.sqrt(q)),
					0.03,
					0.95,
				);
			}
			const shade = dark ? tone : 1 - ink;
			for (let k = 0; k < 3; k++)
				pixels.data[index + k] =
					pal.moonLow[k] + (pal.moonHigh[k] - pal.moonLow[k]) * shade;
			pixels.data[index + 3] = 255 * edge * ink;
		}
	ctx.putImageData(pixels, 0, 0);
	material = { key, canvas };
	return canvas;
}

/**
 * Cirrus: long thin bands that drift past the moon at their own speeds. Each
 * first thins what lies beneath, then adds moonlit mist, so the moon softens
 * and clears again rather than being covered.
 */
const WISPS = Array.from({ length: 6 }, (_, i) => ({
	y: (rand(i * 9 + 1) - 0.5) * 1.5,
	len: 0.8 + rand(i * 9 + 2) * 0.8,
	speed: 4 + rand(i * 9 + 4) * 6,
	tilt: -0.16 + rand(i * 9 + 5) * 0.34,
	phase: rand(i * 9 + 6),
	curl: 0.03 + rand(i * 9 + 7) * 0.05,
	strands: 5 + Math.floor(rand(i * 9 + 8) * 4),
}));

function cirrus(c: Ctx, t: number, w: World, pal: Pal) {
	const { x: mx, y: my, r } = w.moon;
	const span = r * 3.6;
	c.lineCap = "round";
	for (const [i, s] of WISPS.entries()) {
		const u = ((((t * s.speed) / span + s.phase) % 1) + 1) % 1;
		const env = Math.sin(Math.PI * u) ** 1.4;
		const cx = mx - span / 2 + u * span;
		const cy = my + s.y * r + Math.sin(t * 0.05 + i * 2) * r * 0.03;
		const near = 1 - smooth(r * 0.7, r * 1.3, Math.hypot(cx - mx, cy - my));
		const a = env * near;
		if (a < 0.03) continue;
		// Mares' tails: a sheaf of hair-thin strands, each bending a little differently.
		for (let k = 0; k < s.strands; k++) {
			const g = (n: number) => rand(i * 31 + k * 7 + n);
			const len = s.len * r * (0.55 + 0.7 * g(1));
			const off = (g(2) - 0.5) * r * 0.2;
			const x0 = cx - len / 2 + (g(3) - 0.5) * r * 0.3;
			const slant = Math.tan(s.tilt + (g(4) - 0.5) * 0.12);
			const bend = (s.curl + 0.03 * g(5)) * r;
			const wave = 0.008 + 0.008 * g(6);
			c.lineWidth = 2 + 3.5 * g(7);
			// One path and one gradient serve both passes: first thin what lies
			// beneath, then add the moonlit mist.
			const grad = c.createLinearGradient(x0, cy, x0 + len, cy);
			grad.addColorStop(0, rgba(pal.moonHigh, 0));
			grad.addColorStop(0.28, rgba(pal.moonHigh, 0.35 * a));
			grad.addColorStop(0.7, rgba(pal.moonHigh, 0.35 * a * 0.7));
			grad.addColorStop(1, rgba(pal.moonHigh, 0));
			const path = new Path2D();
			for (let n = 0; n <= 14; n++) {
				const x = x0 + (len * n) / 14;
				const y =
					cy +
					off +
					(x - cx) * slant +
					bend * Math.sin(((x - x0) / len) * Math.PI * (1 + g(8))) +
					Math.sin((x - x0) * wave + g(9) * 6 + t * 0.07) * 3;
				if (n === 0) path.moveTo(x, y);
				else path.lineTo(x, y);
			}
			c.strokeStyle = grad;
			c.globalCompositeOperation = "destination-out";
			c.stroke(path);
			c.globalCompositeOperation = "source-over";
			c.stroke(path);
		}
	}
	c.globalCompositeOperation = "source-over";
}

/* ---------------------------------------------------------- galaxy band -- */

type Bitmap = {
	key: string;
	canvas: HTMLCanvasElement;
	/** Bounds of what is inked, in bitmap px; drawing only these keeps the field small. */
	box: { x: number; y: number; w: number; h: number };
};
let galaxy: Bitmap | undefined;

/**
 * The galaxy's plane crosses the page from low on the right to high on the
 * left, through the planet's corner. A bulge of star cloud swells where it is
 * brightest, a dust rift splits it, and the light thins into the rest of the
 * sky. Cached once per size: it is a still sky behind everything else. Faint
 * fringes under the dither's threshold are dropped, not drawn as invisible dots.
 */
/** Below this the lattice would draw nothing a viewer could see. */
const FAINT = 0.022;

function galaxyBand(w: World, dark: boolean) {
	const key = `${w.W}x${w.H}:${dark}`;
	if (galaxy?.key === key) return galaxy;
	const cw = Math.ceil(w.W / 2);
	const ch = Math.ceil(w.H / 2);
	const canvas = document.createElement("canvas");
	canvas.width = cw;
	canvas.height = ch;
	const ctx = canvas.getContext("2d");
	const empty = { key, canvas, box: { x: 0, y: 0, w: 0, h: 0 } };
	if (!ctx) return empty;
	const img = ctx.createImageData(cw, ch);
	let bx0 = cw,
		by0 = ch,
		bx1 = -1,
		by1 = -1;
	const pal = dark ? PALETTE.dark : PALETTE.light;
	// Axis from the right edge (u = 0) to the left edge (u = 1), in field px.
	const ax = w.W * 1.04;
	const ay = w.H * 0.82;
	const bx = -w.W * 0.04;
	const by = w.H * 0.48;
	const dx = bx - ax;
	const dy = by - ay;
	const len = Math.hypot(dx, dy);
	const ux = dx / len;
	const uy = dy / len;
	for (let py = 0; py < ch; py++)
		for (let px = 0; px < cw; px++) {
			const x = px * 2 + 1;
			const y = py * 2 + 1;
			const along = ((x - ax) * ux + (y - ay) * uy) / len;
			const across = -(x - ax) * uy + (y - ay) * ux;
			// Most of the field lies far from the plane: reject before the costly terms.
			if (Math.abs(across) > w.H * 0.27) continue;
			const sigma =
				w.H * (0.085 + 0.05 * Math.exp(-(((along - 0.62) / 0.2) ** 2)));
			const core = Math.exp(-((across / sigma) ** 2));
			if (core < 0.02) continue;
			// Star clouds: clumps of different sizes that thin and thicken along the plane.
			const cloud =
				0.45 +
				0.55 *
					Math.sin(along * 23 + Math.sin(across * 0.021) * 2.4) *
					Math.sin(across * 0.034 + along * 11 + 1.3);
			const clump = smooth(-0.1, 0.8, cloud);
			// The rift: a dark lane wandering along the middle of the plane.
			const lane = across - sigma * 0.22 * Math.sin(along * 7.3 + 0.4);
			const rift = 1 - 0.82 * Math.exp(-((lane / (sigma * 0.15)) ** 2));
			const alpha =
				(dark ? 0.16 : 0.085) *
				core ** 1.1 *
				(0.25 + 0.75 * clump) *
				rift *
				(0.55 + 0.9 * rand(px * 1.37 + py * 91.3)) *
				smooth(0, 0.1, along) *
				(1 - 0.5 * smooth(0.85, 1.05, along));
			if (alpha < FAINT) continue;
			bx0 = Math.min(bx0, px);
			bx1 = Math.max(bx1, px);
			by0 = Math.min(by0, py);
			by1 = Math.max(by1, py);
			const warm = Math.exp(-(((along - 0.62) / 0.16) ** 2)) * core;
			const o = (py * cw + px) * 4;
			for (let k = 0; k < 3; k++)
				img.data[o + k] = lerp(pal.star[k], pal.starWarm[k], warm * 0.7);
			img.data[o + 3] = 255 * clamp(alpha, 0, 1);
		}
	ctx.putImageData(img, 0, 0);
	galaxy = {
		key,
		canvas,
		box: {
			x: bx0,
			y: by0,
			w: Math.max(0, bx1 - bx0 + 1),
			h: Math.max(0, by1 - by0 + 1),
		},
	};
	return galaxy;
}

/* --------------------------------------------------------------- stars -- */

type Star = {
	x: number;
	y: number;
	a: number;
	r: number;
	warm: boolean;
	amp: number;
	rate: number;
	phase: number;
	glint: number;
	planet?: boolean;
};

let sky: { key: string; stars: Star[] } | undefined;

function starsFor(w: World): Star[] {
	const key = `${w.W}x${w.H}:${w.x0}`;
	if (sky?.key === key) return sky.stars;
	const { W, H, x0, x1, moon } = w;
	const stars: Star[] = [];
	let n = 0;
	const make = (x: number, y: number, a: number, extra: Partial<Star> = {}) => {
		const g = (i: number) => rand(n * 3.7 + i * 1.3 + 900);
		n++;
		stars.push({
			x,
			y,
			a,
			r: 1.25,
			warm: g(1) < 0.18,
			amp: g(2) < 0.35 ? 0.18 + g(3) * 0.16 : 0,
			rate: TAU / (4 + g(4) * 6),
			phase: g(5) * TAU,
			glint: 0,
			...extra,
		});
	};
	// The planet and a small knot of companions in the upper left margin.
	const px = clamp(x0 * 0.5, 50, 260);
	const py = H * 0.17;
	make(px, py, 1, { r: 5.4, warm: true, amp: 0.05, planet: true });
	for (const [dx, dy, a] of [
		[-58, -24, 0.78],
		[-31, 38, 0.6],
		[44, 19, 0.7],
		[71, -37, 0.5],
		[26, -62, 0.56],
	] as const)
		make(px + dx, py + dy, a);
	// A lone bright star low in the right margin, answering the planet.
	make(x1 + (W - x1) * 0.5, H * 0.6, 1, { glint: 11, amp: 0, r: 1.6 });
	// A shallow chain along the open bottom, over the beans.
	for (const [dx, dy, a] of [
		[0, 0, 0.9],
		[38, -17, 0.62],
		[88, -4, 0.8],
		[130, -30, 0.56],
		[174, -10, 0.7],
	] as const)
		make(W * 0.6 + dx, H * 0.84 + dy, a);
	// The rest are scattered, thinned by moonlight, patchy, and sparse behind the column.
	for (let i = 0, kept = 0; i < 1400 && kept < 52; i++) {
		const x = W * rand(i * 2.7 + 400);
		const y = H * 0.9 * rand(i * 2.7 + 401);
		const margin = x < x0 - 8 || x > x1 + 8 ? 1 : 0.3;
		const glare = smooth(
			moon.r * 1.1,
			moon.r * 2.5,
			Math.hypot(x - moon.x, y - moon.y),
		);
		const patch =
			0.3 +
			0.7 *
				smooth(
					-0.25,
					0.7,
					Math.sin(x * 0.0061 + 1.7 + 1.9 * Math.sin(y * 0.0047)) *
						Math.sin(y * 0.0083 - 0.6 + 1.3 * Math.sin(x * 0.0039)) *
						1.4,
				);
		if (rand(i * 2.7 + 402) > margin * glare * patch) continue;
		kept++;
		const b = rand(i * 2.7 + 403);
		make(x, y, 0.62 + 0.38 * b ** 1.6, { glint: b > 0.9 ? 8 + b * 5 : 0 });
	}
	sky = { key, stars };
	return stars;
}

function drawStars(c: Ctx, t: number, w: World, pal: Pal) {
	const { moon } = w;
	for (const s of starsFor(w)) {
		const d = Math.hypot(s.x - moon.x, s.y - moon.y);
		const hide = smooth(moon.r * 0.98, moon.r * 1.25, d);
		if (hide < 0.02) continue;
		const tw = s.amp
			? 1 - s.amp * (0.5 + 0.5 * Math.sin(t * s.rate + s.phase))
			: 1;
		const a = s.a * tw * hide;
		const col = s.planet ? pal.planet : s.warm ? pal.starWarm : pal.star;
		if (s.planet) glow(c, s.x, s.y, 26, col, 0.34 * tw);
		else if (s.a > 0.85) glow(c, s.x, s.y, 9, col, 0.2 * tw);
		// Snap to the lattice so a still star is one steady dot.
		const sx = Math.round(s.x / 2) * 2;
		const sy = Math.round(s.y / 2) * 2;
		if (s.r < 2) {
			c.fillStyle = rgba(col, a);
			c.fillRect(sx - 1, sy - 1, 2, 2);
		} else dot(c, sx, sy, s.r, col, a);
		if (s.glint) {
			const breath = 0.5 + 0.5 * Math.sin(t * 0.52 + s.phase);
			const len = s.glint * (0.7 + 0.5 * breath);
			c.strokeStyle = rgba(col, a * (0.3 + 0.35 * breath));
			c.lineWidth = 1.6;
			c.beginPath();
			c.moveTo(sx - len, sy);
			c.lineTo(sx + len, sy);
			c.moveTo(sx, sy - len * 0.82);
			c.lineTo(sx, sy + len * 0.82);
			c.stroke();
		}
	}
}

/* -------------------------------------------------------------- shower -- */

type Meteor = Track & {
	t0: number;
	life: number;
	len: number;
	v: number;
	b: number;
	col: Rgb;
	side: number;
	flare: number;
	pf: number;
	split: number;
	train: number;
	tail: number;
};

const SHOWER_SPAN = 1.5;

function showerMeteors(t: number, w: World, pal: Pal) {
	const out: Meteor[] = [];
	const { W, H, rad } = w;
	const tint = (g: number, slow: boolean) =>
		slow ? (g < 0.55 ? pal.amber : pal.cool) : g < 0.74 ? pal.cool : pal.green;
	for (const { t0, g } of slotsOf(
		t,
		SHOWER_SPAN,
		16,
		11,
		(s) => 0.1 + 0.72 * activity(s) ** 1.2,
	)) {
		// Ignition: mostly high and towards the right, but anywhere in the sky.
		// The heading is the radiant's, give or take a few degrees.
		const x = W * (1.04 - 0.8 * g(3) ** 1.35);
		const y = -14 + H * 0.42 * g(4) ** 1.7;
		const a = heading(w, x, y, (g(24) - 0.5) * 0.07);
		// Two paces: quick streaks, and slower, longer-lived drifters.
		const slow = g(14) > 0.64;
		let len = slow ? 260 + 260 * g(5) : 300 + 520 * g(5) ** 0.8;
		len = Math.max(140, Math.min(len, room(w, { x, y, a })));
		// Farther from the radiant, a meteor is longer and quicker.
		const [mx, my] = onTrack({ x, y, a }, len * 0.5);
		const reach = clamp(
			Math.hypot(mx - rad.x, my - rad.y) - (w.far - H * 0.75),
			120,
			1100,
		);
		const v = slow
			? 150 + 0.1 * reach + 60 * g(6)
			: 330 + 0.16 * reach + 110 * g(6);
		const bright = 0.5 + 0.5 * g(8) ** 0.7;
		const m: Meteor = {
			t0,
			life: len / v,
			x,
			y,
			a,
			len,
			v,
			b: bright,
			col: tint(g(7), slow),
			side: 0,
			flare: g(10) < 0.38 ? 1 : 0,
			pf: 0.3 + 0.4 * g(11),
			split: g(12) < 0.24 ? (g(13) < 0.5 ? -1 : 1) : 0,
			train: bright > 0.66 && g(9) < 0.72 ? 1 : 0,
			tail: slow ? 130 + 70 * g(15) : clamp(0.5 * v, 150, 240),
		};
		out.push(m);
		// A pair: the parent broke up high above and the pieces arrive together.
		if (g(2) < 0.26)
			out.push({
				...m,
				t0: t0 + 0.14 + 0.36 * g(20),
				a: a + (g(21) - 0.5) * 0.05,
				side: (g(22) < 0.5 ? -1 : 1) * (14 + 28 * g(23)),
				b: m.b * 0.66,
				len: m.len * 0.82,
				life: (m.len * 0.82) / m.v,
				flare: 0,
				split: 0,
				train: 0,
			});
	}
	return out;
}

const meteorAt = (m: Meteor, s: number) => onTrack(m, s, m.side);

function drawMeteor(c: Ctx, m: Meteor, t: number, pal: Pal) {
	const age = t - m.t0;
	if (age < 0) return;
	const after = Math.max(0, age - m.life);
	if (after > 0.5) return;
	const q = clamp(age / m.life, 0, 1);
	const fade = 1 - after / 0.5;
	const s = m.len * q;
	const [hx, hy] = meteorAt(m, s);
	const ux = -Math.cos(m.a);
	const uy = Math.sin(m.a);
	const boost = m.flare ? 1 + 1.3 * flareAt(q - m.pf, 0.1, 0.22) : 1;
	const env = smooth(0, 0.08, q) * fade * (1 - 0.5 * smooth(0.72, 1, q));
	const a = clamp(m.b * env * boost, 0, 1);
	const tail = Math.min(m.tail * boost ** 0.5, age * m.v + 8);
	const half = (1.5 + 1.3 * m.b) * boost ** 0.6;
	streak(c, hx, hy, ux, uy, tail, half, m.col, a);
	streak(c, hx, hy, ux, uy, tail * 0.5, half * 0.45, pal.coolHot, a * 0.95);
	dot(c, hx, hy, 2 + 1.8 * m.b * boost ** 0.5, pal.coolHot, a * fade);

	if (m.split && q > m.pf) {
		const u = q - m.pf;
		const sc = m.len * m.pf + (s - m.len * m.pf) * 0.93;
		const [bx, by] = meteorAt(m, sc);
		const drift = m.split * u * m.len * 0.085;
		const cx = bx - uy * drift;
		const cy = by + ux * drift;
		const ca = a * 0.78 * smooth(0, 0.06, u);
		const bend = m.split * u * 0.18;
		const cux = ux * Math.cos(bend) - uy * Math.sin(bend);
		const cuy = uy * Math.cos(bend) + ux * Math.sin(bend);
		streak(
			c,
			cx,
			cy,
			cux,
			cuy,
			Math.min(tail * 0.7, u * m.len + 6),
			half * 0.8,
			m.col,
			ca,
		);
		dot(c, cx, cy, 1.2 + m.b, pal.coolHot, ca);
	}
}

/**
 * A persistent train: the glowing gas a meteor leaves, seen for a few seconds.
 * It starts as a thin bright line, then the high wind takes it. The top (oldest)
 * shears away first and bends into an S, the line swells and breaks into knots
 * with gaps between, and each knot fades as it spreads. It never stays a line.
 */
function ribbon(
	c: Ctx,
	heading: number,
	pts: (q: number) => readonly [number, number],
	born: (q: number) => number,
	t: number,
	life: number,
	id: number,
	col: Rgb,
	strength: number,
	width: number,
) {
	// One wind for the whole sky: it pushes a train mostly sideways from its
	// own line, so the shear reads as a bend and not as a slide along the path.
	const nx = Math.sin(heading);
	const ny = Math.cos(heading);
	const ux = -ny;
	const uy = nx;
	const wn = 6 + 8 * rand(id * 1.7 + 3);
	const wu = (rand(id * 1.7 + 4) - 0.5) * 6;
	const bendA = 9 + 10 * rand(id * 1.7 + 5);
	const knots = 2.2 + 1.8 * rand(id * 1.7 + 6);
	const N = 24;
	c.lineCap = "round";
	let prev: { x: number; y: number; a: number; wd: number } | undefined;
	for (let j = 0; j <= N; j++) {
		const q = j / N;
		const age = t - born(q);
		if (age < 0) break;
		const [x, y] = pts(q);
		// Shear grows with age, and is stronger higher up, where the wind is.
		const grow = Math.min(age, 7);
		const side =
			age * wn * (0.4 + 1.1 * (1 - q)) +
			Math.sin(q * 4.2 + id + age * 0.35) * grow * bendA * 0.28;
		const drift = age * wu * (1 - q) + Math.cos(q * 3 + id) * grow * 1.6;
		const px = x + nx * side + ux * drift;
		const py = y + ny * side + uy * drift;
		const swell = smooth(0.1, 1.3, age) * (1 - clamp(age / life, 0, 1)) ** 2;
		// Gaps open with age: a bead of gas here, nothing there.
		const bead = 0.5 + 0.5 * Math.sin(q * knots * TAU + id * 2.3 + age * 0.3);
		const gap = smooth(0.7, 3.2, age) * 0.9;
		const a = strength * swell * (1 - gap * (1 - bead ** 0.8));
		const wd = width * (1 + age * 0.55);
		const cur = { x: px, y: py, a, wd };
		if (prev) {
			const aa = Math.min(prev.a, cur.a);
			if (aa > 0.012) {
				// A wide soft shoulder under a core that thins as it spreads.
				const spread = 1 / (1 + age * 0.7);
				for (const [k, wide] of [
					[0.34, 2.1],
					[spread, 0.8],
				] as const) {
					c.strokeStyle = rgba(col, aa * k);
					c.lineWidth = Math.max(1.4, (prev.wd + cur.wd) * 0.5 * wide);
					c.beginPath();
					c.moveTo(prev.x, prev.y);
					c.lineTo(px, py);
					c.stroke();
				}
			}
		}
		prev = cur;
	}
}

function drawShowerTrain(c: Ctx, m: Meteor, id: number, t: number, pal: Pal) {
	const life = 3 + 3 * rand(id * 3.1);
	if (t < m.t0 || t > m.t0 + m.life + life) return;
	ribbon(
		c,
		m.a,
		(q) => meteorAt(m, m.len * lerp(0.14, 0.86, q)),
		(q) => m.t0 + m.life * lerp(0.14, 0.86, q),
		t,
		life,
		id,
		pal.train,
		0.85 * m.b,
		3.2,
	);
}

/* ------------------------------------------------------------- fireball -- */

type Fireball = Track & {
	t0: number;
	life: number;
	len: number;
	v: number;
	id: number;
	pf: number;
	kids: number[];
};
const FIRE_SPAN = 44;
const FIRE_TRAIN = 6;

function fireballs(t: number, w: World): Fireball[] {
	const out: Fireball[] = [];
	for (const { k, t0, g } of slotsOf(
		t,
		FIRE_SPAN,
		5 + FIRE_TRAIN,
		34,
		(s) => 0.62 + 0.3 * activity(s * 0.8 + 9),
		6.6,
	)) {
		// Heavy ones ignite high in the upper right and run down the fan's middle.
		const x = w.W * (0.58 + 0.38 * g(3));
		const y = w.H * (0.02 + 0.06 * g(4));
		const a = heading(w, x, y, (g(24) - 0.5) * 0.06);
		const len = Math.min(w.H * (0.7 + 0.25 * g(5)), room(w, { x, y, a }));
		const v = 235 + 70 * g(6);
		out.push({
			t0,
			life: len / v,
			x,
			y,
			a,
			len,
			v,
			id: k,
			pf: 0.36 + 0.22 * g(7),
			kids: [g(8), g(9), g(10)],
		});
	}
	return out;
}

function drawFireball(c: Ctx, f: Fireball, t: number, pal: Pal) {
	const age = t - f.t0;
	const ux = -Math.cos(f.a);
	const uy = Math.sin(f.a);
	const nx = -uy;
	const ny = ux;
	// Embers: shed after the break-up, they fall behind and cool.
	for (let e = 0; e < 14; e++) {
		const qe = lerp(f.pf, 1, rand(f.id * 7.7 + e * 1.3));
		const te = f.t0 + qe * f.life;
		const ea = t - te;
		const el = 1.4 + 1.6 * rand(f.id * 7.7 + e * 1.3 + 0.5);
		if (ea < 0 || ea > el) continue;
		const lat = (rand(f.id * 7.7 + e * 1.3 + 0.9) - 0.5) * 26;
		const [bx, by] = onTrack(f, f.len * qe);
		const along = (f.v * 0.5 * (1 - Math.exp(-ea * 1.4))) / 1.4;
		const x = bx + ux * along + nx * lat * ea * 0.5;
		const y = by + uy * along + ny * lat * ea * 0.5 + ea * ea * 3;
		const k = 1 - ea / el;
		dot(c, x, y, 1.15, k > 0.5 ? pal.warm : pal.ember, 0.85 * k ** 1.1);
	}
	if (age >= 0 && age < f.life + 0.7) {
		const q = clamp(age / f.life, 0, 1);
		const fade = 1 - Math.max(0, age - f.life) / 0.7;
		const flare = flareAt(q - f.pf, 0.1, 0.2);
		const env = smooth(0, 0.07, q) * fade;
		const hot = lerp(0.8, 1, flare);
		const [hx, hy] = onTrack(f, f.len * q);
		const tail = Math.min(210 * (1 + 0.4 * flare), age * f.v + 8);
		if (flare > 0.05) glow(c, hx, hy, 74 * flare + 16, pal.warm, 0.42 * flare);
		streak(c, hx, hy, ux, uy, tail, 2.5 + 1.6 * flare, pal.warm, env * hot);
		streak(c, hx, hy, ux, uy, tail * 0.45, 1.2, pal.warmHot, env);
		dot(c, hx, hy, 4.4 + 3 * flare, pal.warmHot, env);
		// Three fragments leave the main body and spread.
		if (q > f.pf) {
			const u = q - f.pf;
			for (const [i, kid] of f.kids.entries()) {
				const spread = (i - 1) * (0.7 + 0.5 * kid) * u * f.len * 0.09;
				const lag = (0.88 + 0.08 * kid) * (q - f.pf) * f.len;
				const [bx, by] = onTrack(f, f.len * f.pf + lag);
				const kx = bx + nx * spread;
				const ky = by + ny * spread;
				const ka = env * smooth(0, 0.05, u) * (0.8 - i * 0.1);
				streak(
					c,
					kx,
					ky,
					ux,
					uy,
					Math.min(120 - i * 16, u * f.len + 6),
					1.1 - i * 0.15,
					pal.warm,
					ka,
				);
				dot(c, kx, ky, 2 - i * 0.3, pal.warmHot, ka);
			}
		}
	}
}

function drawFireTrain(c: Ctx, f: Fireball, t: number, pal: Pal) {
	if (t < f.t0) return;
	ribbon(
		c,
		f.a,
		(q) => onTrack(f, f.len * lerp(0.1, 0.96, q)),
		(q) => f.t0 + f.life * lerp(0.1, 0.96, q),
		t,
		FIRE_TRAIN,
		f.id + 50,
		pal.train,
		0.7,
		4.2,
	);
}

/* --------------------------------------------------------------- grazer -- */

type Grazer = Track & {
	t0: number;
	life: number;
	len: number;
	id: number;
	frags: [number, number, number][];
};

function grazers(t: number, w: World): Grazer[] {
	const out: Grazer[] = [];
	for (const { k, t0, g } of slotsOf(
		t,
		27,
		11,
		89,
		(s) => 0.35 + 0.5 * activity(s * 0.6 + 17),
	)) {
		// The fan's shallow edge: in from the right at mid height, down towards
		// the moon, and gone before it gets there.
		const x = w.W + 30;
		const y = w.H * (0.22 + 0.24 * g(5));
		const a = 0.4 + 0.08 * g(6);
		const len = Math.min(w.W * (0.5 + 0.24 * g(3)), room(w, { x, y, a }));
		out.push({
			t0,
			life: 6 + 2.6 * g(4),
			x,
			y,
			a,
			len,
			id: k,
			frags: [0, 1, 2].map((i) => [
				26 + i * 24 + 20 * g(10 + i),
				(g(13 + i) < 0.5 ? -1 : 1) * (5 + 9 * g(16 + i)),
				g(19 + i),
			]),
		});
	}
	return out;
}

function drawGrazer(c: Ctx, z: Grazer, t: number, pal: Pal) {
	const age = t - z.t0;
	if (age < 0 || age > z.life + 1.4) return;
	const q = clamp(age / z.life, 0, 1);
	const ux = -Math.cos(z.a);
	const uy = Math.sin(z.a);
	const nx = -uy;
	const ny = ux;
	const pos = (qq: number) =>
		[z.x + ux * z.len * qq, z.y + uy * z.len * qq] as const;
	// Embers cool from amber to red as they fall behind.
	for (let e = 0; e < 18; e++) {
		const qe = lerp(0.08, 0.96, rand(z.id * 3.3 + e * 1.9));
		const ea = t - (z.t0 + qe * z.life);
		const el = 1.4 + 1.4 * rand(z.id * 3.3 + e * 1.9 + 0.5);
		if (ea < 0 || ea > el) continue;
		const [bx, by] = pos(qe);
		const side = (rand(z.id * 3.3 + e * 1.9 + 0.9) - 0.5) * 20;
		const k = 1 - ea / el;
		const along = 26 * (1 - Math.exp(-ea * 1.1)) * (z.len / z.life / 150);
		dot(
			c,
			bx + ux * along + nx * side * ea * 0.45,
			by + uy * along + ny * side * ea * 0.45 + ea * ea * 2.4,
			1.1,
			k > 0.55 ? pal.warm : pal.ember,
			0.8 * k,
		);
	}
	if (age > z.life + 0.9) return;
	const fade = 1 - Math.max(0, age - z.life) / 0.9;
	const env = smooth(0, 0.12, q) * fade;
	// A terminal flare, then nothing.
	const burst = Math.exp(-(((q - 0.93) / 0.035) ** 2));
	const [hx, hy] = pos(q);
	const tail = Math.min(250, age * (z.len / z.life) + 6);
	if (burst > 0.05) glow(c, hx, hy, 34 * burst + 8, pal.warm, 0.3 * burst);
	streak(c, hx, hy, ux, uy, tail, 2.1 + burst * 1.4, pal.warm, 0.95 * env);
	streak(c, hx, hy, ux, uy, tail * 0.4, 1, pal.warmHot, env);
	dot(c, hx, hy, 3.6 + 2.4 * burst, pal.warmHot, env);
	for (const [lag, off, ph] of z.frags) {
		const fq = q - lag / z.len;
		if (fq < 0.02) continue;
		const sway = off * (1 + 0.28 * Math.sin(t * 0.8 + ph * TAU));
		const [bx, by] = pos(fq);
		const fx = bx + nx * sway;
		const fy = by + ny * sway;
		// Small pieces burn out before the main body does.
		const fa = env * 0.78 * (1 - smooth(0.72 + ph * 0.15, 0.95, q));
		streak(c, fx, fy, ux, uy, 80 + 40 * ph, 1.05, pal.amber, fa);
		dot(c, fx, fy, 1.8 + ph * 1, pal.warmHot, fa);
	}
}

/* ---------------------------------------------------- satellite, pearls -- */

function drawSatellite(c: Ctx, t: number, w: World, pal: Pal) {
	const span = 97;
	const dur = 38;
	const k = Math.floor((t - 8) / span);
	const age = t - 8 - k * span;
	if (k < 0 || age > dur) return;
	const q = age / dur;
	// It comes out from under the column and slides down the left margin on the
	// sky's own heading, well below the planet's knot, and dims into shadow.
	const p: Track = {
		x: w.x0 * 1.6,
		y: w.H * 0.14,
		a: 0.5 + 0.06 * Math.sin(k),
	};
	const [px, py] = onTrack(p, ((w.x0 * 1.6 + 12) * q) / Math.cos(p.a));
	const x = px + Math.sin(q * 5 + k) * 1.5;
	const y = py;
	const a = smooth(0, 0.12, q) * (1 - smooth(0.7, 0.96, q));
	// It swells as it catches the sun, then dims into the Earth's shadow.
	const swell = 0.75 + 0.25 * Math.sin(q * Math.PI * 1.6);
	glow(c, x, y, 17, pal.sat, 0.42 * a * swell);
	dot(c, x, y, 2.6, pal.sat, a * swell);
}

function drawPearls(c: Ctx, t: number, w: World, pal: Pal) {
	const span = 173;
	const dur = 52;
	const k = Math.floor((t - 45) / span);
	const age = t - 45 - k * span;
	if (k < 0 || age > dur) return;
	const q = age / dur;
	// On the sky's heading, a touch shallower than the meteors, from off the
	// right edge down to where it fades out well short of the moon.
	const p: Track = { x: w.W + 260, y: w.H * (0.3 + (k % 2) * 0.05), a: 0.44 };
	const run = (p.x - (w.moon.x + w.moon.r * 2.4)) / Math.cos(p.a);
	const lead = run * q;
	for (let i = 0; i < 7; i++) {
		const s = lead - i * 42;
		const [x, y] = onTrack(p, s);
		const edge =
			smooth(0, 60, s) *
			(1 - smooth(run - 220, run - 40, s)) *
			(1 - smooth(w.W - 40, w.W + 20, x));
		// A slow swell runs down the string, so the row breathes as it moves.
		const pulse = 0.72 + 0.28 * Math.sin(t * 0.9 - i * 0.9);
		glow(c, x, y, 9, pal.sat, 0.3 * edge * pulse);
		dot(c, x, y, 2.6, pal.sat, edge * pulse);
	}
}

/* ------------------------------------------------------------------ scene -- */

export const nocturne: Scene = ({ dither: c }, { W, H, t, dark, anchors }) => {
	const pal = dark ? PALETTE.dark : PALETTE.light;
	const w = worldFor(W, H, anchors.frame);
	const { moon } = w;
	c.save();

	const band = galaxyBand(w, dark);
	const { x: gx, y: gy, w: gw, h: gh } = band.box;
	if (gw > 0)
		c.drawImage(band.canvas, gx, gy, gw, gh, gx * 2, gy * 2, gw * 2, gh * 2);
	drawStars(c, t, w, pal);

	glow(c, moon.x, moon.y, moon.r * 1.55, pal.moonHigh, 0.1);
	c.drawImage(moonBitmap(moon.r, dark), moon.x - moon.r, moon.y - moon.r);
	cirrus(c, t, w, pal);

	const meteors = showerMeteors(t, w, pal);
	for (const m of meteors)
		if (m.train) drawShowerTrain(c, m, Math.round(m.t0 * 100), t, pal);
	const fires = fireballs(t, w);
	for (const f of fires) drawFireTrain(c, f, t, pal);

	drawSatellite(c, t, w, pal);
	drawPearls(c, t, w, pal);
	for (const z of grazers(t, w)) drawGrazer(c, z, t, pal);
	for (const m of meteors) drawMeteor(c, m, t, pal);
	for (const f of fires) drawFireball(c, f, t, pal);

	c.restore();
};
