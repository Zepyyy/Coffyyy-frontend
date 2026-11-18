import type { Box, Scene } from "../engine";

/**
 * A night window.
 *
 * We sit inside, by a wooden window, looking out on a forest valley. The frame
 * and its deep sill run along the page edges and the foot; mullions stand in
 * the gutters, never across the column. A lamp somewhere off to the right
 * warms the wood. On the sill a cat sleeps in a curl, breathing slowly, now
 * and then curling its tail or flicking an ear; beside a plant at the left a
 * mug steams.
 *
 * Outside it is all big soft shapes: two ridges fading into the sky, a lake
 * between dark wooded hills, a cabin with one lit window by the shore, mist
 * drifting along the valley, a few fireflies, and very rarely a shooting
 * star. Light paper is the blue hour; dark paper is deep night under the
 * Milky Way.
 *
 * Everything still is painted once into a single cached plate; the per-frame
 * life is a handful of sprites and short paths. Everything is a function of t.
 */

type Rgb = [number, number, number];
/** A colour and its coverage. On dark paper coverage carries the brightness. */
type Ink = [Rgb, number];
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const rgba = (c: Rgb, a: number) =>
	`rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${clamp(a, 0, 1).toFixed(3)})`;
const ink = (i: Ink, k = 1) => rgba(i[0], i[1] * k);
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
function fbm1(x: number, seed: number, oct = 3) {
	let s = 0;
	let a = 0.5;
	let n = 0;
	for (let i = 0; i < oct; i++) {
		s += a * noise1(x, seed + i * 17);
		n += a;
		x *= 2.03;
		a *= 0.45;
	}
	return s / n;
}

/* ------------------------------------------------------------------ ink */

type Pal = {
	night: boolean;
	/** Sky stops from the top of the field down to the far ridge. */
	sky: [number, Ink][];
	glow: Ink;
	star: Ink;
	milky: Ink;
	ridge: [Ink, Ink][];
	floor: Ink;
	lake: [Ink, Ink];
	hill: [Ink, Ink];
	wood: [Ink, Ink];
	woodRim: Ink;
	mist: Ink;
	window: Rgb;
	cabin: Ink;
	/** Window wood: in shade, lamp-lit, the bright catch on an edge. */
	frame: [Ink, Ink, Ink];
	sill: [Ink, Ink];
	wall: Ink;
	lamp: Ink;
	shadow: Ink;
	fog: Ink;
	cat: [Ink, Ink, Ink];
	catRim: Ink;
	catSky: Ink;
	ear: Ink;
	paw: Ink;
	mug: [Ink, Ink];
	coffee: Ink;
	pot: [Ink, Ink];
	leaf: [Ink, Ink];
	steam: Ink;
	fly: Rgb;
};

const PALS: Record<"light" | "dark", Pal> = {
	light: {
		night: false,
		sky: [
			[0, [[78, 92, 150], 0.86]],
			[0.35, [[112, 118, 172], 0.74]],
			[0.68, [[168, 150, 192], 0.6]],
			[0.88, [[222, 172, 178], 0.56]],
			[1, [[242, 190, 160], 0.6]],
		],
		glow: [[250, 186, 140], 0.38],
		star: [[255, 255, 255], 1],
		milky: [[255, 255, 255], 0],
		ridge: [
			[
				[[150, 140, 188], 0.84],
				[[206, 180, 200], 0.7],
			],
			[
				[[112, 112, 166], 0.9],
				[[176, 160, 196], 0.76],
			],
		],
		floor: [[150, 146, 186], 0.86],
		lake: [
			[[246, 196, 178], 0.66],
			[[160, 150, 200], 0.8],
		],
		hill: [
			[[58, 68, 114], 0.96],
			[[112, 112, 166], 0.92],
		],
		wood: [
			[[34, 42, 96], 1],
			[[66, 70, 128], 1],
		],
		woodRim: [[150, 136, 190], 1],
		mist: [[232, 214, 228], 0.6],
		window: [255, 188, 112],
		cabin: [[46, 48, 72], 1],
		frame: [
			[[96, 50, 40], 1],
			[[178, 100, 58], 1],
			[[246, 172, 106], 1],
		],
		sill: [
			[[104, 58, 44], 1],
			[[214, 138, 84], 1],
		],
		wall: [[86, 46, 42], 1],
		lamp: [[255, 176, 104], 0.7],
		shadow: [[78, 36, 34], 0.6],
		fog: [[238, 232, 244], 0.32],
		cat: [
			[[96, 54, 46], 1],
			[[176, 106, 66], 1],
			[[226, 156, 100], 1],
		],
		catRim: [[252, 204, 146], 1],
		catSky: [[176, 168, 214], 0.75],
		ear: [[230, 150, 140], 0.9],
		paw: [[244, 230, 210], 1],
		mug: [
			[[120, 128, 140], 1],
			[[220, 206, 186], 1],
		],
		coffee: [[58, 40, 36], 1],
		pot: [
			[[120, 70, 60], 1],
			[[206, 136, 102], 1],
		],
		leaf: [
			[[30, 70, 60], 1],
			[[120, 168, 100], 1],
		],
		steam: [[248, 244, 250], 0.5],
		fly: [255, 214, 130],
	},
	dark: {
		night: true,
		sky: [
			[0, [[70, 84, 150], 0.05]],
			[0.45, [[78, 94, 160], 0.1]],
			[0.8, [[96, 110, 176], 0.2]],
			[1, [[120, 134, 194], 0.32]],
		],
		glow: [[130, 142, 204], 0.1],
		star: [[236, 238, 252], 1],
		milky: [[196, 204, 240], 0.28],
		ridge: [
			[
				[[120, 134, 194], 0.2],
				[[140, 152, 206], 0.26],
			],
			[
				[[100, 114, 178], 0.11],
				[[126, 140, 198], 0.2],
			],
		],
		floor: [[110, 124, 186], 0.14],
		lake: [
			[[150, 162, 216], 0.3],
			[[110, 124, 186], 0.12],
		],
		hill: [
			[[90, 104, 166], 0.05],
			[[110, 124, 186], 0.12],
		],
		wood: [
			[[80, 94, 156], 0],
			[[90, 104, 166], 0.05],
		],
		woodRim: [[130, 144, 204], 0.16],
		mist: [[150, 164, 214], 0.3],
		window: [255, 192, 116],
		cabin: [[0, 0, 0], 0],
		frame: [
			[[150, 120, 110], 0.02],
			[[214, 150, 104], 0.1],
			[[255, 196, 140], 0.34],
		],
		sill: [
			[[180, 130, 100], 0.03],
			[[224, 160, 112], 0.2],
		],
		wall: [[120, 96, 90], 0.01],
		lamp: [[255, 178, 112], 0.5],
		shadow: [[0, 0, 0], 0.8],
		fog: [[160, 172, 220], 0.1],
		cat: [
			[[160, 110, 90], 0.03],
			[[220, 140, 90], 0.14],
			[[240, 170, 110], 0.34],
		],
		catRim: [[255, 200, 140], 0.75],
		catSky: [[150, 162, 220], 0.2],
		ear: [[250, 170, 150], 0.18],
		paw: [[255, 232, 204], 0.36],
		mug: [
			[[170, 160, 160], 0.06],
			[[250, 220, 190], 0.48],
		],
		coffee: [[0, 0, 0], 0],
		pot: [
			[[200, 120, 90], 0.06],
			[[240, 160, 120], 0.42],
		],
		leaf: [
			[[110, 150, 120], 0.03],
			[[190, 200, 150], 0.26],
		],
		steam: [[220, 210, 220], 0.2],
		fly: [236, 226, 140],
	},
};

/* ----------------------------------------------------------------- plan */

type Pane = { x: number; y: number; w: number; h: number };

type Plan = {
	W: number;
	H: number;
	S: number;
	key: string;
	/** Jamb width, head rail height, mullion width. */
	J: number;
	T: number;
	M: number;
	/** Mullion centres (empty on narrow pages). */
	mull: number[];
	muntinY: number;
	railTop: number;
	sillTop: number;
	sillFront: number;
	noseBot: number;
	panes: Pane[];
	farY: number;
	midY: number;
	floorY: number;
	hillL: number;
	hillR: number;
	lakeY: number;
	lakeL: number;
	lakeR: number;
	bandY: number;
	cabin: { x: number; y: number; s: number };
	lampX: number;
	lampY: number;
	cat: { x: number; y: number; u: number };
	mug: { x: number; y: number; u: number };
	pot: { x: number; y: number; u: number };
	plate: HTMLCanvasElement | null;
	catBody: Sprite | null;
	catHead: Sprite | null;
	puff: HTMLCanvasElement | null;
	spark: HTMLCanvasElement | null;
};

