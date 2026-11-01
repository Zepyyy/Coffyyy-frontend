import type { Scene } from "../engine";

/**
 * A star atlas turning about the celestial pole, which sits just off the page.
 *
 * The chart is one rigid disc, far bigger than the page: every mark on it has a
 * fixed place, and a frame is a single rotation of that list. Nothing has its
 * own path and nothing wraps.
 *
 * Every dot is printed at full tone. A faint dot would pass in and out of the
 * dither as it crossed the lattice, which is a twinkle. So faintness here is
 * colour and spacing, never tone.
 */

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const HOUR = TAU / 24;

/** Fifteen minutes a turn. Counter-clockwise, as the northern sky goes. */
const OMEGA = TAU / 900;
/**
 * Steps per second for each dot. A dot gliding through cells never stays long
 * enough for the engine's tone to reach it, so the fast outer sky would fade to
 * a smear. Each one holds a cell until it is whole, then moves on. Dots step in
 * eight staggered groups, so the page as a whole never pulses.
 */
const STEPS = 3;
const GROUPS = 8;
/** Chart angle of 0h right ascension at t=0. */
const OFFSET = -1.9;

type StarRow = [h: number, m: number, dec: number, mag: number];
type Figure = {
	name: string;
	stars: StarRow[];
	lines: [number, number][];
	first: boolean;
};

const chain = (...ids: number[]): [number, number][] =>
	ids.slice(1).map((id, i) => [ids[i], id]);

