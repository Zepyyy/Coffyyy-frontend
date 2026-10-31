import type { Layers, Scene } from "../engine";

/**
 * Kaldi's goat. Coffee's origin myth is a goatherd who watched his goats dance
 * after eating the cherries, so the brand creature is one goat that trots a
 * ground line, stops, and dances: a rear on its hind legs, or a stiff-legged
 * pronk. Then it walks off, and comes back after a quiet while.
 *
 * Everything is a pure function of time. The skeleton is authored in "u"
 * (1u = a hundredth of the goat's length); legs are two-bone IK; gait phase is
 * driven by ground distance, so a planted hoof never slides. The stride
 * shortens as the goat slows into a dance, so it stops standing on all fours
 * rather than frozen mid-stride.
 */

type Pt = [number, number];

// --- tuning ---------------------------------------------------------------
const CRUISE = 19; // u/s
const STRIDE = 34; // u per cycle at cruise
const STRIDE_MIN = 15; // u per cycle at a standstill
const DUTY = 0.6;
const T_DECEL = 2.6;
const T_ACCEL = 2.6;
const REST_PHASE = 0.05; // gait phase at a standstill: both diagonals planted
const OFFSTAGE = 66; // u beyond the page edge before the goat is gone

const STILL_AT = 30;
const STILL_KIND: DanceKind = "pronk";
const STILL_X = 0.44; // t=30 catches a trot at this fraction of the page // how far through the dance t=30 lands

// Skeleton, body frame, facing +x, ground at y=0, up is negative.
const HIP: Pt = [-24, -28.5];
const SHOULDER: Pt = [17, -29.5];
const FORE = { a: 16, b: 16.5, x0: 18, lift: 7 };
const HIND = { a: 17.5, b: 15, x0: -24, lift: 5.5 };
const REACH_AIR = 32.3;

type DanceKind = "rear" | "pronk";
// near front, far front, near hind, far hind
const LEGS = [
	{ hind: false, near: true, phase: 0 },
	{ hind: false, near: false, phase: 0.5 },
	{ hind: true, near: true, phase: 0.5 },
	{ hind: true, near: false, phase: 0 },
] as const;

// Tone is alpha.
const T = {
	backTop: 0.42,
	backMid: 0.6,
	belly: 0.92,
	neck: 0.6,
	head: 0.72,
	horn: 0.94,
	legNear: 0.9,
	legFar: 0.66,
	tail: 0.8,
};

// --- small math -----------------------------------------------------------
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (a: number, b: number, v: number) => {
	const k = clamp((v - a) / (b - a), 0, 1);
	return k * k * (3 - 2 * k);
};
const mod = (v: number, m: number) => ((v % m) + m) % m;

/** Smooth piecewise interpolation through [time, value] keys. */
function keys(v: number, ks: readonly (readonly [number, number])[]) {
	if (v <= ks[0][0]) return ks[0][1];
	for (let i = 1; i < ks.length; i++) {
		if (v <= ks[i][0]) {
			const [a, va] = ks[i - 1];
			const [b, vb] = ks[i];
			return lerp(va, vb, smooth(a, b, v));
		}
	}
	return ks[ks.length - 1][1];
}

// --- gait -----------------------------------------------------------------
/** Cumulative phase at distance d from a standstill (u). Stride ramps up. */
function phaseAt(d: number, ramp: number) {
	if (d <= 0) return 0;
	const k = (STRIDE - STRIDE_MIN) / ramp;
	if (d < ramp) return Math.log(1 + (k * d) / STRIDE_MIN) / k;
	return Math.log(1 + (k * ramp) / STRIDE_MIN) / k + (d - ramp) / STRIDE;
}
const strideAt = (d: number, ramp: number) =>
	STRIDE_MIN + (STRIDE - STRIDE_MIN) * clamp(d / ramp, 0, 1);

