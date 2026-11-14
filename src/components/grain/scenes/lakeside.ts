import type { Scene } from "../engine";

/**
 * A mountain lake at the end of the day, with someone fishing off a dock.
 *
 * Light paper is golden hour: a low sun sinking behind the ridges, peach air
 * at the horizon, lilac distance. Dark paper is a moonlit night: the ridges
 * are cut out of the glow, the village windows are lit, a lantern burns on
 * the dock.
 *
 * Mountains are four ridges in atmospheric perspective. Each face is lit by
 * its slope against the sun, so the range has form instead of a flat edge,
 * and haze thickens toward its foot. The lake mirrors everything above the
 * shore, broken into strips that sway, so the reflection shivers; a path of
 * glints runs down from the sun.
 *
 * Life overlaps at different paces: clouds crossing slowly, chimney smoke
 * drifting, the bobber riding the swell, a bite now and then that dips the
 * rod and sends rings out, and fish rising elsewhere on the lake.
 *
 * The land is painted once per paper; water, sky and life are drawn each
 * frame. Everything is a function of t.
 */

type Rgb = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const x = clamp((v - a) / (b - a), 0, 1);
	return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
	lerp(a[0], b[0], k),
	lerp(a[1], b[1], k),
	lerp(a[2], b[2], k),
];
const rgba = (c: Rgb, a: number) =>
	`rgb(${c[0] | 0} ${c[1] | 0} ${c[2] | 0} / ${clamp(a, 0, 1).toFixed(3)})`;
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
function fbm1(x: number, seed: number, oct = 5) {
	let s = 0;
	let a = 0.5;
	let n = 0;
	for (let i = 0; i < oct; i++) {
		s += a * noise1(x, seed + i * 17);
		n += a;
		x *= 2.07;
		a *= 0.5;
	}
	return s / n;
}

/* ------------------------------------------------------------------ ink */

type Pal = {
	night: boolean;
	/** Air at the horizon, and how strongly it is laid over the paper. */
	horizon: Rgb;
	air: number;
	sun: Rgb;
	glow: Rgb;
	/** Ridges, far to near: shadowed face and lit face. */
	ridge: [Rgb, Rgb][];
	haze: Rgb;
	water: Rgb;
	glint: Rgb;
	cloud: Rgb;
	cloudLit: Rgb;
	wall: Rgb;
	roof: Rgb;
	window: Rgb;
	smoke: Rgb;
	wood: Rgb;
	woodLit: Rgb;
	coat: Rgb;
	coatLit: Rgb;
	hat: Rgb;
	skin: Rgb;
	bobber: Rgb;
	/** Clear sky overhead, for full-height looks. */
	sky: Rgb;
	snow: Rgb;
	pine: Rgb;
	hull: Rgb;
};

const PALS: Record<"light" | "dark", Pal> = {
	light: {
		night: false,
		horizon: [240, 186, 146],
		air: 0.5,
		sun: [244, 174, 104],
		glow: [244, 176, 120],
		ridge: [
			[
				[196, 178, 196],
				[222, 190, 182],
			],
			[
				[160, 150, 182],
				[204, 168, 160],
			],
			[
				[118, 120, 150],
				[176, 146, 132],
			],
			[
				[84, 96, 104],
				[138, 128, 98],
			],
		],
		haze: [236, 198, 176],
		water: [128, 150, 172],
		glint: [252, 222, 170],
		cloud: [200, 180, 196],
		cloudLit: [246, 196, 150],
		wall: [214, 196, 176],
		roof: [150, 94, 78],
		window: [120, 104, 98],
		smoke: [186, 178, 190],
		wood: [112, 86, 68],
		woodLit: [170, 128, 92],
		coat: [128, 116, 70],
		coatLit: [186, 160, 96],
		hat: [96, 80, 62],
		skin: [214, 164, 132],
		bobber: [196, 78, 60],
		sky: [184, 204, 226],
		snow: [250, 238, 226],
		pine: [72, 88, 78],
		hull: [150, 82, 62],
	},
	dark: {
		night: true,
		horizon: [84, 96, 150],
		air: 0.62,
		sun: [236, 232, 214],
		glow: [150, 164, 210],
		ridge: [
			[
				[78, 88, 132],
				[110, 120, 160],
			],
			[
				[58, 66, 104],
				[86, 96, 136],
			],
			[
				[0, 0, 0],
				[0, 0, 0],
			],
			[
				[0, 0, 0],
				[0, 0, 0],
			],
		],
		haze: [96, 108, 160],
		water: [70, 82, 130],
		glint: [226, 230, 240],
		cloud: [96, 106, 150],
		cloudLit: [170, 180, 214],
		wall: [0, 0, 0],
		roof: [0, 0, 0],
		window: [255, 200, 120],
		smoke: [130, 140, 180],
		wood: [0, 0, 0],
		woodLit: [150, 130, 120],
		coat: [0, 0, 0],
		coatLit: [150, 150, 170],
		hat: [0, 0, 0],
		skin: [0, 0, 0],
		bobber: [255, 170, 120],
		sky: [40, 48, 92],
		snow: [190, 200, 230],
		pine: [0, 0, 0],
		hull: [0, 0, 0],
	},
};

