import type { Scene } from "../engine";

/**
 * A passion vine climbing the right of the page. Geometry lives in "design
 * units" around the hero bloom, so every attachment (leaf, bud, perch) is a
 * point on a stem rather than a coordinate. Everything is a pure function of
 * t: the breeze displaces stems along their normals, and whatever hangs from a
 * stem inherits that displacement. The butterfly follows a per-cycle route
 * (enter, perch, leave) that reads the same displaced plant, so it lands where
 * the flower actually is and the flower answers its weight.
 */

type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const q = clamp((v - a) / (b - a), 0, 1);
	return q * q * (3 - 2 * q);
};
const mix = (a: number, b: number, q: number) => a + (b - a) * q;
function hash(n: number) {
	const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return v - Math.floor(v);
}
const angleMix = (a: number, b: number, q: number) => {
	let d = (b - a) % TAU;
	if (d > Math.PI) d -= TAU;
	if (d < -Math.PI) d += TAU;
	return a + d * q;
};

/** Folded blades are shaded across their width, with veins engraved into the face. */
function blade(
	c: C,
	length: number,
	width: number,
	angle: number,
	petal: boolean,
	dark: boolean,
	curl: number,
) {
	c.save();
	c.rotate(angle);
	const p = new Path2D();
	p.moveTo(0, 0);
	p.bezierCurveTo(
		length * 0.22,
		-width,
		length * 0.96,
		-width * 0.9,
		length,
		curl,
	);
	p.bezierCurveTo(
		length * 1.02,
		width * 0.48,
		length * 0.38,
		width * 1.15,
		0,
		0,
	);
	const g = c.createLinearGradient(0, -width, 0, width);
	for (const [at, color] of (petal
		? [
				[0, "#a799bd"],
				[0.3, dark ? "#eee0ef" : "#e4d9e8"],
				[0.52, "#fcf0dc"],
				[0.62, "#b5a0bf"],
				[1, "#796484"],
			]
		: [
				[0, "#294f52"],
				[0.4, "#6f9c89"],
				[0.53, "#abc1a0"],
				[0.6, "#517e76"],
				[1, "#34595c"],
			]) as [number, string][])
		g.addColorStop(at, color);
	c.fillStyle = g;
	c.fill(p);
	c.save();
	c.clip(p);
	c.strokeStyle = petal ? "#796487" : "#c1cfab";
	c.globalAlpha = 0.3;
	c.lineWidth = 0.65;
	for (let j = 0; j < 13; j++) {
		const v = j / 14;
		c.beginPath();
		c.moveTo(0, 0);
		c.bezierCurveTo(
			length * 0.25,
			(v - 0.5) * width * 0.35,
			length * 0.65,
			(v - 0.5) * width * 1.65,
			length,
			curl,
		);
		c.stroke();
	}
	c.restore();
	c.strokeStyle = petal ? "#f4e8e0" : "#99b29a";
	c.globalAlpha = 0.65;
	c.lineWidth = 1.1;
	c.beginPath();
	c.moveTo(0, 0);
	c.quadraticCurveTo(length * 0.64, -width * 0.05, length, curl);
	c.stroke();
	// Rolled lip turns its pale underside toward the light.
	if (petal) {
		c.strokeStyle = "#ece0ec";
		c.lineWidth = 2.8;
		c.beginPath();
		c.moveTo(length * 0.58, -width * 0.53);
		c.quadraticCurveTo(length * 0.86, -width * 0.5, length, curl);
		c.stroke();
	}
	c.restore();
}

/** Passiflora leaves are palmate: a long middle lobe and two shorter flanks. */
function leaf(c: C, length: number, angle: number, dark: boolean) {
	blade(c, length * 0.66, length * 0.15, angle - 0.82, false, dark, 3);
	blade(c, length * 0.66, length * 0.15, angle + 0.82, false, dark, -3);
	blade(c, length, length * 0.21, angle, false, dark, 9);
}

/** A bud: three sepals clasp a twisted ovoid, its petals just parting. */
function bud(c: C, size: number, dark: boolean, ripe: number) {
	for (const a of [-2.25, -1.57, -0.9])
		blade(c, size * 1.05, size * 0.27, a + 1.57 - 1.57, false, dark, 1);
	const p = new Path2D();
	p.moveTo(0, 0);
	p.bezierCurveTo(
		size * 0.62,
		-size * 0.35,
		size * 0.55,
		-size * 1.5,
		0,
		-size * 2.25,
	);
	p.bezierCurveTo(-size * 0.55, -size * 1.5, -size * 0.62, -size * 0.35, 0, 0);
	const g = c.createLinearGradient(-size * 0.6, 0, size * 0.6, 0);
	g.addColorStop(0, "#3c6760");
	g.addColorStop(0.42, "#9cb797");
	g.addColorStop(0.58, "#c8cfa8");
	g.addColorStop(1, "#4d7b72");
	c.fillStyle = g;
	c.fill(p);
	c.save();
	c.clip(p);
	// Petals fold around each other, so the veins spiral.
	c.strokeStyle = "#e3d6e6";
	c.globalAlpha = 0.28 + 0.3 * ripe;
	c.lineWidth = 0.8;
	for (let j = 0; j < 5; j++) {
		const x = (j - 2) * size * 0.2;
		c.beginPath();
		c.moveTo(x * 0.3, -size * 0.2);
		c.bezierCurveTo(
			x * 1.9,
			-size * 0.8,
			-x * 1.6,
			-size * 1.5,
			x * 0.2,
			-size * 2.25,
		);
		c.stroke();
	}
	c.globalAlpha = 0.55 * ripe;
	const tip = c.createLinearGradient(0, -size * 1.2, 0, -size * 2.25);
	tip.addColorStop(0, "rgb(190 170 205 / 0)");
	tip.addColorStop(1, dark ? "#efe3f0" : "#d6c5df");
	c.fillStyle = tip;
	c.fillRect(-size, -size * 2.3, size * 2, size * 1.2);
	c.restore();
	c.strokeStyle = "#35585a";
	c.globalAlpha = 0.5;
	c.lineWidth = 0.8;
	c.stroke(p);
	c.globalAlpha = 1;
}

/* ---------------------------------------------------------------- blooms */

type BloomSpec = {
	/** Design-size multiplier over the 157 px hero petals. */
	sc: number;
	squash: number;
	rot: number;
	/** 1 is a fully spread bowl; lower raises and shortens the far petals. */
	open: number;
	seed: number;
	/** Far petals first, as a tilted bloom needs. */
	sorted: boolean;
};
const HERO: BloomSpec = {
	sc: 1.12,
	squash: 0.77,
	rot: -0.23,
	open: 1,
	seed: 0,
	sorted: false,
};
const SIDE: BloomSpec = {
	sc: 0.8,
	squash: 0.58,
	rot: 0.5,
	open: 0.66,
	seed: 4.3,
	sorted: true,
};

