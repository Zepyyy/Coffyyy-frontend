import type { Scene } from "../engine";

/**
 * A ringed giant and the things that obey it. One 3D model, drawn flat.
 *
 * World: the planet sits at the origin, +x right, +y down, +z toward the
 * viewer. One sun, nearly behind the viewer, high above the ring plane.
 * Every shadow, occlusion and eclipse below is computed from that single
 * model, so a moon's shadow lands where the sun would put it.
 *
 *  - The ring is a plane tilted toward the viewer. Its far half is drawn
 *    behind the globe, its near half in front. The globe's cloud bands are
 *    parallel to it (they are the planet's equator), and the ring's own
 *    shadow is projected onto the globe along the sun's rays.
 *  - Moon A circles in a lane the ring leaves open, on a plane tilted ~30
 *    degrees to the ring. It crosses the ring plane through that lane twice per
 *    orbit: above the ring it passes over the ring's near arc, below it, behind.
 *    Near the sun side it throws a shadow onto the globe; below the ring it is
 *    dimmed by the ring's shadow; behind the globe it is eclipsed.
 *  - Moon B, a small fast one inside the ring, and moon C, a distant one
 *    on a retrograde plane, share the same rules at other speeds.
 *  - Ring arcs are dense clumps of material. Everything orbits at Kepler's
 *    speed, period ~ radius^1.5, so inner arcs lap outer ones.
 *
 * All motion is analytic in t. The ring structure, its shadow on the globe
 * and the lit side are cached per viewport; nothing here keeps state.
 */

type RGB = [number, number, number];
type V3 = [number, number, number];
const TAU = Math.PI * 2;
const ice: RGB = [184, 212, 210];
const copper: RGB = [193, 131, 105];
const mauve: RGB = [159, 128, 160];
const depth: RGB = [53, 75, 101];
const bone: RGB = [214, 192, 170];
const mix = (a: RGB, b: RGB, q: number): RGB =>
	a.map((v, i) => Math.round(v + (b[i] - v) * q)) as RGB;
const ink = (v: RGB, a = 1) => `rgba(${v.join(",")},${a})`;
const random = (i: number) => {
	const v = Math.sin(i * 127.13 + 37) * 43758.5453;
	return v - Math.floor(v);
};
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const q = clamp((v - a) / (b - a), 0, 1);
	return q * q * (3 - 2 * q);
};

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];
const add = (a: V3, b: V3, k = 1): V3 => [
	a[0] + b[0] * k,
	a[1] + b[1] * k,
	a[2] + b[2] * k,
];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const unit = (a: V3): V3 => scale(a, 1 / Math.hypot(a[0], a[1], a[2]));

/** The ring plane, tilted toward the viewer. */
const PHI = -0.46;
const ELEV = 0.4;
const sinE = Math.sin(ELEV);
const cosE = Math.cos(ELEV);
const U: V3 = [Math.cos(PHI), Math.sin(PHI), 0];
const Wv: V3 = [-Math.sin(PHI) * sinE, Math.cos(PHI) * sinE, cosE];
const N: V3 = cross(U, Wv);
/** Unit vector toward the sun: upper left, almost behind the viewer. */
const SUN = unit([-0.27, -0.3, 0.91]);
const SUN_RING = dot(SUN, N);
const SUN_IN = unit(add(SUN, N, -SUN_RING));

type MoonSpec = {
	/** Orbit radius, in planet radii. */
	r: number;
	/** Body radius, in planet radii. */
	size: number;
	/** Seconds per orbit. */
	period: number;
	dir: 1 | -1;
	/** Tilt of the orbit to the ring plane, rotating around the line of nodes. */
	inc: number;
	/** Rotation of the line of nodes within the ring plane. */
	node: number;
	/** Orbital angle at t = 30, the still frame. */
	a30: number;
	palette: [RGB, RGB, RGB];
};