/* ----------------------------------------------------------------- looks */

type Ridge = {
	lift: number;
	rough: number;
	seed: number;
	/** [x, height, width], as fractions of the page. */
	peaks: [number, number, number][];
};

/** One composition of the same world: where things sit, and how the air is. */
type Look = {
	/** The far shore, as a fraction of the page height. */
	shore: number;
	sun: { x: number; y: number };
	sunR: number;
	ridges: Ridge[];
	village: {
		x: number;
		span: number;
		count: number;
		size: number;
		rows: number;
		/** Height of each back row up the hillside, px. */
		rise: number;
	};
	/** Where the angler fishes from. */
	angler: "dock" | "boat";
	/** Boats moored at the village. */
	moored: number;
	/** Strength of the full-height clear sky; 0 leaves the top as paper. */
	sky: number;
	clouds: number;
	/** Snow line on the far range, as a fraction of page height; 0 for none. */
	snow: number;
	/** A fringe of conifers along the nearest ridge. */
	pines: boolean;
	/** Windows lit even by day: the sun has nearly gone. */
	dusk: boolean;
	/** Per-look colour changes over the base palettes. */
	tint?: { light?: Partial<Pal>; dark?: Partial<Pal> };
};

const RANGE: Ridge[] = [
	{
		lift: 0.07,
		rough: 0.5,
		seed: 11,
		peaks: [
			[0.16, 0.33, 0.18],
			[0.48, 0.25, 0.17],
			[0.97, 0.22, 0.1],
		],
	},
	{
		lift: 0.05,
		rough: 0.55,
		seed: 23,
		peaks: [
			[0.3, 0.26, 0.15],
			[0.62, 0.17, 0.12],
			[0.06, 0.18, 0.1],
		],
	},
	{
		lift: 0.03,
		rough: 0.6,
		seed: 37,
		peaks: [
			[0.08, 0.2, 0.14],
			[0.42, 0.12, 0.16],
			[0.86, 0.11, 0.12],
		],
	},
	{
		lift: 0.012,
		rough: 0.7,
		seed: 51,
		peaks: [
			[0.0, 0.1, 0.12],
			[0.24, 0.05, 0.12],
			[0.98, 0.07, 0.1],
		],
	},
];

const LOOKS = {
	/** The first study: golden hour, a village across the water, a dock. */
	lakeside: {
		shore: 0.7,
		sun: { x: 0.87, y: 0.5 },
		sunR: 0.04,
		ridges: RANGE,
		village: { x: 0.62, span: 0.13, count: 14, size: 1, rows: 3, rise: 4 },
		angler: "dock",
		moored: 0,
		sky: 0,
		clouds: 4,
		snow: 0,
		pines: false,
		dusk: false,
	},
} satisfies Record<string, Look>;

/* ----------------------------------------------------------------- plan */

type Plan = {
	W: number;
	H: number;
	/** The far shore: the line the land mirrors about. */
	shore: number;
	sun: { x: number; y: number; r: number };
	/** Ridge tops per CSS pixel column, far to near. */
	ridges: Float32Array[];
	houses: {
		x: number;
		w: number;
		h: number;
		roof: number;
		lit: boolean;
		smoke: boolean;
		lift: number;
	}[];
	dock: { x0: number; x1: number; deck: number; water: number };
	man: { x: number; y: number; s: number };
	look: Look;
	land: HTMLCanvasElement;
	landKey: string;
};

function plan(W: number, H: number, look: Look): Plan {
	const shore = Math.round(H * look.shore);
	const sun = {
		x: W * look.sun.x,
		y: H * look.sun.y,
		r: clamp(H * look.sunR, 18, 48),
	};
	const specs = look.ridges;
	const ridges = specs.map((sp) => {
		const a = new Float32Array(Math.ceil(W) + 2);
		for (let x = 0; x < a.length; x++) {
			const u = x / W;
			let h = sp.lift;
			for (const [px, ph, pw] of sp.peaks) {
				const d = (u - px) / pw;
				h = Math.max(h, ph * Math.exp(-d * d * 1.6));
			}
			const n = fbm1(x / (W * 0.06), sp.seed);
			const ridged = 1 - Math.abs(2 * fbm1(x / (W * 0.03), sp.seed + 5, 3) - 1);
			h *= 1 + sp.rough * ((n - 0.5) * 0.8 + (ridged - 0.6) * 0.14);
			a[x] = shore - Math.max(4, h * H);
		}
		return a;
	});
	const houses: Plan["houses"] = [];
	// A village gathered at the foot of the hill, back rows set higher.
	const v = look.village;
	const vx = W * v.x;
	for (let i = 0; i < v.count; i++) {
		const row = i % v.rows;
		const x = vx + hash(i, 3) * W * v.span + row * 6;
		houses.push({
			x,
			w: (10 + 9 * hash(i, 4)) * v.size,
			h: (8 + 7 * hash(i, 5) - row * 1.5) * v.size,
			roof: (5 + 5 * hash(i, 6)) * v.size,
			lit: hash(i, 7) < 0.65,
			smoke: i === 3 || i === 10,
			lift: row * v.rise + (hash(i, 8) - 0.5) * v.rise * 0.6,
		});
	}
	houses.sort((a, b) => b.lift - a.lift);
	// A church, for the silhouette.
	houses.push({
		x: vx + W * v.span * 0.5,
		w: 11 * v.size,
		h: 30 * v.size,
		roof: 14 * v.size,
		lit: false,
		smoke: false,
		lift: Math.max(3, v.rise * (v.rows - 1) * 0.6),
	});
	const deck = H * 0.8;
	const dock = {
		x0: -10,
		x1: Math.max(W * 0.16, 170),
		deck,
		water: deck + H * 0.028,
	};
	const man = { x: dock.x1 - 16, y: deck, s: clamp(H / 520, 1.3, 2) };
	return {
		W,
		H,
		shore,
		sun,
		ridges,
		houses,
		dock,
		man,
		look,
		land: document.createElement("canvas"),
		landKey: "",
	};
}

