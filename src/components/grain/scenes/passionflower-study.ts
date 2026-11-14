import type { Scene } from "../engine";

/**
 * PASSIONFLOWER STUDY: the liked passion vine, unchanged in petal, shadow and
 * anatomy, now rooted in a small perennial border. A japanese anemone (flat
 * face, upturned cup, nodding bud) and a verbena bonariensis (tall, airy,
 * clustered) grow in the margin on the vine's side of the page; the vine's
 * lateral shoot reaches over and coils its tendril round a verbena stalk, as
 * passion vines do round whatever is nearest. One bumblebee works the border
 * while the butterfly works the vine, taking turns rather than competing.
 *
 * Baseline text follows. A passion vine climbing the right of the page. Geometry lives in "design
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
/**
 * Mix two facings along the turn that passes through `ref`: the shortest way
 * flips when the difference crosses a half turn, which on landing approaches
 * snapped the body round by a whole turn times the blend weight.
 */
const blendAngle = (from: number, to: number, q: number, ref: number) => {
	let v = (to - from - ref) % TAU;
	if (v > Math.PI) v -= TAU;
	if (v < -Math.PI) v += TAU;
	return from + (ref + v) * q;
};
const wrapPi = (d: number) => {
	let v = d % TAU;
	if (v > Math.PI) v -= TAU;
	if (v < -Math.PI) v += TAU;
	return v;
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

/* ------------------------------------------------------ companion flowers */

/** A broad, overlapping tepal: shaded across its width, veined, midrib lit. */
function tepal(
	c: C,
	len: number,
	wid: number,
	angle: number,
	dark: boolean,
	curl: number,
) {
	c.save();
	c.rotate(angle);
	const p = new Path2D();
	p.moveTo(0, 0);
	p.bezierCurveTo(
		len * 0.18,
		-wid * 0.75,
		len * 0.7,
		-wid * 1.12,
		len * 0.97,
		-wid * 0.3 + curl,
	);
	p.bezierCurveTo(
		len * 1.04,
		-wid * 0.02 + curl,
		len * 1.04,
		wid * 0.12 + curl,
		len * 0.97,
		wid * 0.36 + curl,
	);
	p.bezierCurveTo(len * 0.7, wid * 1.14, len * 0.2, wid * 0.82, 0, 0);
	const g = c.createLinearGradient(0, -wid, 0, wid);
	for (const [at, color] of [
		[0, "#c488a0"],
		[0.28, dark ? "#f7e6e8" : "#efd6dc"],
		[0.5, "#fff4ec"],
		[0.66, "#e4bccb"],
		[1, "#a46d85"],
	] as [number, string][])
		g.addColorStop(at, color);
	c.fillStyle = g;
	c.fill(p);
	c.save();
	c.clip(p);
	c.strokeStyle = "#a2677f";
	c.globalAlpha = 0.26;
	c.lineWidth = 0.6;
	for (let j = 0; j < 11; j++) {
		const v = (j - 5) / 6;
		c.beginPath();
		c.moveTo(0, 0);
		c.bezierCurveTo(
			len * 0.25,
			v * wid * 0.3,
			len * 0.6,
			v * wid * 1.35,
			len * 0.98,
			v * wid * 0.5 + curl,
		);
		c.stroke();
	}
	c.restore();
	c.strokeStyle = "#fff6ee";
	c.globalAlpha = 0.6;
	c.lineWidth = 1;
	c.beginPath();
	c.moveTo(0, 0);
	c.quadraticCurveTo(len * 0.6, -wid * 0.04, len * 0.95, curl * 0.4);
	c.stroke();
	c.restore();
}

/** The green knob and its crown of gold stamens, ringed in violet. */
function anemoneBoss(c: C, r: number, seed: number, dark: boolean) {
	c.fillStyle = "#6f5a85";
	c.globalAlpha = 0.8;
	c.beginPath();
	c.ellipse(0, 0, r * 1.35, r * 1.1, 0, 0, TAU);
	c.fill();
	c.globalAlpha = 1;
	c.lineCap = "round";
	for (let i = 0; i < 44; i++) {
		const a = (i * TAU) / 44 + Math.sin(i * 2.7 + seed) * 0.08;
		const r0 = r * 0.7;
		const r1 = r * (1.55 + 0.35 * Math.sin(i * 1.9 + seed));
		c.strokeStyle = i % 2 ? "#bda14f" : "#d2b665";
		c.lineWidth = 1.1;
		c.beginPath();
		c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.85);
		c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.85);
		c.stroke();
		c.fillStyle = dark ? "#f4dc86" : "#e8cf72";
		c.beginPath();
		c.arc(Math.cos(a) * r1, Math.sin(a) * r1 * 0.85, 1.5, 0, TAU);
		c.fill();
	}
	const k = c.createRadialGradient(-r * 0.25, -r * 0.3, 1, 0, 0, r * 0.85);
	k.addColorStop(0, "#d3d98f");
	k.addColorStop(0.55, "#9fb06c");
	k.addColorStop(1, "#6f8c5c");
	c.fillStyle = k;
	c.beginPath();
	c.arc(0, 0, r * 0.82, 0, TAU);
	c.fill();
}

/** Flat face of the anemone, seen a little from the side. */
function anemoneFace(c: C, dark: boolean) {
	const n = 6;
	const squash = 0.82;
	c.save();
	c.scale(1, squash);
	const ang = (i: number) => (i * TAU) / n + 0.25 + Math.sin(i * 2.3) * 0.08;
	const order = Array.from({ length: n }, (_, i) => i).sort(
		(a, b) => Math.sin(ang(a)) - Math.sin(ang(b)),
	);
	for (const i of order)
		tepal(
			c,
			50 + 5 * Math.sin(i * 3.1),
			27 + 2 * Math.cos(i * 1.7),
			ang(i),
			dark,
			Math.sin(i * 5) * 5,
		);
	anemoneBoss(c, 9, 1.3, dark);
	c.restore();
}