const FIGURES: Figure[] = [
	{
		// Ursa Major: the Plough.
		name: "URSA MAJOR",
		first: true,
		stars: [
			[11, 4, 61.75, 1.8],
			[11, 2, 56.38, 2.4],
			[11, 54, 53.69, 2.4],
			[12, 15, 57.03, 3.3],
			[12, 54, 55.96, 1.8],
			[13, 24, 54.93, 2.2],
			[13, 48, 49.31, 1.9],
		],
		lines: [...chain(0, 1, 2, 3, 0), ...chain(3, 4, 5, 6)],
	},
	{
		// Cassiopeia.
		name: "CASSIOPEIA",
		first: true,
		stars: [
			[0, 9, 59.15, 2.3],
			[0, 40.5, 56.54, 2.2],
			[0, 56.7, 60.72, 2.2],
			[1, 25.8, 60.24, 2.7],
			[1, 54.4, 63.67, 3.4],
		],
		lines: chain(0, 1, 2, 3, 4),
	},
	{
		// Orion.
		name: "ORION",
		first: true,
		stars: [
			[5, 55.2, 7.41, 0.5],
			[5, 25.1, 6.35, 1.6],
			[5, 40.8, -1.94, 1.8],
			[5, 36.2, -1.2, 1.7],
			[5, 32, -0.3, 2.2],
			[5, 47.8, -9.67, 2.1],
			[5, 14.5, -8.2, 0.1],
			[5, 35.1, 9.93, 3.3],
		],
		lines: [
			...chain(0, 2, 3, 4, 1),
			...chain(2, 5),
			...chain(4, 6),
			...chain(0, 1),
			...chain(0, 7, 1),
		],
	},
	{
		// Cygnus.
		name: "CYGNUS",
		first: true,
		stars: [
			[20, 41.4, 45.28, 1.3],
			[20, 22.2, 40.26, 2.2],
			[20, 46.2, 33.97, 2.5],
			[19, 45, 45.13, 2.9],
			[19, 30.7, 27.96, 3.1],
		],
		lines: [...chain(0, 1, 4), ...chain(3, 1, 2)],
	},
	{
		// Leo: the sickle and the haunch.
		name: "LEO",
		first: true,
		stars: [
			[10, 8.4, 11.97, 1.4],
			[10, 7.3, 16.76, 3.5],
			[10, 20, 19.84, 2],
			[10, 16.7, 23.42, 3.4],
			[9, 52.8, 26, 3.9],
			[9, 45.9, 23.77, 3],
			[11, 14.1, 20.52, 2.6],
			[11, 14.2, 15.43, 3.3],
			[11, 49, 14.57, 2.1],
		],
		lines: [...chain(0, 1, 2, 3, 4, 5), ...chain(2, 6, 8, 7, 0)],
	},
	{
		// Scorpius: claws, heart, and the long tail with its sting.
		name: "SCORPIUS",
		first: true,
		stars: [
			[16, 5.4, -19.81, 2.6],
			[16, 0.3, -22.62, 2.3],
			[15, 58.9, -26.11, 2.9],
			[16, 21.2, -25.59, 2.9],
			[16, 29.4, -26.43, 1],
			[16, 35.9, -28.22, 2.8],
			[16, 50.2, -34.29, 2.3],
			[16, 51.9, -38.05, 3],
			[16, 54, -42.36, 3.6],
			[17, 12.2, -43.24, 3.3],
			[17, 37.3, -43, 1.9],
			[17, 47.6, -40.13, 3],
			[17, 42.5, -39.03, 2.4],
			[17, 33.6, -37.1, 1.6],
			[17, 30.8, -37.3, 2.7],
		],
		lines: [
			...chain(0, 1, 2),
			...chain(1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14),
		],
	},
	{
		// Ursa Minor, with Polaris just off the pole.
		name: "URSA MINOR",
		first: false,
		stars: [
			[2, 31.8, 89.26, 2],
			[17, 32, 86.59, 4.4],
			[16, 46, 82.04, 4.2],
			[15, 44, 77.79, 4.3],
			[14, 50.7, 74.16, 2.1],
			[15, 20.7, 71.83, 3],
			[16, 17.5, 75.76, 4.9],
		],
		lines: chain(0, 1, 2, 3, 4, 5, 6, 3),
	},
	{
		// Lyra.
		name: "LYRA",
		first: false,
		stars: [
			[18, 36.9, 38.78, 0],
			[18, 44.8, 37.6, 4.3],
			[18, 54.5, 36.9, 4.3],
			[18, 58.9, 32.69, 3.2],
			[18, 50, 33.36, 3.5],
		],
		lines: chain(0, 1, 2, 3, 4, 1),
	},
	{
		// Bootes.
		name: "BOOTES",
		first: false,
		stars: [
			[14, 15.7, 19.18, 0],
			[14, 45, 27.07, 2.4],
			[13, 54.7, 18.4, 2.7],
			[14, 32, 38.3, 3],
			[15, 1.9, 40.39, 3.5],
			[15, 15.5, 33.31, 3.5],
		],
		lines: chain(2, 0, 1, 5, 4, 3, 0),
	},
	{
		// Gemini.
		name: "GEMINI",
		first: false,
		stars: [
			[7, 34.6, 31.89, 1.6],
			[7, 45.3, 28.03, 1.1],
			[7, 20, 21.98, 3.5],
			[6, 37.7, 16.4, 1.9],
			[6, 43.9, 25.13, 3],
			[6, 22.9, 22.51, 2.9],
		],
		lines: chain(5, 4, 0, 1, 2, 3),
	},
	{
		// Taurus.
		name: "TAURUS",
		first: false,
		stars: [
			[4, 35.9, 16.51, 0.9],
			[4, 19.8, 15.63, 3.6],
			[4, 28.6, 19.18, 3.5],
			[5, 26.3, 28.6, 1.7],
			[5, 37.6, 21.14, 3],
		],
		lines: chain(4, 0, 1, 2, 3),
	},
	{
		// Auriga.
		name: "AURIGA",
		first: false,
		stars: [
			[5, 16.7, 46, 0.1],
			[5, 59.5, 44.95, 1.9],
			[5, 59.7, 37.2, 2.6],
			[4, 57, 33.17, 2.7],
			[5, 2, 43.82, 3],
		],
		lines: chain(0, 1, 2, 3, 4, 0),
	},
	{
		// Canis Major.
		name: "CANIS MAJOR",
		first: false,
		stars: [
			[6, 45.1, -16.72, -1.4],
			[6, 22.7, -17.96, 2],
			[7, 8.4, -26.39, 1.8],
			[6, 58.6, -28.97, 1.5],
			[7, 24.1, -29.3, 2.4],
		],
		lines: [...chain(1, 0, 2, 3), ...chain(2, 4)],
	},
	{
		// The Square of Pegasus.
		name: "PEGASUS",
		first: false,
		stars: [
			[23, 4.8, 15.2, 2.5],
			[23, 3.8, 28.08, 2.4],
			[0, 8.4, 29.09, 2.1],
			[0, 13.2, 15.18, 2.8],
		],
		lines: chain(0, 1, 2, 3, 0),
	},
	{
		// Aquila.
		name: "AQUILA",
		first: false,
		stars: [
			[19, 50.8, 8.87, 0.8],
			[19, 46.3, 10.61, 2.7],
			[19, 55.3, 6.41, 3.7],
		],
		lines: chain(1, 0, 2),
	},
];