/* ----------------------------------------------------------------- land */

function paintLand(p: Plan, pal: Pal, scale: number) {
	const { W, H, shore, sun } = p;
	const cw = Math.ceil(W * scale);
	const ch = Math.ceil(shore * scale);
	p.land.width = cw;
	p.land.height = ch;
	const g = p.land.getContext("2d");
	if (!g) return;
	g.setTransform(scale, 0, 0, scale, 0, 0);
	g.clearRect(0, 0, W, H);

	// A clear sky overhead, for the full-height looks.
	if (p.look.sky > 0) {
		const sky = g.createLinearGradient(0, 0, 0, shore);
		sky.addColorStop(0, rgba(pal.sky, p.look.sky * (pal.night ? 0.7 : 0.45)));
		sky.addColorStop(
			0.55,
			rgba(mix(pal.sky, pal.horizon, 0.5), p.look.sky * 0.4),
		);
		sky.addColorStop(1, rgba(pal.horizon, p.look.sky * 0.6));
		g.fillStyle = sky;
		g.fillRect(0, 0, W, shore);
	}
	// Air: paper up high, warming down to the horizon.
	const top = shore - H * 0.62;
	const air = g.createLinearGradient(0, top, 0, shore);
	air.addColorStop(0, rgba(pal.horizon, 0));
	air.addColorStop(0.6, rgba(pal.horizon, pal.air * 0.35));
	air.addColorStop(1, rgba(pal.horizon, pal.air));
	g.fillStyle = air;
	g.fillRect(0, top, W, shore - top);
	const glow = g.createRadialGradient(
		sun.x,
		sun.y,
		sun.r,
		sun.x,
		sun.y,
		H * 0.42,
	);
	glow.addColorStop(0, rgba(pal.glow, 0.55));
	glow.addColorStop(1, rgba(pal.glow, 0));
	g.fillStyle = glow;
	g.fillRect(0, 0, W, shore);
	// The disc, softly edged.
	const disc = g.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.r);
	disc.addColorStop(0, rgba(pal.sun, 1));
	disc.addColorStop(0.85, rgba(pal.sun, 0.95));
	disc.addColorStop(1, rgba(pal.sun, 0));
	g.fillStyle = disc;
	g.beginPath();
	g.arc(sun.x, sun.y, sun.r, 0, TAU);
	g.fill();

	// Ridges, far to near, each face lit by its slope toward the sun.
	const img = g.getImageData(0, 0, cw, ch);
	const d = img.data;
	const put = (i: number, c: Rgb, a: number) => {
		const da = d[i + 3] / 255;
		const oa = a + da * (1 - a);
		if (oa <= 0) return;
		const k = a / oa;
		d[i] += (c[0] - d[i]) * k;
		d[i + 1] += (c[1] - d[i + 1]) * k;
		d[i + 2] += (c[2] - d[i + 2]) * k;
		d[i + 3] = oa * 255;
	};
	const cut = (i: number, a: number) => {
		d[i + 3] *= 1 - a;
	};
	p.ridges.forEach((ridge, k) => {
		const [shade, lit] = pal.ridge[k];
		const silhouette = pal.night && k >= 2;
		const depth = k / (p.ridges.length - 1);
		for (let x = 0; x < cw; x++) {
			const X = x / scale;
			const xi = Math.min(ridge.length - 2, X | 0);
			const yTop = ridge[xi];
			const span = 7;
			const slope =
				(ridge[Math.min(ridge.length - 1, xi + span)] -
					ridge[Math.max(0, xi - span)]) /
				(2 * span);
			// Faces that fall away toward the sun catch it.
			const toward = Math.sign(sun.x - X) || 1;
			const light = smooth(0, 1, 0.5 - slope * toward * 1.1);
			for (let y = Math.max(0, Math.floor(yTop * scale)); y < ch; y++) {
				const Y = (y + 0.5) / scale;
				const cover = clamp((Y - yTop) * scale + 0.5, 0, 1);
				if (cover <= 0) continue;
				const down = (Y - yTop) / Math.max(8, shore - yTop);
				const i = (y * cw + x) * 4;
				if (silhouette) {
					// Night: the near ridges are dark land cut out of the glow,
					// with a thin moonlit rim along the crest.
					cut(i, cover);
					const rim =
						(1 - smooth(0, 2.2, Y - yTop)) * light * (k === 2 ? 0.5 : 0.3);
					if (rim > 0.01) put(i, lit, rim * cover);
					continue;
				}
				const sunlit = light * (1 - smooth(0.05, 0.55, down));
				let c = mix(shade, lit, sunlit);
				// Snow on the far range, above its line, thinning down the gullies.
				if (k === 0 && p.look.snow > 0) {
					const above = shore - yTop - p.look.snow * H;
					const cap = above * 0.55 * (0.7 + 0.6 * noise1(X * 0.08, 7));
					if (above > 0 && Y - yTop < cap)
						c = mix(
							c,
							mix(pal.snow, pal.haze, 0.25 * (1 - light)),
							0.85 * (0.45 + 0.55 * light),
						);
				}
				// Haze gathers at the foot of each ridge, more so far away.
				c = mix(c, pal.haze, smooth(0.15, 1, down) * (0.55 - depth * 0.35));
				// Forest grain on the nearer slopes.
				const tree =
					depth > 0.5 ? 0.12 * (noise1(X * 0.35 + Y * 0.9, 90 + k) - 0.5) : 0;
				c = mix(c, [0, 0, 0], Math.max(0, tree));
				put(i, c, cover * lerp(0.85, 1, depth));
			}
		}
	});
	g.putImageData(img, 0, 0);

	// Conifers along the nearest ridge, each a narrow stacked spire.
	if (p.look.pines) {
		const near = p.ridges[p.ridges.length - 1];
		const ridge2 = p.ridges[p.ridges.length - 2];
		for (let i = 0; i < W / 7; i++) {
			const x = hash(i, 801) * W;
			const onNear = hash(i, 802) < 0.6;
			const r = onNear ? near : ridge2;
			const base = r[Math.min(r.length - 1, x | 0)] + 3;
			const h = (onNear ? 14 : 8) + 12 * hash(i, 803);
			if (shore - base > H * 0.2) continue;
			if (pal.night) {
				g.globalCompositeOperation = "destination-out";
				g.fillStyle = "#000";
			} else
				g.fillStyle = rgba(mix(pal.pine, pal.haze, onNear ? 0 : 0.35), 0.95);
			g.beginPath();
			g.moveTo(x, base - h);
			for (let k = 1; k <= 3; k++) {
				const y = base - h + (h * k) / 3;
				const w = (h * 0.16 * k) / 3 + 1;
				g.lineTo(x + w, y);
				g.lineTo(x + w * 0.4, y - 1);
			}
			g.lineTo(x - (h * 0.16 + 1) * 0.4, base - 1);
			for (let k = 3; k >= 1; k--) {
				const y = base - h + (h * k) / 3;
				const w = (h * 0.16 * k) / 3 + 1;
				g.lineTo(x - w, y);
				g.lineTo(x - w * 0.4, y - 1);
			}
			g.closePath();
			g.fill();
			g.globalCompositeOperation = "source-over";
		}
	}

	// The village on the far shore.
	for (const h of p.houses) {
		const y = shore - h.lift;
		if (pal.night) {
			g.globalCompositeOperation = "destination-out";
			g.fillStyle = "#000";
			houseShape(g, h, y);
			g.globalCompositeOperation = "source-over";
			if (h.lit) {
				const wx = h.x + h.w * 0.5;
				const wy = y - h.h * 0.45;
				const lg = g.createRadialGradient(wx, wy, 0, wx, wy, 6);
				lg.addColorStop(0, rgba(pal.window, 0.9));
				lg.addColorStop(1, rgba(pal.window, 0));
				g.fillStyle = lg;
				g.fillRect(wx - 6, wy - 6, 12, 12);
				g.fillStyle = rgba(pal.window, 1);
				g.fillRect(wx - 1, wy - 1, 2, 2);
			}
		} else {
			g.fillStyle = rgba(pal.wall, 1);
			houseShape(g, h, y);
			// The shaded end wall, away from the sun.
			g.fillStyle = rgba(mix(pal.wall, pal.roof, 0.35), 1);
			g.fillRect(h.x, y - h.h, h.w * 0.3, h.h);
			g.fillStyle = rgba(pal.roof, 0.95);
			g.beginPath();
			g.moveTo(h.x - 1, y - h.h);
			g.lineTo(h.x + h.w * 0.5, y - h.h - h.roof);
			g.lineTo(h.x + h.w + 1, y - h.h);
			g.closePath();
			g.fill();
			if (h.lit) {
				if (p.look.dusk) {
					const wx = h.x + h.w * 0.45;
					const wy = y - h.h * 0.5;
					const lg = g.createRadialGradient(wx, wy, 0, wx, wy, 5);
					lg.addColorStop(0, rgba(pal.window, 0.8));
					lg.addColorStop(1, rgba(pal.window, 0));
					g.fillStyle = lg;
					g.fillRect(wx - 5, wy - 5, 10, 10);
				}
				g.fillStyle = rgba(pal.window, 0.9);
				g.fillRect(h.x + h.w * 0.35, y - h.h * 0.6, 2, 2);
			}
		}
	}
	// The shore: a thin bright edge where the land meets the water.
	g.fillStyle = rgba(pal.night ? pal.glint : pal.haze, pal.night ? 0.25 : 0.7);
	g.fillRect(0, shore - 1, W, 1);
}