/** Body-frame foot position for one leg. y is up-negative; 0 is the ground. */
function footGait(leg: number, phi: number, Ls: number, sf: number): Pt {
	const L = LEGS[leg];
	const spec = L.hind ? HIND : FORE;
	const q = mod(phi + L.phase, 1);
	const S = Ls * DUTY;
	if (q < DUTY) return [spec.x0 + S / 2 - (S * q) / DUTY, 0];
	const r = (q - DUTY) / (1 - DUTY);
	const m = -Ls * (1 - DUTY);
	const r2 = r * r;
	const r3 = r2 * r;
	const x =
		(2 * r3 - 3 * r2 + 1) * (-S / 2) +
		(r3 - 2 * r2 + r) * m +
		(-2 * r3 + 3 * r2) * (S / 2) +
		(r3 - r2) * m;
	return [spec.x0 + x, -spec.lift * sf * Math.sin(Math.PI * r) ** 0.75];
}

const STAND: Pt[] = LEGS.map((_, i) => footGait(i, REST_PHASE, STRIDE_MIN, 0));

// --- journey --------------------------------------------------------------
type Dance = { kind: DanceKind; tl: number; dur: number };
type Track = {
	visible: boolean;
	x: number; // root, u
	phi: number;
	Ls: number;
	sf: number; // 0 at a standstill, 1 at cruise
	dance: Dance | null;
	xa: number; // dance origin;
};

const DANCE_DUR: Record<DanceKind, number> = { rear: 8.2, pronk: 6.5 };
const PRONK_HOPS = 3;
const PRONK_HOP = 16; // u per hop
const QUIET = 12;

function layout(kind: DanceKind, Wu: number, u: number) {
	const xs = -OFFSTAGE;
	const xe = Wu + OFFSTAGE;
	const xa =
		(kind === "rear" ? 0.5 + 0.36 * smooth(500, 1100, Wu * u) : 0.66) * Wu;
	const xb = xa + (kind === "pronk" ? PRONK_HOPS * PRONK_HOP : 0);
	const T1 = (xa - xs) / CRUISE + T_DECEL / 2;
	const T3 = (xe - xb) / CRUISE + T_ACCEL / 2;
	return { xs, xe, xa, xb, T1, T3, TD: DANCE_DUR[kind] };
}

function journey(t: number, Wu: number, u: number): Track {
	// All cycles share one length so t=30 can sit inside the dance of cycle 0.
	const a = layout("rear", Wu, u);
	const b = layout("pronk", Wu, u);
	const P = Math.max(a.T1 + a.TD + a.T3, b.T1 + b.TD + b.T3) + QUIET;
	const t0 = STILL_AT - (STILL_X * Wu + OFFSTAGE) / CRUISE;
	const ci = Math.floor((t - t0) / P);
	const s = t - t0 - ci * P;
	const kind: DanceKind = mod(ci, 2) === 0 ? STILL_KIND : other(STILL_KIND);
	const L = layout(kind, Wu, u);
	const out: Track = {
		visible: true,
		x: 0,
		phi: 0,
		Ls: STRIDE,
		sf: 1,
		dance: null,
		xa: L.xa,
	};
	const ramp1 = 0.5 * CRUISE * T_DECEL;
	const ramp3 = 0.5 * CRUISE * T_ACCEL;
	if (s < L.T1) {
		const tc = L.T1 - T_DECEL;
		if (s < tc) out.x = L.xs + CRUISE * s;
		else {
			const r = L.T1 - s;
			out.x = L.xa - (0.5 * CRUISE * r * r) / T_DECEL;
		}
		const d = L.xa - out.x;
		out.phi = REST_PHASE - phaseAt(d, ramp1);
		out.Ls = strideAt(d, ramp1);
	} else if (s < L.T1 + L.TD) {
		out.dance = { kind, tl: s - L.T1, dur: L.TD };
		out.x = L.xa;
		out.phi = REST_PHASE;
		out.Ls = STRIDE_MIN;
	} else if (s < L.T1 + L.TD + L.T3) {
		const r = s - L.T1 - L.TD;
		out.x =
			r < T_ACCEL
				? L.xb + (0.5 * CRUISE * r * r) / T_ACCEL
				: L.xb + ramp3 + CRUISE * (r - T_ACCEL);
		const d = out.x - L.xb;
		out.phi = REST_PHASE + phaseAt(d, ramp3);
		out.Ls = strideAt(d, ramp3);
		out.xa = L.xb;
	} else out.visible = false;
	out.sf = clamp((out.Ls - STRIDE_MIN) / (STRIDE - STRIDE_MIN), 0, 1);
	if (out.dance) out.sf = 0;
	return out;
}
const other = (k: DanceKind): DanceKind => (k === "rear" ? "pronk" : "rear");