const Kind = {
	Fine: 0,
	Major: 1,
	/** Faint field stars: one cell, then a two-by-two block. */
	Dust: 2,
	Field: 3,
	/** The river of the galaxy, its bright core and its pale banks. */
	Core: 4,
	Bank: 5,
	Ecliptic: 6,
	/** The fixed plate: its neat-lines and scale. */
	Plate: 7,
	Name: 8,
	Count: 9,
} as const;

const INK: Record<"light" | "dark", Rgb[]> = {
	light: [
		[198, 204, 220],
		[160, 172, 200],
		[186, 182, 188],
		[150, 142, 146],
		[168, 154, 186],
		[204, 196, 214],
		[138, 98, 170],
		[176, 180, 196],
		[126, 94, 150],
	],
	dark: [
		[92, 100, 118],
		[132, 144, 170],
		[128, 126, 132],
		[192, 186, 180],
		[176, 164, 196],
		[116, 108, 132],
		[196, 160, 222],
		[120, 124, 136],
		[200, 172, 222],
	],
};

const STAR = { light: "rgb(180 112 46)", dark: "rgb(246 206 136)" };
const FIGURE = {
	light: ["rgb(104 82 84)", "rgb(150 130 128)"],
	dark: ["rgb(232 214 188)", "rgb(170 156 142)"],
};

/** How far figures shrink about their true centres, to read as figures. */
const FIGURE_SCALE = 0.56;

const rnd = (n: number) => {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
};

/** Radius of a star's points, px. Hierarchy lives here: few large, many small. */
const glyphSize = (mag: number) =>
	mag < 0.6 ? 15 : mag < 1.5 ? 12 : mag < 2.2 ? 9 : mag < 3 ? 5.2 : 3.6;

/** A 5x7 sort for the names, one hex row per line, as a plate would letter them. */
const SORTS: Record<string, number[]> = {
	A: [14, 17, 17, 31, 17, 17, 17],
	B: [30, 17, 17, 30, 17, 17, 30],
	C: [14, 17, 16, 16, 16, 17, 14],
	E: [31, 16, 16, 30, 16, 16, 31],
	G: [14, 17, 16, 23, 17, 17, 15],
	I: [14, 4, 4, 4, 4, 4, 14],
	J: [7, 2, 2, 2, 2, 18, 12],
	L: [16, 16, 16, 16, 16, 16, 31],
	M: [17, 27, 21, 21, 17, 17, 17],
	N: [17, 25, 21, 19, 17, 17, 17],
	O: [14, 17, 17, 17, 17, 17, 14],
	P: [30, 17, 17, 30, 16, 16, 16],
	Q: [14, 17, 17, 17, 21, 18, 13],
	R: [30, 17, 17, 30, 20, 18, 17],
	S: [15, 16, 16, 14, 1, 1, 30],
	T: [31, 4, 4, 4, 4, 4, 4],
	U: [17, 17, 17, 17, 17, 17, 14],
	Y: [17, 17, 10, 4, 4, 4, 4],
};

/** Packs a colour as one little-endian RGBA word. */
const word = (c: Rgb) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];