function houseShape(g: Ctx, h: Plan["houses"][number], y: number) {
	g.beginPath();
	g.moveTo(h.x, y);
	g.lineTo(h.x, y - h.h);
	g.lineTo(h.x + h.w * 0.5, y - h.h - h.roof);
	g.lineTo(h.x + h.w, y - h.h);
	g.lineTo(h.x + h.w, y);
	g.closePath();
	g.fill();
}

/* ---------------------------------------------------------------- water */

function drawWater(c: Ctx, p: Plan, pal: Pal, t: number, scale: number) {
	const { W, H, shore, sun } = p;
	const depth = H - shore;
	// The mirror: strips of the land, flipped about the shore, swaying.
	const step = 2;
	for (let y = shore; y < H; y += step) {
		const dist = (y - shore) / depth;
		const src = shore - (y - shore) * 1.02 - step;
		if (src < 0) break;
		const amp = 0.4 + 5 * dist * dist;
		const off =
			amp * Math.sin(y * 0.21 - t * 1.3) +
			amp * 0.6 * Math.sin(y * 0.077 + t * 0.7 + 1);
		c.globalAlpha = lerp(0.6, 0.12, dist ** 0.8);
		c.drawImage(
			p.land,
			0,
			Math.max(0, src * scale),
			p.land.width,
			step * scale,
			off,
			y,
			W,
			step,
		);
	}
	c.globalAlpha = 1;
	// Water colour deepens toward the viewer.
	const tint = c.createLinearGradient(0, shore, 0, H);
	tint.addColorStop(0, rgba(pal.water, pal.night ? 0.22 : 0.16));
	tint.addColorStop(1, rgba(pal.water, pal.night ? 0.14 : 0.1));
	c.fillStyle = tint;
	c.fillRect(0, shore, W, depth);
	// The sun's path: glints that swell and fade in place, never blink.
	for (let i = 0; i < 90; i++) {
		const dist = hash(i, 201) ** 0.8;
		const y = shore + 3 + dist * depth * 0.95;
		const spread = (6 + dist * 70) * (hash(i, 202) * 2 - 1);
		const x = sun.x + spread;
		const life =
			0.5 + 0.5 * Math.sin(t * (0.6 + hash(i, 203)) + hash(i, 204) * TAU);
		const a =
			smooth(0.35, 1, life) * (1 - Math.abs(spread) / (8 + dist * 72)) * 0.9;
		if (a < 0.03) continue;
		const len = 3 + dist * 16 * hash(i, 205);
		c.fillStyle = rgba(pal.glint, a);
		c.fillRect(x - len / 2, y, len, 1 + (dist > 0.6 ? 1 : 0));
	}
	// Ripple lines catching the sky, slow and level.
	for (let i = 0; i < 40; i++) {
		const dist = hash(i, 301);
		const y = shore + 2 + dist * depth;
		const x = hash(i, 302) * W + Math.sin(t * 0.2 + i) * 8;
		const len = 20 + 80 * dist * hash(i, 303);
		const a = 0.18 * smooth(0, 1, 0.5 + 0.5 * Math.sin(t * 0.4 + i * 1.7));
		c.fillStyle = rgba(pal.night ? pal.glint : pal.haze, a);
		c.fillRect(x, y, len, 1);
	}
	// Village lights stretched down the water at night, and at dusk.
	if (pal.night || p.look.dusk)
		for (const h of p.houses) {
			if (!h.lit) continue;
			const x = h.x + h.w * 0.5;
			const g = c.createLinearGradient(0, shore, 0, shore + 40);
			g.addColorStop(0, rgba(pal.window, 0.5));
			g.addColorStop(1, rgba(pal.window, 0));
			c.fillStyle = g;
			for (let k = 0; k < 8; k++) {
				const y = shore + 2 + k * 5;
				const w = 2 + k * 0.4;
				c.fillRect(x - w / 2 + Math.sin(t * 1.4 + k + h.x) * k * 0.4, y, w, 3);
			}
		}
}