// --- pose -----------------------------------------------------------------
type Pose = {
	root: number; // world x of body origin, u
	feet: Pt[]; // relative to root
	lift: number;
	theta: number; // nose-up, radians
	wp: number; // 0 pivots at body origin, 1 at the hips
	headRel: number; // radians, positive nose-down
	headDy: number;
	tail: number;
	sway: number;
	air: number; // 0..1, how high above standing, for the shadow
	rise: number; // 0..1, how reared
};

function walkPose(tr: Track, t: number): Pose {
	const { phi, sf, Ls } = tr;
	const feet = LEGS.map((_, i) => footGait(i, phi, Ls, sf));
	const bob = 0.85 * sf * Math.cos(4 * Math.PI * (phi - 0.3));
	return {
		root: tr.x,
		feet,
		lift: bob,
		theta: 0.018 * sf * Math.sin(4 * Math.PI * (phi - 0.55)),
		wp: 0,
		headRel: 0.2 + 0.035 * sf * Math.sin(4 * Math.PI * (phi - 0.1)),
		headDy: 0.7 * sf * Math.sin(4 * Math.PI * (phi - 0.05)),
		tail: 0.1 + 0.07 * Math.sin(t * 1.3 + 1),
		sway: 0.12 * Math.sin(2 * Math.PI * phi * 2 - 0.8) * sf,
		air: 0,
		rise: 0,
	};
}

function rearPose(tr: Track, d: Dance, t: number): Pose {
	const u = d.tl / d.dur;
	const wp = smooth(0.02, 0.13, u) * (1 - smooth(0.92, 0.99, u));
	const lift = keys(u, [
		[0.0, 0],
		[0.14, -3.2],
		[0.36, 2.4],
		[0.7, 2.4],
		[0.9, 0],
		[1, 0],
	]);
	const base = keys(u, [
		[0.0, 0],
		[0.14, -0.07],
		[0.4, 0.78],
		[0.7, 0.78],
		[0.9, 0],
		[1, 0],
	]);
	const hold = smooth(0.4, 0.5, u) * (1 - smooth(0.66, 0.72, u));
	const theta = base + 0.05 * hold * Math.sin((d.tl - 0.4 * d.dur) * 2.1);
	const rise = keys(u, [
		[0.12, 0],
		[0.36, 1],
		[0.7, 1],
		[0.88, 0],
	]);
	const fold = keys(u, [
		[0.2, 0],
		[0.38, 1],
		[0.7, 1],
		[0.86, 0],
	]);
	// World-space hips and shoulders for this pitch.
	const c: Pt = [HIP[0] * wp, HIP[1] * wp];
	const p: Pt = [c[0], c[1] - lift];
	const cs = Math.cos(theta);
	const sn = Math.sin(theta);
	const toWorld = (q: Pt): Pt => {
		const dx = q[0] - c[0];
		const dy = q[1] - c[1];
		return [p[0] + dx * cs + dy * sn, p[1] - dx * sn + dy * cs];
	};
	const sh = toWorld(SHOULDER);
	const paw = Math.sin(d.tl * 4.6);
	const feet: Pt[] = LEGS.map((L, i) => {
		const stand = STAND[i];
		if (L.hind) {
			// Planted. Hooves stay put on the ground while the hips rise.
			return [stand[0], 0];
		}
		const phase = L.near ? paw : -paw;
		const up: Pt = [
			sh[0] + 10 + 2.2 * phase * hold + (L.near ? 2 : -1.5),
			sh[1] + 13 - 2.4 * (1 + phase) * hold - (L.near ? 0 : 2),
		];
		const k = smooth(0, 1, fold);
		return [lerp(stand[0], up[0], k), lerp(0, up[1], k)];
	});
	return {
		root: tr.x,
		feet,
		lift,
		theta,
		wp,
		headRel: lerp(0.2, theta * 0.95 - 0.02, rise) + 0.05 * hold * paw,
		headDy: 0,
		tail: lerp(0.1, -0.5, rise) + 0.05 * Math.sin(t * 3),
		sway: 0.12 * hold * Math.sin(d.tl * 2.3),
		air: 0,
		rise,
	};
}

