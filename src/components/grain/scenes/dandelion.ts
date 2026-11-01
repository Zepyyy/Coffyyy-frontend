import type { Scene } from "../engine";
import { type Lanes, lanesFor } from "./margins";

/**
 * A dandelion clock on its stem at the page edge, and the seeds it lets go.
 *
 * Anatomy: a sphere of ~80 achenes, each a dusty-umber body on a thin beak
 * topped by a pappus, a flat umbrella of fine filaments. Where achenes have
 * gone, the bare knobbly receptacle shows. The stem is a hollow tube, the head
 * sits in a collar of reflexed bracts.
 *
 * Nothing is state. One long loop: three soft gusts each release a handful of
 * seeds one by one, the head is half bare, then the achenes grow back slowly.
 * A released seed's whole flight is analytic in the time since its release, so
 * it starts exactly where it sat in the head. Seeds hang below a parachute that
 * tilts with the drift and shows at every angle, from face-on ellipse to edge.
 */

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const mod = (x: number, n: number) => ((x % n) + n) % n;
const ease = (x: number) => x * x * (3 - 2 * x);
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const tint = (c: Rgb, a: number) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;

function rnd(n: number) {
	let h = Math.imul(n | 0, 2654435761);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const PALETTE = {
	light: {
		straw: [172, 152, 118],
		umber: [132, 92, 68],
		sage: [128, 146, 112],
		ink: [60, 52, 46],
	},
	dark: {
		straw: [238, 226, 200],
		umber: [208, 160, 124],
		sage: [172, 190, 156],
		ink: [226, 214, 196],
	},
} satisfies Record<string, Record<string, Rgb>>;
type Pal = (typeof PALETTE)["light"];

/* ------------------------------------------------------------------ data */

const NF = 12;
const LOOP = 160;
const GUSTS = [14, 54, 94];
const PER_GUST = 10;
const SPAN = 11;
const GROW_FOR = 12;

// Achenes on a Fibonacci sphere (y points down), minus the pole where the stem
// enters. Head frame: d radial, e1 and e2 tangent.
const raw: number[][] = [];
{
	const M = 96;
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let k = 0; k < M; k++) {
		const y = 1 - ((k + 0.5) / M) * 2;
		if (y > 0.76) continue;
		const r = Math.sqrt(1 - y * y);
		const a = k * golden;
		let x = Math.cos(a) * r + (rnd(k * 3 + 1) - 0.5) * 0.11;
		let yy = y + (rnd(k * 3 + 2) - 0.5) * 0.11;
		let z = Math.sin(a) * r + (rnd(k * 3 + 3) - 0.5) * 0.11;
		const n = Math.hypot(x, yy, z);
		x /= n;
		yy /= n;
		z /= n;
		raw.push([x, yy, z]);
	}
}
const N = raw.length;
const D = new Float64Array(N * 3);
const E1 = new Float64Array(N * 3);
const E2 = new Float64Array(N * 3);
/** Per filament: cos of angle off the axis, then two in-plane parts, then length. */
const FIL = new Float64Array(N * NF * 4);
const GUST_OF = new Int8Array(N).fill(-1);
const REL = new Float64Array(N);
const GROW = new Float64Array(N);
const VY = new Float64Array(N);
const A1 = new Float64Array(N);
const A2 = new Float64Array(N);
const P1 = new Float64Array(N);
const P2 = new Float64Array(N);
const P3 = new Float64Array(N);
const P4 = new Float64Array(N);
const P5 = new Float64Array(N);
const B0 = new Float64Array(N);
const LV = new Float64Array(N);