/** The upturned cup in profile: petals rise and flare round a risen boss. */
function anemoneCup(c: C, dark: boolean) {
	// Calyx leaves under the bowl.
	for (const a of [-0.9, 0.9]) blade(c, 17, 5, -1.57 + a, false, dark, 1);
	// Back petals stand nearly upright, the mid pair lean out, and the near rim
	// petals fall in front of the boss, so the bowl reads as a goblet.
	const back: [number, number, number][] = [
		[-1.57 - 0.1, 47, 19],
		[-1.57 + 0.14, 49, 19],
		[-1.57 - 0.42, 46, 19],
		[-1.57 + 0.46, 45, 19],
	];
	for (const [a, l, w] of back) tepal(c, l, w, a, dark, a < -1.57 ? 4 : -4);
	c.save();
	c.translate(0, -26);
	c.scale(1, 0.8);
	anemoneBoss(c, 7, 2.4, dark);
	c.restore();
	for (const [a, l, w] of [
		[-1.57 - 0.78, 38, 19],
		[-1.57 + 0.8, 37, 19],
		[-1.57 - 0.2, 31, 21],
		[-1.57 + 0.25, 30, 21],
	] as [number, number, number][])
		tepal(c, l, w, a, dark, a < -1.57 ? 5 : -5);
}

/** A nodding bud: pale rose petals under two green hairy sepals. */
function anemoneBud(c: C, dark: boolean) {
	const p = new Path2D();
	p.moveTo(0, 0);
	p.bezierCurveTo(15, -4, 16, -27, 0, -34);
	p.bezierCurveTo(-16, -27, -15, -4, 0, 0);
	const g = c.createLinearGradient(-15, 0, 15, 0);
	g.addColorStop(0, "#a86f84");
	g.addColorStop(0.4, dark ? "#f3dfe3" : "#e8c9d3");
	g.addColorStop(0.62, "#f7e7e2");
	g.addColorStop(1, "#8f6a7a");
	c.fillStyle = g;
	c.fill(p);
	c.save();
	c.clip(p);
	c.strokeStyle = "#9d6479";
	c.globalAlpha = 0.3;
	c.lineWidth = 0.7;
	for (let j = 0; j < 6; j++) {
		c.beginPath();
		c.moveTo((j - 2.5) * 2.4, -3);
		c.bezierCurveTo(
			(j - 2.5) * 6.5,
			-12,
			-(j - 2.5) * 3,
			-24,
			(j - 2.5) * 0.5,
			-33,
		);
		c.stroke();
	}
	c.restore();
	for (const a of [-0.38, 0.4]) blade(c, 22, 7.5, -1.57 + a, false, dark, 2);
}

/** A flat-topped cluster: tiny tubular florets on radiating pedicels. */
function umbel(c: C, r: number, seed: number, dark: boolean) {
	const N = 52;
	const sq = 0.64;
	c.lineCap = "round";
	c.strokeStyle = dark ? "#90b4a0" : "#5f8574";
	c.lineWidth = 0.8;
	c.globalAlpha = 0.7;
	for (let i = 0; i < 9; i++) {
		const a = (i * TAU) / 9 + seed;
		c.beginPath();
		c.moveTo(0, 0);
		c.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85 * sq);
		c.stroke();
	}
	c.globalAlpha = 1;
	for (let i = 0; i < N; i++) {
		const q = Math.sqrt((i + 0.5) / N);
		const a = i * 2.39996 + seed;
		const x = Math.cos(a) * r * q;
		const y = Math.sin(a) * r * q * sq - (1 - q * q) * 4;
		const bud = i % 5 === 3;
		const fr = bud ? 1.9 : 2.7;
		const g = c.createRadialGradient(x - 0.6, y - 0.8, 0.2, x, y, fr + 0.6);
		g.addColorStop(0, bud ? "#b9a3d0" : dark ? "#e6d8f4" : "#cdb9e4");
		g.addColorStop(0.6, bud ? "#7f65a2" : "#9378bb");
		g.addColorStop(1, "#5d4a80");
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, fr, 0, TAU);
		c.fill();
		if (!bud) {
			c.fillStyle = "#fff3e2";
			c.globalAlpha = 0.85;
			c.beginPath();
			c.arc(x - 0.3, y - 0.3, 0.7, 0, TAU);
			c.fill();
			c.globalAlpha = 1;
		}
	}
}

/** Broad, three-lobed basal leaf, as anemones have. */
function broadLeaf(c: C, length: number, angle: number, dark: boolean) {
	blade(c, length * 0.72, length * 0.27, angle - 0.78, false, dark, 4);
	blade(c, length * 0.72, length * 0.27, angle + 0.78, false, dark, -4);
	blade(c, length, length * 0.3, angle, false, dark, 6);
}

/* ----------------------------------------------------------------- the bee */

/**
 * A bumblebee seen from above, drawn rounder and denser than the butterfly. The
 * wings are a soft blur rather than a beat, since nothing the lattice can show
 * beats at wing speed; they fan wider when it flies and fold back when it works.
 */