function rosette(c: C, s: BloomSpec, dark: boolean) {
	c.save();
	c.rotate(s.rot);
	c.scale(1, s.squash);
	const order = Array.from({ length: 10 }, (_, i) => i);
	const ang = (i: number) =>
		(i * TAU) / 10 + 0.13 + Math.sin(i * 2.1 + s.seed) * 0.09;
	if (s.sorted) order.sort((a, b) => Math.sin(ang(a)) - Math.sin(ang(b)));
	for (const i of order) {
		const a = ang(i);
		const petal = i % 2 === 1;
		const far = Math.max(0, -Math.sin(a));
		const reach = 1 - (1 - s.open) * (0.5 * far + 0.12);
		blade(
			c,
			(petal
				? 157 + 10 * Math.sin(i * 3 + s.seed)
				: 151 + 9 * Math.cos(i + s.seed)) * reach,
			(petal ? 51 : 35) * (1 - (1 - s.open) * 0.28),
			a,
			true,
			dark,
			Math.sin(i * 7 + s.seed) * 18 - (1 - s.open) * far * 40,
		);
	}
	// Recessed nectary and fine, individually bowed corona threads.
	const well = c.createRadialGradient(0, 0, 4, 0, 0, 36);
	well.addColorStop(0, "#33394e");
	well.addColorStop(0.65, "#62516d");
	well.addColorStop(1, "#dccbbd");
	c.fillStyle = well;
	c.beginPath();
	c.ellipse(0, 0, 36, 30, 0, 0, TAU);
	c.fill();
	const cup = 0.62 + 0.38 * s.open;
	for (let ring = 0; ring < 2; ring++)
		for (let i = 0; i < 72; i++) {
			const a = (i * TAU) / 72 + ring * 0.037;
			const r =
				((i % 2 ? 91 : 75) - ring * 18 + 6 * Math.sin(i * 2.39 + s.seed)) * cup;
			const bend = 0.07 * Math.sin(i * 1.7 + s.seed);
			const lift = 8 + (1 - s.open) * 16;
			const x = Math.cos(a) * r,
				y = Math.sin(a) * r;
			const g = c.createLinearGradient(
				Math.cos(a) * 25,
				Math.sin(a) * 25,
				x,
				y,
			);
			g.addColorStop(0, "#46365f");
			g.addColorStop(0.32, i % 2 ? "#bfa9da" : "#7955a0");
			g.addColorStop(0.7, i % 2 ? "#fff0df" : "#bba2d6");
			g.addColorStop(1, "#f6e9da");
			c.strokeStyle = g;
			c.lineWidth = ring === 0 ? 1.9 : 1.3;
			c.beginPath();
			c.moveTo(Math.cos(a) * 25, Math.sin(a) * 25);
			c.bezierCurveTo(
				Math.cos(a + bend) * r * 0.55,
				Math.sin(a + bend) * r * 0.55 - lift,
				Math.cos(a - 0.05) * r * 0.9,
				Math.sin(a - 0.05) * r * 0.9 - lift - 1,
				x,
				y,
			);
			c.stroke();
		}
	c.restore();
}

/**
 * Petals, nectary and corona never change, so they are painted once per size
 * and theme and blitted with the breeze's small rotation.
 */
const rosettes = new Map<string, HTMLCanvasElement>();
const EXTENT = 200;
function rosetteFor(
	name: string,
	s: BloomSpec,
	dark: boolean,
	pixel: number,
): HTMLCanvasElement {
	const key = `${name}|${dark ? 1 : 0}|${Math.round(pixel * 40)}`;
	let cv = rosettes.get(key);
	if (cv) return cv;
	if (rosettes.size > 10) rosettes.clear();
	cv = document.createElement("canvas");
	const size = Math.ceil(EXTENT * 2 * s.sc * pixel);
	cv.width = cv.height = size;
	const g = cv.getContext("2d");
	if (g) {
		g.translate(size / 2, size / 2);
		g.scale(pixel * s.sc, pixel * s.sc);
		rosette(g, s, dark);
	}
	rosettes.set(key, cv);
	return cv;
}

/**
 * Leaves, buds and stamens only ever rotate, so each is painted once per size
 * and theme (like the petals) and blitted under the breeze's rotation.
 */
const stamps = new Map<string, HTMLCanvasElement>();
function stampFor(
	key: string,
	w: number,
	h: number,
	ox: number,
	oy: number,
	pixel: number,
	paint: (g: C) => void,
): HTMLCanvasElement {
	const id = `${key}|${Math.round(pixel * 40)}`;
	let cv = stamps.get(id);
	if (cv) return cv;
	if (stamps.size > 60) stamps.clear();
	cv = document.createElement("canvas");
	cv.width = Math.ceil(w * pixel);
	cv.height = Math.ceil(h * pixel);
	const g = cv.getContext("2d");
	if (g) {
		g.scale(cv.width / w, cv.height / h);
		g.translate(ox, oy);
		paint(g);
	}
	stamps.set(id, cv);
	return cv;
}

/** Androgynophore with anthers and styles; leans a little with the breeze. */
function stamens(c: C, lean: number) {
	c.save();
	c.rotate(lean);
	c.lineCap = "round";
	c.strokeStyle = "#b6bf92";
	c.lineWidth = 9;
	c.beginPath();
	c.moveTo(0, 0);
	c.bezierCurveTo(-7, -13, -4, -33, -13, -46);
	c.stroke();
	c.strokeStyle = "#e1dec0";
	c.lineWidth = 3;
	c.stroke();
	for (let i = 0; i < 5; i++) {
		const a = (i * TAU) / 5 - 0.7;
		const x = -13 + Math.cos(a) * 31,
			y = -46 + Math.sin(a) * 16;
		c.strokeStyle = "#b6bc8b";
		c.lineWidth = 3;
		c.beginPath();
		c.moveTo(-13, -43);
		c.quadraticCurveTo(x, -57, x, y);
		c.stroke();
		c.save();
		c.translate(x, y);
		c.rotate(a * 0.6);
		c.fillStyle = "#b89755";
		c.beginPath();
		c.ellipse(0, 0, 12, 4.7, 0, 0, TAU);
		c.fill();
		c.fillStyle = "#eee0a3";
		for (let k = 0; k < 10; k++) {
			c.beginPath();
			c.arc(-9 + k * 2, Math.sin(k * 4) * 2, 1, 0, TAU);
			c.fill();
		}
		c.restore();
	}
	for (let i = 0; i < 3; i++) {
		const x = -28 + i * 17;
		c.strokeStyle = "#cbd0a5";
		c.lineWidth = 3;
		c.beginPath();
		c.moveTo(-13, -47);
		c.quadraticCurveTo(-14, -70, x, -72 + Math.sin(i) * 5);
		c.stroke();
		c.fillStyle = "#c3a2ba";
		c.beginPath();
		c.ellipse(x, -72 + Math.sin(i) * 5, 6, 3, -0.3, 0, TAU);
		c.fill();
	}
	c.restore();
}