for (let i = 0; i < N; i++) {
	const [x, y, z] = raw[i];
	D[i * 3] = x;
	D[i * 3 + 1] = y;
	D[i * 3 + 2] = z;
	const ref = Math.abs(y) > 0.9 ? [0, 0, 1] : [0, 1, 0];
	// e1 = d x ref, normalised; e2 = d x e1
	let ex = y * ref[2] - z * ref[1];
	let ey = z * ref[0] - x * ref[2];
	let ez = x * ref[1] - y * ref[0];
	const en = Math.hypot(ex, ey, ez);
	ex /= en;
	ey /= en;
	ez /= en;
	E1.set([ex, ey, ez], i * 3);
	E2.set([y * ez - z * ey, z * ex - x * ez, x * ey - y * ex], i * 3);
	const base = rnd(i * 17 + 5) * TAU;
	for (let k = 0; k < NF; k++) {
		const phi = base + ((k + (rnd(i * 31 + k) - 0.5) * 0.55) / NF) * TAU;
		const alpha = ((62 + 17 * rnd(i * 37 + k + 100)) * Math.PI) / 180;
		const o = (i * NF + k) * 4;
		FIL[o] = Math.cos(alpha);
		FIL[o + 1] = Math.sin(alpha) * Math.cos(phi);
		FIL[o + 2] = Math.sin(alpha) * Math.sin(phi);
		FIL[o + 3] = 0.8 + 0.3 * rnd(i * 41 + k + 200);
	}
	GROW[i] = 108 + rnd(i * 5 + 9) * 38;
	VY[i] = 11 + rnd(i * 7 + 3) * 14;
	A1[i] = 7 + rnd(i * 11 + 1) * 11;
	A2[i] = 14 + rnd(i * 13 + 2) * 22;
	P1[i] = rnd(i * 19 + 4) * TAU;
	P2[i] = rnd(i * 23 + 6) * TAU;
	P3[i] = rnd(i * 29 + 8) * TAU;
	P4[i] = rnd(i * 43 + 1) * TAU;
	P5[i] = rnd(i * 47 + 2) * TAU;
	B0[i] =
		(rnd(i * 53 + 3) < 0.5 ? -1 : 1) *
		(rnd(i * 67 + 5) < 0.08 ? 0.16 : 0.4 + 0.42 * rnd(i * 61 + 4));
	LV[i] = 0.72 + 0.34 * rnd(i * 59 + 7);
}
{
	// The seeds that leave are the ones facing us; they go in three gusts.
	const order = [...Array(N).keys()].sort(
		(a, b) =>
			rnd(a * 3 + 1) -
			0.62 * D[a * 3 + 2] -
			(rnd(b * 3 + 1) - 0.62 * D[b * 3 + 2]),
	);
	const gone = order
		.slice(0, PER_GUST * GUSTS.length)
		.sort((a, b) => rnd(a * 5 + 2) - rnd(b * 5 + 2));
	gone.forEach((i, j) => {
		const g = j % GUSTS.length;
		GUST_OF[i] = g;
		REL[i] =
			GUSTS[g] +
			0.8 +
			(Math.floor(j / GUSTS.length) / PER_GUST) * SPAN +
			rnd(i) * 0.5;
	});
}

/* ----------------------------------------------------------------- plants */

type Plant = {
	bx: number;
	by: number;
	/** Stem height to the collar of bracts. */
	sh: number;
	R: number;
	/** Wind blows toward this side of x. */
	wind: number;
	off: number;
	seed: number;
	/** Gutter limits for flying seeds. */
	lo: number;
	hi: number;
	/** Fraction of the full seed count in the air for this plant. */
	air: number;
};

const bump = (x: number) =>
	x < 0 ? Math.exp(-((x / 2) ** 2)) : Math.exp(-((x / 5.5) ** 2));

function lean(p: Plant, t: number) {
	const ph = p.seed;
	let g = 0;
	const q = mod(t - p.off, LOOP);
	for (const G of GUSTS) g += bump(q - G);
	return (
		0.02 * Math.sin(0.38 * t + ph) +
		0.011 * Math.sin(0.15 * t + ph * 1.3) +
		p.wind * 0.07 * g
	);
}
const yawOf = (p: Plant, t: number) => 0.5 * Math.sin(0.045 * t + p.seed * 2.1);