type Glyph = { x: number; y: number; mag: number };
/** Cell offsets of a name, centred on its anchor. */
type Label = {
	x: number;
	y: number;
	dx: Int16Array;
	dy: Int16Array;
	w: number;
};

type Box = { x0: number; x1: number; y0: number; y1: number };

type Chart = {
	n: number;
	xs: Float32Array;
	ys: Float32Array;
	kind: Uint8Array;
	/** Bright stars and figure lines are drawn, so they glide between cells. */
	stars: Glyph[];
	/** Line ends as x0,y0,x1,y1 runs: first-rank figures, then second. */
	lines: [Float32Array, Float32Array];
	labels: Label[];
	/** Cells of the fixed plate, with their kinds. */
	plateAt: Uint32Array;
	plateKind: Uint8Array;
	/** A mark in the text column survives only if its rank is low enough. */
	rank: Uint8Array;
	k: number;
	poleX: number;
	poleY: number;
	image: ImageData;
	pixels: Uint32Array;
};

/** Tangent-plane offsets of a star from a centre, in degrees: east, north. */
function tangent(ra: number, dec: number, ra0: number, dec0: number) {
	const d = ra - ra0;
	const cosC =
		Math.sin(dec0) * Math.sin(dec) +
		Math.cos(dec0) * Math.cos(dec) * Math.cos(d);
	return [
		(Math.cos(dec) * Math.sin(d)) / cosC / DEG,
		(Math.cos(dec0) * Math.sin(dec) -
			Math.sin(dec0) * Math.cos(dec) * Math.cos(d)) /
			cosC /
			DEG,
	];
}

/** Galactic plane, J2000: its north pole, and the longitude of our own pole. */
const NGP_RA = 192.859 * DEG;
const NGP_DEC = 27.128 * DEG;
const NCP_L = 122.932 * DEG;

/** Equatorial right ascension and declination of a galactic position. */
function fromGalactic(l: number, b: number) {
	const d = NCP_L - l;
	const sinDec =
		Math.sin(NGP_DEC) * Math.sin(b) +
		Math.cos(NGP_DEC) * Math.cos(b) * Math.cos(d);
	const y = Math.cos(b) * Math.sin(d);
	const x =
		Math.cos(NGP_DEC) * Math.sin(b) -
		Math.sin(NGP_DEC) * Math.cos(b) * Math.cos(d);
	return [NGP_RA + Math.atan2(y, x), Math.asin(sinDec)];
}