/* ------------------------------------------------------------- butterfly */

/** `bank` leans into a turn: the inside wing closes a little, the outside opens. */
function butterfly(c: C, opening: number, dark: boolean, bank = 0) {
	for (const side of [-1, 1]) {
		c.save();
		c.scale(side * opening * (1 + side * bank), 1);
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
			// Dots print lighter on dark paper, so the same dye needs more light.
			g.addColorStop(0, dark ? "#4f8b8f" : "#335d63");
			g.addColorStop(0.45, dark ? "#d38a58" : "#ac724d");
			g.addColorStop(0.8, dark ? "#efc088" : "#d4a36b");
			g.addColorStop(1, dark ? "#7d6c78" : "#493f48");
			c.fillStyle = g;
			c.fill(p);
			c.save();
			c.clip(p);
			c.strokeStyle = "#59474c";
			c.lineWidth = 0.85;
			for (let j = 0; j < 7; j++) {
				c.beginPath();
				c.moveTo(0, 0);
				c.quadraticCurveTo(17, j * 6 - 22, 45, j * 8 - 35);
				c.stroke();
			}
			c.fillStyle = "#e4c693";
			for (let j = 0; j < 8; j++) {
				c.beginPath();
				c.arc(29 + Math.sin(j) * 5, -23 + j * 6, 1.4, 0, TAU);
				c.fill();
			}
			c.restore();
			c.fillStyle = "#304c55";
			c.beginPath();
			c.ellipse(hind ? 19 : 27, hind ? 17 : -17, hind ? 5 : 4, 6, -0.5, 0, TAU);
			c.fill();
			c.strokeStyle = "#ddbd85";
			c.lineWidth = 1.5;
			c.stroke();
		}
		c.restore();
	}
	c.fillStyle = "#c6a783";
	c.beginPath();
	c.ellipse(0, 2, 2.5, 13, 0, 0, TAU);
	c.fill();
	c.strokeStyle = "#d5b994";
	c.lineWidth = 0.9;
	for (const s of [-1, 1]) {
		c.beginPath();
		c.moveTo(s, -9);
		c.quadraticCurveTo(s * 7, -21, s * 9, -19);
		for (let j = 0; j < 3; j++) {
			c.moveTo(s * 2, j * 3);
			c.lineTo(s * 7, j * 4 + 3);
			c.lineTo(s * 10, j * 4 + 1);
		}
		c.stroke();
	}
}

/* ----------------------------------------------------------------- stems */

type Stem = {
	n: number;
	x: Float32Array;
	y: Float32Array;
	nx: Float32Array;
	ny: Float32Array;
	/** Breeze reach at the tip, design units. */
	amp: number;
	phase: number;
	/** Width at the root and at the tip. */
	w0: number;
	w1: number;
	parent?: { stem: Stem; u: number };
};

type Seg = [number, number, number, number, number, number, number, number];
const N = 64;