/** Rings on the water: a bite at the bobber, fish rising elsewhere. */
function ring(
	c: Ctx,
	x: number,
	y: number,
	age: number,
	life: number,
	size: number,
	col: Rgb,
) {
	for (let k = 0; k < 3; k++) {
		const a = age - k * 0.45;
		if (a <= 0 || a > life) continue;
		const r = 2 + (a / life) * size;
		const fade = (1 - a / life) * 0.55;
		c.strokeStyle = rgba(col, fade);
		c.lineWidth = 1;
		c.beginPath();
		c.ellipse(x, y, r, r * 0.28, 0, 0, TAU);
		c.stroke();
	}
}

/* ---------------------------------------------------------------- clouds */

function drawClouds(c: Ctx, p: Plan, pal: Pal, t: number) {
	const { W, H, shore, sun } = p;
	// Long evening bands, each a few overlapping lenses: a cool body, and an
	// underside lit warm by the low sun, strongest on the side facing it.
	const blob = (
		x: number,
		y: number,
		rx: number,
		ry: number,
		col: Rgb,
		a: number,
	) => {
		c.save();
		c.translate(x, y);
		c.scale(1, ry / rx);
		const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
		g.addColorStop(0, rgba(col, a));
		g.addColorStop(0.6, rgba(col, a * 0.6));
		g.addColorStop(1, rgba(col, 0));
		c.fillStyle = g;
		c.beginPath();
		c.arc(0, 0, rx, 0, TAU);
		c.fill();
		c.restore();
	};
	for (let i = 0; i < p.look.clouds; i++) {
		const span = W + 700;
		const speed = 2.5 + 2.5 * hash(i, 401);
		const x = ((hash(i, 402) * span + t * speed) % span) - 350;
		const y = shore - H * (0.27 + 0.26 * hash(i, 403));
		const len = 260 + 260 * hash(i, 404);
		const toward = clamp(1 - Math.abs(sun.x - x) / (W * 0.6), 0, 1);
		const lit = mix(pal.cloud, pal.cloudLit, 0.3 + 0.7 * toward);
		for (let k = 0; k < 6; k++) {
			const u = k / 5 - 0.5;
			const px = x + u * len * 0.8 + (hash(i * 6 + k, 406) - 0.5) * 40;
			const rx =
				len * (0.18 + 0.14 * hash(i * 6 + k, 407)) * (1 - Math.abs(u) * 0.8);
			const ry = 5 + 6 * hash(i * 6 + k, 408);
			const py = y + (hash(i * 6 + k, 409) - 0.5) * 6;
			blob(px, py, rx, ry, pal.cloud, pal.night ? 0.3 : 0.32);
			blob(
				px + 6,
				py + ry * 0.55,
				rx * 0.8,
				ry * 0.5,
				lit,
				pal.night ? 0.3 : 0.5,
			);
		}
	}
}