function pronkPose(tr: Track, d: Dance, t: number): Pose {
	const STANCE = 0.6;
	const AIR = 0.95;
	const HOP = STANCE + AIR;
	const T0 = 0.7;
	const LIFT_MAX = 3.9;
	const DOWN = -3.4;
	const PEAK = 10;
	let lift = 0;
	let dx = 0;
	let airFrac = 0;
	const tl = d.tl;
	const tLand = T0 + PRONK_HOPS * HOP;
	if (tl < T0) {
		lift = 0;
	} else if (tl < tLand) {
		const h = Math.floor((tl - T0) / HOP);
		const r = tl - T0 - h * HOP;
		dx = h * PRONK_HOP;
		if (r < STANCE) {
			const from = h === 0 ? 0 : LIFT_MAX;
			lift = keys(r / STANCE, [
				[0, from],
				[0.4, DOWN],
				[1, LIFT_MAX],
			]);
			// Last bit of push stays on the ground, then the air phase takes over.
		} else {
			const a = (r - STANCE) / AIR;
			lift = LIFT_MAX + 4 * PEAK * a * (1 - a);
			// Travel only while airborne, easing in and out.
			dx += PRONK_HOP * smooth(0, 1, a) ** 1;
			airFrac = Math.sin(Math.PI * a);
		}
	} else {
		dx = PRONK_HOPS * PRONK_HOP;
		lift = keys((tl - tLand) / (d.dur - tLand), [
			[0, LIFT_MAX],
			[0.45, DOWN * 0.8],
			[1, 0],
		]);
	}
	const vy =
		(pronkLift(tl + 0.04, T0, STANCE, AIR, LIFT_MAX, PEAK, DOWN, d.dur) -
			pronkLift(tl - 0.04, T0, STANCE, AIR, LIFT_MAX, PEAK, DOWN, d.dur)) /
		0.08;
	const theta = clamp(0.0055 * vy, -0.12, 0.12);
	const feet: Pt[] = LEGS.map((L, i) => {
		const stand = STAND[i];
		const spec = L.hind ? HIND : FORE;
		const hipY = (L.hind ? HIP[1] : SHOULDER[1]) - lift;
		const y = Math.min(0, hipY + REACH_AIR + (L.hind ? 0.2 : -0.6));
		const splay = L.hind ? -2.2 * airFrac : 2.2 * airFrac;
		// Planted feet keep their world x: root only advances while airborne.
		const x = stand[0] + splay + (spec === FORE && !L.near ? 0.4 : 0);
		return [x, y];
	});
	return {
		root: tr.xa + dx,
		feet,
		lift,
		theta,
		wp: 0,
		headRel: 0.12 + 0.07 * Math.sin(Math.min(1, Math.max(0, lift / 8)) * 3),
		headDy: -0.35 * Math.max(0, lift),
		tail: 0.35 + 0.1 * Math.sin(t * 3),
		sway: 0.18 * Math.sin(d.tl * 5),
		air: clamp(lift / 18, 0, 1),
		rise: 0,
	};
}
function pronkLift(
	tl: number,
	T0: number,
	STANCE: number,
	AIR: number,
	LIFT_MAX: number,
	PEAK: number,
	DOWN: number,
	dur: number,
) {
	const HOP = STANCE + AIR;
	const tLand = T0 + PRONK_HOPS * HOP;
	if (tl < T0) return 0;
	if (tl >= tLand)
		return keys((tl - tLand) / (dur - tLand), [
			[0, LIFT_MAX],
			[0.45, DOWN * 0.8],
			[1, 0],
		]);
	const h = Math.floor((tl - T0) / HOP);
	const r = tl - T0 - h * HOP;
	if (r < STANCE)
		return keys(r / STANCE, [
			[0, h === 0 ? 0 : LIFT_MAX],
			[0.4, DOWN],
			[1, LIFT_MAX],
		]);
	const a = (r - STANCE) / AIR;
	return LIFT_MAX + 4 * PEAK * a * (1 - a);
}

function poseOf(tr: Track, t: number): Pose {
	if (!tr.dance) return walkPose(tr, t);
	return tr.dance.kind === "rear"
		? rearPose(tr, tr.dance, t)
		: pronkPose(tr, tr.dance, t);
}