function bumblebee(
	c: C,
	t: number,
	dark: boolean,
	fan: number,
	basket: number,
) {
	for (const s of [-1, 1]) {
		c.save();
		c.scale(s, 1);
		const sway = 0.1 * Math.sin(t * 5 + (s > 0 ? 0 : 1.7)) * (0.3 + fan);
		c.fillStyle = dark ? "rgb(230 238 244 / 0.4)" : "rgb(176 196 206 / 0.45)";
		c.strokeStyle = dark ? "#c7d6de" : "#7f98a4";
		c.lineWidth = 0.8;
		c.globalAlpha = 0.9;
		for (const [rx, ry, ax, ay, a] of [
			[13, 4.6, 7, -4, -0.7 - 0.55 * fan + sway],
			[9, 3.4, 6, 1, 0.45 + 0.2 * fan - sway],
		] as number[][]) {
			c.beginPath();
			c.ellipse(
				ax + Math.cos(a) * rx * 0.75,
				ay + Math.sin(a) * rx * 0.75,
				rx,
				ry,
				a,
				0,
				TAU,
			);
			c.fill();
			c.stroke();
		}
		c.globalAlpha = 1;
		c.restore();
	}
	// Abdomen: banded.
	c.save();
	c.beginPath();
	c.ellipse(0, 8, 7.2, 10.2, 0, 0, TAU);
	c.clip();
	c.fillStyle = dark ? "#7b7080" : "#302a32";
	c.fillRect(-9, -4, 18, 30);
	c.fillStyle = dark ? "#f0c46a" : "#d89c2c";
	c.fillRect(-9, 4.5, 18, 4.2);
	c.fillStyle = "#f0e6d4";
	c.fillRect(-9, 15.4, 18, 5);
	c.restore();
	// Thorax: a golden fur with a dark band between the wing roots.
	const th = c.createRadialGradient(-1.5, -5, 1, 0, -3, 7.5);
	th.addColorStop(0, dark ? "#ffe4a0" : "#f2c35a");
	th.addColorStop(1, dark ? "#d9a24a" : "#b8812a");
	c.fillStyle = th;
	c.beginPath();
	c.ellipse(0, -3, 6.6, 6.4, 0, 0, TAU);
	c.fill();
	c.strokeStyle = dark ? "#7b7080" : "#302a32";
	c.lineWidth = 1.7;
	c.globalAlpha = 0.85;
	c.beginPath();
	c.moveTo(-5.2, -2.4);
	c.quadraticCurveTo(0, -0.4, 5.2, -2.4);
	c.stroke();
	c.globalAlpha = 1;
	c.fillStyle = dark ? "#8c8092" : "#38303a";
	c.beginPath();
	c.arc(0, -11.4, 3.5, 0, TAU);
	c.fill();
	c.strokeStyle = dark ? "#a89cae" : "#4a404c";
	c.lineWidth = 0.8;
	for (const s of [-1, 1]) {
		c.beginPath();
		c.moveTo(s * 1.4, -13.5);
		c.quadraticCurveTo(s * 4, -18, s * 6.4, -17.5);
		c.stroke();
		// Legs, the hind pair carrying the pollen it has gathered.
		for (const [lx, ly, ex, ey] of [
			[4, -5, 9, -8],
			[5, -1, 10, 1],
			[5, 3, 9.5, 8],
		]) {
			c.beginPath();
			c.moveTo(s * lx, ly);
			c.lineTo(s * ex, ey);
			c.stroke();
		}
		c.fillStyle = "#e6b53e";
		c.beginPath();
		c.ellipse(
			s * 9.8,
			7.2,
			0.8 + 2 * basket,
			0.8 + 3 * basket,
			0.2 * s,
			0,
			TAU,
		);
		c.fill();
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
	/** Weight hung on the tip (a bee), per frame: bends the stem down. */
	load?: (t: number) => number;
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
	if (s.load) {
		const w = s.load(t);
		if (w) y += w * 9 * u ** 2;
	}
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

/* ------------------------------------------------------------ the border */

/**
 * Bed units: the foot of the planting is (0, 0) on the field's floor, y up is
 * negative, and the stems start a little below it where the floor has faded.
 */
const kid = (
	segs: Seg[],
	amp: number,
	phase: number,
	w0: number,
	w1: number,
	parent?: Stem["parent"],
) => buildStem(segs, amp, phase, w0, w1, parent);

const VERB_A = kid([[40, 44, 18, -170, 58, -340, 34, -462]], 12, 0.9, 3.1, 1.8);
const VA_TIP = restAt(VERB_A, 1);
const VERB_A1 = kid(
	[[VA_TIP[0], VA_TIP[1], 8, -506, -8, -552, -26, -592]],
	8,
	2.3,
	1.9,
	1.2,
	{ stem: VERB_A, u: 1 },
);
const VERB_A2 = kid(
	[[VA_TIP[0], VA_TIP[1], 42, -528, 56, -584, 46, -634]],
	8,
	4.1,
	1.9,
	1.2,
	{ stem: VERB_A, u: 1 },
);
const VERB_A3 = kid(
	[[VA_TIP[0], VA_TIP[1], 62, -498, 84, -522, 100, -548]],
	8,
	5.2,
	1.9,
	1.2,
	{ stem: VERB_A, u: 1 },
);
const VERB_B = kid([[78, 44, 66, -110, 92, -250, 80, -364]], 13, 3.3, 2.8, 1.7);
const VB_SIDE = restAt(VERB_B, 0.7);
const VERB_B1 = kid(
	[[VB_SIDE[0], VB_SIDE[1], 100, -310, 114, -330, 112, -372]],
	8,
	1.4,
	1.7,
	1.2,
	{ stem: VERB_B, u: 0.7 },
);

const ANE_FACE = kid(
	[[-46, 44, -66, -120, -34, -240, -58, -322]],
	18,
	1.7,
	3.0,
	1.8,
);
const ANE_CUP = kid([[-14, 44, 8, -60, -16, -130, 0, -196]], 15, 3.6, 2.9, 1.7);
const ANE_BUD = kid(
	[
		[-92, 44, -108, -70, -126, -150, -108, -226],
		[-108, -226, -100, -254, -82, -258, -76, -240],
	],
	15,
	5.5,
	2.6,
	1.5,
);

type Head = {
	id: string;
	stem: Stem;
	kind: "face" | "cup" | "bud" | "umbel";
	/** Cluster radius for umbels, stamp size otherwise. */
	r: number;
	seed: number;
};
const HEADS: Head[] = [
	{ id: "V1", stem: VERB_A1, kind: "umbel", r: 22, seed: 0.4 },
	{ id: "V2", stem: VERB_A2, kind: "umbel", r: 27, seed: 1.9 },
	{ id: "V3", stem: VERB_A3, kind: "umbel", r: 20, seed: 3.1 },
	{ id: "V4", stem: VERB_B, kind: "umbel", r: 24, seed: 4.4 },
	{ id: "V5", stem: VERB_B1, kind: "umbel", r: 17, seed: 5.6 },
	{ id: "A1", stem: ANE_FACE, kind: "face", r: 58, seed: 0 },
	{ id: "A2", stem: ANE_CUP, kind: "cup", r: 46, seed: 0 },
	{ id: "A3", stem: ANE_BUD, kind: "bud", r: 34, seed: 0 },
];
const HEAD = Object.fromEntries(HEADS.map((h) => [h.id, h]));

type BedLeaf = {
	stem: Stem;
	u: number;
	pet: [number, number];
	ang: number;
	length: number;
	phase: number;
};
const BED_LEAVES: BedLeaf[] = [
	{
		stem: ANE_FACE,
		u: 0.24,
		pet: [-10, -4],
		ang: -2.35,
		length: 44,
		phase: 0.5,
	},
	{ stem: ANE_CUP, u: 0.3, pet: [16, -5], ang: -0.4, length: 62, phase: 2.1 },
	{ stem: ANE_FACE, u: 0.46, pet: [14, -8], ang: -0.9, length: 44, phase: 3.7 },
	{ stem: ANE_BUD, u: 0.3, pet: [-8, -6], ang: -2.05, length: 38, phase: 4.9 },
];
/** Verbena clasps its stalk with small paired blades. */
const VERB_LEAVES: { stem: Stem; u: number }[] = [
	{ stem: VERB_A, u: 0.2 },
	{ stem: VERB_A, u: 0.38 },
	{ stem: VERB_A, u: 0.56 },
	{ stem: VERB_B, u: 0.25 },
	{ stem: VERB_B, u: 0.45 },
];

/** The border's stems in the order they are drawn, back to front. */
const BED_STEMS = [
	VERB_B,
	VERB_B1,
	VERB_A,
	VERB_A1,
	VERB_A2,
	VERB_A3,
	ANE_BUD,
	ANE_FACE,
	ANE_CUP,
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

/**
 * Eased progress along a leg: gentle takeoff and landing, steady between. The
 * baseline's blend left a fifth of the cruise speed at both ends, so the body
 * lurched into motion and stopped dead on its perch; this one starts and ends
 * almost at rest.
 */
const legEase = (u: number) =>
	mix(u, u * u * u * (u * (6 * u - 15) + 10), 0.92);

/* --------------------------------------------------------- the bee's route */

type BSpot = "A1" | "A2" | "V1" | "V2" | "V3" | "V4" | "V5" | "offL" | "offT";
const isBOff = (s: BSpot) => s === "offL" || s === "offT";
type BStep = { at: BSpot; dwell?: number };
/**
 * A bumblebee works one flower at a time, so each story is a few short hops
 * between the border's blooms with long, quiet foraging in between.
 */
const BEE_STORIES: BStep[][] = [
	[
		{ at: "offL" },
		{ at: "A1", dwell: 9 },
		{ at: "V4", dwell: 5 },
		{ at: "A2", dwell: 7 },
		{ at: "V1", dwell: 4.5 },
		{ at: "offT" },
	],
	[
		{ at: "offT" },
		{ at: "V3", dwell: 4.5 },
		{ at: "A1", dwell: 7 },
		{ at: "V2", dwell: 5 },
		{ at: "A2", dwell: 6 },
		{ at: "V5", dwell: 4 },
		{ at: "offL" },
	],
	[
		{ at: "offL" },
		{ at: "A2", dwell: 7 },
		{ at: "V4", dwell: 4.5 },
		{ at: "V5", dwell: 4 },
		{ at: "A1", dwell: 8 },
		{ at: "offT" },
	],
];
type BNode = {
	id: BSpot;
	a: number;
	d: number;
	phase: number;
	x?: number;
	y?: number;
};
type BLeg = { t0: number; t1: number; from: BNode; to: BNode; pref: number };
type BeePlan = { nodes: BNode[]; legs: BLeg[] };
const beePlans = new Map<string, BeePlan>();

export const passionflowerStudy: Scene = (
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

	/* --- the border: a narrow planting in the margin the cards leave free --- */
	const bedOn = !!frame && frame.x >= 150;
	const bk = Math.min(
		k * clamp((frame ? frame.x : 260) / 260, 0.7, 1.15),
		(0.7 * H) / 640,
		frame ? (frame.x - 44) / 215 : 1,
	);
	const bx = frame ? frame.x * 0.5 + 4 : 0;
	const by = H - 56;
	// The border's stems start with no weight; the plan below hangs the bee on them.
	for (const h of HEADS) h.stem.load = undefined;

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

	/* --- the bee's pose: perches live in the border's own frame --- */
	const headPose = (h: Head, at: number) => {
		const [x, y] = stemAt(h.stem, 1, at);
		const [x2, y2] = stemAt(h.stem, 0.93, at);
		return { x, y, rot: Math.atan2(y - y2, x - x2) + Math.PI / 2 };
	};
	/** Where the bee stands and which way it faces, in border units. */
	const beeAt = (nd: BNode, at: number) => {
		if (isBOff(nd.id)) return { x: nd.x ?? 0, y: nd.y ?? 0, th: 0 };
		const h = HEAD[nd.id];
		const p = headPose(h, at);
		const ph = nd.phase * 6;
		let lx: number;
		let ly: number;
		let th: number;
		if (h.kind === "face") {
			// Circling the boss, collecting pollen off the stamens.
			const a = at * 0.5 + ph;
			lx = Math.cos(a) * 12;
			ly = Math.sin(a) * 12 * 0.82;
			th = Math.atan2(Math.cos(a) * 0.82, -Math.sin(a)) + Math.PI / 2;
		} else if (h.kind === "cup") {
			lx = 7 * Math.sin(at * 0.55 + ph);
			ly = -24 + 2.5 * Math.cos(at * 0.8 + ph);
			th = 0.3 * Math.sin(at * 0.4 + ph);
		} else {
			// Across the cluster, floret to floret, facing in.
			lx = h.r * 0.45 * Math.sin(at * 0.42 + ph);
			ly = h.r * 0.2 * Math.cos(at * 0.33 + ph) - 3;
			th = (nd.phase - 0.5) * 1.8 + 0.25 * Math.sin(at * 0.3 + ph);
		}
		const cs = Math.cos(p.rot),
			sn = Math.sin(p.rot);
		return {
			x: p.x + lx * cs - ly * sn,
			y: p.y + lx * sn + ly * cs,
			th: th + p.rot,
		};
	};

	const makeBeePlan = (n: number, bf: Plan): BeePlan => {
		const rnd = (i: number) => hash(n * 17 + i * 2.9 + 5);
		const kind = n === 0 ? 0 : Math.floor(rnd(1) * BEE_STORIES.length);
		const steps = BEE_STORIES[kind];
		const offL: [number, number] = [(-70 - bx) / bk, (-0.42 * H) / bk];
		const offT: [number, number] = [30 + (rnd(3) - 0.5) * 80, (-40 - by) / bk];
		const spots = steps.map((st, i): BNode => {
			const nd: BNode = {
				id: st.at,
				a: 0,
				d: 0,
				phase: hash(n * 3 + i * 5.1),
			};
			if (st.at === "offL") [nd.x, nd.y] = offL;
			if (st.at === "offT") [nd.x, nd.y] = offT;
			return nd;
		});
		const ref = n * CYCLE + 20;
		const pts = spots.map((nd) => beeAt(nd, ref));
		const hop = pts
			.slice(1)
			.map(
				(p, i) =>
					1.7 + Math.max(1.6, Math.hypot(p.x - pts[i].x, p.y - pts[i].y) / 52),
			);
		// The butterfly's visible flights are the one thing the bee waits out.
		const busy = bf.legs
			.filter((l) => !isOff(l.from.id) || !isOff(l.to.id))
			.map((l) => [l.t0, l.t1]);
		const clash = (a: number, b: number) =>
			busy.some(([s0, e0]) => a < e0 - 0.2 && b > s0 + 0.2);
		const stillAt = steps.findIndex((st) => st.at === "A1");
		let A: number[] = [];
		let D: number[] = [];
		for (let attempt = 0; attempt < 3; attempt++) {
			const squeeze = 1 - 0.22 * attempt;
			A = [];
			D = [];
			let cur = n * CYCLE + 1.5 + 6 * rnd(2);
			for (let i = 0; i < steps.length; i++) {
				const off = isBOff(steps[i].at);
				let dw = off
					? 0
					: (steps[i].dwell ?? 5) * (0.85 + 0.3 * rnd(i)) * squeeze;
				if (n === 0 && i === stillAt) dw = Math.max(dw, 9.5);
				A[i] = cur;
				let start = cur + dw;
				if (i < steps.length - 1) {
					for (let w = 0; w < 14 && clash(start, start + hop[i]); w += 0.5)
						start += 0.5;
					cur = start + hop[i];
				} else cur = start;
				D[i] = start;
			}
			if (cur < (n + 1) * CYCLE - 2) break;
		}
		if (n === 0) {
			// The still frame (t = 30) catches the bee on the anemone's face.
			const shift = 25 - A[stillAt];
			A = A.map((v) => v + shift);
			D = D.map((v) => v + shift);
		}
		const nodes = spots.map((nd, i): BNode => ({ ...nd, a: A[i], d: D[i] }));
		const legs = nodes.slice(1).map(
			(to, i): BLeg => ({
				t0: nodes[i].d,
				t1: to.a,
				from: nodes[i],
				to,
				pref: hash(n * 7 + i * 1.7) < 0.5 ? -1 : 1,
			}),
		);
		return { nodes, legs };
	};
	const beeKey = `${key}|${bx | 0}|${(bk * 100) | 0}|${cycleN}`;
	let bee: BeePlan | undefined = bedOn ? beePlans.get(beeKey) : undefined;
	if (bedOn && !bee) {
		for (const name of beePlans.keys())
			if (!name.startsWith(`${key}|${bx | 0}|${(bk * 100) | 0}|`))
				beePlans.delete(name);
		if (beePlans.size > 8) beePlans.clear();
		bee = makeBeePlan(cycleN, cyc);
		beePlans.set(beeKey, bee);
	}
	// Every third cycle the bee is elsewhere, so the border has quiet stretches
	// and the butterfly has the field to itself. The first cycle (and the still)
	// always has it.
	if (cycleN !== 0 && cycleN % 3 === 2) bee = undefined;
	// What the bee's weight does to whatever it stands on.
	if (bee) {
		const nodes = bee.nodes;
		for (const h of HEADS) {
			if (!nodes.some((nd) => nd.id === h.id)) continue;
			h.stem.load = (at: number) => {
				let v = 0;
				for (const nd of nodes) {
					if (nd.id !== h.id) continue;
					const w =
						smooth(nd.a - 0.2, nd.a + 0.6, at) *
						(1 - smooth(nd.d - 0.1, nd.d + 0.7, at));
					let kick = 0;
					if (at > nd.a)
						kick +=
							0.5 * Math.exp(-1.6 * (at - nd.a)) * Math.sin(5.2 * (at - nd.a));
					if (at > nd.d)
						kick -=
							0.4 * Math.exp(-1.8 * (at - nd.d)) * Math.sin(6 * (at - nd.d));
					v += w + kick;
				}
				return v;
			};
		}
	}
	const LIFT = 0.7;
	const SETTLE = 1.0;
	const beeLeg = (leg: BLeg, at: number) => {
		const fromOff = isBOff(leg.from.id),
			toOff = isBOff(leg.to.id);
		const tc0 = leg.t0 + (fromOff ? 0 : LIFT);
		const tc1 = leg.t1 - (toOff ? 0 : SETTLE);
		if (at < tc0) {
			const q = smooth(0, 1, (at - leg.t0) / LIFT);
			const p = beeAt(leg.from, at);
			return { x: p.x, y: p.y - 15 * q };
		}
		if (at > tc1) {
			const q = smooth(0, 1, (at - tc1) / SETTLE);
			const p = beeAt(leg.to, at);
			return { x: p.x, y: p.y - 15 * (1 - q) };
		}
		const p0 = beeAt(leg.from, tc0);
		const S = { x: p0.x, y: p0.y - (fromOff ? 0 : 15) };
		const p1 = beeAt(leg.to, toOff ? leg.t1 : at);
		const E = { x: p1.x, y: p1.y - (toOff ? 0 : 15) };
		const u = clamp((at - tc0) / Math.max(0.01, tc1 - tc0), 0, 1);
		const e = u * u * u * (u * (6 * u - 15) + 10);
		const dx = E.x - S.x,
			dy = E.y - S.y;
		const len = Math.hypot(dx, dy) || 1;
		const bow = leg.pref * len * 0.14;
		const cx = (S.x + E.x) / 2 - (dy / len) * bow,
			cy = (S.y + E.y) / 2 + (dx / len) * bow;
		const r = 1 - e;
		return {
			x: r * r * S.x + 2 * r * e * cx + e * e * E.x,
			y: r * r * S.y + 2 * r * e * cy + e * e * E.y,
		};
	};
	const beeWhere = (at: number) => {
		if (!bee) return { x: 0, y: 0, th: 0, state: "off" as const, i: 0 };
		const nodes = bee.nodes;
		const rest = (i: number, tt: number) => ({
			...beeAt(nodes[i], tt),
			state: "rest" as const,
			i,
		});
		if (at <= nodes[0].a) return rest(0, nodes[0].a);
		for (let i = 0; i < nodes.length; i++) {
			if (at <= nodes[i].d) return rest(i, at);
			const leg = bee.legs[i];
			if (leg && at < leg.t1)
				return { ...beeLeg(leg, at), th: 0, state: "leg" as const, i };
		}
		return rest(nodes.length - 1, nodes[nodes.length - 1].d);
	};

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
		// Squared sine ramps: lateral drift, lift and loop all begin and end with no
		// velocity of their own, so none of them kinks the path where it starts.
		const wob = 16 * Math.sin(Math.PI * u) ** 2 * Math.sin(at * 1.5 + leg.ph);
		let x = bx + (-ty / tl) * wob;
		let y = by + (tx / tl) * wob;
		// Both ends were frozen when the leg was resolved, but a perch keeps
		// swaying. The body leaves with its perch's motion, which fades over the
		// first second and a half, and arrives already moving with the next one;
		// without this it stopped dead and was then dragged along by the landing.
		if (!isOff(leg.from.id)) {
			const w = 1 - smooth(0, 1.6, at - leg.t0);
			if (w > 0) {
				const pf = perch(leg.from, at);
				x += w * (pf.x - leg.ax);
				y += w * (pf.y - leg.ay);
			}
		}
		if (!isOff(leg.to.id)) {
			const w = smooth(0, 2.6, at - (leg.t1 - 2.6));
			if (w > 0) {
				const pt = perch(leg.to, at);
				x += w * (pt.x - leg.bx);
				y += w * (pt.y - leg.by);
			}
		}
		if (!isOff(leg.from.id))
			y -= 14 * Math.sin(Math.PI * clamp((at - leg.t0) / 2.2, 0, 1)) ** 2;
		if (!isOff(leg.to.id)) {
			// Reconnoitring the flower: one loose loop that tightens onto it.
			const s = clamp((u - 0.62) / 0.38, 0, 1);
			const g = Math.sin(Math.PI * s) ** 2 * (1 - s) ** 0.6;
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
		return {
			x,
			y,
			th: 0,
			// The arc's own tangent and position, free of the drift and loop: the
			// body's heading follows these, since the full velocity reverses (and
			// the heading spun) wherever the loop cancels the arc's speed.
			tth: Math.atan2(ty, tx),
			cx: bx,
			cy: by,
			state: "leg" as const,
			i,
		};
	};

	const where = (at: number) => {
		const nodes = cyc.nodes;
		const rest = (i: number, tt: number) => {
			const q = perch(nodes[i], tt);
			return {
				...q,
				tth: 0,
				cx: q.x,
				cy: q.y,
				state: "rest" as const,
				i,
			};
		};
		if (at <= nodes[0].a) return rest(0, nodes[0].a);
		for (let i = 0; i < nodes.length; i++) {
			if (at <= nodes[i].d) return rest(i, at);
			const leg = cyc.legs[i];
			if (leg && at < leg.t1) return flyLeg(leg, i, at);
		}
		return rest(nodes.length - 1, nodes[nodes.length - 1].d);
	};
	/* --- the border, behind the vine --- */
	let stalk: { x: number; y: number; r: number; u: number } | null = null;
	if (bedOn) {
		c.save();
		c.translate(bx, by);
		c.scale(bk, bk);
		const bp = c.getTransform().a || 0.5;
		for (const st of BED_STEMS) strokeStem(c, st, t, dark);
		c.lineCap = "round";
		// Verbena's small paired blades clasp the stalk.
		for (const vl of VERB_LEAVES) {
			const [x, y] = stemAt(vl.stem, vl.u, t);
			const [x2, y2] = stemAt(vl.stem, vl.u + 0.03, t);
			const a = Math.atan2(y2 - y, x2 - x);
			const cv = stampFor(`vleaf|${dark ? 1 : 0}`, 44, 22, 4, 11, bp, (g) =>
				blade(g, 36, 5.5, 0, false, dark, 1),
			);
			for (const side of [-1, 1]) {
				c.save();
				c.translate(x, y);
				c.rotate(
					a + side * 0.95 + 0.05 * Math.sin(t * 0.8 + vl.u * 9) * gust(t),
				);
				c.drawImage(cv, -4, -11, 44, 22);
				c.restore();
			}
		}
		BED_LEAVES.forEach((lf, i) => {
			const [sx, sy] = stemAt(lf.stem, lf.u, t);
			const a = lf.ang + 0.08 * gust(t) * Math.sin(t * 0.8 + lf.phase);
			const lx = sx + lf.pet[0],
				ly = sy + lf.pet[1];
			c.strokeStyle = dark ? "#779f90" : "#476f65";
			c.lineWidth = 2.2;
			c.beginPath();
			c.moveTo(sx, sy);
			c.quadraticCurveTo((sx + lx) / 2 + 2, (sy + ly) / 2 + 4, lx, ly);
			c.stroke();
			const L = lf.length;
			const cv = stampFor(
				`bleaf${i}|${dark ? 1 : 0}`,
				L * 1.4,
				L * 1.5,
				L * 0.2,
				L * 0.75,
				bp,
				(g) => broadLeaf(g, L, 0, dark),
			);
			c.save();
			c.translate(lx, ly);
			c.rotate(a);
			c.drawImage(cv, -L * 0.2, -L * 0.75, L * 1.4, L * 1.5);
			c.restore();
		});
		for (const id of ["A3", "A1", "A2", "V4", "V5", "V3", "V1", "V2"]) {
			const h = HEAD[id];
			const p = headPose(h, t);
			c.save();
			c.translate(p.x, p.y);
			if (h.kind === "umbel") {
				c.rotate(p.rot * 0.3 + 0.05 * gust(t) * Math.sin(t * 0.7 + h.seed));
				const r = h.r;
				const cv = stampFor(
					`umbel${id}|${dark ? 1 : 0}`,
					2 * r + 16,
					1.3 * r + 16,
					r + 8,
					0.65 * r + 8,
					bp,
					(g) => umbel(g, r, h.seed, dark),
				);
				c.drawImage(cv, -(r + 8), -(0.65 * r + 8), 2 * r + 16, 1.3 * r + 16);
			} else if (h.kind === "face") {
				c.rotate(p.rot + 0.03 * gust(t) * Math.sin(t * 0.6 + 1));
				const cv = stampFor(
					`aneface|${dark ? 1 : 0}`,
					136,
					112,
					68,
					56,
					bp,
					(g) => anemoneFace(g, dark),
				);
				c.drawImage(cv, -68, -56, 136, 112);
			} else if (h.kind === "cup") {
				c.rotate(p.rot + 0.03 * gust(t) * Math.sin(t * 0.65 + 2));
				const cv = stampFor(
					`anecup|${dark ? 1 : 0}`,
					120,
					90,
					60,
					70,
					bp,
					(g) => anemoneCup(g, dark),
				);
				c.drawImage(cv, -60, -70, 120, 90);
			} else {
				c.rotate(p.rot + 0.05 * gust(t) * Math.sin(t * 0.7 + 3));
				const cv = stampFor(`anebud|${dark ? 1 : 0}`, 56, 60, 28, 50, bp, (g) =>
					anemoneBud(g, dark),
				);
				c.drawImage(cv, -28, -50, 56, 60);
			}
			c.restore();
		}
		// The vine's tendril lands on the verbena stalk nearest its tip.
		const tip = stemAt(LAT, 1, t);
		const wantY = (hy + tip[1] * k - by) / bk;
		let bu = 0.5;
		let bd = Number.POSITIVE_INFINITY;
		for (let u = 0.3; u <= 0.82; u += 0.02) {
			const d = Math.abs(restAt(VERB_A, u)[1] - wantY);
			if (d < bd) {
				bd = d;
				bu = u;
			}
		}
		const sp = stemAt(VERB_A, bu, t);
		stalk = {
			x: bx + sp[0] * bk,
			y: by + sp[1] * bk,
			r: (mix(VERB_A.w0, VERB_A.w1, bu ** 0.8) * bk) / 2,
			u: bu,
		};
		c.restore();
	}

	c.save();
	c.translate(hx, hy);
	c.scale(k, k);
	const pixel = c.getTransform().a || 0.5;

	/* --- stems and tendrils --- */
	strokeStem(c, MAIN, t, dark);
	strokeStem(c, LAT, t, dark);
	for (const td of TENDRILS) {
		if (stalk && td.stem === LAT) continue;
		const p = stemAt(td.stem, td.u, t);
		tendril(c, p, td.heading, td.length, td.coil, t, td.phase, dark);
	}
	if (stalk) {
		// A free arc from the shoot's tip, then three turns round the stalk. Only
		// the near side of each turn shows; the far side is behind the stem.
		const p0 = stemAt(LAT, 1, t);
		const [qx, qy] = stemAt(LAT, 0.96, t);
		const tl = Math.hypot(p0[0] - qx, p0[1] - qy) || 1;
		const cx = (stalk.x - hx) / k,
			cy = (stalk.y - hy) / k;
		const r = stalk.r / k + 1.3;
		const side = p0[0] > cx ? 1 : -1;
		const sx = cx + side * r,
			sy = cy;
		const span = Math.hypot(sx - p0[0], sy - p0[1]);
		const live = 1 + 0.06 * Math.sin(t * 0.5 + 2.2) * gust(t);
		c.strokeStyle = dark ? "#779f90" : "#476f65";
		c.lineCap = "round";
		const seg = 28;
		let px = p0[0],
			py = p0[1];
		const ax = p0[0] + ((p0[0] - qx) / tl) * span * 0.55 * live;
		const ay = p0[1] + ((p0[1] - qy) / tl) * span * 0.55 * live - 6;
		const ex = sx + side * span * 0.3,
			ey = sy - span * 0.25 - 10;
		for (let i = 1; i <= seg; i++) {
			const v = i / seg,
				w = 1 - v;
			const x =
				w * w * w * p0[0] +
				3 * w * w * v * ax +
				3 * w * v * v * ex +
				v * v * v * sx;
			const y =
				w * w * w * p0[1] +
				3 * w * w * v * ay +
				3 * w * v * v * ey +
				v * v * v * sy;
			c.lineWidth = 2.6 - 1.2 * v;
			c.beginPath();
			c.moveTo(px, py);
			c.lineTo(x, y);
			c.stroke();
			px = x;
			py = y;
		}
		for (let m = 0; m < 3; m++) {
			c.lineWidth = 1.7 - m * 0.2;
			c.beginPath();
			for (let i = 0; i <= 16; i++) {
				const f = (i / 16) * Math.PI;
				const x = cx + side * r * Math.cos(f);
				const y = cy + (m + f / TAU) * 6.4 + 1.5 * Math.sin(f);
				if (i) c.lineTo(x, y);
				else c.moveTo(x, y);
			}
			c.stroke();
		}
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
	/**
	 * Body heading in flight: the arc's tangent, leaning toward the sideways drift
	 * (bounded), so it banks into the loop instead of spinning through it.
	 */
	const flightHeading = (tt: number) => {
		const p = where(tt);
		if (p.state !== "leg") return p.th;
		const a = where(tt + 0.3),
			b = where(tt - 0.3);
		const rvx = (a.x - a.cx - (b.x - b.cx)) / 0.6,
			rvy = (a.y - a.cy - (b.y - b.cy)) / 0.6;
		const perp = -Math.sin(p.tth) * rvx + Math.cos(p.tth) * rvy;
		return p.tth + Math.PI / 2 + 0.5 * Math.tanh(perp / 45);
	};
	const flightTh = flightHeading(t);
	let turn = 0;
	if (speed > 8) {
		// A short window: over 1.4 s a tight loop turns past a half turn and the
		// bank flipped sign. Half a second turns far less.
		turn = wrapPi(flightHeading(t + 0.35) - flightHeading(t - 0.35)) / 0.7;
	}
	// Body angle eases between the two perches' facings and the flight heading
	// by time, never by which perch is nearer: the baseline switched perches at
	// mid-flight, so on short hops the body snapped to the other's facing.
	let th = flightTh;
	let fly = 1;
	let settle = 0;
	let restNode: Node | undefined;
	// One wing-beat phase per flight, so no seed changes while it is airborne.
	let seed = 0;
	if (now.state === "rest") {
		const nd = cyc.nodes[now.i];
		restNode = nd;
		seed = nd.phase;
		if (!isOff(nd.id)) {
			fly = 0;
			th = now.th;
		}
	} else {
		const from = cyc.nodes[now.i],
			to = cyc.nodes[now.i + 1];
		const leg = cyc.legs[now.i];
		const dFrom = isOff(from.id) ? 99 : t - from.d;
		const dTo = isOff(to.id) ? 99 : to.a - t;
		const q = Math.min(dFrom, dTo);
		fly = smooth(0, 2, q);
		settle = 1 - smooth(0.5, 3.5, dTo);
		seed = leg.ph / 6;
		if (!isOff(from.id)) {
			const tm = from.d + 1.5;
			const pf = perch(from, tm).th;
			const ref = wrapPi(flightHeading(tm) - pf);
			th = blendAngle(perch(from, t).th, th, smooth(0.4, 2.8, dFrom), ref);
		}
		if (!isOff(to.id)) {
			const tm = to.a - 1.8;
			const pt = perch(to, tm).th;
			const ref = wrapPi(flightHeading(tm) - pt);
			th = blendAngle(perch(to, t).th, th, smooth(0.4, 3.4, dTo), ref);
		}
		restNode = dFrom < dTo ? from : to;
	}
	const onScreen = now.state === "leg" || (restNode && !isOff(restNode.id));
	if (onScreen) {
		const rest = restNode ? restWings(t, restNode) : 0.4;
		// A slow, deliberate beat: each stroke outlasts the lattice's easing. The
		// downstroke is brisker than the recovery, and a glide holds the wings up.
		// Coming in to land the stroke deepens a little before the wings fold.
		const ph = t * 4.2 + seed * 6;
		const flutter =
			now.state === "leg"
				? 1 -
					smooth(
						0.6,
						2.4,
						cyc.nodes[now.i + 1] && !isOff(cyc.nodes[now.i + 1].id)
							? cyc.nodes[now.i + 1].a - t
							: 99,
					)
				: 0;
		const flap =
			0.67 + (0.27 + 0.07 * flutter) * Math.sin(ph + 0.45 * Math.sin(ph));
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

	/* --- the bee, in the border's frame --- */
	if (bedOn && bee) {
		const now2 = beeWhere(t);
		const off = now2.state === "rest" && isBOff(bee.nodes[now2.i].id);
		const pose = (tt: number) => beeWhere(tt);
		const a1 = pose(t + 0.25),
			b1 = pose(t - 0.25);
		const flightTh2 = Math.atan2(a1.y - b1.y, a1.x - b1.x) + Math.PI / 2;
		let bth = flightTh2;
		let fan = 0.15;
		let visits = 0;
		if (now2.state === "rest") {
			const nd = bee.nodes[now2.i];
			bth = now2.th;
			visits = now2.i - 1 + smooth(nd.a, nd.d, t);
		} else {
			const leg = bee.legs[now2.i];
			const fromOff = isBOff(leg.from.id),
				toOff = isBOff(leg.to.id);
			const cruiseTh = (tt: number) => {
				const pa = pose(tt + 0.25),
					pb = pose(tt - 0.25);
				return Math.atan2(pa.y - pb.y, pa.x - pb.x) + Math.PI / 2;
			};
			if (!fromOff) {
				const tm = leg.t0 + LIFT + 0.8;
				const ref = wrapPi(cruiseTh(tm) - beeAt(leg.from, tm).th);
				bth = blendAngle(
					beeAt(leg.from, t).th,
					bth,
					smooth(0.2, LIFT + 0.9, t - leg.t0),
					ref,
				);
			}
			if (!toOff) {
				const tm = leg.t1 - SETTLE - 0.8;
				const ref = wrapPi(cruiseTh(tm) - beeAt(leg.to, tm).th);
				bth = blendAngle(
					beeAt(leg.to, t).th,
					bth,
					smooth(0.2, SETTLE + 0.9, leg.t1 - t),
					ref,
				);
			}
			fan =
				0.15 +
				0.85 *
					smooth(leg.t0, leg.t0 + (fromOff ? 0.8 : LIFT + 0.5), t) *
					smooth(leg.t1, leg.t1 - (toOff ? 0.8 : SETTLE + 0.5), t);
			visits = now2.i;
		}
		if (!off) {
			const hover = 1 - smooth(0, 1, fan);
			c.save();
			c.translate(bx, by);
			c.scale(bk, bk);
			// Pollen shaken loose where it lands on an anemone.
			if (now2.state === "rest") {
				const nd = bee.nodes[now2.i];
				const k0 = HEAD[nd.id].kind;
				const e = t - nd.a;
				if ((k0 === "face" || k0 === "cup") && e > 0 && e < 2.2) {
					for (let j = 0; j < 7; j++) {
						const a = j * 2.4 + nd.phase * 5;
						const dd =
							6 + 15 * (1 - (1 - e / 2.2) ** 2) * (0.6 + 0.4 * hash(j + 3));
						c.globalAlpha = 0.85 * (1 - e / 2.2);
						c.fillStyle = dark ? "#f4dc86" : "#d9b84a";
						c.beginPath();
						c.arc(
							now2.x + Math.cos(a) * dd,
							now2.y + Math.sin(a) * dd * 0.8 - 4 * e,
							1.5,
							0,
							TAU,
						);
						c.fill();
					}
					c.globalAlpha = 1;
				}
			}
			c.translate(now2.x, now2.y + 1.6 * Math.sin(t * 2.3) * (0.3 + hover));
			c.rotate(bth);
			const bs = 1.12;
			c.scale(bs, bs);
			bumblebee(c, t, dark, fan, clamp(0.12 + 0.22 * visits, 0.1, 1));
			c.restore();
		}
	}
};