/** Collar of the head in stem coordinates (origin at the foot, y down). */
const neckX = (p: Plant) => p.sh * 0.035 * (p.wind > 0 ? -1 : 1);
const centreY = (p: Plant) => -p.sh - p.R * 0.62;

const scratch = new Float64Array(9);

/**
 * Frame of achene i in the head at time t, yawed and (optionally) leaned into
 * page space. Writes a, u, v into `out` at `o`.
 */
function headFrame(
	i: number,
	yaw: number,
	lea: number,
	out: Float64Array,
	o: number,
) {
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	const cl = Math.cos(lea);
	const sl = Math.sin(lea);
	for (let k = 0; k < 3; k++) {
		const src = k === 0 ? D : k === 1 ? E1 : E2;
		const x = src[i * 3];
		const y = src[i * 3 + 1];
		const z = src[i * 3 + 2];
		const xr = x * cy + z * sy;
		const zr = -x * sy + z * cy;
		out[o + k * 3] = lea ? xr * cl - y * sl : xr;
		out[o + k * 3 + 1] = lea ? xr * sl + y * cl : y;
		out[o + k * 3 + 2] = zr;
	}
}

/** Position of achene i's pappus apex, in page space. */
function apexPage(p: Plant, i: number, t: number, out: number[]) {
	const yaw = yawOf(p, t);
	const lea = lean(p, t);
	headFrame(i, yaw, 0, scratch, 0);
	const r = p.R * 0.72;
	const lx = neckX(p) + scratch[0] * r;
	const ly = centreY(p) + scratch[1] * r;
	const cl = Math.cos(lea);
	const sl = Math.sin(lea);
	out[0] = p.bx + lx * cl - ly * sl;
	out[1] = p.by + lx * sl + ly * cl;
}

function presence(p: Plant, i: number, t: number) {
	if (GUST_OF[i] < 0) return 1;
	const q = mod(t - p.off, LOOP);
	if (q < REL[i]) return 1;
	const b = GROW[i];
	if (q < b) return 0;
	if (q < b + GROW_FOR) return ease((q - b) / GROW_FOR);
	return 1;
}

/* ------------------------------------------------------------- drawing */

/** Add the filaments of one pappus to the current path. sel: 0 all, 1 far, 2 near. */
function filaments(
	c: Ctx,
	i: number,
	X: number,
	Y: number,
	fr: Float64Array,
	o: number,
	len: number,
	sel: number,
	every = 1,
	a0 = 0,
	a1 = 1,
) {
	const ax = fr[o];
	const ay = fr[o + 1];
	const az = fr[o + 2];
	const ux = fr[o + 3];
	const uy = fr[o + 4];
	const uz = fr[o + 5];
	const vx = fr[o + 6];
	const vy = fr[o + 7];
	const vz = fr[o + 8];
	for (let k = 0; k < NF; k += every) {
		const f = (i * NF + k) * 4;
		const ca = FIL[f];
		const cu = FIL[f + 1];
		const cv = FIL[f + 2];
		const dz = ca * az + cu * uz + cv * vz;
		if (sel === 1 && dz >= 0) continue;
		if (sel === 2 && dz < 0) continue;
		const l = len * FIL[f + 3];
		const dx = ca * ax + cu * ux + cv * vx;
		const dy = ca * ay + cu * uy + cv * vy;
		c.moveTo(X + dx * l * a0, Y + dy * l * a0);
		c.lineTo(X + dx * l * a1, Y + dy * l * a1);
	}
}

const FR = new Float64Array(9 * 128);
const AXY = new Float64Array(2 * 128);
const PRES = new Float64Array(128);