// --- drawing --------------------------------------------------------------
function ribbon(cl: Pt[], w: number[]): Pt[] {
	const n = cl.length;
	const left: Pt[] = [];
	const right: Pt[] = [];
	const tan: Pt[] = [];
	for (let i = 0; i < n; i++) {
		const a = cl[Math.max(0, i - 1)];
		const b = cl[Math.min(n - 1, i + 1)];
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const l = Math.hypot(dx, dy) || 1;
		const tx = dx / l;
		const ty = dy / l;
		tan.push([tx, ty]);
		const nx = -ty;
		const ny = tx;
		left.push([cl[i][0] + (nx * w[i]) / 2, cl[i][1] + (ny * w[i]) / 2]);
		right.push([cl[i][0] - (nx * w[i]) / 2, cl[i][1] - (ny * w[i]) / 2]);
	}
	const out: Pt[] = [...left];
	const cap = (i: number, sign: number) => {
		const [tx, ty] = tan[i];
		const nx = -ty;
		const ny = tx;
		const r = w[i] / 2;
		for (let k = 1; k < 6; k++) {
			const a = (Math.PI * k) / 6;
			const c = Math.cos(a);
			const s = Math.sin(a);
			out.push([
				cl[i][0] + sign * (nx * c + tx * s) * r,
				cl[i][1] + sign * (ny * c + ty * s) * r,
			]);
		}
	};
	cap(n - 1, 1);
	for (let i = n - 1; i >= 0; i--) out.push(right[i]);
	// start cap: from -N around -T to +N
	{
		const [tx, ty] = tan[0];
		const nx = -ty;
		const ny = tx;
		const r = w[0] / 2;
		for (let k = 1; k < 6; k++) {
			const a = (Math.PI * k) / 6;
			out.push([
				cl[0][0] - (nx * Math.cos(a) + tx * Math.sin(a)) * r,
				cl[0][1] - (ny * Math.cos(a) + ty * Math.sin(a)) * r,
			]);
		}
	}
	return out;
}

function pathOf(pts: Pt[]) {
	const p = new Path2D();
	pts.forEach(([x, y], i) => {
		if (i) p.lineTo(x, y);
		else p.moveTo(x, y);
	});
	p.closePath();
	return p;
}

function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
	const out: Pt[] = [];
	for (let i = 0; i <= n; i++) {
		const s = i / n;
		const m = 1 - s;
		out.push([
			m * m * m * p0[0] +
				3 * m * m * s * p1[0] +
				3 * m * s * s * p2[0] +
				s * s * s * p3[0],
			m * m * m * p0[1] +
				3 * m * m * s * p1[1] +
				3 * m * s * s * p2[1] +
				s * s * s * p3[1],
		]);
	}
	return out;
}

const widthAt = (ws: readonly (readonly [number, number])[], s: number) => {
	for (let i = 1; i < ws.length; i++)
		if (s <= ws[i][0])
			return lerp(
				ws[i - 1][1],
				ws[i][1],
				(s - ws[i - 1][0]) / (ws[i][0] - ws[i - 1][0] || 1),
			);
	return ws[ws.length - 1][1];
};

/** Two-bone IK. `side` picks which way the middle joint folds. */
function ik(hip: Pt, foot: Pt, a: number, b: number, side: number): Pt {
	const dx = foot[0] - hip[0];
	const dy = foot[1] - hip[1];
	const d = clamp(Math.hypot(dx, dy), Math.abs(a - b) + 0.01, a + b - 0.01);
	const base = Math.atan2(dy, dx);
	const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
	const A = Math.acos(cosA);
	return [
		hip[0] + a * Math.cos(base + side * A),
		hip[1] + a * Math.sin(base + side * A),
	];
}

