import type { Box, Scene } from "../engine";
import type { GardenBean } from "../journal";

/**
 * Bean garden: every bean in the journal is a plant in a border along the
 * page margins.
 *
 * Brews grow it (height, leaves, buds, then flowers). A bean brewed in the last
 * day or two is in fresh bloom; the longer it sits, the more it nods and fades
 * toward straw. A finished bag goes to seed. A bean with no brews is a seedling.
 * Identity is a hash of the bean's id: one of three simple forms (daisy,
 * poppy, grass), a colour variant, a lean. Slots are a hash plus a probe in id
 * order, so a plant does not move when another bean is added.
 *
 * Deliberately few parts per plant: one stem curve, a flower of a handful of
 * large soft petals, leaves as plain blades. Detail below a dot does not
 * survive the dither. Everything is a pure function of (t, journal, now).
 */

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const DAY = 86_400_000;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k,
];
const rgba = (c: Rgb, a = 1) =>
	`rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

function hash32(n: number) {
	let h = (n | 0) ^ 0x9e3779b9;
	h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const hr = (id: number, k: number) => hash32(id * 131 + k * 7919 + 17);

/* ------------------------------------------------------------ palettes */

type Pal = { pet: Rgb; lo: Rgb; hi: Rgb; core: Rgb };
const FORMS = 3; // 0 daisy, 1 poppy, 2 grass
const PALS: Pal[][] = [
	[
		{ pet: [224, 152, 176], lo: [184, 100, 134], hi: [244, 204, 216], core: [218, 170, 72] },
		{ pet: [240, 232, 224], lo: [196, 184, 184], hi: [255, 252, 246], core: [212, 160, 60] },
		{ pet: [200, 120, 164], lo: [150, 70, 116], hi: [232, 170, 200], core: [222, 178, 76] },
	],
	[
		{ pet: [226, 104, 76], lo: [166, 56, 50], hi: [244, 156, 118], core: [70, 52, 56] },
		{ pet: [240, 176, 150], lo: [196, 116, 100], hi: [252, 216, 196], core: [80, 60, 58] },
		{ pet: [238, 200, 84], lo: [190, 148, 50], hi: [250, 232, 150], core: [90, 70, 50] },
	],
	[
		{ pet: [198, 150, 148], lo: [150, 100, 104], hi: [226, 196, 190], core: [150, 120, 90] },
		{ pet: [196, 178, 120], lo: [150, 130, 80], hi: [228, 214, 164], core: [150, 120, 90] },
		{ pet: [176, 176, 196], lo: [128, 128, 156], hi: [214, 214, 228], core: [150, 120, 90] },
	],
];
const NOTE_TINT: [RegExp, Rgb][] = [
	[/fruit|berry|citrus|cherry|apple|lemon|orange/i, [232, 110, 100]],
	[/floral|jasmine|flower|tea|lavender/i, [178, 150, 220]],
	[/choc|cocoa|nut|caramel|toffee|spice|tobacco/i, [176, 112, 80]],
];

type Look = {
	dark: boolean;
	leaf: Rgb;
	leafLo: Rgb;
	stem: Rgb;
	straw: Rgb;
	strawLo: Rgb;
	soil: Rgb;
	lift: (c: Rgb) => Rgb;
};
function lookFor(dark: boolean): Look {
	const lift = (c: Rgb): Rgb =>
		dark ? mix(c, [255, 250, 232], 0.32) : c;
	return {
		dark,
		leaf: lift([132, 164, 104]),
		leafLo: lift([92, 126, 80]),
		stem: lift([118, 148, 92]),
		straw: lift([206, 178, 108]),
		strawLo: lift([156, 126, 76]),
		soil: lift([122, 94, 72]),
		lift,
	};
}

/* ------------------------------------------------------------ layout */

type Plant = {
	id: number;
	form: number;
	x: number;
	base: number;
	s: number;
	back: boolean;
	brews: number;
	fresh: number;
	finished: boolean;
	pal: Pal;
	tone: number;
	len: number;
	lean: number;
	nod: number;
	per: number;
	ph: number;
	seedling: boolean;
};

type Side = { a: number; b: number };

/** Plant scale: screen height, eased down when the gutters are slim. */
function sceneScale(W: number, H: number, frame: Box | undefined) {
	if (W < 640) return 0.6;
	const g = frame ? Math.min(frame.x, W - frame.x - frame.w) : 260;
	return clamp(H / 900, 0.75, 1.5) * (g < 70 ? 1 : clamp(g / 260, 0.78, 1));
}

function slotXs(W: number, frame: Box | undefined, s: number) {
	const gl = frame ? frame.x : W * 0.2;
	const gr = frame ? W - frame.x - frame.w : W * 0.2;
	const sides: Side[] = [];
	const reach = 440 * s;
	const mk = (g: number, left: boolean) => {
		if (g < 70) {
			// Phones and slim gutters: plants peek in from the very edge.
			const e = 26;
			return left ? { a: 2, b: 2 + e } : { a: W - 2 - e, b: W - 2 };
		}
		// Keep every leaf and flower 24px clear of the content column.
		const pad = 36 * s;
		const w = Math.min(g - 24 - 62 * s, reach) - pad;
		return left ? { a: pad, b: pad + w } : { a: W - pad - w, b: W - pad };
	};
	sides.push(mk(gl, true), mk(gr, false));
	const xs: number[] = [];
	let nL = 0;
	for (let si = 0; si < 2; si++) {
		const { a, b } = sides[si];
		const narrow = b - a < 40;
		const n = narrow ? 3 : clamp(Math.floor((b - a) / (44 * s)), 1, 8);
		const pitch = Math.max(0, b - a) / n;
		for (let i = 0; i < n; i++) {
			const j = (hr(si * 31 + i, 5) - 0.5) * 0.35 * pitch;
			xs.push(a + (i + 0.5) * pitch + j);
		}
		if (si === 0) nL = xs.length;
	}
	return { xs, sides, nL };
}

/**
 * Beans in id order alternate sides, then take a hashed slot on their side
 * (probing along it). A new bean has the highest id, so nobody else moves.
 */
function assign(ids: number[], nL: number, S: number, salt: number) {
	const out = new Map<number, number>();
	const used = new Set<number>();
	const sorted = [...ids].sort((p, q) => p - q);
	sorted.forEach((id, idx) => {
		const first = idx % 2;
		for (const side of [first, 1 - first]) {
			const lo = side === 0 ? 0 : nL;
			const cnt = side === 0 ? nL : S - nL;
			if (!cnt) continue;
			let k = Math.floor(hr(id, 3 + salt) * cnt);
			for (let i = 0; i < cnt && used.has(lo + k); i++) k = (k + 1) % cnt;
			if (!used.has(lo + k)) {
				used.add(lo + k);
				out.set(id, lo + k);
				return;
			}
		}
	});
	return out;
}

const ANON: GardenBean[] = [-1, -2, -3, -4, -5].map((id) => ({
	id,
	name: "",
	origin: [],
	roastLevel: null,
	dominantNote: "",
	finished: false,
	brews: 0,
	lastBrew: null,
	firstBrew: null,
	rating: null,
}));

function plantOf(b: GardenBean, now: number): Omit<Plant, "x" | "base" | "s" | "back"> {
	const id = b.id;
	const form = Math.floor(hr(id, 1) * FORMS);
	let pal = PALS[form][Math.floor(hr(id, 2) * 3)];
	const tint = NOTE_TINT.find(([re]) => re.test(b.dominantNote));
	if (tint)
		pal = {
			pet: mix(pal.pet, tint[1], 0.22),
			lo: mix(pal.lo, tint[1], 0.22),
			hi: mix(pal.hi, tint[1], 0.12),
			core: pal.core,
		};
	const days = b.lastBrew == null ? 99 : Math.max(0, (now - b.lastBrew) / DAY);
	const n = b.brews;
	const fresh = n === 0 ? 1 : 1 - smooth(2.5, 30, days);
	const len = (44 + 168 * (1 - Math.exp(-n / 8))) * (0.74 + 0.5 * hr(id, 4));
	return {
		id,
		form,
		brews: n,
		fresh,
		finished: b.finished,
		pal,
		tone: b.roastLevel == null ? 0.3 : (b.roastLevel - 1) / 9,
		len: n === 0 ? 20 : len,
		lean: (hr(id, 6) - 0.5) * 0.22,
		nod: hr(id, 7) < 0.5 ? -1 : 1,
		per: 4.2 + len / 38 + hr(id, 8) * 1.2,
		ph: hr(id, 9) * TAU,
		seedling: n === 0,
	};
}

let layoutKey = "";
let layoutVal: Plant[] = [];
function layout(
	W: number,
	H: number,
	frame: Box | undefined,
	beans: GardenBean[],
	now: number,
): Plant[] {
	const hourBucket = Math.floor(now / 3_600_000);
	const sig = beans
		.map((b) => `${b.id}.${b.brews}.${b.finished ? 1 : 0}.${b.lastBrew}.${b.roastLevel}.${b.dominantNote}`)
		.join("|");
	const key = `${W}x${H}|${(frame?.x ?? 0) | 0}|${(frame?.w ?? 0) | 0}|${hourBucket}|${sig}`;
	if (key === layoutKey) return layoutVal;
	layoutKey = key;

	const s = sceneScale(W, H, frame);
	const { xs, nL } = slotXs(W, frame, s);
	const S = xs.length;
	const base0 = H - 98;
	const list = beans.length ? beans : ANON;
	const live = list.filter((b) => !b.finished);
	const done = list
		.filter((b) => b.finished)
		.sort((a, b) => (b.lastBrew ?? 0) - (a.lastBrew ?? 0))
		.slice(0, 4);
	const score = (b: GardenBean) => b.lastBrew ?? now - DAY + b.id;
	const front = live.sort((a, b) => score(b) - score(a)).slice(0, Math.min(S, 11));

	const out: Plant[] = [];
	const fa = assign(front.map((b) => b.id), nL, S, 0);
	for (const b of front) {
		const k = fa.get(b.id);
		if (k == null) continue;
		out.push({
			...plantOf(b, now),
			x: xs[k],
			base: base0 + (hr(b.id, 10) - 0.5) * 8 * s,
			s: s * (0.92 + 0.16 * hr(b.id, 11)),
			back: false,
		});
	}
	// Finished bags stand behind, half a slot off, a little smaller.
	const ba = assign(done.map((b) => b.id), nL, S, 9);
	for (const b of done) {
		const k = ba.get(b.id);
		if (k == null) continue;
		const left = k < nL;
		const nb = left ? (k + 1 < nL ? k + 1 : -1) : k + 1 < S ? k + 1 : -1;
		const x = nb >= 0 ? (xs[k] + xs[nb]) / 2 : xs[k] + (left ? -14 : 14) * s;
		out.push({
			...plantOf(b, now),
			x,
			base: base0 - 7 * s,
			s: s * 0.86,
			back: true,
		});
	}
	out.sort((a, b) => Number(b.back) - Number(a.back) || a.x - b.x);
	layoutVal = out;
	return out;
}

/* ------------------------------------------------------------ stems */

const N = 14;
type Stem = { x: Float32Array; y: Float32Array; a: Float32Array };
const newStem = (): Stem => ({
	x: new Float32Array(N + 1),
	y: new Float32Array(N + 1),
	a: new Float32Array(N + 1),
});

/** Integrates angle along the stem, so length is preserved as it sways. */
function buildStem(
	out: Stem,
	x0: number,
	y0: number,
	len: number,
	rest: (u: number) => number,
	amp: number,
	per: number,
	ph: number,
	t: number,
	gust: number,
) {
	let x = x0;
	let y = y0;
	const ds = len / N;
	for (let i = 0; i <= N; i++) {
		const u = i / N;
		const w = u ** 1.3;
		const sway =
			amp *
			gust *
			w *
			(0.65 * Math.sin((TAU * t) / per - u * 1.8 + ph) +
				0.35 * Math.sin((TAU * t) / (per * 2.4) - u * 0.9 + ph * 1.7));
		const a = rest(u) + sway;
		out.x[i] = x;
		out.y[i] = y;
		out.a[i] = a;
		x += Math.sin(a) * ds;
		y -= Math.cos(a) * ds;
	}
}

function at(s: Stem, u: number): [number, number, number] {
	const f = clamp(u, 0, 1) * N;
	const i = Math.min(N - 1, f | 0);
	const q = f - i;
	return [
		s.x[i] + (s.x[i + 1] - s.x[i]) * q,
		s.y[i] + (s.y[i + 1] - s.y[i]) * q,
		s.a[i] + (s.a[i + 1] - s.a[i]) * q,
	];
}

function strokeStem(c: Ctx, s: Stem, w0: number, w1: number, col: Rgb, hi: Rgb) {
	c.lineCap = "round";
	c.lineJoin = "round";
	for (let i = 0; i < N; i++) {
		c.lineWidth = w0 + (w1 - w0) * (i / N);
		c.strokeStyle = rgba(col, 0.92);
		c.beginPath();
		c.moveTo(s.x[i], s.y[i]);
		c.lineTo(s.x[i + 1], s.y[i + 1]);
		c.stroke();
	}
	if (w0 > 1.8) {
		// A lit edge, a dot wide, so the stem has a round body.
		c.lineWidth = Math.max(0.5, w0 * 0.3);
		c.strokeStyle = rgba(hi, 0.55);
		c.beginPath();
		for (let i = 0; i < N * 0.7; i++) {
			const nx = Math.cos(s.a[i]) * w0 * 0.2;
			if (i === 0) c.moveTo(s.x[i] - nx, s.y[i]);
			else c.lineTo(s.x[i] - nx, s.y[i]);
		}
		c.stroke();
	}
}

/* ------------------------------------------------------------ leaf */

/** A plain blade: lit half, shaded half, one midrib. */
function leaf(
	c: Ctx,
	x: number,
	y: number,
	ang: number,
	len: number,
	wid: number,
	bendBy: number,
	col: Rgb,
	lo: Rgb,
	thin: number,
) {
	c.save();
	c.translate(x, y);
	c.rotate(ang);
	const tx = bendBy * len;
	c.beginPath();
	c.moveTo(0, 0);
	c.bezierCurveTo(wid * 0.9, -len * 0.3, wid * 0.7 + tx, -len * 0.75, tx, -len);
	c.bezierCurveTo(-wid * 0.5 + tx, -len * 0.7, -wid * 0.8, -len * 0.3, 0, 0);
	c.fillStyle = rgba(col, 0.88);
	c.fill();
	// shade the half away from the light
	c.beginPath();
	c.moveTo(0, 0);
	c.bezierCurveTo(-wid * 0.8, -len * 0.3, -wid * 0.5 + tx, -len * 0.7, tx, -len);
	c.quadraticCurveTo(tx * 0.5 - 1, -len * 0.5, 0, 0);
	c.fillStyle = rgba(lo, 0.5);
	c.fill();
	c.lineWidth = thin * 0.9;
	c.strokeStyle = rgba(lo, 0.55);
	c.beginPath();
	c.moveTo(0, 0);
	c.quadraticCurveTo(tx * 0.3, -len * 0.5, tx, -len * 0.95);
	c.stroke();
	c.restore();
}

/* ------------------------------------------------------------ flowers */

type Head = { x: number; y: number; r: number };

function petal(
	c: Ctx,
	len: number,
	wid: number,
	pal: Pal,
	col: Rgb,
	thin: number,
	notch: boolean,
) {
	c.beginPath();
	c.moveTo(0, 0);
	if (notch) {
		c.bezierCurveTo(wid * 0.9, -len * 0.25, wid * 1.1, -len * 0.75, wid * 0.55, -len);
		c.quadraticCurveTo(0, -len * 0.88, -wid * 0.55, -len);
		c.bezierCurveTo(-wid * 1.1, -len * 0.75, -wid * 0.9, -len * 0.25, 0, 0);
	} else {
		c.bezierCurveTo(wid, -len * 0.2, wid * 0.95, -len * 0.9, 0, -len);
		c.bezierCurveTo(-wid * 0.95, -len * 0.9, -wid, -len * 0.2, 0, 0);
	}
	c.fillStyle = rgba(col, 0.9);
	c.fill();
	// soft shading: dark toward the centre, light on one shoulder
	c.save();
	c.scale(0.55, 0.5);
	c.fillStyle = rgba(pal.lo, 0.38);
	c.fill();
	c.restore();
	c.save();
	c.translate(-wid * 0.25, -len * 0.45);
	c.scale(0.4, 0.42);
	c.beginPath();
	c.arc(0, -len * 0.4, len * 0.55, 0, TAU);
	c.fillStyle = rgba(pal.hi, 0.35);
	c.fill();
	c.restore();
	c.lineWidth = thin * 0.8;
	c.strokeStyle = rgba(pal.lo, 0.35);
	c.beginPath();
	c.moveTo(0, -len * 0.1);
	c.lineTo(0, -len * 0.75);
	c.stroke();
}

function drawBud(c: Ctx, x: number, y: number, ang: number, r: number, p: Plant, k: Look, thin: number) {
	c.save();
	c.translate(x, y);
	c.rotate(ang);
	c.beginPath();
	c.ellipse(0, -r * 0.9, r * 0.62, r * 0.95, 0, 0, TAU);
	c.fillStyle = rgba(k.lift(p.pal.pet), 0.85);
	c.fill();
	c.beginPath();
	c.ellipse(0, -r * 0.45, r * 0.66, r * 0.55, 0, 0, TAU);
	c.fillStyle = rgba(k.leaf, 0.92);
	c.fill();
	c.beginPath();
	c.ellipse(-r * 0.2, -r * 1.1, r * 0.2, r * 0.45, 0.1, 0, TAU);
	c.fillStyle = rgba(k.lift(p.pal.hi), 0.5);
	c.fill();
	c.lineWidth = thin * 0.8;
	c.strokeStyle = rgba(k.leafLo, 0.5);
	c.beginPath();
	c.moveTo(0, -r * 0.1);
	c.lineTo(0, -r * 0.85);
	c.stroke();
	c.restore();
}

function drawDaisy(c: Ctx, x: number, y: number, ang: number, R: number, o: number, fresh: number, p: Plant, k: Look, thin: number) {
	const tilt = 0.55 + 0.25 * hr(p.id, 12) - 0.12 * (1 - fresh);
	const n = 8;
	const len = R * (0.45 + 0.55 * o) * (0.8 + 0.2 * fresh);
	const pal: Pal = {
		pet: k.lift(mix(p.pal.pet, k.straw, 0.5 * (1 - fresh))),
		lo: k.lift(mix(p.pal.lo, k.strawLo, 0.5 * (1 - fresh))),
		hi: k.lift(p.pal.hi),
		core: k.lift(p.pal.core),
	};
	c.save();
	c.translate(x, y);
	c.rotate(ang);
	c.scale(1, tilt);
	for (const pass of [0, 1]) {
		for (let i = 0; i < n; i++) {
			const a = (i / n) * TAU + 0.2 + hr(p.id, 20 + i) * 0.12;
			const far = Math.cos(a) > 0;
			if (far !== (pass === 0)) continue;
			c.save();
			c.rotate(a);
			petal(c, len, R * 0.3, pal, pal.pet, thin, true);
			c.restore();
		}
	}
	c.beginPath();
	c.arc(0, 0, R * 0.2, 0, TAU);
	c.fillStyle = rgba(pal.core, 0.95);
	c.fill();
	c.beginPath();
	c.arc(-R * 0.05, -R * 0.06, R * 0.09, 0, TAU);
	c.fillStyle = rgba(mix(pal.core, [255, 240, 190], 0.5), 0.8);
	c.fill();
	c.restore();
}

function drawPoppy(c: Ctx, x: number, y: number, ang: number, R: number, o: number, fresh: number, p: Plant, k: Look, thin: number) {
	const pal: Pal = {
		pet: k.lift(mix(p.pal.pet, k.straw, 0.45 * (1 - fresh))),
		lo: k.lift(mix(p.pal.lo, k.strawLo, 0.45 * (1 - fresh))),
		hi: k.lift(p.pal.hi),
		core: k.lift(p.pal.core),
	};
	c.save();
	c.translate(x, y);
	c.rotate(ang);
	c.scale(1, 0.78 - 0.14 * (1 - fresh));
	const rr = R * (0.55 + 0.45 * o) * (0.82 + 0.18 * fresh);
	for (let i = 0; i < 4; i++) {
		const a = (i / 4) * TAU + Math.PI / 4 + hr(p.id, 30 + i) * 0.2;
		const cx = Math.cos(a) * rr * 0.5;
		const cy = Math.sin(a) * rr * 0.5;
		c.save();
		c.translate(cx, cy);
		c.rotate(a);
		c.beginPath();
		c.ellipse(0, 0, rr * 0.62, rr * 0.55, 0, 0, TAU);
		c.fillStyle = rgba(pal.pet, 0.88);
		c.fill();
		c.beginPath();
		c.ellipse(-rr * 0.25, 0, rr * 0.3, rr * 0.4, 0, 0, TAU);
		c.fillStyle = rgba(pal.lo, 0.4);
		c.fill();
		c.beginPath();
		c.ellipse(rr * 0.2, -rr * 0.15, rr * 0.28, rr * 0.2, 0.3, 0, TAU);
		c.fillStyle = rgba(pal.hi, 0.4);
		c.fill();
		c.lineWidth = thin * 0.8;
		c.strokeStyle = rgba(pal.lo, 0.4);
		c.beginPath();
		c.arc(0, 0, rr * 0.6, -0.9, 0.9);
		c.stroke();
		c.restore();
	}
	c.beginPath();
	c.arc(0, 0, rr * 0.3, 0, TAU);
	c.fillStyle = rgba(pal.core, 0.9);
	c.fill();
	c.beginPath();
	c.arc(0, 0, rr * 0.14, 0, TAU);
	c.fillStyle = rgba(k.leaf, 0.9);
	c.fill();
	c.restore();
}

/** A soft plume: a curved rachis with a fan of fine barbs. */
function drawPlume(c: Ctx, x: number, y: number, ang: number, L: number, fresh: number, dry: number, p: Plant, k: Look, thin: number) {
	const col = k.lift(mix(mix(p.pal.pet, k.straw, 0.5 * (1 - fresh)), k.straw, dry));
	const lo = k.lift(mix(mix(p.pal.lo, k.strawLo, 0.5 * (1 - fresh)), k.strawLo, dry));
	c.save();
	c.translate(x, y);
	c.rotate(ang);
	const w = L * 0.2;
	c.beginPath();
	c.moveTo(0, 0);
	c.bezierCurveTo(w * 1.4, -L * 0.25, w * 1.2, -L * 0.8, 0, -L);
	c.bezierCurveTo(-w * 1.2, -L * 0.8, -w * 1.4, -L * 0.25, 0, 0);
	c.fillStyle = rgba(col, 0.5);
	c.fill();
	c.lineCap = "round";
	c.lineWidth = thin * 0.9;
	for (let i = 0; i < 11; i++) {
		const u = 0.1 + (i / 10) * 0.82;
		const side = i % 2 ? 1 : -1;
		const sp = (0.9 - u * 0.5) * w;
		c.strokeStyle = rgba(i % 3 ? col : lo, 0.8);
		c.beginPath();
		c.moveTo(0, -L * u);
		c.quadraticCurveTo(side * sp * 0.7, -L * (u + 0.08), side * sp * 0.9, -L * (u + 0.17));
		c.stroke();
	}
	c.lineWidth = thin * 1.2;
	c.strokeStyle = rgba(lo, 0.8);
	c.beginPath();
	c.moveTo(0, 0);
	c.lineTo(0, -L);
	c.stroke();
	c.restore();
}

/* seed heads */
function drawSeedHead(c: Ctx, x: number, y: number, ang: number, R: number, p: Plant, k: Look, thin: number) {
	c.save();
	c.translate(x, y);
	c.rotate(ang);
	if (p.form === 0) {
		// a clock: a pale ball and a ring of fine hairs
		c.beginPath();
		c.arc(0, -R * 0.55, R * 0.55, 0, TAU);
		c.fillStyle = rgba(k.lift([236, 226, 200]), 0.55);
		c.fill();
		c.lineWidth = thin * 0.8;
		c.lineCap = "round";
		for (let i = 0; i < 14; i++) {
			const a = (i / 14) * TAU;
			c.strokeStyle = rgba(i % 2 ? k.straw : k.strawLo, 0.75);
			c.beginPath();
			c.moveTo(Math.cos(a) * R * 0.2, -R * 0.55 + Math.sin(a) * R * 0.2);
			c.lineTo(Math.cos(a) * R * 0.95, -R * 0.55 + Math.sin(a) * R * 0.95);
			c.stroke();
		}
		c.beginPath();
		c.arc(0, -R * 0.55, R * 0.18, 0, TAU);
		c.fillStyle = rgba(k.strawLo, 0.9);
		c.fill();
	} else {
		// a poppy pod: capsule under a flat crown
		c.beginPath();
		c.ellipse(0, -R * 0.55, R * 0.42, R * 0.6, 0, 0, TAU);
		c.fillStyle = rgba(k.straw, 0.92);
		c.fill();
		c.beginPath();
		c.ellipse(-R * 0.15, -R * 0.55, R * 0.18, R * 0.42, 0, 0, TAU);
		c.fillStyle = rgba(k.strawLo, 0.35);
		c.fill();
		c.beginPath();
		c.ellipse(0, -R * 1.12, R * 0.5, R * 0.14, 0, 0, TAU);
		c.fillStyle = rgba(k.strawLo, 0.9);
		c.fill();
	}
	c.restore();
}

/* ------------------------------------------------------------ plant */

function windAt(t: number, x: number) {
	return 0.78 + 0.22 * Math.sin(t * 0.31 - x * 0.004) + 0.1 * Math.sin(t * 0.17 + 1);
}

const stemA = newStem();
const stemB = newStem();
const stemC = newStem();

function drawSeedling(c: Ctx, p: Plant, t: number, k: Look, thin: number, wind: number) {
	const sw = 0.1 * wind * Math.sin((TAU * t) / p.per + p.ph);
	const h = 16 * p.s;
	buildStem(stemA, p.x, p.base, h, () => p.lean + sw * 0.5, 0.05, p.per, p.ph, t, wind);
	strokeStem(c, stemA, 1.4 * p.s, 1.0, k.stem, k.leaf);
	const [tx, ty, ta] = at(stemA, 1);
	for (const sd of [-1, 1]) leaf(c, tx, ty + 1, ta + sd * 1.15, 8 * p.s, 3.6 * p.s, sd * 0.1, k.leaf, k.leafLo, thin);
	leaf(c, tx, ty, ta, 6 * p.s, 2.2 * p.s, 0, k.lift([150, 176, 112]), k.leafLo, thin);
}

function drawFlowerPlant(c: Ctx, p: Plant, t: number, k: Look, thin: number, wind: number, heads: Head[]) {
	const s = p.s;
	const n = p.brews;
	const len = p.len * s;
	const dry = p.finished ? 1 : 0;
	const droop = p.finished ? 0.35 : 1 - p.fresh;
	const stemCol = mix(k.stem, k.straw, Math.max(dry, droop * 0.55));
	const leafCol = mix(mix(k.leaf, [92, 120, 78], p.tone * 0.35), k.straw, Math.max(dry * 0.85, smooth(0.5, 1, droop) * 0.6));
	const leafLo = mix(k.leafLo, k.strawLo, Math.max(dry, droop * 0.5));
	const budding = n >= 3;
	const blooming = n >= 5 && !p.finished;
	const open = blooming ? 0.55 + 0.45 * p.fresh : 0;
	const hook = blooming ? (1 - open) * 1.2 : budding && !p.finished ? 1.6 : p.finished ? 0.4 : 0;
	const nodAmt = (p.form === 1 ? hook : hook * 0.4) + droop * 0.95;
	const rest = (u: number) =>
		p.lean * u + 0.12 * Math.sin(u * 3.2 + p.ph) * u + p.nod * nodAmt * smooth(0.55, 1, u) ** 1.4;
	const amp = 0.12 * (140 / Math.max(60, len)) ** 0.3;
	buildStem(stemA, p.x, p.base, len, rest, amp, p.per, p.ph, t, wind);

	// leaves first (behind the stem)
	const nodes = Math.min(5, 1 + (n >> 1));
	const lenL = (p.form === 1 ? 30 : 26) * s * (p.finished ? 0.7 : 1);
	for (let i = 0; i < nodes; i++) {
		const u = 0.08 + (i / Math.max(1, nodes)) * 0.5;
		const sd = i % 2 ? 1 : -1;
		if (p.finished && hr(p.id, 40 + i) < 0.5) continue;
		const [lx, ly, la] = at(stemA, u);
		const sz = lenL * (1 - u * 0.6) * (0.85 + 0.3 * hr(p.id, 50 + i));
		leaf(c, lx, ly, la + sd * (0.95 + 0.2 * hr(p.id, 55 + i)) + 0.05 * Math.sin(t * 0.9 + i + p.ph), sz, sz * 0.26, -sd * 0.3, leafCol, leafLo, thin);
	}
	strokeStem(c, stemA, 2.3 * s, 1.2 * s, stemCol, k.lift([170, 196, 130]));

	const head = (x: number, y: number, a: number, size: number, kind: "bloom" | "bud" | "seed") => {
		if (kind === "seed") drawSeedHead(c, x, y, a, size, p, k, thin);
		else if (kind === "bud") drawBud(c, x, y, a, size * 0.5, p, k, thin);
		else {
			(p.form === 0 ? drawDaisy : drawPoppy)(c, x, y, a, size, open, p.fresh, p, k, thin);
			if (p.fresh > 0.55) heads.push({ x, y: y - size * 0.15, r: size });
		}
	};
	const R = (p.form === 0 ? 23 : 21) * s * (0.92 + (p.id % 3) * 0.04);
	// side stems carry the second and third flowers
	const sides = p.finished ? (n >= 8 ? 1 : 0) : n >= 5 ? Math.min(2, (n - 5) >> 2) : 0;
	const sideBuds = !p.finished && n >= 3 ? Math.min(2, 1 + (n >> 3)) - sides : 0;
	for (let i = 0; i < sides + Math.max(0, sideBuds); i++) {
		const u = 0.5 + i * 0.16;
		const [bx, by, ba] = at(stemA, u);
		const sd = i % 2 ? 1 : -1;
		const sl = len * (0.2 - i * 0.03);
		const isFlower = i < sides;
		const sRest = (v: number) => ba + sd * (0.55 + 0.25 * v) + p.nod * droop * 0.7 * v * v;
		buildStem(stemB, bx, by, sl, sRest, amp * 1.2, p.per * 0.8, p.ph + i + 1, t, wind);
		strokeStem(c, stemB, 1.3 * s, 0.9 * s, stemCol, k.leaf);
		const [hx, hy, ha] = at(stemB, 1);
		head(hx, hy, ha, R * 0.8, p.finished ? "seed" : isFlower ? "bloom" : "bud");
	}
	const [mx, my, ma] = at(stemA, 1);
	head(mx, my, ma, R, p.finished ? "seed" : blooming ? "bloom" : budding ? "bud" : "bud");
	if (!budding && !p.finished) {
		// still leafy: a tuft at the tip
		for (const sd of [-1, 0, 1]) leaf(c, mx, my, ma + sd * 0.7, 10 * s, 3.4 * s, sd * 0.1, k.lift([150, 178, 112]), leafLo, thin);
	}
	if (p.finished) seedsAway(c, mx, my, p, t, k, thin);
}

function drawGrass(c: Ctx, p: Plant, t: number, k: Look, thin: number, wind: number, heads: Head[]) {
	const s = p.s;
	const n = p.brews;
	const dry = p.finished ? 1 : 0;
	const droop = p.finished ? 0.3 : 1 - p.fresh;
	const col = mix(mix(k.leaf, [92, 120, 78], p.tone * 0.35), k.straw, Math.max(dry * 0.8, smooth(0.6, 1, droop) * 0.55));
	const lo = mix(k.leafLo, k.strawLo, Math.max(dry, droop * 0.4));
	const blades = 4 + Math.min(7, n >> 1);
	const H = p.len * s;
	// blades first, back to front
	for (let i = 0; i < blades; i++) {
		const side = i % 2 ? 1 : -1;
		const fr = 0.45 + 0.55 * hr(p.id, 60 + i);
		const L = H * fr * 0.8;
		const lean = side * (0.1 + 0.35 * hr(p.id, 70 + i)) + p.lean;
		const arch = side * (0.5 + 0.7 * hr(p.id, 80 + i));
		buildStem(
			stemB,
			p.x + side * (1 + hr(p.id, 90 + i) * 5) * s,
			p.base,
			L,
			(u) => lean + arch * u ** 1.8,
			0.2,
			p.per * (0.9 + 0.2 * hr(p.id, 100 + i)),
			p.ph + i * 0.9,
			t,
			wind,
		);
		// tapered ribbon
		const w = 2.8 * s;
		c.beginPath();
		for (let j = 0; j <= N; j++) {
			const ww = w * (1 - j / N) ** 0.8;
			const nx = Math.cos(stemB.a[j]) * ww;
			if (j === 0) c.moveTo(stemB.x[j] - nx, stemB.y[j]);
			else c.lineTo(stemB.x[j] - nx, stemB.y[j]);
		}
		for (let j = N; j >= 0; j--) {
			const ww = w * (1 - j / N) ** 0.8;
			c.lineTo(stemB.x[j] + Math.cos(stemB.a[j]) * ww, stemB.y[j]);
		}
		c.closePath();
		c.fillStyle = rgba(i % 2 ? col : mix(col, lo, 0.35), 0.9);
		c.fill();
		c.lineWidth = thin * 0.9;
		c.strokeStyle = rgba(lo, 0.5);
		c.beginPath();
		c.moveTo(stemB.x[0], stemB.y[0]);
		for (let j = 1; j <= N * 0.85; j++) c.lineTo(stemB.x[j], stemB.y[j]);
		c.stroke();
	}
	// flowering culms
	const culms = n >= 5 ? Math.min(3, 1 + ((n - 5) >> 2)) : 0;
	for (let i = 0; i < culms; i++) {
		const side = i % 2 ? 1 : -1;
		const L = H * (1.05 - i * 0.18);
		const nod = (droop * 1.1 + (p.finished ? 0.7 : 0.15)) * p.nod;
		buildStem(
			stemC,
			p.x + side * 2 * s,
			p.base,
			L,
			(u) => side * 0.1 * (i + 1) + p.lean + nod * smooth(0.55, 1, u) ** 1.4,
			0.13,
			p.per * (1 + i * 0.15),
			p.ph + i * 1.7,
			t,
			wind,
		);
		strokeStem(c, stemC, 1.5 * s, 0.9 * s, mix(k.stem, k.straw, Math.max(dry, droop * 0.5)), k.leaf);
		const [px, py, pa] = at(stemC, 1);
		const PL = 30 * s * (1 - i * 0.12);
		drawPlume(c, px, py, pa, PL, p.fresh, dry, p, k, thin);
		if (p.finished) seedsAway(c, px, py - PL * 0.5, p, t, k, thin);
		else if (p.fresh > 0.55) heads.push({ x: px + Math.sin(pa) * PL * 0.4, y: py - Math.cos(pa) * PL * 0.4, r: PL * 0.5 });
	}
	if (n >= 3 && n < 5 && !p.finished) {
		// before flowering, one green plume-in-bud
		buildStem(stemC, p.x, p.base, H * 0.95, (u) => p.lean + p.nod * 0.25 * u * u, 0.12, p.per, p.ph, t, wind);
		strokeStem(c, stemC, 1.4 * s, 0.9 * s, k.stem, k.leaf);
		const [px, py, pa] = at(stemC, 1);
		drawBud(c, px, py, pa, 8 * s, p, k, thin);
	}
}

/** A few seeds let go of a seed head, ride the breeze and fade. */
function seedsAway(c: Ctx, hx: number, hy: number, p: Plant, t: number, k: Look, thin: number) {
	for (let i = 0; i < 2; i++) {
		const cyc = 17 + hr(p.id, 110 + i) * 9;
		const ph = ((t / cyc + hr(p.id, 120 + i)) % 1 + 1) % 1;
		if (ph > 0.85) continue;
		const e = ph / 0.85;
		const x = hx + 80 * p.s * e * e + 8 * Math.sin(e * 9 + i);
		const y = hy - 46 * p.s * Math.sin(e * Math.PI * 0.8) + 18 * p.s * e * e + 3 * Math.sin(e * 13);
		const a = smooth(0, 0.08, e) * (1 - smooth(0.6, 1, e));
		c.strokeStyle = rgba(k.lift([232, 220, 190]), 0.8 * a);
		c.lineWidth = thin * 0.8;
		c.beginPath();
		for (let j = -2; j <= 2; j++) {
			c.moveTo(x, y);
			c.lineTo(x + j * 2.1, y - 5.5 + Math.abs(j) * 0.8);
		}
		c.stroke();
		c.beginPath();
		c.arc(x, y, 0.9, 0, TAU);
		c.fillStyle = rgba(k.strawLo, a);
		c.fill();
	}
}

/* ------------------------------------------------------------ bee */

function drawBee(c: Ctx, heads: Head[], t: number, k: Look, s: number) {
	if (!heads.length) return;
	const T = 9;
	const idx = Math.floor(t / T);
	const pick = (i: number) => heads[Math.floor(hash32(i * 7 + 3) * heads.length) % heads.length];
	const to = pick(idx);
	const from = pick(idx - 1);
	const ph = (t % T) / T;
	const e = smooth(0, 0.38, ph);
	const hover = smooth(0.38, 1, ph);
	let x = from.x + (to.x - from.x) * e;
	let y = from.y + (to.y - from.y) * e - 12 * s * Math.sin(e * Math.PI);
	x += 6 * s * Math.sin(ph * 40) * (1 - e) * e * 2 + Math.sin(t * 2.1) * 2.2 * hover;
	y += Math.sin(t * 2.7) * 1.8 * hover - to.r * 0.2 * hover;
	const dir = to.x >= from.x ? 1 : -1;
	c.save();
	c.translate(x, y);
	c.scale(dir * s * 1.15, s * 1.15);
	c.rotate(-0.15 * (1 - hover));
	c.fillStyle = rgba(k.lift([240, 244, 250]), 0.55);
	c.beginPath();
	c.ellipse(-1, -3.4, 3.4, 1.7, -0.5, 0, TAU);
	c.ellipse(1.2, -3.1, 3, 1.5, -0.1, 0, TAU);
	c.fill();
	c.beginPath();
	c.ellipse(0, 0, 3.8, 2.5, 0, 0, TAU);
	c.fillStyle = rgba(k.lift([214, 160, 56]), 1);
	c.fill();
	c.fillStyle = rgba(k.dark ? [30, 24, 20] : [58, 44, 36], 0.9);
	c.fillRect(-1.6, -2.3, 1.1, 4.6);
	c.fillRect(0.7, -2.4, 1.1, 4.8);
	c.beginPath();
	c.arc(3.8, -0.2, 1.5, 0, TAU);
	c.fill();
	c.restore();
}

/* ------------------------------------------------------------ ground */

/** No band: a few pebbles and tufts at each root, in the plants' own colours. */
function drawGround(c: Ctx, plants: Plant[], k: Look, thin: number) {
	for (const p of plants) {
		const a = p.back ? 0.5 : 0.8;
		c.lineCap = "round";
		c.lineWidth = thin * 1.1;
		for (let i = 0; i < 3; i++) {
			const sd = i - 1;
			const x = p.x + sd * (6 + 4 * hr(p.id, 140 + i)) * p.s;
			const h = (5 + 4 * hr(p.id, 143 + i)) * p.s;
			c.strokeStyle = rgba(i === 1 ? k.leafLo : k.leaf, 0.7 * a);
			c.beginPath();
			c.moveTo(x, p.base + 1);
			c.quadraticCurveTo(x + sd * 1.5 * p.s, p.base - h * 0.6, x + sd * 4 * p.s, p.base - h);
			c.stroke();
		}
		for (let i = 0; i < 4; i++) {
			const x = p.x + (hr(p.id, 150 + i) - 0.5) * 38 * p.s;
			c.beginPath();
			c.ellipse(x, p.base + 2 + hr(p.id, 155 + i) * 3, (1 + hr(p.id, 160 + i)) * 1.2, 0.9, 0, 0, TAU);
			c.fillStyle = rgba(k.soil, 0.5 * a);
			c.fill();
		}
	}
}

/* ------------------------------------------------------------ scene */

export const beangarden: Scene = ({ dither: c }, env) => {
	const { t, W, H, anchors, dark, journal, now } = env;
	const frame = anchors.frame ?? anchors.content;
	const plants = layout(W, H, frame, journal.beans, now);
	const k = lookFor(dark);
	const scale = c.getTransform().a;
	const thin = clamp(1 / scale / 2, 0.5, 1);
	const s = sceneScale(W, H, frame);
	const heads: Head[] = [];
	drawGround(c, plants, k, thin);
	for (const p of plants) {
		const wind = windAt(t, p.x);
		c.globalAlpha = p.back ? 0.85 : 1;
		if (p.seedling) drawSeedling(c, p, t, k, thin, wind);
		else if (p.form === 2) drawGrass(c, p, t, k, thin, wind, heads);
		else drawFlowerPlant(c, p, t, k, thin, wind, heads);
	}
	c.globalAlpha = 1;
	drawBee(c, heads, t, k, s);
};