function drawPlant(c: Ctx, p: Plant, t: number, pal: Pal, alpha: number) {
	const R = p.R;
	const lea = lean(p, t);
	const yaw = yawOf(p, t);
	const nx = neckX(p);
	const cx = nx;
	const cy = centreY(p);
	c.save();
	c.globalAlpha = alpha;
	c.lineCap = "round";
	c.lineJoin = "round";

	c.translate(p.bx, p.by);
	c.rotate(lea);

	// Hollow stem: two walls and a faint lumen, slightly bent.
	const bend = p.sh * 0.05 * (p.wind > 0 ? 1 : -1);
	const wBase = 4.4;
	const wTop = 3;
	const stem = (e: number) => {
		const x0 = e * wBase;
		const x1 = nx + e * wTop;
		c.moveTo(x0, 0);
		c.bezierCurveTo(
			x0 + bend,
			-p.sh * 0.35,
			x1 - bend * 1.4,
			-p.sh * 0.7,
			x1,
			-p.sh,
		);
	};
	c.beginPath();
	stem(1);
	c.lineTo(nx - wTop, -p.sh);
	c.bezierCurveTo(
		nx - wTop - bend * 1.4,
		-p.sh * 0.7,
		-wBase + bend,
		-p.sh * 0.35,
		-wBase,
		0,
	);
	c.closePath();
	c.fillStyle = tint(pal.sage, 0.2);
	c.fill();
	for (const e of [1, -1]) {
		c.beginPath();
		stem(e);
		c.strokeStyle = tint(pal.sage, e === 1 ? 0.55 : 0.8);
		c.lineWidth = 1.5;
		c.stroke();
	}

	// Reflexed bracts under the head.
	for (let pass = 0; pass < 2; pass++) {
		c.beginPath();
		for (let j = 0; j < 12; j++) {
			const phi = (j / 12) * TAU + 0.3;
			const near = Math.sin(phi) >= 0;
			if (near !== (pass === 1)) continue;
			const ca = Math.cos(phi);
			const y0 = -p.sh - R * 0.12;
			c.moveTo(nx + ca * R * 0.1, y0);
			c.quadraticCurveTo(
				nx + ca * R * 0.4,
				y0 - R * 0.14,
				nx + ca * R * (0.52 + 0.06 * Math.sin(j * 2.1)),
				y0 + R * 0.22,
			);
		}
		c.strokeStyle = tint(pal.sage, pass ? 0.7 : 0.38);
		c.lineWidth = 1.7;
		c.stroke();
	}

	// Prepare every achene once.
	let absent = 0;
	let seen = 0;
	for (let i = 0; i < N; i++) {
		const pr = presence(p, i, t);
		PRES[i] = pr;
		headFrame(i, yaw, 0, FR, i * 9);
		const reach = R * (0.22 + 0.5 * pr);
		AXY[i * 2] = cx + FR[i * 9] * reach;
		AXY[i * 2 + 1] = cy + FR[i * 9 + 1] * reach;
		if (FR[i * 9 + 2] > -0.25) {
			seen++;
			absent += 1 - pr;
		}
	}
	const bare = seen ? absent / seen : 0;

	for (let pass = 0; pass < 2; pass++) {
		const near = pass === 1;
		if (near) {
			// Receptacle: a pitted dome, plain where the seeds have gone.
			c.beginPath();
			c.arc(cx, cy, R * 0.23, 0, TAU);
			c.fillStyle = tint(pal.umber, 0.08 + 0.3 * bare);
			c.fill();
			c.beginPath();
			for (let i = 0; i < N; i++) {
				if (PRES[i] > 0.5) continue;
				if (FR[i * 9 + 2] < -0.5) continue;
				const kx = cx + FR[i * 9] * R * 0.22;
				const ky = cy + FR[i * 9 + 1] * R * 0.22;
				c.moveTo(kx, ky);
				c.lineTo(kx + 0.1, ky);
			}
			c.strokeStyle = tint(pal.umber, 0.85);
			c.lineWidth = 3;
			c.stroke();
		}
		// Beaks, then bodies, then filaments: far hemisphere first.
		c.beginPath();
		for (let i = 0; i < N; i++) {
			const o = i * 9;
			if (PRES[i] < 0.03 || FR[o + 2] >= 0 !== near) continue;
			c.moveTo(cx + FR[o] * R * 0.25, cy + FR[o + 1] * R * 0.25);
			c.lineTo(AXY[i * 2], AXY[i * 2 + 1]);
		}
		c.strokeStyle = near ? tint(pal.ink, 0.3) : tint(pal.straw, 0.34);
		c.lineWidth = 1.5;
		c.stroke();
		c.beginPath();
		for (let i = 0; i < N; i++) {
			const o = i * 9;
			if (PRES[i] < 0.03 || FR[o + 2] >= 0 !== near) continue;
			c.moveTo(cx + FR[o] * R * 0.22, cy + FR[o + 1] * R * 0.22);
			c.lineTo(cx + FR[o] * R * 0.34, cy + FR[o + 1] * R * 0.34);
		}
		c.strokeStyle = tint(pal.umber, near ? 0.5 : 0.35);
		c.lineWidth = 2.6;
		c.stroke();
		// Filaments fade outward: strong at the hub, a fine haze at the tip.
		for (let part = 0; part < 2; part++) {
			c.beginPath();
			for (let i = 0; i < N; i++) {
				const o = i * 9;
				if (PRES[i] < 0.03 || FR[o + 2] >= 0 !== near) continue;
				filaments(
					c,
					i,
					AXY[i * 2],
					AXY[i * 2 + 1],
					FR,
					o,
					R * 0.32 * LV[i] * PRES[i] ** 1.5,
					0,
					FR[o + 2] > 0.7 ? 2 : 1,
					part ? 0.5 : 0,
					part ? 1 : 0.5,
				);
			}
			c.strokeStyle = tint(
				pal.straw,
				near ? (part ? 0.3 : 0.66) : part ? 0.14 : 0.36,
			);
			c.lineWidth = 1.5;
			c.stroke();
		}
		if (near) {
			// A few filaments in ink give the sphere its engraved grain.
			c.beginPath();
			for (let i = 0; i < N; i++) {
				const o = i * 9;
				if (PRES[i] < 0.5 || FR[o + 2] < 0.15 || i % 2) continue;
				filaments(
					c,
					i,
					AXY[i * 2],
					AXY[i * 2 + 1],
					FR,
					o,
					R * 0.32 * LV[i],
					0,
					4,
				);
			}
			c.strokeStyle = tint(pal.ink, 0.2);
			c.lineWidth = 1.5;
			c.stroke();
		}
	}
	c.restore();
}