type Sprite = {
	paint: HTMLCanvasElement;
	mask: HTMLCanvasElement;
	x: number;
	y: number;
	w: number;
	h: number;
};

function columnOf(W: number, anchors: Record<string, Box>): Box {
	if (anchors.frame) return anchors.frame;
	if (W < 640) return { x: 16, y: 0, w: W - 32, h: 0 };
	const gutter = Math.max(40, Math.min(152, W * 0.1875 - 80));
	const w = Math.min(976, Math.max(0, W - 2 * gutter));
	return { x: (W - w) / 2, y: 0, w, h: 0 };
}

function plan(W: number, H: number, col: Box): Plan {
	const S = clamp(Math.min(W / 1440, H / 836), 0.55, 1.35);
	const J = Math.round(clamp(W * 0.044, 22, 72));
	const T = Math.round(28 * S);
	const M = Math.round(20 * S);
	const mull: number[] = [];
	const gl = col.x;
	const gr = W - (col.x + col.w);
	if (gl - J > 90 * S && gr - J > 90 * S) {
		mull.push(Math.round(col.x - 34 * S), Math.round(col.x + col.w + 34 * S));
	}
	const sillTop = Math.round(H - 90 - 82 * S);
	const railTop = sillTop - Math.round(16 * S);
	const sillFront = sillTop + Math.round(50 * S);
	const noseBot = sillFront + Math.round(16 * S);
	const muntinY = Math.round(lerp(T, railTop, 0.4));
	const edges = [J, ...mull.flatMap((m) => [m - M / 2, m + M / 2]), W - J];
	const panes: Pane[] = [];
	for (let i = 0; i < edges.length; i += 2)
		panes.push({ x: edges[i], y: T, w: edges[i + 1] - edges[i], h: railTop - T });
	// The land keeps its height on tall pages; the sky takes the rest.
	const L = Math.min(railTop, 780 * S);
	const land = (f: number) => railTop - f * L;
	const bandY = land(0.09);
	const lakeY = land(0.18);
	return {
		W,
		H,
		S,
		key: "",
		J,
		T,
		M,
		mull,
		muntinY,
		railTop,
		sillTop,
		sillFront,
		noseBot,
		panes,
		farY: land(0.37),
		midY: land(0.3),
		floorY: land(0.24),
		hillL: land(0.32),
		hillR: land(0.3),
		lakeY,
		lakeL: W * 0.27,
		lakeR: W * 0.74,
		bandY,
		cabin: { x: W * 0.74 + 22 * S, y: lakeY + 2 * S, s: S },
		lampX: W + 30 * S,
		lampY: sillTop - 150 * S,
		cat: {
			x: W - J - 134 * S,
			y: sillTop + 34 * S,
			u: S * 1.02,
		},
		mug: { x: Math.max(J + 70 * S, gl - 92 * S), y: sillTop + 36 * S, u: S },
		pot: { x: J * 0.55 + 18 * S, y: sillTop + 32 * S, u: S },
		plate: null,
		catBody: null,
		catHead: null,
		puff: null,
		spark: null,
	};
}

/* ----------------------------------------------------------------- pens */

/**
 * Draws a layer. On dark paper a solid shape must cut what lies behind it,
 * since paper is the darkest tone; the mask keeps the silhouette for the
 * moment the layer is laid on another.
 */
type Pen = { g: Ctx; m: Ctx | null; night: boolean };

function solid(p: Pen, path: Path2D, style: string | CanvasGradient) {
	p.g.globalCompositeOperation = "destination-out";
	p.g.fillStyle = "#000";
	p.g.fill(path);
	p.g.globalCompositeOperation = "source-over";
	p.g.fillStyle = style;
	p.g.fill(path);
	if (p.m) {
		p.m.fillStyle = "#000";
		p.m.fill(path);
	}
}

function tint(p: Pen, path: Path2D | null, style: string | CanvasGradient) {
	p.g.fillStyle = style;
	if (path) p.g.fill(path);
	else {
		// The whole canvas, in whatever space the gradient was made in.
		const m = p.g.getTransform().inverse();
		const { width: w, height: h } = p.g.canvas;
		const xs: number[] = [];
		const ys: number[] = [];
		for (const [cx, cy] of [
			[0, 0],
			[w, 0],
			[0, h],
			[w, h],
		]) {
			const q = m.transformPoint({ x: cx, y: cy });
			xs.push(q.x);
			ys.push(q.y);
		}
		const x0 = Math.min(...xs);
		const y0 = Math.min(...ys);
		p.g.fillRect(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0);
	}
}

/** Darken: ink on light paper, a cut toward paper on dark. */
function shade(
	p: Pen,
	path: Path2D | null,
	make: (c: Rgb, k: number) => string | CanvasGradient,
	pal: Pal,
) {
	if (p.night) {
		p.g.globalCompositeOperation = "destination-out";
		tint(p, path, make([0, 0, 0], pal.shadow[1]));
		p.g.globalCompositeOperation = "source-over";
	} else tint(p, path, make(pal.shadow[0], pal.shadow[1]));
}

function surface(scale: number, x: number, y: number, w: number, h: number) {
	const cv = document.createElement("canvas");
	cv.width = Math.max(1, Math.ceil(w * scale));
	cv.height = Math.max(1, Math.ceil(h * scale));
	const g = cv.getContext("2d");
	if (!g) throw new Error("no 2d context");
	g.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
	return { cv, g };
}

function blur(g: Ctx, px: number, scale: number) {
	g.filter = px > 0 ? `blur(${(px * scale).toFixed(2)}px)` : "none";
}

/* ------------------------------------------------------------- outside */

/** A smooth silhouette through samples, closed down to `bottom`. */
function skyline(W: number, f: (x: number) => number, bottom: number, step = 8) {
	const path = new Path2D();
	path.moveTo(-20, bottom);
	let px = -20;
	let py = f(-20);
	path.lineTo(px, py);
	for (let x = -20 + step; x <= W + 20 + step; x += step) {
		const y = f(x);
		path.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
		px = x;
		py = y;
	}
	path.lineTo(px, py);
	path.lineTo(W + 20, bottom);
	path.closePath();
	return path;
}

/** Rounded crowns along a line: a forest edge read as one soft mass. */
function canopy(base: (x: number) => number, x: number, size: number, seed: number) {
	let y = base(x);
	const cell = size * 1.5;
	const i0 = Math.floor(x / cell);
	let lift = 0;
	for (let i = i0 - 2; i <= i0 + 2; i++) {
		const cx = (i + hash(i, seed)) * cell;
		const h = hash(i, seed + 1);
		const r = size * (0.6 + 1.1 * h * h);
		const d = (x - cx) / r;
		if (d * d < 1) lift = Math.max(lift, r * (0.3 + 0.25 * h) * Math.sqrt(1 - d * d));
	}
	y -= lift;
	return y;
}