/* -------------------------------------------------------------- village */

function drawSmoke(c: Ctx, p: Plan, pal: Pal, t: number) {
	for (const h of p.houses) {
		if (!h.smoke) continue;
		const x0 = h.x + h.w * 0.75;
		const y0 = p.shore - h.lift - h.h - h.roof * 0.4;
		for (let k = 0; k < 14; k++) {
			const phase = (t * 0.12 + k / 14 + h.x * 0.01) % 1;
			const rise = phase * 70;
			const x = x0 + rise * 0.5 * phase + Math.sin(phase * 5 + t * 0.4) * 3;
			const y = y0 - rise;
			const r = 2 + phase * 9;
			const a = (1 - phase) * smooth(0, 0.1, phase) * 0.28;
			const gr = c.createRadialGradient(x, y, 0, x, y, r);
			gr.addColorStop(0, rgba(pal.smoke, a));
			gr.addColorStop(1, rgba(pal.smoke, 0));
			c.fillStyle = gr;
			c.fillRect(x - r, y - r, r * 2, r * 2);
		}
	}
}

/* ----------------------------------------------------------------- dock */

/** A bite every so often: the bobber goes under, the rod tip dips. */
function biteAt(t: number) {
	const slot = Math.floor(t / 23);
	const start = slot * 23 + 6 + hash(slot, 501) * 10;
	return t - start;
}

/** Pure black in a night palette means "cut a silhouette out of the glow". */
function filler(c: Ctx, pal: Pal) {
	return (col: Rgb, a = 1) => {
		if (pal.night && col[0] + col[1] + col[2] === 0) {
			c.globalCompositeOperation = "destination-out";
			c.fillStyle = "#000";
		} else {
			c.globalCompositeOperation = "source-over";
			c.fillStyle = rgba(col, a);
		}
	};
}

function drawDock(c: Ctx, p: Plan, pal: Pal, t: number) {
	const { dock, man } = p;
	const fill = filler(c, pal);
	// Posts, then their wobbling reflections.
	const posts: number[] = [];
	for (let x = dock.x0 + 30; x < dock.x1; x += 38) posts.push(x);
	posts.push(dock.x1 - 4);
	for (const x of posts) {
		fill(pal.wood);
		c.fillRect(x, dock.deck, 4, dock.water - dock.deck);
		for (let k = 0; k < 6; k++) {
			const y = dock.water + k * 4;
			const wob = Math.sin(t * 1.5 + k * 0.9 + x) * (0.5 + k * 0.4);
			fill(pal.wood, 0.5 * (1 - k / 6));
			c.fillRect(x + wob, y, 4, 3);
		}
	}
	// The deck, its lit top edge.
	fill(pal.wood);
	c.fillRect(dock.x0, dock.deck - 6, dock.x1 - dock.x0, 7);
	c.globalCompositeOperation = "source-over";
	c.fillStyle = rgba(pal.woodLit, pal.night ? 0.35 : 0.9);
	c.fillRect(dock.x0, dock.deck - 6, dock.x1 - dock.x0, 1.5);

	drawAngler(c, pal, t, man.x, man.y - 6, man.s, dock.water, true);
	if (pal.night) lantern(c, pal, t, dock.x1 - 40, dock.deck - 9, dock.water);
}