/* --------------------------------------------------------------- flight */

const OUT = [0, 0];

function dxAt(
	i: number,
	tau: number,
	wind: number,
	roomL: number,
	roomR: number,
) {
	const k = 1 - Math.exp(-tau / 5);
	let dx =
		wind * k +
		A1[i] * (Math.sin(0.12 * tau + P1[i]) - Math.sin(P1[i])) +
		A2[i] * (Math.sin(0.047 * tau + P2[i]) - Math.sin(P2[i]));
	if (dx > 0) dx = roomR > 1 ? roomR * Math.tanh(dx / roomR) : 0;
	else dx = roomL > 1 ? -roomL * Math.tanh(-dx / roomL) : 0;
	return dx;
}

const FRAME = new Float64Array(9);
const HEAD = new Float64Array(9);

function norm3(a: Float64Array, o: number) {
	const n = Math.hypot(a[o], a[o + 1], a[o + 2]) || 1;
	a[o] /= n;
	a[o + 1] /= n;
	a[o + 2] /= n;
}

const EX = new Float64Array(NF);
const EY = new Float64Array(NF);

/**
 * A parachute: each filament arches up and out from the hub and lands on a
 * rim. `e` 0 is the head's straight spoke, 1 a full dome. sel: 1 far, 2 near.
 */