function buildStem(
	segs: Seg[],
	amp: number,
	phase: number,
	w0: number,
	w1: number,
	parent?: Stem["parent"],
): Stem {
	// Dense sampling, then resampled to even arc length so `u` means distance.
	const dense: [number, number][] = [];
	for (const [x0, y0, x1, y1, x2, y2, x3, y3] of segs)
		for (let i = 0; i < 60; i++) {
			const q = i / 60,
				v = 1 - q;
			dense.push([
				v ** 3 * x0 + 3 * v * v * q * x1 + 3 * v * q * q * x2 + q ** 3 * x3,
				v ** 3 * y0 + 3 * v * v * q * y1 + 3 * v * q * q * y2 + q ** 3 * y3,
			]);
		}
	const last = segs[segs.length - 1];
	dense.push([last[6], last[7]]);
	const cum = [0];
	for (let i = 1; i < dense.length; i++)
		cum.push(
			cum[i - 1] +
				Math.hypot(
					dense[i][0] - dense[i - 1][0],
					dense[i][1] - dense[i - 1][1],
				),
		);
	const x = new Float32Array(N),
		y = new Float32Array(N),
		nx = new Float32Array(N),
		ny = new Float32Array(N);
	let j = 0;
	for (let i = 0; i < N; i++) {
		const d = (i / (N - 1)) * cum[cum.length - 1];
		while (j < cum.length - 2 && cum[j + 1] < d) j++;
		const f = (d - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
		x[i] = mix(dense[j][0], dense[j + 1][0], f);
		y[i] = mix(dense[j][1], dense[j + 1][1], f);
	}
	for (let i = 0; i < N; i++) {
		const a = Math.max(0, i - 1),
			b = Math.min(N - 1, i + 1);
		const tx = x[b] - x[a],
			ty = y[b] - y[a];
		const l = Math.hypot(tx, ty) || 1;
		nx[i] = -ty / l;
		ny[i] = tx / l;
	}
	return { n: N, x, y, nx, ny, amp, phase, w0, w1, parent };
}

const gust = (t: number) =>
	0.78 + 0.22 * Math.sin(t * 0.083 + 1) + 0.1 * Math.sin(t * 0.21);

/** Normal displacement of a stem at distance `u`, plus what its parent moves. */
function bend(s: Stem, u: number, t: number): number {
	const g = gust(t);
	return (
		s.amp *
		u ** 1.4 *
		g *
		(0.65 * Math.sin(t * 0.42 + u * 2.4 + s.phase) +
			0.35 * Math.sin(t * 0.77 + u * 4.1 + s.phase * 2.1))
	);
}

function restAt(s: Stem, u: number): [number, number, number, number] {
	const f = clamp(u, 0, 1) * (s.n - 1);
	const i = Math.min(s.n - 2, Math.floor(f));
	const q = f - i;
	return [
		mix(s.x[i], s.x[i + 1], q),
		mix(s.y[i], s.y[i + 1], q),
		mix(s.nx[i], s.nx[i + 1], q),
		mix(s.ny[i], s.ny[i + 1], q),
	];
}

function stemAt(s: Stem, u: number, t: number): [number, number] {
	const [rx, ry, nx, ny] = restAt(s, u);
	const d = bend(s, u, t);
	let x = rx + nx * d;
	let y = ry + ny * d;
	if (s.parent) {
		// A shoot rides wherever its node on the parent has been carried.
		const [px, py] = stemAt(s.parent.stem, s.parent.u, t);
		const [qx, qy] = restAt(s.parent.stem, s.parent.u);
		x += px - qx;
		y += py - qy;
	}
	return [x, y];
}

function nearest(s: Stem, x: number, y: number) {
	let best = 0,
		bd = Number.POSITIVE_INFINITY;
	for (let i = 0; i < s.n; i++) {
		const d = (s.x[i] - x) ** 2 + (s.y[i] - y) ** 2;
		if (d < bd) {
			bd = d;
			best = i;
		}
	}
	return best / (s.n - 1);
}

function strokeStem(c: C, s: Stem, t: number, dark: boolean) {
	const pts: [number, number][] = [];
	for (let i = 0; i < s.n; i++) pts.push(stemAt(s, i / (s.n - 1), t));
	c.lineCap = "round";
	c.lineJoin = "round";
	// The taper changes by a fraction of a pixel per step, so runs of three
	// segments share one width and one stroke.
	const RUN = 3;
	for (const [pass, col] of [
		[0, dark ? "#779f90" : "#476f65"],
		[1, dark ? "#a9ccb8" : "#86ad95"],
	] as const) {
		c.strokeStyle = col;
		c.globalAlpha = pass ? 0.55 : 1;
		for (let i = 0; i < s.n - 1; i += RUN) {
			const end = Math.min(s.n - 1, i + RUN);
			const u = (i + end) / 2 / (s.n - 1);
			const w = mix(s.w0, s.w1, u ** 0.8);
			c.lineWidth = pass ? Math.max(0, w * 0.34) : w;
			if (c.lineWidth <= 0.01) continue;
			c.beginPath();
			c.moveTo(pts[i][0] - pass * 0.6, pts[i][1] - pass * 0.6);
			for (let j = i + 1; j <= end; j++)
				c.lineTo(pts[j][0] - pass * 0.6, pts[j][1] - pass * 0.6);
			c.stroke();
		}
	}
	c.globalAlpha = 1;
}

/**
 * A tendril's tangent turns faster toward its tip, which is what coils it.
 * The coil tightens and loosens a little with the breeze.
 */
function tendril(
	c: C,
	from: [number, number],
	heading: number,
	length: number,
	coil: number,
	t: number,
	phase: number,
	dark: boolean,
) {
	const steps = 44;
	const live = 1 + 0.1 * Math.sin(t * 0.5 + phase) * gust(t);
	let x = from[0],
		y = from[1];
	c.strokeStyle = dark ? "#779f90" : "#476f65";
	c.lineCap = "round";
	for (let i = 0; i < steps; i++) {
		const v = i / steps;
		const a =
			heading + 0.1 * Math.sin(t * 0.6 + phase) * v + coil * live * v * v;
		const ds = length / steps;
		const nx = x + Math.cos(a) * ds,
			ny = y + Math.sin(a) * ds;
		c.lineWidth = 2.6 * (1 - v) + 0.9;
		c.beginPath();
		c.moveTo(x, y);
		c.lineTo(nx, ny);
		c.stroke();
		x = nx;
		y = ny;
	}
}

/* ----------------------------------------------------------------- plant */

const MAIN = buildStem(
	[
		[-60, 440, -120, 330, -70, 200, -30, 115],
		[-30, 115, 0, 15, -20, -90, 0, -170],
		[0, -170, 25, -250, 90, -290, 95, -360],
	],
	11,
	0.4,
	6.4,
	2.2,
);
const ROOT_U = nearest(MAIN, -42, 140);
const ROOT = restAt(MAIN, ROOT_U);
const LAT = buildStem(
	[
		[ROOT[0], ROOT[1], -150, 190, -300, 215, -420, 205],
		[-420, 205, -510, 196, -590, 222, -710, 222],
		[-710, 222, -820, 222, -900, 190, -990, 130],
	],
	18,
	2,
	5.8,
	2.2,
	{ stem: MAIN, u: ROOT_U },
);

type Leaf = {
	stem: Stem;
	u: number;
	/** Petiole vector from the node to the blade's base. */
	pet: [number, number];
	ang: number;
	length: number;
	phase: number;
};
const LEAVES: Leaf[] = [
	{ stem: MAIN, u: 0.3, pet: [30, 6], ang: -0.05, length: 118, phase: 0.3 },
	{ stem: MAIN, u: 0.8, pet: [26, -10], ang: -0.55, length: 100, phase: 1.9 },
	{ stem: MAIN, u: 0.9, pet: [-18, -12], ang: -2.45, length: 72, phase: 3.1 },
	{ stem: LAT, u: 0.25, pet: [-26, -24], ang: -2.25, length: 106, phase: 4.4 },
	{ stem: LAT, u: 0.8, pet: [-22, -20], ang: -2.7, length: 92, phase: 5.2 },
	{ stem: LAT, u: 0.93, pet: [-8, -22], ang: -1.25, length: 58, phase: 0.8 },
];

type Bud = {
	stem: Stem;
	u: number;
	pet: [number, number];
	dir: number;
	size: number;
	ripe: number;
	phase: number;
};
const BUDS: Bud[] = [
	{
		stem: MAIN,
		u: 0.68,
		pet: [40, -26],
		dir: -0.8,
		size: 22,
		ripe: 0.8,
		phase: 1.2,
	},
	{
		stem: LAT,
		u: 0.43,
		pet: [-16, -34],
		dir: -2.2,
		size: 13,
		ripe: 0.2,
		phase: 2.6,
	},
];

type Tendril = {
	stem: Stem;
	u: number;
	heading: number;
	length: number;
	coil: number;
	phase: number;
};
const TENDRILS: Tendril[] = [
	{ stem: MAIN, u: 1, heading: -1.32, length: 84, coil: 6.2, phase: 0.5 },
	{ stem: LAT, u: 1, heading: 3.55, length: 96, coil: -6.4, phase: 2.2 },
];

const HERO_U = nearest(MAIN, -10, 0);
const SIDE_BASE: [number, number] = [-618, 158];
const SIDE_U = nearest(LAT, -585, 218);

type Pose = { x: number; y: number; rot: number };
type Role = "hero" | "side" | "leaf" | "petal";
type Off = "L" | "TR" | "T" | "R";
type Spot = Role | Off;

/* ------------------------------------------------------------ butterfly */

const CYCLE = 96;
const isOff = (s: Spot): s is Off =>
	s === "L" || s === "TR" || s === "T" || s === "R";

/**
 * The engine eases every dot's tone at a bounded rate (about a third of a
 * second from dark to light), so anything the eye should read as a shape has
 * to stay put or travel gently for about that long. Flights are therefore long,
 * wing beats are slow and deliberate, and every leg's duration is derived from
 * its length, so no route can outrun the lattice.
 */
type Step = { at: Spot; dwell?: number; touch?: boolean };
const STORIES: Step[][] = [
	// In along the low band, the side bloom, the hero, a leaf, out over the top.
	[
		{ at: "L" },
		{ at: "side", dwell: 6 },
		{ at: "hero", dwell: 10 },
		{ at: "leaf", dwell: 6 },
		{ at: "TR" },
	],
	// Down from the top onto the leaf, the hero, the side bloom, and away left.
	[
		{ at: "TR" },
		{ at: "leaf", dwell: 6 },
		{ at: "hero", dwell: 8 },
		{ at: "side", dwell: 8 },
		{ at: "L" },
	],
	// From the right: the hero, the side bloom, a brush of the hero, a leaf.
	[
		{ at: "R" },
		{ at: "hero", dwell: 7 },
		{ at: "side", dwell: 8 },
		{ at: "hero", dwell: 2.5, touch: true },
		{ at: "leaf", dwell: 6 },
		{ at: "T" },
	],
];
/**
 * Where the side bloom is covered, the visitor keeps to the open gutter beside
 * the cards: the hero, one of its outer petals and the leaf above it, with more hops.
 */
const GUTTER_STORIES: Step[][] = [
	[
		{ at: "R" },
		{ at: "petal", dwell: 5 },
		{ at: "hero", dwell: 8 },
		{ at: "leaf", dwell: 5 },
		{ at: "hero", dwell: 2.5, touch: true },
		{ at: "petal", dwell: 5 },
		{ at: "TR" },
	],
	[
		{ at: "TR" },
		{ at: "leaf", dwell: 6 },
		{ at: "hero", dwell: 9 },
		{ at: "petal", dwell: 5 },
		{ at: "hero", dwell: 2.5, touch: true },
		{ at: "leaf", dwell: 5 },
		{ at: "T" },
	],
	[
		{ at: "R" },
		{ at: "hero", dwell: 7 },
		{ at: "leaf", dwell: 5 },
		{ at: "petal", dwell: 5 },
		{ at: "hero", dwell: 2.5, touch: true },
		{ at: "leaf", dwell: 5 },
		{ at: "T" },
	],
];
const ROUTE_ORDERS = [
	[1, 0, 2],
	[0, 2, 1],
	[1, 0, 2],
	[1, 2, 0],
	[2, 0, 1],
	[2, 1, 0],
];

type Node = {
	id: Spot;
	a: number;
	d: number;
	touch?: boolean;
	phase: number;
	/** Off-screen spots carry their own point, in design units. */
	x?: number;
	y?: number;
};
/** One flight: a quadratic arc with a lazily resolved start, end and bend. */
type Leg = {
	t0: number;
	t1: number;
	from: Node;
	to: Node;
	pref: number;
	ph: number;
	spin: number;
	ready: boolean;
	ax: number;
	ay: number;
	bx: number;
	by: number;
	cx: number;
	cy: number;
};
type Plan = { nodes: Node[]; legs: Leg[] };
type Lay = {
	k: number;
	hx: number;
	hy: number;
	W: number;
	H: number;
	/** Glass: field-space rect where dots are erased by cards and text. */
	gx0: number;
	gx1: number;
	gy1: number;
	/** Whether the side bloom sits in the open band below the cards. */
	roomy: boolean;
	/** Left-most design x at which the hero visitor is clear of the cards. */
	heroX: number;
};
const plans = new Map<string, Plan>();
const LEAF_ROLE: (Role | null)[] = [null, "leaf", null, null, null, null];
const LEAF_OF = { leaf: 1 };

/** The pulse of a resting butterfly: closed, a slow open, a hold, and shut. */
const restPeriod = (phase: number) => 5.4 + 1.8 * ((phase * 7.3) % 1);
function restWings(t: number, nd: Node) {
	if (nd.touch) return 0.72 + 0.2 * Math.sin(t * 3.2 + nd.phase * 6);
	// On a leaf it basks: wings mostly spread, easing shut now and then.
	if (nd.id === "leaf")
		return (
			0.62 +
			0.3 * Math.sin(t * 0.55 + nd.phase * 6) ** 2 +
			0.06 * Math.sin(t * 1.7)
		);
	const x = ((((t - nd.a) / restPeriod(nd.phase) + nd.phase) % 1) + 1) % 1;
	const wide = smooth(0.02, 0.15, x) * (1 - smooth(0.4, 0.54, x));
	const twitch = smooth(0.64, 0.68, x) * (1 - smooth(0.7, 0.75, x));
	return 0.3 + 0.55 * wide + 0.2 * twitch;
}

/** Eased progress along a leg: gentle takeoff and landing, steady between. */
const legEase = (u: number) => mix(u, u * u * (3 - 2 * u), 0.8);

export const moonflower: Scene = (
	{ dither: c },
	{ W, H, t, dark, anchors },
) => {
	const k = clamp(Math.min(W / 1440, (H / 836) * 1.04), 0.8, 1.3);
	const frame = anchors.frame;
	const right = frame ? frame.x + frame.w : W * 0.833;
	const hx = Math.min(W - 185 * k, right + 105 * k);
	const hy = H * 0.59;
	const toDesign = (sx: number, sy: number): [number, number] => [
		(sx * W - hx) / k,
		(sy * H - hy) / k,
	];

	/* --- where the cards erase the field, and what is left for a visitor --- */
	const body = anchors.shelf ?? anchors.content;
	const lay: Lay = {
		k,
		hx,
		hy,
		W,
		H,
		gx0: frame ? frame.x - 30 : 1e9,
		gx1: frame ? right + 30 : -1e9,
		gy1: body ? body.y + body.h + 30 : -1e9,
		roomy: true,
		heroX: frame ? (right + 32 - hx) / k : -1e3,
	};
	// The side bloom is only a place to land when it clears the cards and the
	// field's faded floor; on short screens it hides behind glass.
	const sideY = hy + 112 * k;
	lay.roomy = !body || (sideY > lay.gy1 + 10 && sideY < H - 70);

	let plan: Plan | null = null;

	/* --- what the butterfly's weight does to what it sits on --- */
	const press = (id: Role, at: number) => {
		let v = 0;
		if (!plan) return v;
		for (const nd of plan.nodes) {
			if ((nd.id === "petal" ? "hero" : nd.id) !== id) continue;
			const mass = nd.touch ? 0.5 : 1;
			const w =
				smooth(nd.a - 0.3, nd.a + 0.5, at) *
				(1 - smooth(nd.d - 0.1, nd.d + 0.7, at));
			let kick = 0;
			if (at > nd.a)
				kick +=
					0.6 * Math.exp(-1.5 * (at - nd.a)) * Math.sin(5.4 * (at - nd.a));
			if (at > nd.d)
				kick -=
					0.5 * Math.exp(-1.7 * (at - nd.d)) * Math.sin(6.2 * (at - nd.d));
			v += mass * (w + kick);
		}
		return v;
	};
	const delta = (s: Stem, u: number, at: number) => {
		const [x, y] = stemAt(s, u, at);
		const [rx, ry] = restAt(s, u);
		return [x - rx, y - ry];
	};
	const bloomPose = (id: "hero" | "side", at: number): Pose => {
		const g = gust(at);
		if (id === "hero") {
			const [dx, dy] = delta(MAIN, HERO_U, at);
			return {
				x: dx,
				y: dy,
				rot: 0.022 * g * Math.sin(at * 0.5 + 1) + 0.03 * press("hero", at),
			};
		}
		const [dx, dy] = delta(LAT, SIDE_U, at);
		return {
			x: SIDE_BASE[0] + dx,
			y: SIDE_BASE[1] + dy,
			rot: 0.03 * g * Math.sin(at * 0.62 + 2.4) - 0.045 * press("side", at),
		};
	};
	const leafPose = (i: number, at: number) => {
		const lf = LEAVES[i];
		const [sx, sy] = stemAt(lf.stem, lf.u, at);
		const role = LEAF_ROLE[i];
		const a =
			lf.ang +
			0.07 * gust(at) * Math.sin(at * 0.8 + lf.phase) +
			(role ? 0.06 * press(role, at) : 0);
		return { bx: sx + lf.pet[0], by: sy + lf.pet[1], a, sx, sy };
	};

	/** Where the butterfly's feet are on a perch, and which way it faces. */
	const perch = (nd: Pick<Node, "id" | "phase" | "x" | "y">, at: number) => {
		const id = nd.id;
		if (isOff(id)) return { x: nd.x ?? 0, y: nd.y ?? 0, th: 0 };
		if (id === "leaf") {
			const i = LEAF_OF.leaf;
			const p = leafPose(i, at);
			const L = LEAVES[i].length * 0.5;
			return {
				x: p.bx + Math.cos(p.a) * L,
				y: p.by + Math.sin(p.a) * L,
				th: p.a + Math.PI / 2 + 0.1 * Math.sin(at * 0.3 + nd.phase * 5),
			};
		}
		const bloom = id === "side" ? "side" : "hero";
		const spec = bloom === "hero" ? HERO : SIDE;
		const flip = bloom === "hero" ? 1 : -1;
		const p = bloomPose(bloom, at);
		// Probing the anthers: a slow wander in the flower's own frame. A petal
		// visit settles on the open side of the bloom instead.
		const wx = 5 * Math.sin(at * 0.31 + nd.phase * 6);
		const wy = 3 * Math.cos(at * 0.23 + nd.phase * 4);
		let lx = (id === "petal" ? 78 + wx : -18 + wx) * spec.sc * flip;
		const ly = (id === "petal" ? 4 + wy : -58 + wy) * spec.sc;
		// Where cards cover the anthers, it works the petals just past them.
		if (bloom === "hero") lx = Math.max(lx, Math.min(lay.heroX, 96));
		const cs = Math.cos(p.rot),
			sn = Math.sin(p.rot);
		return {
			x: p.x + lx * cs - ly * sn,
			y: p.y + lx * sn + ly * cs,
			th:
				(id === "hero" ? -0.5 : id === "petal" ? 0.4 : 0.62) +
				p.rot +
				0.12 * Math.sin(at * 0.27 + nd.phase * 3),
		};
	};

	/* --- one 96 s cycle: a story, its timing derived from route lengths --- */
	const offPoint = (o: Off, jx: number, jy: number): [number, number] =>
		o === "L"
			? toDesign(-0.07 + jx, 0.84 + jy)
			: o === "TR"
				? toDesign(0.97 + jx, -0.1)
				: o === "T"
					? [55 + jx * 600, (-0.1 * H - hy) / k]
					: toDesign(1.08, 0.26 + jy * 2);

	const makePlan = (n: number): Plan => {
		const block = Math.floor(n / 3);
		const order =
			ROUTE_ORDERS[block === 0 ? 0 : Math.floor(hash(block * 5.3) * 6)];
		const kind = order[((n % 3) + 3) % 3];
		const rnd = (i: number) => (n === 0 ? 0.5 : hash(n * 11 + i * 3.7 + 2));
		const steps = (lay.roomy ? STORIES : GUTTER_STORIES)[kind];
		const spots = steps.map((s, i): Node => {
			const nd: Node = {
				id: s.at,
				a: 0,
				d: 0,
				touch: s.touch,
				phase: hash(n + i * 4),
			};
			if (isOff(s.at)) {
				const [x, y] = offPoint(
					s.at,
					(rnd(i + 30) - 0.5) * 0.06,
					(rnd(i + 60) - 0.5) * 0.1,
				);
				nd.x = x;
				nd.y = y;
			}
			return nd;
		});
		// Rest-pose lengths, with no weight on the flowers: only used for timing.
		const pts = spots.map((nd) => perch(nd, n * CYCLE + 20));
		const flights = pts
			.slice(1)
			.map((p, i) =>
				Math.max(
					5.5,
					2.2 + (1.12 * Math.hypot(p.x - pts[i].x, p.y - pts[i].y)) / 50,
				),
			);
		const heroAt = steps.findIndex((s) => s.at === "hero" && !s.touch);
		const base = steps.map((s, i) => {
			if (isOff(s.at)) return 0;
			const v = (s.dwell ?? 6) * (0.85 + 0.3 * rnd(i));
			// The still frame (t = 30) catches the hero visitor, wings open.
			return n === 0 && i === heroAt ? Math.max(v, 9) : v;
		});
		const sumF = flights.reduce((a, b) => a + b, 0);
		const sumD = base.reduce((a, b) => a + b, 0);
		const target = CYCLE - 11;
		let dScale = 1;
		let fScale = 1;
		if (sumF + sumD > target) {
			dScale = Math.max(0.55, (target - sumF) / sumD);
			fScale = Math.min(1, (target - sumD * dScale) / sumF);
		} else dScale = clamp((target - sumF) / sumD, 1, 1.5);
		const dwell = base.map((v) => v * dScale);
		let cursor = 0;
		const times = steps.map((_, i) => {
			const a = cursor;
			const d = a + dwell[i];
			cursor = d + (flights[i] ?? 0) * fScale;
			return [a, d] as const;
		});
		const gap = CYCLE - cursor;
		let s0 = Math.max(0, gap) * (0.3 + 0.4 * rnd(99));
		if (n === 0) s0 = 25 - times[Math.max(0, heroAt)][0];
		const nodes = spots.map(
			(nd, i): Node => ({
				...nd,
				a: n * CYCLE + s0 + times[i][0],
				d: n * CYCLE + s0 + times[i][1],
			}),
		);
		if (n === 0) {
			const hero = nodes[Math.max(0, heroAt)];
			let best = 0;
			let err = 9;
			for (let q = 0; q < 1; q += 0.002) {
				const x = ((30 - hero.a) / restPeriod(q) + q) % 1;
				if (Math.abs(x - 0.27) < err) {
					err = Math.abs(x - 0.27);
					best = q;
				}
			}
			hero.phase = best;
		}
		const legs: Leg[] = nodes.slice(1).map((to, i) => ({
			t0: nodes[i].d,
			t1: to.a,
			from: nodes[i],
			to,
			pref: hash(n * 5 + i * 1.3) < 0.5 ? -1 : 1,
			ph: hash(n + i * 9) * TAU,
			spin: hash(n * 2 + i) < 0.5 ? -1 : 1,
			ready: false,
			ax: 0,
			ay: 0,
			bx: 0,
			by: 0,
			cx: 0,
			cy: 0,
		}));
		return { nodes, legs };
	};
	const key = `${W}|${H}|${hx | 0}|${hy | 0}|${(k * 100) | 0}|${lay.gx0 | 0}|${lay.gx1 | 0}|${lay.gy1 | 0}`;
	const cycleN = Math.floor(t / CYCLE);
	const cached = plans.get(`${key}|${cycleN}`);
	if (cached) plan = cached;
	else {
		// Keep one layout's plans; a resize or navigation re-derives them.
		for (const name of plans.keys())
			if (!name.startsWith(`${key}|`)) plans.delete(name);
		if (plans.size > 8) plans.clear();
		plan = makePlan(cycleN);
		plans.set(`${key}|${cycleN}`, plan);
	}
	const cyc: Plan = plan;

	/** Hidden behind cards, or in the field's faded floor. Off-screen is free. */
	const hidden = (x: number, y: number) => {
		const fx = hx + x * k,
			fy = hy + y * k;
		if (fx < -30 || fx > W + 30 || fy < -30 || fy > H + 30) return false;
		return fy > H - 62 || (fx > lay.gx0 && fx < lay.gx1 && fy < lay.gy1);
	};
	const resolve = (leg: Leg) => {
		if (leg.ready) return;
		const A = perch(leg.from, leg.t0),
			B = perch(leg.to, leg.t1);
		const dx = B.x - A.x,
			dy = B.y - A.y;
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len,
			py = dx / len;
		const mx = (A.x + B.x) / 2,
			my = (A.y + B.y) / 2;
		// The gentlest bow that keeps the whole arc out of the glass.
		let bestBad = 99;
		let cx = mx + px * leg.pref * len * 0.2,
			cy = my + py * leg.pref * len * 0.2;
		search: for (const f of [0.1, 0.2, 0.32, 0.46, 0.64, 0.85])
			for (const s of [leg.pref, -leg.pref]) {
				const qx = mx + px * s * f * len * 2,
					qy = my + py * s * f * len * 2;
				let bad = 0;
				for (let j = 1; j < 12; j++) {
					const u = j / 12,
						r = 1 - u;
					if (
						hidden(
							r * r * A.x + 2 * r * u * qx + u * u * B.x,
							r * r * A.y + 2 * r * u * qy + u * u * B.y,
						)
					)
						bad++;
				}
				if (bad < bestBad) {
					bestBad = bad;
					cx = qx;
					cy = qy;
					if (!bad) break search;
				}
			}
		leg.ax = A.x;
		leg.ay = A.y;
		leg.bx = B.x;
		leg.by = B.y;
		leg.cx = cx;
		leg.cy = cy;
		leg.ready = true;
	};

	const flyLeg = (leg: Leg, i: number, at: number) => {
		resolve(leg);
		const D = leg.t1 - leg.t0;
		const u = clamp((at - leg.t0) / D, 0, 1);
		const e = legEase(u);
		const r = 1 - e;
		const bx = r * r * leg.ax + 2 * r * e * leg.cx + e * e * leg.bx;
		const by = r * r * leg.ay + 2 * r * e * leg.cy + e * e * leg.by;
		const tx = 2 * r * (leg.cx - leg.ax) + 2 * e * (leg.bx - leg.cx);
		const ty = 2 * r * (leg.cy - leg.ay) + 2 * e * (leg.by - leg.cy);
		const tl = Math.hypot(tx, ty) || 1;
		// A butterfly never flies straight: a slow lateral meander about the arc.
		const wob = 16 * Math.sin(Math.PI * u) * Math.sin(at * 1.5 + leg.ph);
		let x = bx + (-ty / tl) * wob;
		let y = by + (tx / tl) * wob;
		if (!isOff(leg.from.id))
			y -= 14 * Math.sin(Math.PI * clamp((at - leg.t0) / 2.2, 0, 1));
		if (!isOff(leg.to.id)) {
			// Reconnoitring the flower: one loose loop that tightens onto it.
			const s = clamp((u - 0.62) / 0.38, 0, 1);
			const g = Math.sin(Math.PI * s) * (1 - s) ** 0.6;
			const f = leg.spin * TAU * s + leg.ph;
			// The hero sits at the cards' edge, so its loop swings out to the open side.
			x +=
				(leg.to.id === "hero" || leg.to.id === "petal"
					? 0.5 + 0.5 * Math.cos(f)
					: Math.cos(f)) *
				30 *
				g;
			y += Math.sin(f) * 22 * g;
		}
		return { x, y, th: 0, state: "leg" as const, i };
	};

	const where = (at: number) => {
		const nodes = cyc.nodes;
		const rest = (i: number, tt: number) => ({
			...perch(nodes[i], tt),
			state: "rest" as const,
			i,
		});
		if (at <= nodes[0].a) return rest(0, nodes[0].a);
		for (let i = 0; i < nodes.length; i++) {
			if (at <= nodes[i].d) return rest(i, at);
			const leg = cyc.legs[i];
			if (leg && at < leg.t1) return flyLeg(leg, i, at);
		}
		return rest(nodes.length - 1, nodes[nodes.length - 1].d);
	};
	c.save();
	c.translate(hx, hy);
	c.scale(k, k);
	const pixel = c.getTransform().a || 0.5;

	/* --- stems and tendrils --- */
	strokeStem(c, MAIN, t, dark);
	strokeStem(c, LAT, t, dark);
	for (const td of TENDRILS) {
		const p = stemAt(td.stem, td.u, t);
		tendril(c, p, td.heading, td.length, td.coil, t, td.phase, dark);
	}

	/* --- pedicels, leaves, buds --- */
	c.lineCap = "round";
	c.strokeStyle = dark ? "#779f90" : "#476f65";
	c.lineWidth = 3;
	const tie = (
		sx: number,
		sy: number,
		ex: number,
		ey: number,
		bowX: number,
		bowY: number,
	) => {
		c.beginPath();
		c.moveTo(sx, sy);
		c.quadraticCurveTo((sx + ex) / 2 + bowX, (sy + ey) / 2 + bowY, ex, ey);
		c.stroke();
	};
	LEAVES.forEach((lf, i) => {
		const p = leafPose(i, t);
		tie(p.sx, p.sy, p.bx, p.by, 4, 8);
		const L = lf.length;
		const cv = stampFor(
			`leaf${i}|${dark ? 1 : 0}`,
			L * 1.4,
			L * 1.5,
			L * 0.2,
			L * 0.75,
			pixel,
			(g) => leaf(g, L, 0, dark),
		);
		c.save();
		c.translate(p.bx, p.by);
		c.rotate(p.a);
		c.drawImage(cv, -L * 0.2, -L * 0.75, L * 1.4, L * 1.5);
		c.restore();
	});
	for (const b of BUDS) {
		const [sx, sy] = stemAt(b.stem, b.u, t);
		const sway = 0.05 * gust(t) * Math.sin(t * 0.7 + b.phase);
		const bx = sx + b.pet[0],
			by = sy + b.pet[1];
		tie(sx, sy, bx, by, 3, 6);
		const z = b.size;
		const cv = stampFor(
			`bud${b.size}|${dark ? 1 : 0}`,
			z * 2.8,
			z * 3.1,
			z * 1.4,
			z * 2.6,
			pixel,
			(g) => bud(g, z, dark, b.ripe),
		);
		c.save();
		c.translate(bx, by);
		c.rotate(b.dir + Math.PI / 2 + sway);
		c.drawImage(cv, -z * 1.4, -z * 2.6, z * 2.8, z * 3.1);
		c.restore();
	}

	/* --- blooms --- */
	const drawBloom = (id: "hero" | "side") => {
		const spec = id === "hero" ? HERO : SIDE;
		const flip = id === "hero" ? 1 : -1;
		const p = bloomPose(id, t);
		if (id === "side") {
			const [nx, ny] = stemAt(LAT, SIDE_U, t);
			c.strokeStyle = dark ? "#779f90" : "#476f65";
			c.lineWidth = 3.4;
			tie(nx, ny, p.x, p.y, -10, 6);
		}
		c.save();
		c.translate(p.x, p.y);
		c.rotate(p.rot);
		c.save();
		c.scale(flip, 1);
		const cv = rosetteFor(id, spec, dark, pixel);
		const e = EXTENT * spec.sc;
		c.drawImage(cv, -e, -e, e * 2, e * 2);
		c.restore();
		c.scale(flip * spec.sc, spec.sc);
		const st = stampFor(
			`stamens|${dark ? 1 : 0}`,
			110,
			125,
			70,
			95,
			pixel * spec.sc,
			(g) => stamens(g, 0),
		);
		c.rotate(0.018 * gust(t) * Math.sin(t * 0.9 + (id === "hero" ? 0 : 2)));
		c.drawImage(st, -70, -95, 110, 125);
		c.restore();
	};
	drawBloom("side");
	drawBloom("hero");

	/* --- the visitor --- */
	const now = where(t);
	// Heading and turning come from the path a little either side of now, which
	// is as smooth as the lattice can show.
	const aheadP = where(t + 0.3),
		behindP = where(t - 0.3);
	const vx = (aheadP.x - behindP.x) / 0.6,
		vy = (aheadP.y - behindP.y) / 0.6;
	const speed = Math.hypot(vx, vy);
	const flightTh = Math.atan2(vy, vx) + Math.PI / 2;
	const heading = (tt: number) => {
		const p = where(tt + 0.3),
			q = where(tt - 0.3);
		return Math.atan2(p.y - q.y, p.x - q.x);
	};
	let turn = 0;
	if (speed > 8) {
		let d = heading(t + 0.7) - heading(t - 0.7);
		if (d > Math.PI) d -= TAU;
		if (d < -Math.PI) d += TAU;
		turn = d / 1.4;
	}
	// Which perch is nearest in time decides both pose and wing behaviour.
	let th = flightTh;
	let fly = 1;
	let settle = 0;
	let restNode: Node | undefined;
	if (now.state === "rest") {
		const nd = cyc.nodes[now.i];
		restNode = nd;
		if (!isOff(nd.id)) {
			fly = 0;
			th = now.th;
		}
	} else {
		const from = cyc.nodes[now.i],
			to = cyc.nodes[now.i + 1];
		const dFrom = isOff(from.id) ? 99 : t - from.d;
		const dTo = isOff(to.id) ? 99 : to.a - t;
		const q = Math.min(dFrom, dTo);
		fly = smooth(0, 2, q);
		settle = 1 - smooth(0.5, 3.5, dTo);
		if (q < 99) {
			const nd = dFrom < dTo ? from : to;
			const pe = perch(nd, t);
			th = angleMix(pe.th, flightTh, smooth(10, 55, speed));
		}
		restNode = dFrom < dTo ? from : to;
	}
	const onScreen = now.state === "leg" || (restNode && !isOff(restNode.id));
	if (onScreen) {
		const seed = restNode?.phase ?? 0;
		const rest = restNode ? restWings(t, restNode) : 0.4;
		// A slow, deliberate beat: each stroke outlasts the lattice's easing. The
		// downstroke is brisker than the recovery, and a glide holds the wings up.
		const ph = t * 4.2 + seed * 6;
		const flap = 0.67 + 0.27 * Math.sin(ph + 0.45 * Math.sin(ph));
		const glide =
			smooth(0.3, 0.7, 0.5 + 0.5 * Math.sin((t * TAU) / 6.2 + seed * 6)) *
			(1 - settle);
		const cruise = mix(flap, 0.86 + 0.04 * Math.sin(t * 1.3), glide * 0.9);
		const opening = mix(rest, cruise, fly);
		const bank = clamp(turn * 0.3, -0.3, 0.3) * fly * smooth(10, 40, speed);
		c.save();
		c.translate(now.x, now.y + 4 * fly * Math.sin(ph) * (1 - glide));
		c.rotate(th + 0.06 * fly * Math.sin(ph + 1));
		const s = 1.02 + 0.16 * fly;
		c.scale(s, s);
		butterfly(c, opening, dark, bank);
		c.restore();
	}
	c.restore();
};