/** A limb: hip -> bend -> hoof, with a rounded bend and tapering width. */
function limb(
	hip: Pt,
	mid: Pt,
	foot: Pt,
	ws: readonly (readonly [number, number])[],
): Pt[] {
	const norm = (a: Pt, b: Pt): Pt => {
		const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
		return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
	};
	const l1 = Math.hypot(mid[0] - hip[0], mid[1] - hip[1]);
	const l2 = Math.hypot(foot[0] - mid[0], foot[1] - mid[1]);
	const r = Math.min(3.2, l1 * 0.35, l2 * 0.35);
	const d1 = norm(mid, hip);
	const d2 = norm(mid, foot);
	const t1: Pt = [mid[0] + d1[0] * r, mid[1] + d1[1] * r];
	const t2: Pt = [mid[0] + d2[0] * r, mid[1] + d2[1] * r];
	const cl: Pt[] = [];
	const N1 = 6;
	for (let i = 0; i <= N1; i++) {
		const s = i / N1;
		cl.push([lerp(hip[0], t1[0], s), lerp(hip[1], t1[1], s)]);
	}
	for (let i = 1; i < 5; i++) {
		const s = i / 5;
		const m = 1 - s;
		cl.push([
			m * m * t1[0] + 2 * m * s * mid[0] + s * s * t2[0],
			m * m * t1[1] + 2 * m * s * mid[1] + s * s * t2[1],
		]);
	}
	const N2 = 6;
	for (let i = 0; i <= N2; i++) {
		const s = i / N2;
		cl.push([lerp(t2[0], foot[0], s), lerp(t2[1], foot[1], s)]);
	}
	// width by fraction of arc length, with the bend at l1/(l1+l2)
	const arc: number[] = [0];
	for (let i = 1; i < cl.length; i++)
		arc.push(
			arc[i - 1] + Math.hypot(cl[i][0] - cl[i - 1][0], cl[i][1] - cl[i - 1][1]),
		);
	const total = arc[arc.length - 1] || 1;
	const kneeAt = l1 / (l1 + l2);
	const w = arc.map((a) => {
		const s = a / total;
		return widthAt(
			ws.map(([f, v]) => [f === 0.5 ? kneeAt : f, v] as const),
			s,
		);
	});
	return ribbon(cl, w);
}

function put(
	c: CanvasRenderingContext2D,
	path: Path2D,
	style: string | CanvasGradient,
	alpha: number,
) {
	c.globalCompositeOperation = "destination-out";
	c.globalAlpha = 1;
	c.fillStyle = "#000";
	c.fill(path);
	c.globalCompositeOperation = "source-over";
	c.globalAlpha = alpha;
	c.fillStyle = style;
	c.fill(path);
}

const BLACK = "#000";

const FORE_W = [
	[0, 10.5],
	[0.5, 6],
	[0.62, 3.8],
	[1, 4.4],
] as const;
const HIND_W = [
	[0, 15],
	[0.5, 6.4],
	[0.62, 3.8],
	[1, 4.4],
] as const;

const BODY_PATH = (() => {
	const p = new Path2D();
	p.moveTo(22, -51);
	p.bezierCurveTo(10, -47.5, -6, -46, -18, -48);
	p.bezierCurveTo(-24, -50, -30, -50, -33, -45);
	p.bezierCurveTo(-36, -41, -35, -36, -32, -32);
	p.bezierCurveTo(-26, -25, -18, -24.5, -10, -23.5);
	p.bezierCurveTo(0, -21, 12, -21.5, 20, -24.5);
	p.bezierCurveTo(25.5, -27, 29.5, -34, 29, -42);
	p.bezierCurveTo(29, -47, 27, -50, 22, -51);
	p.closePath();
	return p;
})();

const HEAD_PATH = (() => {
	const p = new Path2D();
	p.moveTo(-3, -2);
	p.bezierCurveTo(0, -6, 6, -6.5, 10, -4.8);
	p.bezierCurveTo(15, -3.4, 19, -1.2, 22, 1.5);
	p.bezierCurveTo(24, 3.2, 24.4, 5.8, 22.4, 7.2);
	p.bezierCurveTo(20, 8.6, 15, 8.6, 11, 7);
	p.bezierCurveTo(7, 6, 3, 7, -1, 10.5);
	p.bezierCurveTo(-5, 10.5, -6.5, 5, -3, -2);
	p.closePath();
	return p;
})();