function canopy(
	c: Ctx,
	i: number,
	X: number,
	Y: number,
	F: Float64Array,
	len: number,
	e: number,
	sel: number,
	every = 1,
) {
	const [ax, ay, az, ux, uy, uz, vx, vy, vz] = F;
	const drop = 1 - 0.75 * e;
	for (let k = 0; k < NF; k += every) {
		const f = (i * NF + k) * 4;
		const ca = FIL[f];
		const cu = FIL[f + 1];
		const cv = FIL[f + 2];
		const dz = ca * az + cu * uz + cv * vz;
		if (sel === 1 && dz >= 0) continue;
		if (sel === 2 && dz < 0) continue;
		const l = len * FIL[f + 3];
		const ex = X + l * (cu * ux + cv * vx + ca * drop * ax);
		const ey = Y + l * (cu * uy + cv * vy + ca * drop * ay);
		c.moveTo(X, Y);
		c.quadraticCurveTo(
			(X + ex) / 2 + ax * l * 0.8 * e,
			(Y + ey) / 2 + ay * l * 0.8 * e,
			ex,
			ey,
		);
	}
}

/** The elliptic rim joining the filament tips; also the canopy's faint skin. */
function rim(
	c: Ctx,
	i: number,
	X: number,
	Y: number,
	F: Float64Array,
	len: number,
	e: number,
) {
	const [ax, ay, , ux, uy, , vx, vy] = F;
	const drop = 1 - 0.75 * e;
	for (let k = 0; k < NF; k++) {
		const f = (i * NF + k) * 4;
		const l = len * 0.94;
		EX[k] = X + l * (FIL[f + 1] * ux + FIL[f + 2] * vx + FIL[f] * drop * ax);
		EY[k] = Y + l * (FIL[f + 1] * uy + FIL[f + 2] * vy + FIL[f] * drop * ay);
	}
	c.beginPath();
	c.moveTo(EX[0], EY[0]);
	for (let k = 1; k < NF; k++) c.lineTo(EX[k], EY[k]);
	c.closePath();
}

/**
 * Draws one hanging seed. `e` blends the frame from the head's radial one to
 * the free-hanging one, so a released seed turns over in the first seconds.
 */