function buildChart(
	c: Ctx,
	W: number,
	H: number,
	gutter: number,
	phone: boolean,
): Chart {
	// Over the near gutter, so it holds the slow polar stars while the far
	// gutter sweeps the equator past.
	const poleX = phone ? W * 1.04 : W * 0.1;
	const poleY = phone ? H * 0.03 : -H * 0.16;
	const k = phone
		? H / 46
		: Math.hypot(W - gutter * 0.5 - poleX, H * 0.5 - poleY) / 104;

	const xs: number[] = [];
	const ys: number[] = [];
	const kinds: number[] = [];
	const ranks: number[] = [];
	let seq = 0;
	const dot = (x: number, y: number, kind: number) => {
		xs.push(x);
		ys.push(y);
		kinds.push(kind);
		ranks.push(Math.floor(rnd(++seq * 0.37) * 255));
	};
	const polar = (ra: number, dec: number): [number, number] => {
		const r = (90 - dec / DEG) * k;
		return [r * Math.cos(ra), r * Math.sin(ra)];
	};

	// Parallels every fifteen degrees and hour circles every two hours: few
	// enough to read as a coordinate system, not a mesh.
	for (let dec = 75; dec >= -75; dec -= 15) {
		const r = (90 - dec) * k;
		const major = dec % 45 === 0;
		const step = 6 / r;
		for (let a = 0; a < TAU; a += step)
			dot(r * Math.cos(a), r * Math.sin(a), major ? Kind.Major : Kind.Fine);
	}
	for (let h = 0; h < 24; h += 2) {
		const major = h % 6 === 0;
		const a = h * HOUR;
		for (let r = 15 * k; r < 165 * k; r += 6)
			dot(r * Math.cos(a), r * Math.sin(a), major ? Kind.Major : Kind.Fine);
	}
	if (!phone) {
		// The many faint stars under the few bright ones.
		const reach = 165 * k;
		const field = Math.round(((W * H) / 900) * 8);
		for (let i = 0; i < field; i++) {
			const r = reach * Math.sqrt(rnd(i * 1.7 + 0.3));
			const a = TAU * rnd(i * 2.9 + 0.7);
			dot(
				r * Math.cos(a),
				r * Math.sin(a),
				rnd(i * 4.3 + 0.1) < 0.05 ? Kind.Field : Kind.Dust,
			);
		}
		// The Milky Way, true to the galactic plane: dots thick along it, thicker
		// toward the centre, and split by the dark Great Rift from Cygnus south.
		for (let i = 0; i < 34000; i++) {
			const l = TAU * rnd(i * 0.91 + 0.2);
			const u = rnd(i * 1.33 + 0.4) + rnd(i * 2.17 + 0.6) + rnd(i * 3.1 + 0.8);
			const b = (u / 3 - 0.5) * 21 * DEG;
			const toward = 0.5 + 0.5 * Math.cos(l);
			const near = Math.min(Math.abs(l), TAU - Math.abs(l));
			const wander =
				1.8 * Math.sin(l * 5 + 1) * DEG + 1.1 * Math.sin(l * 13) * DEG;
			const rift =
				(1 - Math.min(1, near / (95 * DEG))) *
				Math.exp(-(((b - wander) / (2.3 * DEG)) ** 2));
			const keep = (0.32 + 0.68 * toward) * (1 - rift);
			if (rnd(i * 5.3 + 0.9) > keep) continue;
			const [ra, dec] = fromGalactic(l, b);
			const [x, y] = polar(ra, dec);
			dot(x, y, Math.abs(b) < 4.2 * DEG ? Kind.Core : Kind.Bank);
		}
	}

	// The ecliptic: two rails with a graduated degree scale between them, the
	// twelve signs cut long.
	const eps = 23.44 * DEG;
	const ecl = (lambda: number) => {
		const ra = Math.atan2(Math.sin(lambda) * Math.cos(eps), Math.cos(lambda));
		return polar(ra, Math.asin(Math.sin(lambda) * Math.sin(eps)));
	};
	const half = 6;
	let travelled = 0;
	let [lastX, lastY] = ecl(0);
	for (let i = 1; i <= 3600; i++) {
		const lambda = (i / 3600) * TAU;
		const [x, y] = ecl(lambda);
		const dx = x - lastX;
		const dy = y - lastY;
		const len = Math.hypot(dx, dy);
		const nx = -dy / len;
		const ny = dx / len;
		travelled += len;
		if (travelled >= 3) {
			travelled = 0;
			dot(x + nx * half, y + ny * half, Kind.Ecliptic);
			dot(x - nx * half, y - ny * half, Kind.Ecliptic);
		}
		if (i % 10 === 0 && !phone) {
			// Graduated from one rail, like a rule; only the twelve signs cross it.
			const degree = i / 10;
			const sign = degree % 30 === 0;
			const cut = sign ? half * 2 + 12 : degree % 5 === 0 ? 7 : 3;
			for (let d = 0; d <= cut; d += 2)
				dot(x + nx * (half - d), y + ny * (half - d), Kind.Ecliptic);
		}
		lastX = x;
		lastY = y;
	}

	const stars: Glyph[] = [];
	const labels: Label[] = [];
	const first: number[] = [];
	const second: number[] = [];
	for (const fig of FIGURES) {
		// The centre of a figure sits true on the grid; its stars keep their real
		// shape around that centre, which the polar grid alone would stretch.
		let sx = 0;
		let sy = 0;
		let sz = 0;
		for (const [h, m, dec] of fig.stars) {
			const ra = (h + m / 60) * HOUR;
			sx += Math.cos(dec * DEG) * Math.cos(ra);
			sy += Math.cos(dec * DEG) * Math.sin(ra);
			sz += Math.sin(dec * DEG);
		}
		const ra0 = Math.atan2(sy, sx);
		const dec0 = Math.atan2(sz, Math.hypot(sx, sy));
		const r0 = (90 - dec0 / DEG) * k;
		const cos0 = Math.cos(ra0);
		const sin0 = Math.sin(ra0);
		const size = k * FIGURE_SCALE;
		const placed = fig.stars.map(([h, m, dec]) => {
			const [east, north] = tangent((h + m / 60) * HOUR, dec * DEG, ra0, dec0);
			// East is clockwise on a sky chart; north is toward the pole.
			return [
				r0 * cos0 - east * size * sin0 - north * size * cos0,
				r0 * sin0 + east * size * cos0 - north * size * sin0,
			];
		});
		fig.stars.forEach((row, i) => {
			if (!phone || row[3] < 2.6)
				stars.push({ x: placed[i][0], y: placed[i][1], mag: row[3] });
		});
		if (!phone) {
			// A name beyond the figure's edge, on the side away from the pole.
			let far = 0;
			for (const [x, y] of placed)
				far = Math.max(far, Math.hypot(x - r0 * cos0, y - r0 * sin0));
			const dx: number[] = [];
			const dy: number[] = [];
			let pen = 0;
			for (const ch of fig.name) {
				const rows = SORTS[ch];
				if (rows)
					rows.forEach((row, ry) => {
						for (let bit = 0; bit < 5; bit++)
							if (row & (16 >> bit)) {
								dx.push(pen + bit);
								dy.push(ry);
							}
					});
				pen += ch === " " ? 4 : 6;
			}
			const out = r0 + far + 26;
			labels.push({
				x: out * cos0,
				y: out * sin0,
				dx: Int16Array.from(dx.map((v) => v - Math.floor(pen / 2))),
				dy: Int16Array.from(dy.map((v) => v - 3)),
				w: pen,
			});
		}
		const list = fig.first ? first : second;
		for (const [a, b] of fig.lines) {
			const [ax, ay] = placed[a];
			const [bx, by] = placed[b];
			const len = Math.hypot(bx - ax, by - ay);
			// Lines stop short of their stars, as an engraver's do.
			const padA = glyphSize(fig.stars[a][3]) + 3;
			const padB = glyphSize(fig.stars[b][3]) + 3;
			if (len < padA + padB + 4) continue;
			const ux = (bx - ax) / len;
			const uy = (by - ay) / len;
			list.push(ax + ux * padA, ay + uy * padA, bx - ux * padB, by - uy * padB);
		}
	}

	// The fixed plate: double neat-line and a degree scale. Each line sits on a
	// row or column whose dither thresholds are low, so it stays whole.
	const w = c.canvas.width;
	const h = c.canvas.height;
	const plateAt: number[] = [];
	const plateKind: number[] = [];
	const put = (x: number, y: number, kind: number) => {
		if (x < 0 || y < 0 || x >= w || y >= h) return;
		plateAt.push(y * w + x);
		plateKind.push(kind);
	};
	const line = phone ? 2 : 8;
	const right = (w - 1) & ~3;
	const bottom = (h - 1) & ~3;
	const inset = line & ~3;
	for (let x = inset; x <= right - inset; x++) {
		put(x, inset, Kind.Plate);
		put(x, bottom - inset, Kind.Plate);
	}
	for (let y = inset; y <= bottom - inset; y++) {
		put(inset, y, Kind.Plate);
		put(right - inset, y, Kind.Plate);
	}
	if (!phone) {
		// A fine degree scale outside the neat-line, every fifth cut longer.
		const tick = (i: number) => (i % 10 === 0 ? 5 : i % 5 === 0 ? 3 : 2);
		for (let x = inset + 8, i = 0; x < right - inset; x += 8, i++)
			for (let d = 1; d <= tick(i); d++) {
				put(x, inset - d, Kind.Plate);
				put(x, bottom - inset + d, Kind.Plate);
			}
		for (let y = inset + 8, i = 0; y < bottom - inset; y += 8, i++)
			for (let d = 1; d <= tick(i); d++) {
				put(inset - d, y, Kind.Plate);
				put(right - inset + d, y, Kind.Plate);
			}
	}

	const image = c.createImageData(w, h);
	return {
		n: xs.length,
		xs: Float32Array.from(xs),
		ys: Float32Array.from(ys),
		kind: Uint8Array.from(kinds),
		stars,
		lines: [Float32Array.from(first), Float32Array.from(second)],
		labels,
		plateAt: Uint32Array.from(plateAt),
		plateKind: Uint8Array.from(plateKind),
		rank: Uint8Array.from(ranks),
		k,
		poleX,
		poleY,
		image,
		pixels: new Uint32Array(image.data.buffer),
	};
}