const HORN_PATH = (() => {
	const cl = bez([1.5, -5], [-1, -13.5], [-11, -18.5], [-24, -12], 14);
	const w = cl.map((_, i) => lerp(7.4, 0.8, (i / 14) ** 0.75));
	return pathOf(ribbon(cl, w));
})();
const HORN_PATH_FAR = (() => {
	const cl = bez([4, -5.5], [3, -14.5], [-5, -20], [-17, -14.5], 14);
	const w = cl.map((_, i) => lerp(6.4, 0.8, (i / 14) ** 0.75));
	return pathOf(ribbon(cl, w));
})();
const EAR_PATH = pathOf(
	ribbon(
		bez([4, 0.5], [-1, -1], [-6, 0], [-10, 3.5], 8),
		[2.2, 3.4, 4, 3.6, 3, 2.4, 1.6, 1.1, 0.5],
	),
);
const BEARD_PATH = pathOf(
	ribbon(
		bez([13, 7], [13.4, 11], [12.6, 15], [12.5, 19.5], 8),
		[3.6, 3.7, 3.5, 3.1, 2.7, 2.2, 1.6, 1.0, 0.4],
	),
);
const TAIL_PATH = pathOf(
	ribbon(
		bez([0, 0], [-3.5, -1], [-4.5, -6], [-3.2, -11], 8),
		[4.2, 4, 3.6, 3.2, 2.8, 2.3, 1.8, 1.2, 0.6],
	),
);
const NECK_PATH = (() => {
	const cl: Pt[] = [];
	const N = 12;
	for (let i = 0; i <= N; i++) {
		const s = i / N;
		const m = 1 - s;
		cl.push([
			m * m * 12 + 2 * m * s * 28 + s * s * 38,
			m * m * -41 + 2 * m * s * -45 + s * s * -52,
		]);
	}
	return pathOf(
		ribbon(
			cl,
			cl.map((_, i) => lerp(21, 11.5, i / N)),
		),
	);
})();

function drawGoat(c: CanvasRenderingContext2D, pose: Pose, tone: number) {
	const { theta, wp, lift } = pose;
	const cx = HIP[0] * wp;
	const cy = HIP[1] * wp;
	const px = cx;
	const py = cy - lift;
	const cs = Math.cos(theta);
	const sn = Math.sin(theta);
	const toWorld = (q: Pt): Pt => {
		const dx = q[0] - cx;
		const dy = q[1] - cy;
		return [px + dx * cs + dy * sn, py - dx * sn + dy * cs];
	};
	const hipW = toWorld(HIP);
	const shW = toWorld(SHOULDER);

	const legs = LEGS.map((L, i) => {
		const foot = pose.feet[i];
		const top = L.hind ? hipW : shW;
		const spec = L.hind ? HIND : FORE;
		// Far legs sit a touch further along to read as a second pair.
		const jx = L.near ? 0 : L.hind ? 1.2 : -1.4;
		const hip: Pt = [top[0] + jx, top[1]];
		const mid = ik(hip, foot, spec.a, spec.b, L.hind ? 1 : -1);
		return {
			L,
			path: pathOf(limb(hip, mid, foot, L.hind ? HIND_W : FORE_W)),
			foot,
			mid,
		};
	});

	const drawLeg = (i: number) => {
		const lg = legs[i];
		put(c, lg.path, BLACK, (lg.L.near ? T.legNear : T.legFar) * tone);
		// hoof: a darker cloven tip
		const hoof = pathOf(
			ribbon(
				[
					[lg.foot[0] - 0.1, lg.foot[1] - 3.4],
					[lg.foot[0] + 0.5, lg.foot[1] - 0.2],
				],
				[3.5, 4.2],
			),
		);
		put(c, hoof, BLACK, 1 * Math.min(1, tone * 1.1));
	};

	// far legs behind everything
	drawLeg(1);
	drawLeg(3);

	c.save();
	c.translate(px, py);
	c.rotate(-theta);
	c.translate(-cx, -cy);

	// tail
	c.save();
	c.translate(-32, -46);
	c.rotate(-pose.tail * 0.9 - 0.55);
	put(c, TAIL_PATH, BLACK, T.tail * tone);
	c.restore();

	// neck, then body replaces its overlap
	put(c, NECK_PATH, BLACK, T.neck * tone);
	const g = c.createLinearGradient(0, -52, 0, -23);
	g.addColorStop(0, `rgba(0,0,0,${T.backTop})`);
	g.addColorStop(0.45, `rgba(0,0,0,${T.backMid})`);
	g.addColorStop(1, `rgba(0,0,0,${T.belly})`);
	put(c, BODY_PATH, g, tone);

	// head
	c.save();
	c.translate(38, -52 + pose.headDy);
	c.rotate(pose.headRel);
	put(c, HORN_PATH_FAR, BLACK, T.horn * 0.7 * tone);
	put(c, HEAD_PATH, BLACK, T.head * tone);
	// beard hangs under gravity, not under the head
	c.save();
	c.rotate(-(pose.headRel - theta) * 0.85 + pose.sway);
	put(c, BEARD_PATH, BLACK, 0.85 * tone);
	c.restore();
	put(c, EAR_PATH, BLACK, 0.8 * tone);
	put(c, HORN_PATH, BLACK, T.horn * tone);
	// eye
	c.globalCompositeOperation = "destination-out";
	c.globalAlpha = 0.95;
	c.beginPath();
	c.ellipse(13, -1.2, 1.15, 0.9, 0, 0, Math.PI * 2);
	c.fillStyle = "#000";
	c.fill();
	c.restore();
	c.globalCompositeOperation = "source-over";

	c.restore();

	// near legs in front
	drawLeg(0);
	drawLeg(2);
	c.globalAlpha = 1;
}