function seed(
	c: Ctx,
	i: number,
	X: number,
	Y: number,
	vx: number,
	tau: number,
	e: number,
	size: number,
	alpha: number,
	pal: Pal,
	hasHead: boolean,
) {
	// Free pose: roll follows drift, pitch wanders so the umbrella shows at
	// every angle from face-on to edge-on.
	const th = clamp(vx * 0.07, -0.5, 0.5) + 0.15 * Math.sin(0.37 * tau + P4[i]);
	const be = B0[i] + 0.12 * Math.sin(0.23 * tau + P5[i]);
	const sp = 0.12 * tau + P3[i];
	const cth = Math.cos(th);
	const sth = Math.sin(th);
	const cb = Math.cos(be);
	const sb = Math.sin(be);
	const ax = sth * cb;
	const ay = -cth * cb;
	const az = sb;
	const u0x = cth;
	const u0y = sth;
	const v0x = -sb * sth;
	const v0y = sb * cth;
	const v0z = cb;
	const cs = Math.cos(sp);
	const ss = Math.sin(sp);
	let m = 1;
	const F = FRAME;
	F[0] = ax;
	F[1] = ay;
	F[2] = az;
	F[3] = u0x * cs + v0x * ss;
	F[4] = u0y * cs + v0y * ss;
	F[5] = v0z * ss;
	F[6] = -u0x * ss + v0x * cs;
	F[7] = -u0y * ss + v0y * cs;
	F[8] = v0z * cs;
	if (hasHead && e < 1) {
		m = e;
		for (let k = 0; k < 9; k++) F[k] = HEAD[k] * (1 - m) + F[k] * m;
		norm3(F, 0);
		// Gram-Schmidt u against a, then v = a x u.
		const d = F[3] * F[0] + F[4] * F[1] + F[5] * F[2];
		F[3] -= d * F[0];
		F[4] -= d * F[1];
		F[5] -= d * F[2];
		norm3(F, 3);
		F[6] = F[1] * F[5] - F[2] * F[4];
		F[7] = F[2] * F[3] - F[0] * F[5];
		F[8] = F[0] * F[4] - F[1] * F[3];
	}
	const len = size * 0.3 * LV[i] * 1.1;
	const shaft = size * 0.4;
	const ex = X - F[0] * shaft;
	const ey = Y - F[1] * shaft;

	c.beginPath();
	canopy(c, i, X, Y, F, len, m, 1);
	c.strokeStyle = tint(pal.straw, alpha * 0.4);
	c.lineWidth = 1.5;
	c.stroke();
	// Beak, then the dark body that hangs straight below it.
	c.beginPath();
	c.moveTo(X, Y);
	c.lineTo(ex, ey);
	c.strokeStyle = tint(pal.straw, alpha * 0.85);
	c.lineWidth = 1.5;
	c.stroke();
	c.beginPath();
	c.moveTo(ex, ey);
	c.lineTo(ex - F[0] * size * 0.15, ey - F[1] * size * 0.15);
	c.strokeStyle = tint(pal.umber, alpha);
	c.lineWidth = 3;
	c.stroke();
	// The skin of the dome, then the near filaments and the rim over it.
	if (m > 0.05) {
		rim(c, i, X, Y, F, len, m);
		c.fillStyle = tint(pal.straw, alpha * 0.1 * m);
		c.fill();
	}
	c.beginPath();
	canopy(c, i, X, Y, F, len, m, 2);
	c.strokeStyle = tint(pal.straw, alpha * 0.72);
	c.lineWidth = 1.5;
	c.stroke();
	if (m > 0.05) {
		rim(c, i, X, Y, F, len, m);
		c.strokeStyle = tint(pal.straw, alpha * 0.62 * m);
		c.stroke();
		c.beginPath();
		canopy(c, i, X, Y, F, len, m, 2, 3);
		c.strokeStyle = tint(pal.ink, alpha * 0.22);
		c.stroke();
	}
}

function flightOf(c: Ctx, p: Plant, i: number, t: number, H: number, pal: Pal) {
	const rel = p.off + REL[i];
	const tau = mod(t - rel, LOOP);
	const n = Math.floor((t - rel) / LOOP);
	// Past the top of the page long before the loop returns.
	const vy = Math.max(VY[i], (H + 200) / (LOOP * 0.72)) * (0.85 + 0.3 * p.air);
	if (tau * vy > H + 260) return;
	apexPage(p, i, rel, OUT);
	const x0 = OUT[0];
	const y0 = OUT[1];
	const gust = rnd(i * 13 + n * 131 + p.seed * 7);
	const wind =
		p.wind *
		(24 + 54 * gust) *
		(p.R / 70) *
		(rnd(i * 17 + n * 57 + 3) < 0.2 ? -0.5 : 1);
	const roomL = x0 - p.lo;
	const roomR = p.hi - x0;
	const dx = dxAt(i, tau, wind, roomL, roomR);
	const dx2 = dxAt(i, tau + 0.6, wind, roomL, roomR);
	const vx = (dx2 - dx) / 0.6;
	const lift = 30 * (1 - Math.exp(-tau / 2.4));
	const y =
		y0 -
		vy * tau -
		lift * (p.R / 70) +
		3.2 * (Math.sin(0.8 * tau + P3[i]) - Math.sin(P3[i]));
	if (y < -50 || y > H + 50) return;
	headFrame(i, yawOf(p, rel), lean(p, rel), HEAD, 0);
	const e = ease(clamp(tau / 4.5, 0, 1));
	seed(c, i, x0 + dx, y, vx, tau, e, p.R * (1 + 0.3 * e), 1, pal, true);
}