let chartKey = "";
let chart: Chart | null = null;

const palette = new Uint32Array(Kind.Count);
const groupCos = new Float64Array(GROUPS);
const groupSin = new Float64Array(GROUPS);

const inside = (x: number, y: number, b: Box | null) =>
	b !== null && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;

function drawFigures(
	c: Ctx,
	sky: Chart,
	cos: number,
	sin: number,
	W: number,
	H: number,
	dark: boolean,
	column: Box | null,
) {
	const inks = FIGURE[dark ? "dark" : "light"];
	c.lineCap = "butt";
	c.setLineDash([9, 4]);
	sky.lines.forEach((run, rank) => {
		c.strokeStyle = inks[rank];
		c.lineWidth = rank ? 2.2 : 3;
		// Two passes: full ink on open paper, a thin trace under the text column.
		for (const under of [false, true]) {
			c.beginPath();
			for (let i = 0; i < run.length; i += 4) {
				const x0 = sky.poleX + cos * run[i] - sin * run[i + 1];
				const y0 = sky.poleY + sin * run[i] + cos * run[i + 1];
				const x1 = sky.poleX + cos * run[i + 2] - sin * run[i + 3];
				const y1 = sky.poleY + sin * run[i + 2] + cos * run[i + 3];
				if (
					(x0 < 0 && x1 < 0) ||
					(y0 < 0 && y1 < 0) ||
					(x0 > W && x1 > W) ||
					(y0 > H && y1 > H)
				)
					continue;
				if (inside((x0 + x1) / 2, (y0 + y1) / 2, column) !== under) continue;
				c.moveTo(x0, y0);
				c.lineTo(x1, y1);
			}
			c.globalAlpha = under ? 0.4 : 1;
			c.stroke();
		}
	});
	c.globalAlpha = 1;
	c.setLineDash([]);
}