function paintSky(p: Pen, P: Plan, pal: Pal, scale: number) {
	const { W, H, S, farY } = P;
	const g = p.g;
	const sky = g.createLinearGradient(0, 0, 0, farY + 30 * S);
	for (const [k, c] of pal.sky) sky.addColorStop(k, ink(c));
	tint(p, null, sky);
	// Afterglow behind the far ridge, off-centre to the right.
	const gx = W * 0.62;
	const glow = g.createRadialGradient(gx, farY, 0, gx, farY, W * 0.5);
	glow.addColorStop(0, ink(pal.glow));
	glow.addColorStop(0.5, ink(pal.glow, 0.35));
	glow.addColorStop(1, ink(pal.glow, 0));
	g.save();
	g.setTransform(scale, 0, 0, scale * 0.42, 0, farY * scale * 0.58);
	tint(p, null, glow);
	g.restore();

	// Milky Way: soft clouds along a gentle arc, a dust lane, dense stars.
	const band = (u: number): [number, number] => [
		lerp(-0.05, 1.05, u) * W,
		lerp(0.04, 0.5, u) * H - Math.sin(u * Math.PI) * 0.1 * H,
	];
	if (pal.milky[1] > 0) {
		for (let i = 0; i < 46; i++) {
			const u = i / 45;
			const [bx, by] = band(u);
			const r = (90 + 70 * hash(i, 31)) * S;
			const jitter = (hash(i, 32) - 0.5) * 60 * S;
			const gr = g.createRadialGradient(bx, by + jitter, 0, bx, by + jitter, r);
			const a = pal.milky[1] * (0.35 + 0.4 * Math.sin(u * Math.PI));
			gr.addColorStop(0, rgba(pal.milky[0], a));
			gr.addColorStop(1, rgba(pal.milky[0], 0));
			g.fillStyle = gr;
			g.fillRect(bx - r, by + jitter - r, r * 2, r * 2);
		}
		g.globalCompositeOperation = "destination-out";
		for (let i = 0; i < 18; i++) {
			const u = 0.15 + (i / 17) * 0.7;
			const [bx, by] = band(u);
			const r = (36 + 30 * hash(i, 34)) * S;
			const gr = g.createRadialGradient(bx + 10 * S, by + 8 * S, 0, bx + 10 * S, by + 8 * S, r);
			gr.addColorStop(0, `rgb(0 0 0 / ${0.5 * pal.milky[1]})`);
			gr.addColorStop(1, "rgb(0 0 0 / 0)");
			g.fillStyle = gr;
			g.fillRect(bx + 10 * S - r, by + 8 * S - r, r * 2, r * 2);
		}
		g.globalCompositeOperation = "source-over";
	}

	// Stars: fewer in the warm low sky, a cluster along the band at night.
	const n = Math.round(((W * farY) / 7000) * (pal.night ? 1 : 0.5));
	for (let i = 0; i < n; i++) {
		const x = hash(i, 41) * W;
		const yy = hash(i, 42);
		const y = yy * yy * farY;
		const fade = pal.night ? 1 - 0.7 * smooth(0.5, 1, y / farY) : 1 - smooth(0.15, 0.7, y / farY);
		if (fade <= 0.05) continue;
		const b = hash(i, 43);
		const r = (0.55 + b * b * 0.9) * Math.max(1, S * 0.9);
		const a = pal.star[1] * fade * (0.35 + 0.65 * b);
		g.fillStyle = rgba(pal.star[0], a);
		g.beginPath();
		g.arc(x, y, r, 0, TAU);
		g.fill();
		if (b > 0.9) {
			const gr = g.createRadialGradient(x, y, 0, x, y, r * 6);
			gr.addColorStop(0, rgba(pal.star[0], a * 0.35));
			gr.addColorStop(1, rgba(pal.star[0], 0));
			g.fillStyle = gr;
			g.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
		}
	}
	if (pal.night) {
		for (let i = 0; i < Math.round(W / 2.5); i++) {
			const u = hash(i, 51);
			const [bx, by] = band(u);
			const off = (hash(i, 52) + hash(i, 53) + hash(i, 57) - 1.5) * 70 * S;
			const y = by + off;
			if (y > farY - 10) continue;
			const a = 0.2 + 0.55 * hash(i, 54) ** 2;
			g.fillStyle = rgba(pal.star[0], a);
			g.beginPath();
			g.arc(bx + (hash(i, 55) - 0.5) * 40 * S, y, 0.5 + 0.4 * hash(i, 56), 0, TAU);
			g.fill();
		}
	}
}

function paintLand(p: Pen, P: Plan, pal: Pal, scale: number) {
	const { W, H, S, farY, midY, floorY, lakeY, lakeL, lakeR, bandY } = P;
	const g = p.g;
	const bottom = H;
	const fill = (top: number, c: [Ink, Ink], bot: number) => {
		const gr = g.createLinearGradient(0, top, 0, bot);
		gr.addColorStop(0, ink(c[0]));
		gr.addColorStop(1, ink(c[1]));
		return gr;
	};

	// Far ridge: two broad peaks. Mid ridge: lower, rounder, nearer.
	blur(g, 0, scale);
	const far = (x: number) =>
		farY -
		(Math.exp(-(((x / W - 0.2) / 0.16) ** 2)) * 46 +
			Math.exp(-(((x / W - 0.78) / 0.2) ** 2)) * 58 +
			(fbm1(x / (260 * S), 3) - 0.5) * 34) *
			S;
	solid(p, skyline(W, far, bottom), fill(farY - 60 * S, pal.ridge[0], floorY));
	// Mist pooling at the ridge's foot.
	const mistBand = (y: number, h: number, k: number) => {
		const gr = g.createLinearGradient(0, y - h, 0, y + h);
		gr.addColorStop(0, ink(pal.mist, 0));
		gr.addColorStop(0.55, ink(pal.mist, k));
		gr.addColorStop(1, ink(pal.mist, 0));
		g.fillStyle = gr;
		g.fillRect(-10, y - h, W + 20, h * 2);
	};
	mistBand(midY - 4 * S, 26 * S, 0.7);
	const mid = (x: number) =>
		midY -
		(Math.exp(-(((x / W - 0.46) / 0.22) ** 2)) * 26 +
			(fbm1(x / (180 * S), 7) - 0.5) * 30) *
			S;
	solid(p, skyline(W, mid, bottom), fill(midY - 40 * S, pal.ridge[1], floorY + 10 * S));
	mistBand(floorY - 6 * S, 22 * S, 0.8);

	// Valley floor and the lake on it.
	blur(g, 0, scale);
	const floor = new Path2D();
	floor.rect(-20, floorY, W + 40, bottom - floorY);
	solid(p, floor, ink(pal.floor));
	const lake = new Path2D();
	const lh = (bandY - lakeY) * 0.5 + 6 * S;
	lake.moveTo(lakeL, lakeY);
	lake.bezierCurveTo(lakeL + 60 * S, lakeY - lh * 0.55, lakeR - 120 * S, lakeY - lh * 0.6, lakeR, lakeY - 2 * S);
	lake.bezierCurveTo(lakeR - 40 * S, lakeY + lh, lakeL + 120 * S, lakeY + lh * 1.2, lakeL, lakeY);
	const lg = g.createLinearGradient(0, lakeY - lh, 0, lakeY + lh);
	lg.addColorStop(0, ink(pal.lake[0]));
	lg.addColorStop(1, ink(pal.lake[1]));
	solid(p, lake, lg);
	// The far shore's reflection: a soft darker strip under the far edge.
	g.save();
	g.clip(lake);
	const rg = g.createLinearGradient(0, lakeY - lh * 0.6, 0, lakeY + 4 * S);
	rg.addColorStop(0, ink(pal.ridge[1][0], 0.55));
	rg.addColorStop(1, ink(pal.ridge[1][0], 0));
	tint(p, null, rg);
	g.restore();

	// Wooded hills closing in from both sides.
	blur(g, 0, scale);
	const left = (x: number) => {
		const k = smooth(lakeL + 160 * S, -40 * S, x);
		return lerp(bandY + 30 * S, P.hillL, Math.sqrt(k)) + (fbm1(x / (120 * S), 63) - 0.5) * 14 * S;
	};
	const right = (x: number) => {
		const k = smooth(lakeR - 170 * S, W + 40 * S, x);
		return lerp(bandY + 30 * S, P.hillR, Math.sqrt(k)) + (fbm1(x / (110 * S), 69) - 0.5) * 14 * S;
	};
	const leftHill = skyline(W, (x) => canopy(left, x, 13 * S, 61), bottom, 3);
	const rightHill = skyline(W, (x) => canopy(right, x, 12 * S, 67), bottom, 3);
	const hillFill = (top: number) => fill(top, pal.hill, bandY + 30 * S);
	solid(p, leftHill, hillFill(P.hillL - 10 * S));
	solid(p, rightHill, hillFill(P.hillR - 10 * S));
	paintCabin(p, P, pal, scale);
	mistBand(bandY - 6 * S, 20 * S, 0.55);

	// The near treeline across the foot of the window.
	const near = (x: number) => {
		const edge = Math.min(x, W - x) / W;
		return bandY - (1 - smooth(0, 0.3, edge)) * 40 * S + (fbm1(x / (160 * S), 71) - 0.5) * 26 * S;
	};
	const band = skyline(W, (x) => canopy(near, x, 15 * S, 73), bottom, 3);
	// Sky light catches the crowns; the mass below falls into shade.
	solid(p, band, ink(pal.woodRim));
	g.save();
	g.clip(band);
	g.translate(0, 3.5 * S);
	g.globalCompositeOperation = "destination-out";
	g.fillStyle = "#000";
	g.fill(band);
	g.globalCompositeOperation = "source-over";
	tint(p, band, fill(bandY - 30 * S, pal.wood, bandY + 50 * S));
	g.restore();
	blur(g, 0, scale);
}