// --- scene ----------------------------------------------------------------
function sizeOf(W: number) {
	return clamp(W * 0.5, 190, 300);
}

function shadow(
	c: CanvasRenderingContext2D,
	x: number,
	g: number,
	u: number,
	w: number,
	a: number,
) {
	c.save();
	c.globalAlpha = a;
	c.fillStyle = "#000";
	c.beginPath();
	c.ellipse(x, g + 1.5 * u, w * u, 3.6 * u, 0, 0, Math.PI * 2);
	c.fill();
	c.restore();
}

function drawAt(
	c: CanvasRenderingContext2D,
	pose: Pose,
	x: number,
	g: number,
	u: number,
	dir: number,
	tone: number,
) {
	c.save();
	c.translate(x, g);
	c.scale(dir * u, u);
	drawGoat(c, pose, tone);
	c.restore();
}

/** A smaller goat further back, in dither, crossing the other way. */
function kid(
	layers: Layers,
	t: number,
	W: number,
	H: number,
	ground: number,
	size: number,
	goatX: number | null,
) {
	const k = size * 0.5;
	const uk = k / 100;
	const v = 13 * uk; // px/s: slower, because it is further away
	const x0 = W + 0.35 * size;
	const span = x0 + 0.35 * size;
	const period = Math.max(64, span / v + 14);
	const t0 = STILL_AT - (x0 - 0.86 * W) / v;
	const s = mod(t - t0, period);
	const x = x0 - v * s;
	if (x < -0.35 * size) return;
	const travelled = (x0 - x) / uk;
	const tr: Track = {
		visible: true,
		x: 0,
		phi: travelled / STRIDE,
		Ls: STRIDE,
		sf: 1,
		dance: null,
		xa: 0,
	};
	const pose = walkPose(tr, t * 0.8);
	const g = ground - 0.05 * H;
	// It passes behind the big goat: fade rather than muddy the silhouette.
	const hide =
		goatX === null ? 1 : smooth(0.5, 0.78, Math.abs(x - goatX) / size);
	if (hide < 0.02) return;
	drawAt(layers.dither, pose, x, g, uk, -1, 0.72 * hide);
	shadow(layers.blur, x, g, uk, 40, 0.6 * hide);
}

export const kaldi: Scene = (layers: Layers, env) => {
	const { t, W, H } = env;
	const size = sizeOf(W);
	const u = size / 100;
	const Wu = W / u;
	// The field starts under the 64px header and the phone has a bottom bar.
	const ground = H - (W < 700 ? 134 : 82);

	const tr = journey(t, Wu, u);
	if (W >= 700)
		kid(layers, t, W, H, ground, size, tr.visible ? tr.x * u : null);
	if (tr.visible) {
		const pose = poseOf(tr, t);
		const x = pose.root * u;
		drawAt(layers.ascii, pose, x, ground, u, 1, 1);
		drawAt(layers.dither, pose, x, ground, u, 1, 0.8);
		const lift = clamp(pose.air, 0, 1);
		const sw = lerp(44, 30, pose.rise);
		shadow(
			layers.blur,
			x + (pose.rise > 0 ? -12 * pose.rise * u : 0),
			ground,
			u,
			sw * (1 - 0.35 * lift),
			0.9 * (1 - 0.55 * lift),
		);
	}
};