/** A seed from beyond the page, crossing a gutter once per cycle. */
function ambient(
	c: Ctx,
	j: number,
	t: number,
	x0: number,
	half: number,
	lo: number,
	hi: number,
	H: number,
	size: number,
	pal: Pal,
) {
	const i = (j * 11 + 5) % N;
	const vy = 9 + rnd(j * 3 + 71) * 5;
	const dur = (H + 140) / vy;
	const cycle = dur + 6 + rnd(j * 5 + 3) * 20;
	const tau = mod(t + rnd(j * 7 + 11) * cycle, cycle);
	const y = H + 60 - vy * tau + 3 * Math.sin(0.8 * tau + P3[i]);
	if (y < -50 || y > H + 50) return;
	const xs = x0 + (rnd(j * 13 + 2) - 0.5) * half * 1.2;
	const dx = dxAt(i, tau, 0, xs - lo, hi - xs);
	const dx2 = dxAt(i, tau + 0.6, 0, xs - lo, hi - xs);
	seed(
		c,
		i,
		xs + dx,
		y,
		(dx2 - dx) / 0.6,
		tau,
		1,
		size * 1.3 * (0.6 + 0.3 * rnd(j * 17 + 9)),
		0.7,
		pal,
		false,
	);
}

/* ----------------------------------------------------------------- scene */

function plants(W: number, H: number, L: Lanes): Plant[] {
	const out: Plant[] = [];
	if (W < 600) {
		// One small head in the bottom corner.
		const R = 18;
		out.push({
			bx: W - 2,
			by: H + 12,
			sh: Math.min(200, H * 0.24),
			R,
			wind: -1,
			off: 0,
			seed: 1.7,
			lo: W - 15,
			hi: W + 40,
			air: 0.6,
		});
		return out;
	}
	const gutter = (s: number) => (s ? W - L.x[1] : L.x[0]) * 2;
	const big = L.f[1] >= L.f[0] ? 1 : 0;
	for (const s of [big, 1 - big]) {
		if (!L.f[s]) continue;
		const half = gutter(s) / 2;
		const R = clamp((half - 10) * 0.72, 24, 78) * (s === big ? 1 : 0.78);
		out.push({
			bx: L.x[s] + (s ? 1 : -1) * half * 0.12,
			by: H + 12,
			sh: clamp(H * (s === big ? 0.3 : 0.25), 140, 300),
			R,
			wind: s ? -1 : 1,
			off: s === big ? 0 : 80,
			seed: s * 2.3 + 0.6,
			lo: L.x[s] - half + 24,
			hi: L.x[s] + half - 24,
			air: s === big ? 1 : 0.8,
		});
	}
	return out;
}

export const dandelion: Scene = ({ dither: c }, { t, W, H, anchors, dark }) => {
	const pal = dark ? PALETTE.dark : PALETTE.light;
	const L = lanesFor(W, anchors.content);
	const list = plants(W, H, L);
	const phone = W < 600;
	for (const p of list) {
		drawPlant(c, p, t, pal, 1);
		for (let i = 0; i < N; i++)
			if (GUST_OF[i] >= 0) flightOf(c, p, i, t, H, pal);
	}
	// Seeds adrift from elsewhere keep the gutters from ever being empty.
	if (phone) {
		for (let j = 0; j < 2; j++)
			ambient(c, j, t, W + 8, 16, W - 14, W + 40, H, 15, pal);
		return;
	}
	for (const p of list) {
		const half = (p.hi - p.lo) / 2;
		const cx = (p.hi + p.lo) / 2;
		for (let j = 0; j < 2; j++)
			ambient(
				c,
				j + (p.wind > 0 ? 0 : 10),
				t,
				cx,
				half,
				p.lo,
				p.hi,
				H,
				p.R * 0.9,
				pal,
			);
	}
};