function paintCabin(p: Pen, P: Plan, pal: Pal, scale: number) {
	const { x, y, s } = P.cabin;
	const g = p.g;
	const w = 30 * s;
	const h = 15 * s;
	const body = new Path2D();
	body.rect(x - w / 2, y - h, w, h + 2 * s);
	const roof = new Path2D();
	roof.moveTo(x - w / 2 - 4 * s, y - h + 1 * s);
	roof.lineTo(x - w * 0.12, y - h - 12 * s);
	roof.lineTo(x + w * 0.12, y - h - 12 * s);
	roof.lineTo(x + w / 2 + 4 * s, y - h + 1 * s);
	roof.closePath();
	const chim = new Path2D();
	chim.rect(x + w * 0.2, y - h - 16 * s, 4 * s, 9 * s);
	blur(g, 0.5, scale);
	solid(p, chim, ink(pal.cabin));
	solid(p, body, ink(pal.cabin));
	solid(p, roof, ink(pal.cabin));
	blur(g, 0, scale);
	// One lit window, its spill on the ground and its streak on the water.
	const wx = x - w * 0.18;
	const wy = y - h * 0.55;
	const glow = g.createRadialGradient(wx, wy, 0, wx, wy, 18 * s);
	glow.addColorStop(0, rgba(pal.window, 0.4));
	glow.addColorStop(1, rgba(pal.window, 0));
	g.fillStyle = glow;
	g.fillRect(wx - 18 * s, wy - 18 * s, 36 * s, 36 * s);
	g.fillStyle = rgba(pal.window, 1);
	g.fillRect(wx - 3.5 * s, wy - 3 * s, 7 * s, 6 * s);
}

/* -------------------------------------------------------------- window */

function paintFrame(p: Pen, P: Plan, pal: Pal, scale: number) {
	const { W, H, S, J, T, M, mull, muntinY, railTop, sillTop, sillFront, noseBot, panes } = P;
	const g = p.g;
	const [shadeC, litC, edgeC] = pal.frame;
	/** A member's cross-section: shade, body, a caught edge toward `lit`. */
	const across = (x0: number, y0: number, x1: number, y1: number) => {
		const gr = g.createLinearGradient(x0, y0, x1, y1);
		gr.addColorStop(0, ink(shadeC));
		gr.addColorStop(0.55, ink(litC, 0.55));
		gr.addColorStop(0.82, ink(litC));
		gr.addColorStop(0.9, ink(edgeC));
		gr.addColorStop(1, ink(shadeC, 0.9));
		return gr;
	};
	const rect = (x: number, y: number, w: number, h: number) => {
		const r = new Path2D();
		r.rect(x, y, w, h);
		return r;
	};
	blur(g, 0, scale);
	// Wall below the sill, in the shade of its overhang.
	const wall = rect(-10, sillFront, W + 20, H - sillFront + 10);
	solid(p, wall, ink(pal.wall));
	// Muntins in the side panes only.
	for (const pn of panes) {
		if (pn.w > 400 * S) continue;
		solid(p, rect(pn.x - 2, muntinY - 6 * S, pn.w + 4, 12 * S), across(0, muntinY + 6 * S, 0, muntinY - 6 * S));
	}
	for (const m of mull) solid(p, rect(m - M / 2, 0, M, sillTop), across(m - M / 2, 0, m + M / 2, 0));
	// Jambs: lit on the edge that faces the glass.
	solid(p, rect(-10, 0, J + 10, sillTop), across(-10, 0, J, 0));
	solid(p, rect(W - J, 0, J + 10, sillTop), across(W + 10, 0, W - J, 0));
	solid(p, rect(-10, -10, W + 20, T + 10), across(0, -10, 0, T));
	solid(p, rect(-10, railTop, W + 20, sillTop - railTop), across(0, sillTop, 0, railTop));
	// The sill: its top face runs from the rail's shadow to a lit front edge.
	const top = rect(-10, sillTop, W + 20, sillFront - sillTop);
	const tg = g.createLinearGradient(0, sillTop, 0, sillFront);
	tg.addColorStop(0, ink(pal.sill[0]));
	tg.addColorStop(0.3, ink(pal.sill[1], 0.6));
	tg.addColorStop(1, ink(pal.sill[1]));
	solid(p, top, tg);
	const nose = rect(-10, sillFront, W + 20, noseBot - sillFront);
	const ng = g.createLinearGradient(0, sillFront, 0, noseBot);
	ng.addColorStop(0, ink(edgeC));
	ng.addColorStop(0.25, ink(litC));
	ng.addColorStop(1, ink(shadeC));
	solid(p, nose, ng);
	blur(g, 0, scale);
	// Overhang shadow on the wall.
	shade(
		p,
		rect(-10, noseBot, W + 20, 60 * S),
		(c, k) => {
			const gr = g.createLinearGradient(0, noseBot, 0, noseBot + 60 * S);
			gr.addColorStop(0, rgba(c, k));
			gr.addColorStop(1, rgba(c, 0));
			return gr;
		},
		pal,
	);
	// Contact shadow under the rail on the sill.
	shade(
		p,
		rect(-10, sillTop, W + 20, 10 * S),
		(c, k) => {
			const gr = g.createLinearGradient(0, sillTop, 0, sillTop + 10 * S);
			gr.addColorStop(0, rgba(c, k * 0.7));
			gr.addColorStop(1, rgba(c, 0));
			return gr;
		},
		pal,
	);
}

/** Warm light on everything the mask holds, falling away from the lamp. */
function lampLight(p: Pen, P: Plan, pal: Pal, scale: number, mask: HTMLCanvasElement) {
	const { W, H, lampX, lampY } = P;
	const l = surface(scale, 0, 0, W, H);
	const r = Math.hypot(W, H) * 0.85;
	const gr = l.g.createRadialGradient(lampX, lampY, 0, lampX, lampY, r);
	gr.addColorStop(0, ink(pal.lamp));
	gr.addColorStop(0.3, ink(pal.lamp, 0.55));
	gr.addColorStop(0.7, ink(pal.lamp, 0.12));
	gr.addColorStop(1, ink(pal.lamp, 0));
	l.g.fillStyle = gr;
	l.g.fillRect(0, 0, W, H);
	l.g.setTransform(1, 0, 0, 1, 0, 0);
	l.g.globalCompositeOperation = "destination-in";
	l.g.drawImage(mask, 0, 0);
	p.g.save();
	p.g.setTransform(1, 0, 0, 1, 0, 0);
	p.g.drawImage(l.cv, 0, 0);
	p.g.restore();
	// Far from the lamp the wood falls into the room's dusk.
	if (!pal.night) {
		const d = surface(scale, 0, 0, W, H);
		const dg = d.g.createRadialGradient(lampX, lampY, r * 0.35, lampX, lampY, r);
		dg.addColorStop(0, rgba(pal.shadow[0], 0));
		dg.addColorStop(1, rgba(pal.shadow[0], 0.35));
		d.g.fillStyle = dg;
		d.g.fillRect(0, 0, W, H);
		d.g.setTransform(1, 0, 0, 1, 0, 0);
		d.g.globalCompositeOperation = "destination-in";
		d.g.drawImage(mask, 0, 0);
		p.g.save();
		p.g.setTransform(1, 0, 0, 1, 0, 0);
		p.g.drawImage(d.cv, 0, 0);
		p.g.restore();
	}
}

/** A cast shadow on the sill: soft, stretched away from the lamp. */
function castShadow(p: Pen, pal: Pal, x: number, y: number, rx: number, ry: number, k: number) {
	const g = p.g;
	g.save();
	g.translate(x, y);
	g.scale(1, ry / rx);
	shade(
		p,
		null,
		(c, a) => {
			const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
			gr.addColorStop(0, rgba(c, a * k));
			gr.addColorStop(0.6, rgba(c, a * k * 0.5));
			gr.addColorStop(1, rgba(c, 0));
			return gr;
		},
		pal,
	);
	g.restore();
}