/** Kepler: period grows as radius^1.5. Anchored on moon A. */
const A_RADIUS = 1.8;
const A_PERIOD = 64;
const periodAt = (r: number) => A_PERIOD * (r / A_RADIUS) ** 1.5;

const MOONS: MoonSpec[] = [
	{
		r: 1.1,
		size: 0.05,
		period: periodAt(1.1),
		dir: 1,
		inc: 0.4,
		node: 1.25,
		a30: 2.4,
		palette: [mix(copper, bone, 0.4), copper, depth],
	},
	{
		r: A_RADIUS,
		size: 0.092,
		period: A_PERIOD,
		dir: 1,
		inc: 0.5,
		node: 0,
		a30: 1.5,
		palette: [ice, mauve, depth],
	},
	{
		r: 2.5,
		size: 0.13,
		period: periodAt(2.5),
		dir: -1,
		inc: 0.7,
		node: 1.05,
		a30: 1.5,
		palette: [bone, copper, mix(depth, copper, 0.25)],
	},
];

type Frame = { e1: V3; e2: V3 };
/** Orbit frame: e1 along the line of nodes, e2 up toward the sun side. */
const frameOf = (m: MoonSpec): Frame => {
	const nodeAxis = cross(SUN_IN, N);
	const c = Math.cos(m.node);
	const s = Math.sin(m.node);
	const e1 = add(scale(nodeAxis, c), SUN_IN, s);
	const q = add(scale(SUN_IN, c), nodeAxis, -s);
	return { e1, e2: add(scale(q, Math.cos(m.inc)), N, Math.sin(m.inc)) };
};
const FRAMES = MOONS.map(frameOf);

/** The ring: where it has material. p is in planet radii. */
const RING_IN = 1.22;
const RING_OUT = 2.16;
const LANE_IN = A_RADIUS - 0.095;
const LANE_OUT = A_RADIUS + 0.095;
const ringDensity = (p: number) => {
	if (p < RING_IN || p > RING_OUT) return 0;
	let d: number;
	if (p < 1.44) d = 0.3 * smooth(RING_IN, RING_IN + 0.03, p);
	else if (p < LANE_IN) d = 0.9 * smooth(1.44, 1.47, p);
	else if (p < LANE_OUT) d = 0;
	else
		d =
			0.62 *
			smooth(LANE_OUT, LANE_OUT + 0.02, p) *
			smooth(RING_OUT, RING_OUT - 0.04, p);
	// Fine division in the outer band, and a gentle ringlet texture.
	d *= 1 - 0.85 * (1 - smooth(0.004, 0.02, Math.abs(p - 2.03)));
	d *= 0.82 + 0.18 * Math.sin(p * 83) * Math.sin(p * 31 + 1);
	// B ring edge is crisp: the lane is carved, not faded.
	if (p > LANE_IN - 0.02 && p < LANE_IN)
		d *= 0.5 + 0.5 * smooth(LANE_IN - 0.02, LANE_IN - 0.005, p);
	return clamp(d, 0, 1);
};
const ringColor = (p: number): RGB => {
	if (p < 1.44) return mix(mauve, copper, smooth(1.22, 1.44, p));
	if (p < LANE_IN) return mix(copper, bone, smooth(1.44, LANE_IN, p) * 0.7);
	return mix(ice, mauve, smooth(LANE_OUT, RING_OUT, p) * 0.8);
};

/** The rings of one viewport, plus their shadow on the globe. */
type Cache = {
	key: string;
	box: { x: number; y: number; w: number; h: number };
	back: HTMLCanvasElement;
	front: HTMLCanvasElement;
	shadow: HTMLCanvasElement;
	shadowBox: { x: number; y: number; w: number; h: number };
};
let cache: Cache | undefined;