function drawStars(
	c: Ctx,
	sky: Chart,
	cos: number,
	sin: number,
	W: number,
	H: number,
	dark: boolean,
	column: Box | null,
) {
	c.fillStyle = dark ? STAR.dark : STAR.light;
	for (const under of [false, true]) {
		c.beginPath();
		for (const s of sky.stars) {
			const x = sky.poleX + cos * s.x - sin * s.y;
			const y = sky.poleY + sin * s.x + cos * s.y;
			const a = glyphSize(s.mag);
			if (x < -a || y < -a || x > W + a || y > H + a) continue;
			if (inside(x, y, column) !== under) continue;
			if (a < 6) {
				c.moveTo(x + a * 0.7, y);
				c.arc(x, y, a * 0.7, 0, TAU);
				continue;
			}
			// A four-point star, always upright, as a printer's sort would be.
			const b = a * 0.3;
			c.moveTo(x, y - a);
			c.lineTo(x + b, y - b);
			c.lineTo(x + a, y);
			c.lineTo(x + b, y + b);
			c.lineTo(x, y + a);
			c.lineTo(x - b, y + b);
			c.lineTo(x - a, y);
			c.lineTo(x - b, y - b);
			c.closePath();
			c.moveTo(x + a * 0.36, y);
			c.arc(x, y, a * 0.36, 0, TAU);
		}
		c.globalAlpha = under ? 0.45 : 1;
		c.fill();
	}
	c.globalAlpha = 1;
}