function paintMug(p: Pen, P: Plan, pal: Pal, scale: number) {
	const { x, y, u } = P.mug;
	const g = p.g;
	const w = 46 * u;
	const h = 50 * u;
	const ry = 6 * u;
	castShadow(p, pal, x - 30 * u, y + 2 * u, 46 * u, 8 * u, 0.7);
	blur(g, 0.6, scale);
	// Handle toward the lamp: a thick ring.
	const hd = new Path2D();
	hd.ellipse(x + w / 2 + 2 * u, y - h * 0.52, 12 * u, 14 * u, 0, 0, TAU);
	hd.ellipse(x + w / 2 + 2 * u, y - h * 0.52, 6 * u, 8 * u, 0, 0, TAU);
	const hg = g.createLinearGradient(x + w / 2 - 8 * u, 0, x + w / 2 + 14 * u, 0);
	hg.addColorStop(0, ink(pal.mug[0]));
	hg.addColorStop(1, ink(pal.mug[1]));
	p.g.globalCompositeOperation = "destination-out";
	p.g.fillStyle = "#000";
	p.g.fill(hd, "evenodd");
	p.g.globalCompositeOperation = "source-over";
	p.g.fillStyle = hg;
	p.g.fill(hd, "evenodd");
	p.m?.fill(hd, "evenodd");
	const body = new Path2D();
	body.moveTo(x - w / 2, y - h);
	body.lineTo(x + w / 2, y - h);
	body.bezierCurveTo(x + w / 2, y - h * 0.4, x + w * 0.46, y - 2 * u, x + w * 0.36, y);
	body.ellipse(x, y, w * 0.36, ry * 0.8, 0, 0, Math.PI);
	body.bezierCurveTo(x - w * 0.46, y - 2 * u, x - w / 2, y - h * 0.4, x - w / 2, y - h);
	body.ellipse(x, y - h, w / 2, ry, 0, Math.PI, TAU);
	const bg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
	bg.addColorStop(0, ink(pal.mug[0]));
	bg.addColorStop(0.55, ink(pal.mug[1], 0.75));
	bg.addColorStop(0.85, ink(pal.mug[1]));
	bg.addColorStop(1, ink(pal.mug[0], 0.9));
	solid(p, body, bg);
	const cup = new Path2D();
	cup.ellipse(x, y - h, w / 2 - 3 * u, ry - 1.5 * u, 0, 0, TAU);
	const cg = g.createLinearGradient(0, y - h - ry, 0, y - h + ry);
	cg.addColorStop(0, ink(pal.coffee));
	cg.addColorStop(1, ink(pal.coffee, 0.75));
	if (pal.night) {
		p.g.globalCompositeOperation = "destination-out";
		p.g.fillStyle = "rgb(0 0 0 / 0.9)";
		p.g.fill(cup);
		p.g.globalCompositeOperation = "source-over";
	} else tint(p, cup, cg);
	blur(g, 0, scale);
}

function paintPlant(p: Pen, P: Plan, pal: Pal, scale: number) {
	const { x, y, u } = P.pot;
	const g = p.g;
	castShadow(p, pal, x - 26 * u, y + 2 * u, 54 * u, 9 * u, 0.7);
	const top = y - 44 * u;
	/** A heart-shaped leaf from its base, pointing along `a`. */
	const leaf = (bx: number, by: number, a: number, len: number, lit: number) => {
		const L = len * u;
		const path = new Path2D();
		const c = Math.cos(a - Math.PI / 2);
		const s = Math.sin(a - Math.PI / 2);
		const pt = (lx: number, ly: number): [number, number] => [
			bx + (lx * c - ly * s) * L,
			by + (lx * s + ly * c) * L,
		];
		path.moveTo(...pt(0, 0.08));
		path.bezierCurveTo(...pt(-0.3, -0.18), ...pt(-0.66, 0.36), ...pt(0, 1));
		path.bezierCurveTo(...pt(0.66, 0.36), ...pt(0.3, -0.18), ...pt(0, 0.08));
		const [x0, y0] = pt(-0.5, 0.4);
		const [x1, y1] = pt(0.5, 0.4);
		const lg = g.createLinearGradient(x0, y0, x1, y1);
		lg.addColorStop(0, ink(pal.leaf[0]));
		lg.addColorStop(1, ink(pal.leaf[1], 0.3 + 0.7 * lit));
		solid(p, path, lg);
		// A soft sheen on the lamp-side lobe.
		const [hx, hy] = pt(0.2, 0.4);
		const hg = g.createRadialGradient(hx, hy, 0, hx, hy, L * 0.35);
		hg.addColorStop(0, ink(pal.leaf[1], 0.5 * lit));
		hg.addColorStop(1, ink(pal.leaf[1], 0));
		g.save();
		g.clip(path);
		g.fillStyle = hg;
		g.fill(path);
		g.restore();
	};
	blur(g, 0.6, scale);
	// Upright leaves behind the rim.
	leaf(x - 8 * u, top + 4 * u, -2.3, 40, 0.3);
	leaf(x + 6 * u, top + 2 * u, -1.25, 46, 0.8);
	leaf(x - 2 * u, top + 2 * u, -1.75, 52, 0.6);
	leaf(x + 14 * u, top + 6 * u, -0.7, 36, 1);
	const w = 50 * u;
	const pot = new Path2D();
	pot.moveTo(x - w / 2, top);
	pot.lineTo(x + w / 2, top);
	pot.lineTo(x + w * 0.38, y);
	pot.ellipse(x, y, w * 0.38, 4 * u, 0, 0, Math.PI);
	pot.lineTo(x - w / 2, top);
	const pg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
	pg.addColorStop(0, ink(pal.pot[0]));
	pg.addColorStop(0.75, ink(pal.pot[1]));
	pg.addColorStop(1, ink(pal.pot[0], 0.9));
	solid(p, pot, pg);
	const rim = new Path2D();
	rim.rect(x - w / 2 - 2 * u, top - 2 * u, w + 4 * u, 9 * u);
	const rg = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
	rg.addColorStop(0, ink(pal.pot[0]));
	rg.addColorStop(0.8, ink(pal.pot[1]));
	rg.addColorStop(1, ink(pal.pot[0]));
	solid(p, rim, rg);
	// A trailing vine over the rim and down the front of the sill.
	const vine: [number, number, number, number][] = [
		[20, -40, 0.2, 30],
		[30, -18, 0.9, 28],
		[36, 6, 1.4, 26],
		[34, 26, 1.7, 24],
		[30, 44, 1.5, 21],
	];
	for (const [dx, dy, a, l] of vine) leaf(x + dx * u, y + dy * u, a, l, 0.9);
	blur(g, 0, scale);
}

/** Glass: the lamp's faint reflection and a breath of fog at the corners. */
function paintGlass(p: Pen, P: Plan, pal: Pal) {
	const { S, panes, railTop } = P;
	const g = p.g;
	const last = panes[panes.length - 1];
	const rx = last.x + last.w * 0.45;
	const ry = last.y + last.h * 0.42;
	const rr = Math.max(40 * S, last.w * 0.5);
	const rg = g.createRadialGradient(rx, ry, 0, rx, ry, rr);
	rg.addColorStop(0, ink(pal.lamp, 0.42));
	rg.addColorStop(0.25, ink(pal.lamp, 0.16));
	rg.addColorStop(1, ink(pal.lamp, 0));
	g.fillStyle = rg;
	g.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
	for (const pn of panes) {
		const fh = 18 * S;
		const fg = g.createLinearGradient(0, railTop - fh, 0, railTop);
		fg.addColorStop(0, ink(pal.fog, 0));
		fg.addColorStop(1, ink(pal.fog, 0.6));
		g.fillStyle = fg;
		g.fillRect(pn.x, railTop - fh, pn.w, fh);
		for (const cx of [pn.x, pn.x + pn.w]) {
			const r = Math.min(70 * S, pn.w * 0.6);
			const cg = g.createRadialGradient(cx, railTop, 0, cx, railTop, r);
			cg.addColorStop(0, ink(pal.fog, 0.9));
			cg.addColorStop(1, ink(pal.fog, 0));
			g.fillStyle = cg;
			g.fillRect(cx - r, railTop - r, r * 2, r);
		}
	}
}

/* ----------------------------------------------------------------- cat */