const makeLayer = (
	x: number,
	y: number,
	w: number,
	h: number,
	s: number,
	paint: (c: CanvasRenderingContext2D) => void,
) => {
	const canvas = document.createElement("canvas");
	canvas.width = Math.ceil(w * s);
	canvas.height = Math.ceil(h * s);
	const c = canvas.getContext("2d");
	if (c) {
		c.setTransform(s, 0, 0, s, -x * s, -y * s);
		paint(c);
	}
	return canvas;
};

const orbitPoint = (f: Frame, r: number, a: number): V3 =>
	add(scale(f.e1, r * Math.cos(a)), f.e2, r * Math.sin(a));

/** Ring material of one half. `front` is the near, lower half of the ellipse. */
function paintRing(
	c: CanvasRenderingContext2D,
	R: number,
	front: boolean,
	dark: boolean,
	cx: number,
	cy: number,
) {
	c.save();
	c.translate(cx, cy);
	c.rotate(PHI);
	c.scale(1, sinE);
	const step = 0.019;
	for (let p = RING_IN; p < RING_OUT; p += step) {
		const mid = p + step / 2;
		const d = ringDensity(mid);
		if (d < 0.02) continue;
		const jitter = 0.86 + random(Math.round(p * 1000)) * 0.28;
		c.beginPath();
		c.arc(0, 0, mid * R, front ? 0 : Math.PI, front ? Math.PI : TAU);
		c.strokeStyle = ink(
			ringColor(mid),
			clamp(d * jitter * (dark ? 1 : 0.9), 0, 1),
		);
		c.lineWidth = step * R * 1.04;
		c.stroke();
	}
	c.restore();
}

/**
 * The ring's shadow on the globe: for each visible cloud-top point, follow the
 * sun's ray back and ask what ring material it crosses. Static, so cached.
 */
function paintRingShadow(
	c: CanvasRenderingContext2D,
	R: number,
	s: number,
	w: number,
) {
	const px = Math.ceil(w * s);
	const img = c.createImageData(px, px);
	const nS = dot(N, SUN);
	for (let j = 0; j < px; j++)
		for (let i = 0; i < px; i++) {
			const x = (i + 0.5) / s - w / 2;
			const y = (j + 0.5) / s - w / 2;
			const rr = x * x + y * y;
			if (rr >= R * R) continue;
			const z = Math.sqrt(R * R - rr);
			const nP = N[0] * x + N[1] * y + N[2] * z;
			if (nP >= 0) continue;
			const k = -nP / nS;
			const qx = x + SUN[0] * k;
			const qy = y + SUN[1] * k;
			const qz = z + SUN[2] * k;
			const d = ringDensity(Math.hypot(qx, qy, qz) / R);
			if (d < 0.01) continue;
			// Fade toward the limb, where the sun grazes the cloud tops.
			const lit = smooth(0.04, 0.4, (x * SUN[0] + y * SUN[1] + z * SUN[2]) / R);
			const o = (j * px + i) * 4;
			img.data[o] = depth[0];
			img.data[o + 1] = depth[1];
			img.data[o + 2] = depth[2];
			img.data[o + 3] = Math.round(d * lit * 0.62 * 255);
		}
	c.putImageData(img, 0, 0);
}

/** A circle on one surface, thrown along the sun's rays, as an ellipse. */
function footprint(
	c: CanvasRenderingContext2D,
	hit: V3,
	normal: V3,
	radius: number,
	paint: () => void,
) {
	const cosI = dot(normal, SUN);
	if (cosI < 0.05) return;
	const t1 = unit(add(SUN, normal, -cosI));
	const t2 = cross(normal, t1);
	c.save();
	c.transform(
		(t1[0] * radius) / cosI,
		(t1[1] * radius) / cosI,
		t2[0] * radius,
		t2[1] * radius,
		hit[0],
		hit[1],
	);
	paint();
	c.restore();
}

function softShadow(c: CanvasRenderingContext2D, strength: number) {
	const g = c.createRadialGradient(0, 0, 0, 0, 0, 1.3);
	g.addColorStop(0, ink(depth, 0.95 * strength));
	g.addColorStop(0.68, ink(depth, 0.88 * strength));
	g.addColorStop(1, ink(depth, 0));
	c.fillStyle = g;
	c.beginPath();
	c.arc(0, 0, 1.3, 0, TAU);
	c.fill();
}