/** A small hull, rocking on the swell, with its reflection. */
function hull(
	c: Ctx,
	pal: Pal,
	t: number,
	x: number,
	y: number,
	len: number,
	seed: number,
) {
	const fill = filler(c, pal);
	const rock = 0.03 * Math.sin(t * 1.1 + seed);
	const bob = Math.sin(t * 1.3 + seed * 2) * 0.8;
	const draw = (flip: number, a: number) => {
		c.save();
		c.translate(x, y + bob * flip);
		c.rotate(rock * flip);
		c.scale(1, flip);
		fill(pal.hull, a);
		c.beginPath();
		c.moveTo(-len / 2, -len * 0.16);
		c.lineTo(len / 2, -len * 0.2);
		c.quadraticCurveTo(len * 0.36, len * 0.02, len * 0.1, len * 0.04);
		c.lineTo(-len * 0.3, len * 0.04);
		c.quadraticCurveTo(-len * 0.46, len * 0.0, -len / 2, -len * 0.16);
		c.closePath();
		c.fill();
		// The gunwale catches the light.
		c.globalCompositeOperation = "source-over";
		c.fillStyle = rgba(pal.woodLit, (pal.night ? 0.35 : 0.85) * a);
		c.fillRect(-len / 2, -len * 0.2, len, 1.2);
		c.restore();
	};
	draw(-1, 0.3);
	draw(1, 1);
	c.globalCompositeOperation = "source-over";
}

function drawBoat(c: Ctx, p: Plan, pal: Pal, t: number) {
	const s = p.man.s;
	const x = p.W * 0.2;
	const y = p.shore + (p.H - p.shore) * 0.42;
	const len = 64 * s;
	hull(c, pal, t, x, y, len, 1.7);
	const bob = Math.sin(t * 1.3 + 3.4) * 0.8;
	drawAngler(
		c,
		pal,
		t,
		x - len * 0.08,
		y - len * 0.14 + bob,
		s * 0.9,
		y + 4,
		false,
	);
	if (pal.night)
		lantern(c, pal, t, x + len * 0.36, y - len * 0.24 + bob, y + 2);
}

function drawMoored(c: Ctx, p: Plan, pal: Pal, t: number) {
	const v = p.look.village;
	for (let i = 0; i < p.look.moored; i++) {
		const x = p.W * (v.x + v.span * (0.1 + 0.8 * hash(i, 901)));
		const y = p.shore + 8 + 10 * hash(i, 902);
		const len = (22 + 12 * hash(i, 903)) * v.size;
		hull(c, pal, t, x, y, len, i * 2.1);
		// Some carry a mast.
		if (hash(i, 904) < 0.5) {
			const rock = 0.03 * Math.sin(t * 1.1 + i * 2.1);
			c.strokeStyle = rgba(
				pal.night ? pal.woodLit : pal.wood,
				pal.night ? 0.5 : 0.9,
			);
			c.lineWidth = 1;
			c.beginPath();
			c.moveTo(x, y - len * 0.18);
			c.lineTo(x + Math.sin(rock) * len, y - len * 1.3);
			c.stroke();
		}
	}
}

function lantern(
	c: Ctx,
	pal: Pal,
	t: number,
	lx: number,
	ly: number,
	water: number,
) {
	const lg = c.createRadialGradient(lx, ly, 0, lx, ly, 34);
	lg.addColorStop(0, rgba(pal.window, 0.5));
	lg.addColorStop(1, rgba(pal.window, 0));
	c.fillStyle = lg;
	c.fillRect(lx - 34, ly - 34, 68, 68);
	c.fillStyle = rgba(pal.window, 1);
	c.fillRect(lx - 1.5, ly - 3, 3, 4);
	const rg = c.createLinearGradient(0, water, 0, water + 40);
	rg.addColorStop(0, rgba(pal.window, 0.4));
	rg.addColorStop(1, rgba(pal.window, 0));
	c.fillStyle = rg;
	for (let k = 0; k < 8; k++)
		c.fillRect(
			lx - 1.5 + Math.sin(t * 1.3 + k) * k * 0.5,
			water + 2 + k * 5,
			3,
			3,
		);
}