/** Cat geometry in its own units: origin on the sill under the chest. */
function catBodyPath() {
	const b = new Path2D();
	b.moveTo(-108, 0);
	b.bezierCurveTo(-138, -2, -148, -52, -118, -80);
	b.bezierCurveTo(-90, -106, -24, -110, 20, -97);
	b.bezierCurveTo(50, -88, 70, -74, 78, -58);
	b.bezierCurveTo(84, -40, 92, -14, 96, 0);
	b.closePath();
	return b;
}
function catHeadPath() {
	const h = new Path2D();
	// Skull tipped forward onto the paws, cheek fluff, a soft muzzle.
	h.ellipse(100, -58, 45, 38, -0.1, 0, TAU);
	h.ellipse(88, -36, 30, 18, 0.1, 0, TAU);
	h.ellipse(126, -38, 21, 16, 0.15, 0, TAU);
	// The far ear. The near one is drawn live so it can flick.
	h.moveTo(62, -72);
	h.quadraticCurveTo(58, -110, 70, -126);
	h.quadraticCurveTo(86, -114, 100, -94);
	h.closePath();
	return h;
}
/** The near ear, turned about its base by `flick` (0 rest, 1 back). */
function catEarPath(flick: number) {
	const e = new Path2D();
	const a = -flick * 0.8;
	const c = Math.cos(a);
	const s = Math.sin(a);
	const pt = (x: number, y: number): [number, number] => [
		120 + x * c - y * s,
		-88 + x * s + y * c,
	];
	e.moveTo(...pt(-20, -6));
	const [q1x, q1y] = pt(-10, -32);
	const [t1x, t1y] = pt(12, -40);
	e.quadraticCurveTo(q1x, q1y, t1x, t1y);
	const [q2x, q2y] = pt(20, -22);
	const [e2x, e2y] = pt(18, 8);
	e.quadraticCurveTo(q2x, q2y, e2x, e2y);
	e.closePath();
	return { path: e, pt };
}

/** Fur: shade to the left, lamp on the right flank, sky along the top. */
function catPaint(g: Ctx, path: Path2D, pal: Pal, x0: number, x1: number, y0: number, y1: number) {
	const [dk, md, lt] = pal.cat;
	const gr = g.createLinearGradient(x0, 0, x1, 0);
	gr.addColorStop(0, ink(dk));
	gr.addColorStop(0.5, ink(md));
	gr.addColorStop(1, ink(lt));
	g.globalCompositeOperation = "destination-out";
	g.fillStyle = "#000";
	g.fill(path);
	g.globalCompositeOperation = "source-over";
	g.fillStyle = gr;
	g.fill(path);
	g.save();
	g.clip(path);
	const sky = g.createLinearGradient(0, y0, 0, y0 + (y1 - y0) * 0.4);
	sky.addColorStop(0, ink(pal.catSky));
	sky.addColorStop(1, ink(pal.catSky, 0));
	g.fillStyle = sky;
	g.fill(path);
	const rim = g.createLinearGradient(x1 - (x1 - x0) * 0.3, 0, x1, 0);
	rim.addColorStop(0, ink(pal.catRim, 0));
	rim.addColorStop(1, ink(pal.catRim, 0.9));
	g.fillStyle = rim;
	g.fill(path);
	const bel = g.createLinearGradient(0, y1 - (y1 - y0) * 0.45, 0, y1);
	if (pal.night) {
		g.globalCompositeOperation = "destination-out";
		bel.addColorStop(0, "rgb(0 0 0 / 0)");
		bel.addColorStop(1, "rgb(0 0 0 / 0.85)");
	} else {
		bel.addColorStop(0, rgba(pal.shadow[0], 0));
		bel.addColorStop(1, rgba(pal.shadow[0], 0.55));
	}
	g.fillStyle = bel;
	g.fill(path);
	g.globalCompositeOperation = "source-over";
	g.restore();
}

/** Darker fur: ink on light paper, a cut toward paper at night. */
function furDark(g: Ctx, pal: Pal, k: number) {
	if (pal.night) {
		g.globalCompositeOperation = "destination-out";
		g.fillStyle = `rgb(0 0 0 / ${k.toFixed(3)})`;
		g.strokeStyle = g.fillStyle;
	} else {
		g.fillStyle = rgba(pal.cat[0][0], k);
		g.strokeStyle = g.fillStyle;
	}
}

function catSprites(P: Plan, pal: Pal, scale: number) {
	const { u } = P.cat;
	const s = scale * u;
	const make = (x0: number, y0: number, x1: number, y1: number, draw: (g: Ctx, mask: boolean) => void): Sprite => {
		const pad = 6;
		const bx = x0 - pad;
		const by = y0 - pad;
		const bw = x1 - x0 + pad * 2;
		const bh = y1 - y0 + pad * 2;
		const a = surface(s, bx, by, bw, bh);
		const m = surface(s, bx, by, bw, bh);
		draw(a.g, false);
		draw(m.g, true);
		return { paint: a.cv, mask: m.cv, x: bx, y: by, w: bw, h: bh };
	};
	const soft = (g: Ctx, px: number) => {
		g.filter = px > 0 ? `blur(${(px * s).toFixed(2)}px)` : "none";
	};
	P.catBody = make(-150, -112, 100, 2, (g, mask) => {
		const body = catBodyPath();
		soft(g, 0.8);
		if (mask) {
			g.fillStyle = "#000";
			g.fill(body);
			return;
		}
		catPaint(g, body, pal, -150, 100, -110, 0);
		g.save();
		g.clip(body);
		// Haunch: a rounder, lit mass at the rump, a soft fold in front of it.
		soft(g, 0);
		const hg = g.createRadialGradient(-92, -62, 0, -84, -46, 52);
		hg.addColorStop(0, ink(pal.cat[2], 0.6));
		hg.addColorStop(1, ink(pal.cat[2], 0));
		g.fillStyle = hg;
		g.fill(body);
		soft(g, 4);
		furDark(g, pal, pal.night ? 0.55 : 0.35);
		g.lineWidth = 7;
		g.beginPath();
		g.ellipse(-82, -44, 48, 42, 0, -1.2, 1.25);
		g.stroke();
		// Tabby bands across the back, following its curve.
		soft(g, 2.4);
		for (let i = 0; i < 6; i++) {
			const x = -112 + i * 30;
			const y = -100 + Math.abs(i - 2.4) * 5;
			furDark(g, pal, pal.night ? 0.5 : 0.32);
			g.beginPath();
			g.ellipse(x, y + 10, 6, 24, 0.25 + i * 0.1, 0, TAU);
			g.fill();
		}
		g.globalCompositeOperation = "source-over";
		g.restore();
		soft(g, 0);
	});
	P.catHead = make(56, -130, 150, -14, (g, mask) => {
		const head = catHeadPath();
		soft(g, 0.7);
		if (mask) {
			g.fillStyle = "#000";
			g.fill(head);
			return;
		}
		catPaint(g, head, pal, 56, 150, -126, -18);
		soft(g, 0);
		g.save();
		g.clip(head);
		// Pale muzzle and cheek, the far ear's warm inside.
		const mg = g.createRadialGradient(130, -34, 0, 128, -36, 22);
		mg.addColorStop(0, ink(pal.paw, 0.5));
		mg.addColorStop(1, ink(pal.paw, 0));
		g.fillStyle = mg;
		g.fill(head);
		soft(g, 2);
		g.fillStyle = ink(pal.ear, 0.5);
		g.beginPath();
		g.ellipse(76, -98, 5, 13, -0.35, 0, TAU);
		g.fill();
		// Forehead stripes.
		furDark(g, pal, pal.night ? 0.5 : 0.35);
		for (const [x, a] of [
			[92, -0.25],
			[102, 0],
			[112, 0.25],
		] as const) {
			g.beginPath();
			g.ellipse(x, -88, 3, 10, a, 0, TAU);
			g.fill();
		}
		g.globalCompositeOperation = "source-over";
		g.restore();
		// Closed eye and a small nose.
		soft(g, 0.6);
		g.lineCap = "round";
		g.lineWidth = 2.8;
		g.strokeStyle = pal.night ? ink(pal.catRim, 0.55) : rgba(pal.cat[0][0], 0.9);
		g.beginPath();
		g.moveTo(108, -58);
		g.quadraticCurveTo(117, -51, 127, -57);
		g.stroke();
		g.fillStyle = ink(pal.ear);
		g.beginPath();
		g.ellipse(144, -42, 4, 3, 0.3, 0, TAU);
		g.fill();
		soft(g, 0);
	});
}