/**
 * Ring material seen through a moon's width: the ring's shadow reaches it as a
 * soft edge, not as a hard step, however fast the shadow point sweeps the ring.
 */
const SHADE_TAPS = [-1, -0.5, 0, 0.5, 1];
const SHADE_WEIGHT = [1, 2, 2, 2, 1];
const ringShade = (q: V3, R: number, radius: number) => {
	const rho = Math.hypot(q[0], q[1], q[2]) / R;
	const w = radius / R;
	let sum = 0;
	for (let i = 0; i < SHADE_TAPS.length; i++)
		sum += ringDensity(rho + SHADE_TAPS[i] * w) * SHADE_WEIGHT[i];
	return sum / 8;
};

type MoonState = {
	spec: MoonSpec;
	p: V3;
	radius: number;
	lit: number;
};

// Stable viewport composition: content changes must not resize the system.
// Dense shelves can obscure the globe; layout-aware framing remains unresolved.
export const orbital: Scene = ({ dither: c }, { W, H, t, dark }) => {
	const R = Math.min(H * 0.18, W * 0.13);
	const cx = W * 0.76;
	const cy = H * 0.8;

	// Cached material. Rebuilt only when the viewport, theme or pixel scale changes.
	const s = c.getTransform().a || 1;
	const key = `${W}:${H}:${dark}:${s.toFixed(4)}:${cx}:${cy}:${R}`;
	if (cache?.key !== key) {
		const outer = RING_OUT * R;
		const hx =
			Math.hypot(outer * Math.cos(PHI), outer * sinE * Math.sin(PHI)) + 6;
		const hy =
			Math.hypot(outer * Math.sin(PHI), outer * sinE * Math.cos(PHI)) + 6;
		const box = {
			x: Math.floor((cx - hx) * s) / s,
			y: Math.floor((cy - hy) * s) / s,
			w: hx * 2,
			h: hy * 2,
		};
		const layer = (front: boolean) =>
			makeLayer(box.x, box.y, box.w, box.h, s, (g) =>
				paintRing(g, R, front, dark, cx, cy),
			);
		const sw = R * 2 + 2;
		const shadowBox = {
			x: Math.floor((cx - sw / 2) * s) / s,
			y: Math.floor((cy - sw / 2) * s) / s,
			w: sw,
			h: sw,
		};
		cache = {
			key,
			box,
			back: layer(false),
			front: layer(true),
			shadow: makeLayer(shadowBox.x, shadowBox.y, sw, sw, s, (g) => {
				g.setTransform(1, 0, 0, 1, 0, 0);
				paintRingShadow(g, R, s, sw);
			}),
			shadowBox,
		};
	}
	const cached = cache;
	const drawCached = (canvas: HTMLCanvasElement, b: Cache["box"]) => {
		c.drawImage(canvas, b.x, b.y, canvas.width / s, canvas.height / s);
	};

	// --- Moons ------------------------------------------------------------
	const moons: MoonState[] = MOONS.map((spec, i) => {
		const a = spec.a30 + (spec.dir * (TAU * (t - 30))) / spec.period;
		const p = scale(orbitPoint(FRAMES[i], spec.r, a), R);
		let lit = 1;
		// Behind the globe, in its shadow: a smooth umbra.
		const along = dot(p, SUN);
		if (along < 0) {
			const d = Math.hypot(
				p[0] - SUN[0] * along,
				p[1] - SUN[1] * along,
				p[2] - SUN[2] * along,
			);
			lit = Math.min(lit, 0.38 + 0.62 * smooth(R * 0.94, R * 1.14, d));
		}
		// Below the ring, the ring itself shades it.
		const h = dot(p, N);
		if (h < 0) {
			const k = -h / SUN_RING;
			const q = add(p, SUN, k);
			lit *= 1 - 0.4 * ringShade(q, R, spec.size * R);
		}
		return { spec, p, radius: spec.size * R, lit };
	});

	const drawMoon = (m: MoonState) => {
		const { spec, radius, lit } = m;
		const x = m.p[0];
		const y = m.p[1];
		const [hi, mid, lo] = spec.palette;
		const g = c.createRadialGradient(
			x - radius * 0.44,
			y - radius * 0.5,
			0,
			x,
			y,
			radius * 1.22,
		);
		g.addColorStop(0, ink(mix(lo, hi, lit)));
		g.addColorStop(0.52, ink(mix(lo, mid, lit)));
		g.addColorStop(1, ink(lo));
		c.beginPath();
		c.arc(x, y, radius, 0, TAU);
		c.fillStyle = g;
		c.fill();
	};

	// Where in the stack a moon belongs: behind or in front of the globe, and
	// above or below the ring plane it crosses.
	const slots: MoonState[][] = [[], [], [], []];
	for (const m of moons) {
		const above = dot(m.p, N) > 0;
		const front = m.p[2] >= 0;
		slots[front ? (above ? 3 : 2) : above ? 1 : 0].push(m);
	}

	// The shadow a moon throws on the ring plane, when it hangs above it.
	const ringShadows = (frontHalf: boolean) => {
		for (const m of moons) {
			const h = dot(m.p, N);
			if (h <= 0) continue;
			const q = add(m.p, SUN, -h / SUN_RING);
			const strength = ringShade(q, R, m.radius);
			if (strength < 0.05 || q[2] >= 0 !== frontHalf) continue;
			footprint(c, q, N, m.radius, () => softShadow(c, strength * 0.9));
		}
	};

	c.save();
	c.translate(cx, cy);
	for (const m of slots[0]) drawMoon(m);
	c.restore();
	drawCached(cached.back, cached.box);
	c.save();
	c.translate(cx, cy);
	arcs(c, R, t, false, dark);
	ringShadows(false);
	for (const m of slots[1]) drawMoon(m);

	// --- Globe ------------------------------------------------------------
	c.save();
	c.beginPath();
	c.arc(0, 0, R, 0, TAU);
	c.clip();
	const body = c.createRadialGradient(
		-R * 0.42,
		-R * 0.48,
		R * 0.05,
		R * 0.15,
		R * 0.12,
		R * 1.2,
	);
	body.addColorStop(0, ink(ice));
	body.addColorStop(0.35, ink([206, 175, 160]));
	body.addColorStop(0.64, ink(mauve));
	body.addColorStop(0.86, ink(depth));
	body.addColorStop(1, ink([37, 49, 74]));
	c.fillStyle = body;
	c.fillRect(-R, -R, R * 2, R * 2);
	strata(c, R, t);
	// The ring's shadow, then each moon's.
	c.drawImage(
		cached.shadow,
		cached.shadowBox.x - cx,
		cached.shadowBox.y - cy,
		cached.shadow.width / s,
		cached.shadow.height / s,
	);
	for (const m of moons) {
		const d = scale(SUN, -1);
		const b = dot(m.p, d);
		const cc = dot(m.p, m.p) - R * R;
		const disc = b * b - cc;
		if (disc < 0) continue;
		const k = -b - Math.sqrt(disc);
		if (k < 0) continue;
		const hit = add(m.p, d, k);
		if (hit[2] < 0.02 * R) continue;
		const normal = scale(hit, 1 / R);
		const strength =
			clamp(m.lit * 1.6, 0, 1) * smooth(0.04, 0.38, dot(normal, SUN));
		if (strength < 0.04) continue;
		footprint(c, hit, normal, m.radius, () => softShadow(c, strength));
	}
	c.restore();

	for (const m of slots[2]) drawMoon(m);
	c.restore();
	drawCached(cached.front, cached.box);
	c.save();
	c.translate(cx, cy);
	arcs(c, R, t, true, dark);
	ringShadows(true);
	for (const m of slots[3]) drawMoon(m);
	c.restore();
};