/** Someone fishing, from the dock or a boat, facing the lake. */
function drawAngler(
	c: Ctx,
	pal: Pal,
	t: number,
	bx: number,
	by: number,
	s: number,
	water: number,
	legs: boolean,
) {
	const fill = filler(c, pal);
	const b = biteAt(t);
	const bite = b > 0 && b < 2.2 ? Math.sin((b / 2.2) * Math.PI) : 0;
	const breathe = Math.sin(t * 0.9) * 0.4;
	c.save();
	c.translate(bx, by);
	c.scale(s, s);
	// Legs over the edge.
	fill(pal.coat);
	c.beginPath();
	c.moveTo(-2, 0);
	c.lineTo(8, 0);
	c.lineTo(9, 12);
	c.lineTo(5, 12);
	c.lineTo(3, 3);
	c.closePath();
	if (legs) c.fill();
	// Body: a rounded coat, leaning forward a little.
	fill(pal.coat);
	c.beginPath();
	c.moveTo(-6, 0);
	c.bezierCurveTo(-8, -10, -6, -20 + breathe, 0, -22 + breathe);
	c.bezierCurveTo(6, -22 + breathe, 9, -12, 8, 0);
	c.closePath();
	c.fill();
	// Light along the back, from the sun on the right.
	c.globalCompositeOperation = "source-over";
	c.fillStyle = rgba(pal.coatLit, pal.night ? 0.3 : 0.8);
	c.beginPath();
	c.moveTo(4, -20 + breathe);
	c.bezierCurveTo(7, -19, 9, -12, 8, -1);
	c.lineTo(6, -1);
	c.bezierCurveTo(7, -10, 6, -17, 3, -20 + breathe);
	c.closePath();
	c.fill();
	// Head and a wide-brimmed hat.
	fill(pal.skin);
	c.beginPath();
	c.arc(2, -25 + breathe, 3.6, 0, TAU);
	c.fill();
	fill(pal.hat);
	c.beginPath();
	c.ellipse(2, -27.5 + breathe, 7.5, 1.8, -0.05, 0, TAU);
	c.fill();
	c.beginPath();
	c.ellipse(2, -29.5 + breathe, 4, 3, 0, Math.PI, TAU);
	c.fill();
	c.restore();
	c.globalCompositeOperation = "source-over";

	// Rod: from the hands up and out over the water; it dips on a bite.
	const hx = bx + 6 * s;
	const hy = by - 12 * s;
	const tipX = hx + 70 * s;
	const tipY = hy - 46 * s + bite * 16 + Math.sin(t * 0.8) * 0.8;
	c.strokeStyle = rgba(pal.night ? pal.woodLit : pal.wood, pal.night ? 0.5 : 1);
	c.lineWidth = 1.4;
	c.beginPath();
	c.moveTo(hx, hy);
	c.quadraticCurveTo(hx + 40 * s, hy - 34 * s, tipX, tipY);
	c.stroke();
	// Line to the bobber, which rides the swell and goes under on a bite.
	const fx = tipX + 34 * s;
	const fy = water + 10 + Math.sin(t * 1.1) * 0.8 + bite * 3;
	c.strokeStyle = rgba(pal.night ? pal.glint : pal.wood, 0.4);
	c.lineWidth = 0.7;
	c.beginPath();
	c.moveTo(tipX, tipY);
	c.quadraticCurveTo(tipX + 20 * s, tipY + 40 + bite * 10, fx, fy);
	c.stroke();
	c.fillStyle = rgba(pal.bobber, 1 - bite * 0.7);
	c.beginPath();
	c.arc(fx, fy - 1, 1.8, 0, TAU);
	c.fill();
	if (b > 0 && b < 5)
		ring(c, fx, fy, b, 4.5, 26, pal.night ? pal.glint : pal.haze);
	ring(c, fx, fy, (t % 6) + 0.01, 3, 6, pal.night ? pal.glint : pal.haze);
}

/* ---------------------------------------------------------------- scene */

function makeLake(look: Look): Scene {
	let memo: Plan | null = null;
	let memoKey = "";
	return ({ dither: c }, { t, W, H, dark }) => {
		const key = `${W}|${H}`;
		if (key !== memoKey || !memo) {
			memoKey = key;
			memo = plan(W, H, look);
		}
		const p = memo;
		const base = PALS[dark ? "dark" : "light"];
		const pal = { ...base, ...look.tint?.[dark ? "dark" : "light"] };
		const scale = c.getTransform().a;
		const landKey = `${dark}|${scale}`;
		if (landKey !== p.landKey) {
			p.landKey = landKey;
			paintLand(p, pal, scale);
		}
		drawClouds(c, p, pal, t);
		c.drawImage(p.land, 0, 0, p.land.width / scale, p.land.height / scale);
		drawSmoke(c, p, pal, t);
		drawWater(c, p, pal, t, scale);
		// Fish rising out on the lake, away from the angler.
		for (let k = Math.floor(t / 7) - 1; k <= Math.floor(t / 7); k++) {
			const t0 = k * 7 + hash(k, 601) * 5;
			const age = t - t0;
			if (age < 0 || age > 4) continue;
			const x = p.W * (0.25 + 0.7 * hash(k, 602));
			const y = p.shore + (p.H - p.shore) * (0.2 + 0.6 * hash(k, 603));
			ring(c, x, y, age, 3.8, 22, pal.night ? pal.glint : pal.haze);
		}
		drawMoored(c, p, pal, t);
		if (look.angler === "boat") drawBoat(c, p, pal, t);
		else drawDock(c, p, pal, t);
	};
}

export const lakeside = makeLake(LOOKS.lakeside);