/** A tapered body along two cubic curves, as one filled outline. */
function tube(curves: [number, number][][], w0: number, w1: number) {
	const N = 14;
	const left: [number, number][] = [];
	const right: [number, number][] = [];
	const total = curves.length * N;
	curves.forEach((q, ci) => {
		for (let i = ci === 0 ? 0 : 1; i <= N; i++) {
			const t = i / N;
			const m = 1 - t;
			const x = m * m * m * q[0][0] + 3 * m * m * t * q[1][0] + 3 * m * t * t * q[2][0] + t * t * t * q[3][0];
			const y = m * m * m * q[0][1] + 3 * m * m * t * q[1][1] + 3 * m * t * t * q[2][1] + t * t * t * q[3][1];
			const dx = 3 * m * m * (q[1][0] - q[0][0]) + 6 * m * t * (q[2][0] - q[1][0]) + 3 * t * t * (q[3][0] - q[2][0]);
			const dy = 3 * m * m * (q[1][1] - q[0][1]) + 6 * m * t * (q[2][1] - q[1][1]) + 3 * t * t * (q[3][1] - q[2][1]);
			const l = Math.hypot(dx, dy) || 1;
			const k = (ci * N + i) / total;
			const w = lerp(w0, w1, k * k);
			left.push([x - (dy / l) * w, y + (dx / l) * w]);
			right.push([x + (dy / l) * w, y - (dx / l) * w]);
		}
	});
	const path = new Path2D();
	path.moveTo(...left[0]);
	for (const q of left) path.lineTo(...q);
	const a = left[left.length - 1];
	const b = right[right.length - 1];
	const a2 = left[left.length - 2];
	path.bezierCurveTo(
		a[0] + (a[0] - a2[0]) * 3,
		a[1] + (a[1] - a2[1]) * 3,
		b[0] + (a[0] - a2[0]) * 3,
		b[1] + (a[1] - a2[1]) * 3,
		b[0],
		b[1],
	);
	for (let i = right.length - 1; i >= 0; i--) path.lineTo(...right[i]);
	path.closePath();
	return path;
}

/** The tail wraps along the front; its tip lifts and curls now and then. */
function catTail(c: Ctx, pal: Pal, curl: number, sway: number) {
	const path = tube(
		[
			[
				[-118, -14],
				[-104, 8],
				[-30, 10],
				[34 + sway * 3, 2],
			],
			[
				[34 + sway * 3, 2],
				[62 + sway * 4, 0 - curl * 8],
				[80 - curl * 4, -14 - curl * 30],
				[64 - curl * 20, -24 - curl * 34],
			],
		],
		11,
		7,
	);
	c.globalCompositeOperation = "destination-out";
	c.fillStyle = "#000";
	c.fill(path);
	c.globalCompositeOperation = "source-over";
	const [, md, lt] = pal.cat;
	const gr = c.createLinearGradient(0, -14, 0, 12);
	gr.addColorStop(0, ink(lt));
	gr.addColorStop(0.45, ink(md));
	gr.addColorStop(1, ink(pal.cat[0]));
	c.fillStyle = gr;
	c.fill(path);
	c.save();
	c.clip(path);
	const rim = c.createLinearGradient(20, 0, 90, 0);
	rim.addColorStop(0, ink(pal.catRim, 0));
	rim.addColorStop(1, ink(pal.catRim, 0.8));
	c.fillStyle = rim;
	c.fill(path);
	// Rings.
	for (const x of [-84, -54, -24, 6, 34]) {
		furDark(c, pal, pal.night ? 0.4 : 0.28);
		c.fillRect(x, -20, 9, 40);
	}
	c.globalCompositeOperation = "source-over";
	c.restore();
}

function catPaws(c: Ctx, pal: Pal) {
	for (const [x, y, rx, ry] of [
		[106, -12, 14, 8],
		[128, -10, 12, 7],
	]) {
		const p = new Path2D();
		p.ellipse(x, y, rx, ry, 0, 0, TAU);
		c.globalCompositeOperation = "destination-out";
		c.fillStyle = "#000";
		c.fill(p);
		c.globalCompositeOperation = "source-over";
		const gr = c.createLinearGradient(0, y - ry, 0, y + ry);
		gr.addColorStop(0, ink(pal.paw, 0.8));
		gr.addColorStop(1, ink(pal.cat[2]));
		c.fillStyle = gr;
		c.fill(p);
	}
}


/* ----------------------------------------------------------------- build */

function build(P: Plan, pal: Pal, scale: number) {
	const { W, H } = P;
	const plate = surface(scale, 0, 0, W, H);
	const pen: Pen = { g: plate.g, m: null, night: pal.night };
	paintSky(pen, P, pal, scale);
	paintLand(pen, P, pal, scale);
	paintGlass(pen, P, pal);

	// The window and what stands on the sill, lit as one.
	const fr = surface(scale, 0, 0, W, H);
	const fm = surface(scale, 0, 0, W, H);
	const fpen: Pen = { g: fr.g, m: fm.g, night: pal.night };
	paintFrame(fpen, P, pal, scale);
	lampLight(fpen, P, pal, scale, fm.cv);
	// The cat's shadow on the sill, cast left, away from the lamp.
	const { x: cx, y: cy, u } = P.cat;
	castShadow(fpen, pal, cx - 40 * u, cy + 2 * u, 170 * u, 13 * u, 0.85);
	castShadow(fpen, pal, cx - 10 * u, cy + 1 * u, 120 * u, 6 * u, 0.9);
	paintPlant(fpen, P, pal, scale);
	paintMug(fpen, P, pal, scale);
	plate.g.save();
	plate.g.setTransform(1, 0, 0, 1, 0, 0);
	plate.g.globalCompositeOperation = "destination-out";
	plate.g.drawImage(fm.cv, 0, 0);
	plate.g.globalCompositeOperation = "source-over";
	plate.g.drawImage(fr.cv, 0, 0);
	plate.g.restore();
	P.plate = plate.cv;

	catSprites(P, pal, scale);

	{
		const a = surface(1, 0, 0, 256, 64);
		const gr = a.g.createRadialGradient(128, 32, 0, 128, 32, 32);
		gr.addColorStop(0, rgba(pal.mist[0], 1));
		gr.addColorStop(0.5, rgba(pal.mist[0], 0.5));
		gr.addColorStop(1, rgba(pal.mist[0], 0));
		a.g.setTransform(4, 0, 0, 1, -384, 0);
		a.g.fillStyle = gr;
		a.g.fillRect(64, 0, 128, 64);
		P.puff = a.cv;
	}
	{
		const a = surface(1, 0, 0, 32, 32);
		const gr = a.g.createRadialGradient(16, 16, 0, 16, 16, 16);
		gr.addColorStop(0, rgba(pal.fly, 1));
		gr.addColorStop(0.25, rgba(pal.fly, 0.5));
		gr.addColorStop(1, rgba(pal.fly, 0));
		a.g.fillStyle = gr;
		a.g.fillRect(0, 0, 32, 32);
		P.spark = a.cv;
	}
}

/* ----------------------------------------------------------------- life */

function clipGlass(c: Ctx, P: Plan) {
	const path = new Path2D();
	for (const pn of P.panes) path.rect(pn.x, pn.y, pn.w, pn.h);
	c.clip(path);
}

function mist(c: Ctx, P: Plan, pal: Pal, t: number, y: number, n: number, h: number, seed: number, k: number) {
	if (!P.puff) return;
	const { W, S } = P;
	const span = W + 800 * S;
	for (let i = 0; i < n; i++) {
		const w = (380 + 260 * hash(i, seed)) * S;
		const speed = (3 + 4 * hash(i, seed + 1)) * S;
		const x = ((hash(i, seed + 2) * span + t * speed) % span) - 400 * S;
		const yy = y + (hash(i, seed + 3) - 0.5) * h * 0.8 + Math.sin(t * 0.05 + i) * 3 * S;
		c.globalAlpha = pal.mist[1] * k * (0.5 + 0.5 * hash(i, seed + 4));
		c.drawImage(P.puff, x - w / 2, yy - h / 2, w, h);
	}
	c.globalAlpha = 1;
}

