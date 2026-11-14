import type { Scene } from "../engine";
import { blade, profile, type Rgb } from "./raster";

/**
 * Stillwater: silver birches on the far bank of a pond, in October.
 *
 * The water is drawn the way an engraver draws water, in level lines, and the
 * reflection lives inside those lines. Where the mirrored image has ink a line
 * swells; where it is empty the line thins to a hair. Swells roll in from the
 * far bank, so the mirrored trunks waver while the trees stand still. Now and
 * then a breath of wind roughens a patch of water, and the reflection breaks
 * into dashes as the patch drifts across.
 *
 * Every half minute or so a birch lets a leaf go. It falls with the side-slip
 * of a real leaf while its own reflection rises to meet it; where the two
 * touch, rings run out through the mirrored trunks, and the leaf floats on.
 *
 * Everything is a function of t: the wave field, the paws of wind, the leaves'
 * schedule, their rings and their drift. Painting goes straight into the dot
 * lattice at 12Hz; the still parts are drawn once per layout and paper.
 */

type Ctx = CanvasRenderingContext2D;
type Frame = { x: number; w: number };

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
function hash(a: number, b = 0) {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
	h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const css = (c: Rgb, a = 1) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;

/* ------------------------------------------------------------------ ink */

type Ink = {
	/** Birch bark: the white, its shade, and the black of lenticels and scars. */
	bark: Rgb;
	barkTone: number;
	shade: Rgb;
	mark: Rgb;
	/** On dark paper the bark is light itself, so marks are cut out of it. */
	cut: boolean;
	/** Fallen and falling leaves: lemon, gold, amber, copper, umber. */
	leaf: Rgb[];
	grass: Rgb;
	/** Bracken gone over: copper, russet, gold, dead brown. */
	fern: Rgb[];
	/** A floating leaf's midrib. */
	rib: Rgb;
	/** The engraved water and the sky it holds. */
	water: Rgb;
	/** A hairline's tone, and what the mirrored image adds to it. */
	hair: number;
	deep: number;
	leafTone: number;
};

const INKS: Record<"light" | "dark", Ink> = {
	light: {
		bark: [236, 232, 222],
		barkTone: 0.06,
		shade: [124, 120, 114],
		mark: [64, 60, 58],
		cut: false,
		leaf: [
			[206, 188, 84],
			[222, 176, 62],
			[210, 148, 52],
			[188, 116, 58],
			[148, 104, 70],
		],
		grass: [150, 132, 92],
		fern: [
			[196, 116, 58],
			[176, 98, 60],
			[214, 160, 72],
			[150, 104, 72],
		],
		rib: [112, 74, 42],
		water: [98, 122, 130],
		hair: 0.5,
		deep: 0.5,
		leafTone: 0.72,
	},
	dark: {
		bark: [238, 232, 216],
		barkTone: 0.6,
		shade: [0, 0, 0],
		mark: [0, 0, 0],
		cut: true,
		leaf: [
			[220, 212, 120],
			[234, 198, 104],
			[228, 172, 92],
			[214, 146, 96],
			[190, 146, 116],
		],
		grass: [188, 174, 140],
		fern: [
			[222, 146, 90],
			[204, 126, 92],
			[232, 184, 104],
			[184, 140, 108],
		],
		rib: [246, 226, 160],
		water: [146, 174, 188],
		hair: 0.36,
		deep: 0.6,
		leafTone: 0.62,
	},
};

/** Birch leaf: broad wedge base, widest low, a short drawn point. */
const BIRCH = profile(
	[0, 0.08, 0.3, 0.55, 0.8, 1],
	[0.35, 0.82, 1, 0.82, 0.38, 0],
);

const STALK = profile([0, 1], [1, 1]);

/* ---------------------------------------------------------------- plan */

type Trunk = {
	x: number;
	w: number;
	lean: number;
	bow: number;
	/** 1 for the nearest trees; far ones are thinner and paler. */
	near: number;
	seed: number;
};

type Plan = {
	phone: boolean;
	U: number;
	/** The far bank's waterline, CSS px. */
	yb: number;
	trunks: Trunk[];
	/** Caches for one paper and lattice. */
	key: string;
	still: Uint8ClampedArray | null;
	raster: ImageData | null;
	colS: Float32Array[];
	colC: Float32Array[];
	rowPhase: Float32Array[];
	dx: Float32Array;
	dy: Float32Array;
	lo: Float32Array;
	/** Ring crests, which draw a line of their own even on open water. */
	rb: Float32Array;
	painted: string;
};

function plan(W: number, H: number, frame: Frame): Plan {
	const phone = W < 600;
	const U = phone ? 1 : clamp(Math.min(W / 1440, H / 900), 0.75, 1.5);
	const yb = Math.round(H * (phone ? 0.6 : 0.69));
	const trunks: Trunk[] = [];
	const add = (x: number, w: number, near: number, seed: number) =>
		trunks.push({
			x,
			w: w * U,
			lean:
				seed === 9 ? 0.05 : seed === 1 ? -0.025 : (hash(seed, 1) - 0.5) * 0.06,
			bow: (hash(seed, 2) - 0.5) * 18 * U,
			near,
			seed,
		});
	if (phone) {
		// Phones have only margins: one tree at each edge, leaning out of frame.
		add(W * 0.02, 44, 1, 1);
		add(W * 0.97, 36, 1, 2);
	} else {
		const gl = frame.x;
		const gr = W - frame.x - frame.w;
		// A twin from one root and a single in the left gutter, a big leaning
		// tree and a slim one on the right. The column stays open water and sky.
		add(gl * 0.22, 52, 1, 1);
		add(gl * 0.22 + 44 * U, 34, 0.9, 9);
		add(gl * 0.8, 26, 0.75, 2);
		add(W - gr * 0.4, 56, 1, 3);
		add(W - gr * 0.86, 22, 0.7, 4);
	}
	return {
		phone,
		U,
		yb,
		trunks,
		key: "",
		still: null,
		raster: null,
		colS: [],
		colC: [],
		rowPhase: [],
		dx: new Float32Array(0),
		dy: new Float32Array(0),
		lo: new Float32Array(0),
		rb: new Float32Array(0),
		painted: "",
	};
}

/* --------------------------------------------------------- still parts */

function trunkAt(tr: Trunk, y: number, yb: number) {
	const up = (yb - y) / (yb + 60);
	return tr.x + tr.lean * (yb - y) + tr.bow * Math.sin(Math.PI * up);
}

/** Trees and bank, drawn once: canvas is fine for work that is done once. */
function paintStill(p: Plan, g: Ctx, ink: Ink, W: number) {
	const { yb, U } = p;
	g.lineCap = "butt";
	for (const tr of p.trunks) {
		const top = -60;
		const steps = 48;
		const half = (y: number) => {
			const up = (yb - y) / (yb - top);
			// A flared foot, then a slow taper toward the crown.
			return (
				(tr.w / 2) * (1 - 0.22 * up) * (1 + 0.35 * (1 - smooth(0, 0.07, up)))
			);
		};
		const edge = (side: number) => {
			const pts: [number, number][] = [];
			for (let i = 0; i <= steps; i++) {
				const y = yb + 2 - ((yb + 2 - top) * i) / steps;
				pts.push([trunkAt(tr, y, yb) + side * half(y), y]);
			}
			return pts;
		};
		const left = edge(-1);
		const right = edge(1);
		const body = () => {
			g.beginPath();
			left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
			for (let i = right.length - 1; i >= 0; i--)
				g.lineTo(right[i][0], right[i][1]);
			g.closePath();
		};
		const fade = 0.45 + 0.55 * tr.near;
		body();
		g.globalCompositeOperation = "source-over";
		g.globalAlpha = 1;
		g.fillStyle = css(ink.bark, ink.barkTone * (ink.cut ? fade : 1));
		g.fill();
		g.save();
		body();
		g.clip();
		// Shade: the bark's own horizontal grain, closer on the side away from
		// the light. On dark paper the shade is cut out of the lit bark.
		const draw = (col: Rgb, a: number) => {
			if (ink.cut) {
				g.globalCompositeOperation = "destination-out";
				g.strokeStyle = "#000";
				g.fillStyle = "#000";
				g.globalAlpha = a;
			} else {
				g.globalCompositeOperation = "source-over";
				g.strokeStyle = css(col);
				g.fillStyle = css(col);
				g.globalAlpha = a * fade;
			}
		};
		g.lineWidth = 2;
		g.beginPath();
		for (let y = yb; y > top; y -= 4) {
			const c = trunkAt(tr, y, yb);
			const h = half(y);
			const from = -0.05 + 0.3 * hash(tr.seed * 977 + (y | 0), 3);
			g.moveTo(c + h * from, y);
			g.lineTo(c + h * 1.05, y);
		}
		draw(ink.shade, ink.cut ? 0.55 : 0.5);
		g.stroke();
		g.beginPath();
		for (let y = yb - 2; y > top; y -= 8) {
			const c = trunkAt(tr, y, yb);
			const h = half(y);
			const to = -0.25 + 0.35 * hash(tr.seed * 977 + (y | 0), 4);
			g.moveTo(c - h * 0.7, y);
			g.lineTo(c + h * to, y);
		}
		draw(ink.shade, ink.cut ? 0.25 : 0.2);
		g.stroke();
		// Lenticels: dark dashes across the bark, in loose bands.
		g.beginPath();
		let y = yb - 10 * U;
		let k = 0;
		while (y > top) {
			const c = trunkAt(tr, y, yb);
			const h = half(y);
			const r1 = hash(tr.seed * 131 + k, 4);
			const r2 = hash(tr.seed * 131 + k, 5);
			const u0 = -0.95 + 1.2 * r1;
			const u1 = Math.min(0.98, u0 + 0.25 + 0.7 * r2);
			const thick = 2 + 3 * hash(tr.seed * 131 + k, 6);
			g.rect(c + h * u0, y, h * (u1 - u0), thick);
			y -= (4 + 13 * hash(tr.seed * 131 + k, 7)) * U;
			k++;
		}
		draw(ink.mark, ink.cut ? 0.92 : 0.78);
		g.fill();
		// The black chevrons where old branches were shed.
		g.beginPath();
		for (let j = 0; j < 4; j++) {
			const yy = yb * (0.12 + 0.78 * hash(tr.seed * 17 + j, 8));
			const c = trunkAt(tr, yy, yb);
			const h = half(yy);
			const side = hash(tr.seed * 17 + j, 9) < 0.5 ? -1 : 1;
			g.moveTo(c + side * h * 1.05, yy - 3 * U);
			g.lineTo(c - side * h * 0.2, yy + 3 * U);
			g.lineTo(c + side * h * 1.05, yy + 7 * U);
		}
		g.lineWidth = 2.6;
		draw(ink.mark, ink.cut ? 0.95 : 0.85);
		g.stroke();
		// Old birch goes black and fissured at the foot.
		g.beginPath();
		const foot = 40 * U * (0.6 + tr.near);
		for (let j = 0; j < 9; j++) {
			const u =
				-0.9 + (1.8 * (j + 0.5)) / 9 + (hash(tr.seed * 7 + j, 10) - 0.5) * 0.15;
			const len = foot * (0.4 + 0.6 * hash(tr.seed * 7 + j, 11));
			const c = trunkAt(tr, yb, yb);
			g.moveTo(c + half(yb) * u, yb + 2);
			g.lineTo(trunkAt(tr, yb - len, yb) + half(yb - len) * u * 0.9, yb - len);
		}
		g.lineWidth = 2.4;
		draw(ink.mark, ink.cut ? 0.7 : 0.7);
		g.stroke();
		g.restore();
		if (!ink.cut) {
			// Contour: a hairline on the lit side, a firm line in shadow.
			g.globalCompositeOperation = "source-over";
			g.strokeStyle = css(ink.mark);
			g.lineWidth = 2;
			g.globalAlpha = 0.5 * fade;
			g.beginPath();
			left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
			g.stroke();
			g.globalAlpha = 0.85 * fade;
			g.lineWidth = 2.6;
			g.beginPath();
			right.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
			g.stroke();
		}
	}
	g.globalCompositeOperation = "source-over";
	// The far bank: a carpet of fallen birch leaves down to the waterline, and
	// a few dry stems. Its reflection is the gold band under the bank.
	const n = Math.round((W / 3.2) * (p.phone ? 1.3 : 1));
	for (let i = 0; i < n; i++) {
		const x = hash(i, 21) * W;
		const deep = hash(i, 22) ** 1.6;
		const y = yb - 2 - deep * 22 * U;
		const r = (2.2 + 2.4 * hash(i, 23)) * U * (1 - 0.35 * deep);
		g.beginPath();
		g.ellipse(x, y, r * 1.5, r * 0.62, (hash(i, 24) - 0.5) * 0.8, 0, TAU);
		g.globalAlpha = (0.5 + 0.4 * hash(i, 25)) * (1 - 0.5 * deep);
		g.fillStyle = css(ink.leaf[Math.min(4, (hash(i, 26) * 5) | 0)]);
		g.fill();
	}
	// Bracken along the bank, gone over to copper: arched fronds whose
	// pinnae shorten to the tip. Its reflection is the warm band in the water.
	const fronds = Math.round((W / 15) * (p.phone ? 1.4 : 1));
	g.lineWidth = 2;
	g.lineCap = "round";
	for (let i = 0; i < fronds; i++) {
		const x0 = hash(i, 71) * W;
		const hgt = (9 + 24 * hash(i, 72) ** 1.5) * U;
		// An upright stipe, then the blade held out sideways and drooping, its
		// pinnae hanging from it: a frond, not a little tree.
		const sx = x0 + (hash(i, 73) - 0.5) * hgt * 0.4;
		const sy = yb - hgt;
		const dir = hash(i, 74) < 0.5 ? -1 : 1;
		const bl = hgt * (1.1 + 0.9 * hash(i, 77));
		g.strokeStyle = css(ink.fern[(hash(i, 75) * 4) | 0]);
		g.globalAlpha = 0.48 + 0.34 * hash(i, 76);
		g.beginPath();
		g.moveTo(x0, yb);
		g.quadraticCurveTo(x0, yb - hgt * 0.7, sx, sy);
		const pairs = Math.max(4, Math.round(bl / (3.2 * U)));
		let px = sx;
		let py = sy;
		g.moveTo(sx, sy);
		for (let k = 1; k <= pairs; k++) {
			const u = k / pairs;
			const qx = sx + dir * bl * u;
			const qy = sy - hgt * 0.25 * u + hgt * 0.75 * u * u;
			g.lineTo(qx, qy);
			const ang = Math.atan2(qy - py, qx - px);
			const len = hgt * 0.5 * (1 - u) ** 0.8 + 1.5;
			for (const side of [1, -1]) {
				const a = ang + side * 1.05 + dir * 0.5;
				g.moveTo(qx, qy);
				g.lineTo(
					qx + Math.cos(a) * len,
					qy + Math.abs(Math.sin(a)) * len * 0.9,
				);
				g.moveTo(qx, qy);
			}
			px = qx;
			py = qy;
		}
		g.stroke();
	}
	g.globalAlpha = 1;
}

/* ---------------------------------------------------------------- leaves */

/** Leaf k: when it lands, where, and how it floats afterwards. */
const LEAF_P = 23;
const FLOAT_LIFE = 130;
type Fall = {
	k: number;
	/** Landing time, how long the fall took, and where it touched down. */
	T: number;
	Tf: number;
	x: number;
	y: number;
	col: Rgb;
	len: number;
	ph: number;
};

function fallOf(p: Plan, k: number, W: number, H: number, ink: Ink): Fall {
	const water = H - p.yb;
	return {
		k,
		T: 8 + k * LEAF_P + 9 * (hash(k, 41) - 0.5),
		Tf: 6.5 + 2.5 * hash(k, 42),
		x: W * (0.05 + 0.9 * hash(k, 43)),
		y: p.yb + water * (0.2 + 0.65 * hash(k, 44)),
		col: ink.leaf[Math.min(4, (hash(k, 45) * 5) | 0)],
		len: (30 + 12 * hash(k, 46)) * p.U,
		// Mostly lying across our view, so the leaf's length reads.
		ph: (hash(k, 47) - 0.5) * 1.3 + (hash(k, 40) < 0.5 ? 0 : Math.PI),
	};
}

/** A leaf lying on the water, foreshortened by the angle we see it at. */
function floating(
	R: ImageData,
	x: number,
	y: number,
	phi: number,
	len: number,
	col: Rgb,
	a: number,
	scale: number,
	squash: number,
	shadow: boolean,
	rib: Rgb,
) {
	const ax = Math.cos(phi);
	const ay = Math.sin(phi) * squash;
	const la = Math.hypot(ax, ay);
	const nx = -Math.sin(phi);
	const ny = Math.cos(phi) * squash;
	const wa = Math.hypot(nx, ny);
	const L = len * la * scale;
	const hw = len * 0.36 * wa * scale;
	const bx = (x - (ax / la) * len * la * 0.5) * scale;
	const by = (y - (ay / la) * len * la * 0.5) * scale;
	// The meniscus: a faint shadow just below and to the side.
	if (shadow)
		blade(
			R,
			bx + 0.8,
			by + 0.9,
			ax / la,
			ay / la,
			L,
			hw,
			BIRCH,
			[60, 70, 74],
			a * 0.22,
		);
	// The stalk, which is what tells a leaf from a scrap on the water.
	blade(
		R,
		bx - (ax / la) * L * 0.22,
		by - (ay / la) * L * 0.22,
		ax / la,
		ay / la,
		L * 0.26,
		0.7,
		STALK,
		rib,
		a,
	);
	blade(R, bx, by, ax / la, ay / la, L, hw, BIRCH, col, a, rib, a);
}

/* ----------------------------------------------------------------- water */

/** Three wave trains: long swells from the far bank, and two shorter, oblique. */
const WAVES = [
	{ m: 1, kx: 0.012, w: 0.62, ax: 2.0, ay: 1.3 },
	{ m: 2.3, kx: 0.09, w: 1.05, ax: 0.8, ay: 0.5 },
	{ m: 0.55, kx: -0.035, w: 0.37, ax: 1.0, ay: 0.9 },
];
/** Engraved line pitch, in lattice cells. */
const PITCH = 4;

function paint(
	p: Plan,
	ink: Ink,
	t: number,
	W: number,
	H: number,
	scale: number,
) {
	const R = p.raster as ImageData;
	const d = R.data;
	const w = R.width;
	const h = R.height;
	d.set(p.still as Uint8ClampedArray);
	const yb = Math.round(p.yb * scale);
	const rows = h - yb;
	if (rows <= 0) return;

	// The wave field, separable: per row the travelling part, per column the
	// obliqueness. The engraved lines ride the same field.
	const { dx: DX, dy: DY, lo: LO } = p;
	for (let wi = 0; wi < WAVES.length; wi++) {
		const wv = WAVES[wi];
		const rp = p.rowPhase[wi];
		const cs = p.colS[wi];
		const cc = p.colC[wi];
		for (let r = 0; r < rows; r++) {
			const v = r / rows;
			const a = rp[r] - wv.w * t;
			const sa = Math.sin(a);
			const ca = Math.cos(a);
			const ax = wv.ax * (0.25 + 1.2 * v) * p.U;
			const ay = wv.ay * (0.2 + 1.0 * v) * p.U;
			const base = r * w;
			for (let x = 0; x < w; x++) {
				const s = sa * cc[x] + ca * cs[x];
				const c = ca * cc[x] - sa * cs[x];
				const i = base + x;
				if (wi === 0) {
					DX[i] = ax * s;
					DY[i] = ay * c;
					LO[i] = 0.5 * s;
				} else {
					DX[i] += ax * s;
					DY[i] += ay * c;
					LO[i] += 0.35 * c;
				}
			}
		}
	}

	// Paws of wind: patches that roughen as they drift across, then settle.
	for (let k = 0; k < 2; k++) {
		const period = 61 + 23 * k;
		const age = (((t + k * 37) % period) + period) % period;
		const life = 26;
		if (age > life) continue;
		const n = Math.floor((t + k * 37) / period) * 2 + k;
		const env = smooth(0, 5, age) * (1 - smooth(life - 8, life, age));
		const along = -0.15 + 1.3 * (age / life);
		const cx = (hash(n, 51) < 0.5 ? along : 1 - along) * w;
		const cy = rows * (0.3 + 0.55 * hash(n, 52));
		const rx = (140 + 90 * hash(n, 53)) * scale * p.U;
		const ry = rx * (0.18 + 0.2 * (cy / rows));
		const x0 = Math.max(0, Math.floor(cx - rx));
		const x1 = Math.min(w - 1, Math.ceil(cx + rx));
		const r0 = Math.max(0, Math.floor(cy - ry));
		const r1 = Math.min(rows - 1, Math.ceil(cy + ry));
		for (let r = r0; r <= r1; r++) {
			const qy = (r - cy) / ry;
			for (let x = x0; x <= x1; x++) {
				const qx = (x - cx) / rx;
				const q = 1 - qx * qx - qy * qy;
				if (q <= 0) continue;
				const m = q * q * env;
				const i = r * w + x;
				DX[i] += m * 2.4 * Math.sin(x * 0.7 + r * 2.1 - t * 5.3);
				LO[i] += m * 1.1 * Math.sin(x * 0.45 - r * 1.3 + t * 4.1);
			}
		}
	}

	// Rings where leaves land: a packet of ripples running outward.
	p.rb.fill(0);
	const falls: Fall[] = [];
	const kLo = Math.floor((t - FLOAT_LIFE - 20) / LEAF_P) - 1;
	const kHi = Math.ceil((t + 15) / LEAF_P) + 1;
	for (let k = kLo; k <= kHi; k++) falls.push(fallOf(p, k, W, H, ink));
	for (const f of falls) {
		const age = t - f.T;
		if (age <= 0 || age > 12) continue;
		const cx = f.x * scale;
		const cy = (f.y - p.yb) * scale;
		const v = cy / rows;
		const squash = 0.26 + 0.2 * v;
		const Rr = (5 + 13 * age) * scale * p.U;
		const sig = (3.5 + 1.1 * age) * scale * p.U;
		const amp = 2.2 * Math.exp(-age / 4.2);
		const lam = 9 * scale * p.U;
		const reach = Rr + 2.5 * sig;
		const x0 = Math.max(0, Math.floor(cx - reach));
		const x1 = Math.min(w - 1, Math.ceil(cx + reach));
		const r0 = Math.max(0, Math.floor(cy - reach * squash));
		const r1 = Math.min(rows - 1, Math.ceil(cy + reach * squash));
		for (let r = r0; r <= r1; r++) {
			const ey = (r - cy) / squash;
			for (let x = x0; x <= x1; x++) {
				const ex = x - cx;
				const dist = Math.sqrt(ex * ex + ey * ey);
				const off = (dist - Rr) / sig;
				if (off > 2.5 || off < -2.5) continue;
				const g =
					amp * Math.exp(-off * off) * Math.cos((TAU * (dist - Rr)) / lam);
				const i = r * w + x;
				const inv = dist > 0.5 ? 1 / dist : 0;
				if (g > 0) p.rb[i] += g * 0.7;
				LO[i] += g * 1.4;
				DX[i] += g * ex * inv * 1.5;
				DY[i] += g * ey * inv * 0.8;
			}
		}
	}

	// The mirror, engraved: each cell reads the image across the waterline,
	// displaced by the field, and becomes part of a level line whose weight
	// follows that image. Open water keeps only broken hairlines near the far
	// bank; nearer, the paper is the sky, crossed only by what moves on it.
	const wr = ink.water[0];
	const wg = ink.water[1];
	const wb = ink.water[2];
	const RB = p.rb;
	for (let r = 0; r < rows; r++) {
		const y = yb + r;
		const v = r / rows;
		const fres = 1 - 0.45 * v;
		const hairT = PITCH * 0.3 * (1 - smooth(0.2, 0.7, v));
		const base = r * w;
		const o = y * w * 4;
		for (let x = 0; x < w; x++) {
			const i = base + x;
			const sy = yb - 1 - r + Math.round(DY[i]);
			const sx = x + Math.round(DX[i]);
			let a = 0;
			let j = 0;
			if (sy >= 0 && sy < yb && sx >= 0 && sx < w) {
				j = (sy * w + sx) * 4;
				a = d[j + 3] * (1 / 255);
			}
			const dark = a * fres;
			const crest = RB[i];
			const lift = y + LO[i];
			let ph = lift % PITCH;
			if (ph < 0) ph += PITCH;
			let hair = 0;
			if (hairT > 0.05) {
				// Each line is broken into dashes of its own rhythm.
				const line = Math.floor(lift / PITCH);
				const dash = 9 + 15 * hash(line, 60);
				const seg = Math.floor((x + DX[i] * 0.6 + line * 53) / dash);
				if (hash(line * 7919 + seg, 61) < 0.62) hair = hairT;
			}
			const th = hair + PITCH * 0.82 * dark;
			let cov = th - ph;
			if (cov > 1) cov = 1;
			const wrap = ph + 1 - PITCH;
			if (wrap > 0) cov += wrap < th ? wrap : th;
			// A ring's crest is drawn whole, across the lines it disturbs.
			const ring = crest > 0.08 ? (crest - 0.08) * 3 : 0;
			if (ring > cov) cov = ring;
			if (cov <= 0) continue;
			if (cov > 1) cov = 1;
			const k = o + x * 4;
			if (a > 0.04) {
				const m = a < 0.5 ? a * 2 : 1;
				d[k] = wr + (d[j] - wr) * m;
				d[k + 1] = wg + (d[j + 1] - wg) * m;
				d[k + 2] = wb + (d[j + 2] - wb) * m;
			} else {
				d[k] = wr;
				d[k + 1] = wg;
				d[k + 2] = wb;
			}
			let tone = ink.hair + ink.deep * dark;
			if (ring > 0 && tone < 0.8) tone += (0.8 - tone) * (ring > 1 ? 1 : ring);
			d[k + 3] = cov * (tone > 0.95 ? 0.95 : tone) * 255;
		}
	}

	// Leaves on the water, then the one falling to meet its reflection.
	for (const f of falls) {
		const age = t - f.T;
		if (age < 0 || age > FLOAT_LIFE) continue;
		const drift = hash(f.k, 48) - 0.5;
		const x = f.x + drift * 4.5 * age * p.U + 2 * Math.sin(age * 0.21 + f.ph);
		const y = f.y + (0.9 + 1.4 * hash(f.k, 49)) * age * p.U;
		if (y > H + 20) continue;
		const v = (y - p.yb) / (H - p.yb);
		const settle = smooth(0, 1.2, age);
		const fadeOut = 1 - smooth(FLOAT_LIFE - 25, FLOAT_LIFE, age);
		const phi = f.ph + (hash(f.k, 50) - 0.5) * 0.08 * age + 0.4 * (1 - settle);
		floating(
			R,
			x,
			y,
			phi,
			f.len * (0.8 + 0.3 * v),
			f.col,
			ink.leafTone * fadeOut,
			scale,
			0.5 + 0.25 * v,
			!ink.cut,
			ink.rib,
		);
	}
	for (const f of falls) {
		const tau = t - (f.T - f.Tf);
		if (tau < 0 || tau >= f.Tf) continue;
		const q = tau / f.Tf;
		// Height above the water at the landing point, falling ever slower as
		// it learns to glide, with the side-slip of a falling leaf.
		const top = f.y + 40 * p.U;
		const hgt = top * (1 - q) ** 1.15;
		const swing = Math.sin(tau * 2.1 + f.ph);
		const x = f.x + 34 * p.U * swing * (0.4 + 0.6 * (1 - q));
		const lift = 6 * p.U * swing * swing;
		const ang = 1.3 + 0.7 * Math.cos(tau * 2.1 + f.ph);
		const roll = Math.abs(Math.cos(tau * 1.3 + f.ph * 2));
		const len = f.len;
		const dxl = Math.sin(ang);
		const dyl = Math.cos(ang);
		const ly = f.y - hgt + lift;
		blade(
			R,
			(x - dxl * len * 0.5) * scale,
			(ly - dyl * len * 0.5) * scale,
			dxl,
			dyl,
			len * scale,
			len * 0.32 * scale * Math.max(0.2, roll),
			BIRCH,
			f.col,
			ink.leafTone,
		);
		// Its reflection, mirrored about the point where they will meet.
		const ry = f.y + hgt - lift;
		if (ry < H + len)
			blade(
				R,
				(x - dxl * len * 0.5) * scale,
				(ry + dyl * len * 0.5) * scale,
				dxl,
				-dyl,
				len * scale,
				len * 0.32 * scale * Math.max(0.2, roll),
				BIRCH,
				f.col,
				ink.leafTone *
					0.42 *
					(1 - 0.6 * smooth(0, 1, (ry - p.yb) / (H - p.yb))),
			);
	}
}

/* --------------------------------------------------------------- scene */

const RATE = 12;
let memoKey = "";
let memo: Plan | null = null;

export const reflection: Scene = (
	{ dither: c },
	{ t, W, H, anchors, dark },
) => {
	const frame = anchors.frame ??
		anchors.content ?? {
			x: Math.max(0, (W - 976) / 2),
			w: Math.min(976, W),
		};
	const key = `${W}|${H}|${frame.x | 0}|${frame.w | 0}`;
	if (key !== memoKey || !memo) {
		memoKey = key;
		memo = plan(W, H, frame);
	}
	const p = memo;
	const theme = dark ? "dark" : "light";
	const ink = INKS[theme];
	const scale = c.getTransform().a;
	const w = c.canvas.width;
	const h = c.canvas.height;
	const stillKey = `${theme}|${w}|${h}|${scale}`;
	if (stillKey !== p.key) {
		p.key = stillKey;
		const el = document.createElement("canvas");
		el.width = w;
		el.height = h;
		const g = el.getContext("2d", { willReadFrequently: true });
		if (!g) return;
		g.setTransform(scale, 0, 0, scale, 0, 0);
		paintStill(p, g, ink, W);
		// Nothing still is drawn below the waterline; the water is all motion.
		const yb = Math.round(p.yb * scale);
		const still = g.getImageData(0, 0, w, h).data;
		still.fill(0, yb * w * 4);
		p.still = still;
		p.raster = new ImageData(w, h);
		const rows = Math.max(0, h - yb);
		p.dx = new Float32Array(rows * w);
		p.dy = new Float32Array(rows * w);
		p.lo = new Float32Array(rows * w);
		p.rb = new Float32Array(rows * w);
		p.colS = WAVES.map((wv) =>
			Float32Array.from({ length: w }, (_, x) => Math.sin((wv.kx * x) / scale)),
		);
		p.colC = WAVES.map((wv) =>
			Float32Array.from({ length: w }, (_, x) => Math.cos((wv.kx * x) / scale)),
		);
		// Waves look shorter toward the far bank: phase accumulates with a
		// wavelength that grows as the water comes nearer.
		p.rowPhase = WAVES.map((wv) => {
			const out = new Float32Array(rows);
			let ph = 0;
			for (let r = 0; r < rows; r++) {
				const v = r / Math.max(1, rows);
				const lam = (4 + 22 * v) * scale * p.U;
				ph += (TAU * wv.m) / lam;
				out[r] = ph;
			}
			return out;
		});
		p.painted = "";
	}
	const beat = Math.floor(t * RATE);
	const paintKey = `${beat}|${stillKey}`;
	if (paintKey !== p.painted) {
		p.painted = paintKey;
		paint(p, ink, beat / RATE, W, H, scale);
	}
	c.putImageData(p.raster as ImageData, 0, 0);
};