/**
 * Cloud bands, parallel to the ring plane because they are the planet's
 * equator. Each band is a line of latitude; its ripples are carried along by
 * a wind that differs from band to band, some prograde and some not.
 */
function strata(c: CanvasRenderingContext2D, R: number, t: number) {
	const BANDS = 84;
	const tanE = Math.tan(ELEV);
	c.save();
	c.rotate(PHI);
	c.lineJoin = "round";
	for (let j = 0; j < BANDS; j++) {
		const lat = -Math.PI / 2 + ((j + 0.5) / BANDS) * Math.PI;
		const cl = Math.cos(lat);
		const edge = -Math.tan(lat) * tanE;
		if (edge >= 1) continue;
		const lim = edge <= -1 ? Math.PI : Math.acos(edge);
		const wind = 0.035 * (0.35 + 0.95 * Math.sin(j * 0.37 + 0.8));
		const amp = Math.sin(j * 0.7) * 0.02;
		c.beginPath();
		const K = 44;
		for (let k = 0; k <= K; k++) {
			const theta = -lim + (2 * lim * k) / K;
			const l2 = lat + amp * Math.sin((theta + t * wind) * 9 + j * 0.46);
			const c2 = Math.cos(l2);
			const x = R * c2 * Math.sin(theta);
			const y = R * (c2 * Math.cos(theta) * sinE - Math.sin(l2) * cosE);
			if (k === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		const weight = 0.08 + 0.15 * random(j);
		c.strokeStyle = ink(j % 9 < 3 ? copper : ice, weight);
		c.lineWidth = (1 + random(j) * 3) * (0.55 + 0.45 * cl);
		c.stroke();
	}
	c.restore();
}

type Arc = { p: number; start: number; len: number; width: number };
const ARCS: Arc[] = [
	{ p: 1.3, start: 0.4, len: 0.8, width: 0.012 },
	{ p: 1.37, start: 3.0, len: 0.45, width: 0.014 },
	{ p: 1.52, start: 1.1, len: 0.55, width: 0.018 },
	{ p: 1.6, start: 4.0, len: 0.85, width: 0.014 },
	{ p: 1.67, start: 5.4, len: 0.4, width: 0.016 },
	{ p: 1.97, start: 0.2, len: 0.7, width: 0.016 },
	{ p: 2.07, start: 2.5, len: 0.5, width: 0.014 },
	{ p: 2.12, start: 4.6, len: 0.35, width: 0.012 },
];

/** Dense clumps of ring material, each at its own Kepler speed. */
function arcs(
	c: CanvasRenderingContext2D,
	R: number,
	t: number,
	front: boolean,
	dark: boolean,
) {
	c.save();
	c.rotate(PHI);
	c.scale(1, sinE);
	c.lineCap = "round";
	for (const a of ARCS) {
		const w = TAU / periodAt(a.p);
		const from = a.start + (t - 30) * w;
		// Split at the ring's near/far boundary at angle 0 and pi.
		const k0 = Math.floor(from / Math.PI);
		const k1 = Math.floor((from + a.len) / Math.PI);
		for (let k = k0; k <= k1; k++) {
			const isFront = k % 2 === 0;
			if (isFront !== front) continue;
			const s0 = Math.max(from, k * Math.PI);
			const s1 = Math.min(from + a.len, (k + 1) * Math.PI);
			if (s1 <= s0) continue;
			const col = dark ? ice : mix(copper, depth, 0.25);
			c.beginPath();
			c.arc(0, 0, a.p * R, s0, s1);
			c.strokeStyle = ink(col, dark ? 0.55 : 0.5);
			c.lineWidth = a.width * R * 1.0;
			c.stroke();
		}
	}
	c.restore();
}