function shootingStar(c: Ctx, P: Plan, pal: Pal, t: number) {
	const period = 21;
	const n = Math.floor(t / period);
	const local = t - n * period - 6 - hash(n, 81) * 8;
	const dur = 1.1;
	if (local < 0 || local > dur) return;
	const { W, H, S } = P;
	const k = local / dur;
	const dir = hash(n, 82) < 0.5 ? -1 : 1;
	const x0 = W * (0.2 + 0.6 * hash(n, 83));
	const y0 = H * (0.06 + 0.16 * hash(n, 84));
	const ang = 0.42 + 0.2 * hash(n, 85);
	const len = 260 * S;
	const hx = x0 + Math.cos(ang) * len * k * dir;
	const hy = y0 + Math.sin(ang) * len * k;
	const tail = 90 * S * Math.sin(k * Math.PI);
	const tx = hx - Math.cos(ang) * tail * dir;
	const ty = hy - Math.sin(ang) * tail;
	const fade = Math.sin(k * Math.PI);
	const gr = c.createLinearGradient(tx, ty, hx, hy);
	gr.addColorStop(0, rgba(pal.star[0], 0));
	gr.addColorStop(1, rgba(pal.star[0], 0.9 * fade));
	c.strokeStyle = gr;
	c.lineWidth = 1.6 * S;
	c.lineCap = "round";
	c.beginPath();
	c.moveTo(tx, ty);
	c.lineTo(hx, hy);
	c.stroke();
}

function fireflies(c: Ctx, P: Plan, t: number) {
	if (!P.spark) return;
	const { W, S, lakeY, bandY, railTop } = P;
	for (let i = 0; i < 11; i++) {
		const ax = hash(i, 91);
		const x0 = W * (0.08 + 0.84 * ax);
		const y0 = lerp(lakeY - 20 * S, railTop - 30 * S, hash(i, 92));
		const sp = 0.06 + 0.05 * hash(i, 93);
		const x = x0 + Math.sin(t * sp + i * 2.1) * 40 * S + Math.sin(t * sp * 2.7 + i) * 12 * S;
		const y = y0 + Math.sin(t * sp * 1.6 + i * 1.3) * 16 * S + (bandY - bandY);
		const pulse = 0.5 + 0.5 * Math.sin(t * (0.6 + 0.4 * hash(i, 94)) + i * 1.7);
		const a = 0.3 + 0.7 * pulse * pulse;
		const r = (6 + 4 * pulse) * S;
		c.globalAlpha = a;
		c.drawImage(P.spark, x - r, y - r, r * 2, r * 2);
	}
	c.globalAlpha = 1;
}

function shimmer(c: Ctx, P: Plan, pal: Pal, t: number) {
	const { S, cabin, lakeY, lakeL, lakeR } = P;
	// The cabin's light, broken on the water.
	const x = cabin.x - 30 * 0.18 * S;
	for (let i = 0; i < 6; i++) {
		const y = lakeY + (2 + i * 3.2) * S;
		const w = (10 - i * 1.1 + Math.sin(t * 0.9 + i * 1.9) * 3) * S;
		const off = Math.sin(t * 0.7 + i * 2.3) * 2 * S;
		c.fillStyle = rgba(pal.window, 0.55 - i * 0.07);
		c.fillRect(x - w / 2 + off, y, w, 1.4 * S);
	}
	// Slow sky glints across the open water.
	for (let i = 0; i < 5; i++) {
		const u = (hash(i, 101) + t * 0.004 * (1 + hash(i, 102))) % 1;
		const gx = lerp(lakeL + 60 * S, lakeR - 80 * S, u);
		const gy = lakeY - 4 * S + hash(i, 103) * 10 * S;
		const a = Math.sin(u * Math.PI) * 0.6;
		const w = (24 + 30 * hash(i, 104)) * S;
		c.fillStyle = rgba(pal.star[0], a * (pal.night ? 0.35 : 0.5));
		c.fillRect(gx - w / 2, gy, w, 1.2 * S);
	}
}

function smoke(c: Ctx, P: Plan, pal: Pal, t: number) {
	if (!P.puff) return;
	const { cabin, S } = P;
	const sx = cabin.x + 30 * S * 0.2 + 2 * S;
	const sy = cabin.y - 15 * S - 16 * S;
	for (let i = 0; i < 7; i++) {
		const k = ((t * 0.08 + i / 7) % 1 + 1) % 1;
		const x = sx + k * 34 * S + Math.sin(t * 0.4 + i * 1.3) * 3 * S * k;
		const y = sy - k * 46 * S;
		const r = (4 + k * 14) * S;
		c.globalAlpha = pal.mist[1] * 0.9 * Math.sin(k * Math.PI) * (1 - k * 0.4);
		c.drawImage(P.puff, x - r * 2, y - r / 2, r * 4, r);
	}
	c.globalAlpha = 1;
}

function steam(c: Ctx, P: Plan, pal: Pal, t: number) {
	if (!P.puff) return;
	const { x, y, u } = P.mug;
	const top = y - 54 * u;
	for (let w = 0; w < 3; w++) {
		for (let i = 0; i < 8; i++) {
			const k = (((t * (0.11 + w * 0.02) + i / 8 + w * 0.31) % 1) + 1) % 1;
			const sx = x + (w - 1) * 9 * u + Math.sin(k * 5 + t * 0.6 + w * 2) * 8 * u * k;
			const sy = top - k * 70 * u;
			const r = (5 + k * 10) * u;
			c.globalAlpha = pal.steam[1] * Math.sin(k * Math.PI) * (1 - k * 0.5);
			c.fillStyle = rgba(pal.steam[0], 1);
			c.beginPath();
			c.ellipse(sx, sy, r * 0.6, r, 0, 0, TAU);
			c.fill();
		}
	}
	c.globalAlpha = 1;
}

function blit(c: Ctx, sp: Sprite) {
	c.globalCompositeOperation = "destination-out";
	c.drawImage(sp.mask, sp.x, sp.y, sp.w, sp.h);
	c.globalCompositeOperation = "source-over";
	c.drawImage(sp.paint, sp.x, sp.y, sp.w, sp.h);
}

function cat(c: Ctx, P: Plan, pal: Pal, t: number) {
	const { catBody, catHead } = P;
	if (!catBody || !catHead) return;
	const { x, y, u } = P.cat;
	// Breathing: slow, with a pause at the bottom of each breath.
	const ph = (t / 4.4) % 1;
	const br = Math.sin(Math.PI * smooth(0, 0.62, ph)) ** 2;
	// The tail curls up now and then; an ear flicks on its own clock.
	const tc = t % 11;
	const curl = smooth(0, 1.4, tc) * (1 - smooth(3.4, 5.4, tc));
	const sway = Math.sin(t * 0.5) * 0.5;
	const fc = (t + 3) % 13.7;
	const flick = fc < 1 ? Math.sin((fc / 1) * Math.PI * 2) ** 2 : 0;
	c.save();
	c.translate(x, y);
	c.scale(u, u);
	c.save();
	c.scale(1 + br * 0.012, 1 + br * 0.03);
	blit(c, catBody);
	c.restore();
	catPaws(c, pal);
	c.save();
	c.translate(0, -br * 1.6);
	blit(c, catHead);
	const { path: ear, pt } = catEarPath(flick);
	catPaint(c, ear, pal, 96, 142, -130, -80);
	c.save();
	c.clip(ear);
	const [ix, iy] = pt(2, -14);
	c.fillStyle = ink(pal.ear, 0.7);
	c.beginPath();
	c.ellipse(ix, iy, 6, 14, -0.15 - flick * 0.55, 0, TAU);
	c.fill();
	c.restore();
	c.restore();
	catTail(c, pal, curl, sway);
	c.restore();
}

/* ---------------------------------------------------------------- scene */

let memo: Plan | null = null;

export const starvalley: Scene = ({ dither: c }, { t, W, H, dark, anchors }) => {
	const col = columnOf(W, anchors);
	const scale = c.getTransform().a;
	const key = `${W}|${H}|${dark}|${scale}|${Math.round(col.x)}|${Math.round(col.w)}`;
	if (!memo || memo.key !== key) {
		memo = plan(W, H, col);
		memo.key = key;
		build(memo, PALS[dark ? "dark" : "light"], scale);
	}
	const P = memo;
	const pal = PALS[dark ? "dark" : "light"];
	if (!P.plate) return;
	c.drawImage(P.plate, 0, 0, W, H);
	c.save();
	clipGlass(c, P);
	shootingStar(c, P, pal, t);
	mist(c, P, pal, t, P.midY + 2 * P.S, 4, 34 * P.S, 200, 0.6);
	mist(c, P, pal, t, P.floorY + 4 * P.S, 4, 30 * P.S, 300, 0.7);
	shimmer(c, P, pal, t);
	smoke(c, P, pal, t);
	mist(c, P, pal, t, P.bandY - 4 * P.S, 5, 30 * P.S, 400, 0.5);
	fireflies(c, P, t);
	c.restore();
	steam(c, P, pal, t);
	cat(c, P, pal, t);
};