/** How much of the sky survives under the text column. */
const UNDER_TEXT = 70;

export const atlas: Scene = ({ dither: c }, { t, W, H, anchors, dark }) => {
	const content = anchors.content;
	const shelf = anchors.shelf;
	const phone = W < 600;
	const gutter = content ? Math.max(0, W - content.x - content.w) : 200;
	const key = `${c.canvas.width}x${c.canvas.height}|${W}|${H}|${gutter | 0}|${phone}`;
	if (key !== chartKey || !chart) {
		chartKey = key;
		chart = buildChart(c, W, H, gutter, phone);
	}
	const sky = chart;
	const colours = INK[dark ? "dark" : "light"];
	for (let i = 0; i < Kind.Count; i++) palette[i] = word(colours[i]);

	let column: Box | null = null;
	if (content && !phone) {
		column = {
			x0: content.x - 8,
			x1: content.x + content.w + 8,
			y0: content.y - 8,
			y1: Math.max(content.y + content.h, shelf ? shelf.y + shelf.h : 0) + 8,
		};
	}

	const angle = OFFSET - OMEGA * t;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const scale = c.getTransform().a;
	const w = c.canvas.width;
	const h = c.canvas.height;
	const { n, xs, ys, kind, rank, pixels, image, poleX, poleY } = sky;
	pixels.fill(0);
	for (let g = 0; g < GROUPS; g++) {
		const offset = g / GROUPS;
		const held = (Math.floor(t * STEPS + offset) - offset) / STEPS;
		groupCos[g] = Math.cos(OFFSET - OMEGA * held);
		groupSin[g] = Math.sin(OFFSET - OMEGA * held);
	}
	const cx0 = column ? column.x0 * scale : 0;
	const cx1 = column ? column.x1 * scale : -1;
	const cy0 = column ? column.y0 * scale : 0;
	const cy1 = column ? column.y1 * scale : -1;
	for (let i = 0; i < n; i++) {
		const g = rank[i] & (GROUPS - 1);
		const x = poleX + groupCos[g] * xs[i] - groupSin[g] * ys[i];
		const y = poleY + groupSin[g] * xs[i] + groupCos[g] * ys[i];
		const cx = (x * scale) | 0;
		const cy = (y * scale) | 0;
		if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
		if (rank[i] > UNDER_TEXT && cx > cx0 && cx < cx1 && cy > cy0 && cy < cy1)
			continue;
		const ink = palette[kind[i]];
		const at = cy * w + cx;
		pixels[at] = ink;
		if (kind[i] === Kind.Field && cx + 1 < w && cy + 1 < h) {
			pixels[at + 1] = ink;
			pixels[at + w] = ink;
			pixels[at + w + 1] = ink;
		}
	}
	// Names stay upright and keep off the text column altogether.
	const nameInk = palette[Kind.Name];
	for (let l = 0; l < sky.labels.length; l++) {
		const label = sky.labels[l];
		const g = l & (GROUPS - 1);
		const x = poleX + groupCos[g] * label.x - groupSin[g] * label.y;
		const y = poleY + groupSin[g] * label.x + groupCos[g] * label.y;
		const span = (label.w / scale) * 0.5 + 8;
		if (x < span + 16 || x > W - span - 16 || y < 28 || y > H - 44) continue;
		if (
			column &&
			x + span > column.x0 &&
			x - span < column.x1 &&
			y < column.y1 + 16
		)
			continue;
		const lx = (x * scale) | 0;
		const ly = (y * scale) | 0;
		for (let i = 0; i < label.dx.length; i++)
			pixels[(ly + label.dy[i]) * w + lx + label.dx[i]] = nameInk;
	}
	const plateInk = palette[Kind.Plate];
	for (const at of sky.plateAt) pixels[at] = plateInk;
	c.putImageData(image, 0, 0);
	drawFigures(c, sky, cos, sin, W, H, dark, column);
	drawStars(c, sky, cos, sin, W, H, dark, column);
};
