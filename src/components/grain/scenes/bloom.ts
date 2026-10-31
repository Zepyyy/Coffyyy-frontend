import type { Scene } from "../engine";

/**
 * A small bloom: four animals of different families at different depths.
 * Nothing here is state. Each animal's place, pulse and trailing filaments
 * are functions of t, and a filament point reads where its own animal was a
 * moment ago, which is what makes the long parts lag behind the bell.
 *
 * Colour follows anatomy. Warm at the crown, cooler down the tentacles,
 * deepest in the gonads. Overlaps are plain source-over, so a far animal seen
 * through a near bell is the two colours mixed.
 */

type Ctx = CanvasRenderingContext2D;
type Rgb = [number, number, number];

const TAU = Math.PI * 2;
const mod = (x: number, n: number) => ((x % n) + n) % n;
const ease = (x: number) => x * x * (3 - 2 * x);
const tint = (c: Rgb, a: number) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;

/** Dots print at about 0.62, so light paper wants deeper values than dark. */
const PALETTE = {
	light: {
		crema: [226, 160, 84],
		amber: [208, 132, 62],
		rose: [190, 92, 104],
		umber: [150, 84, 62],
		peri: [118, 130, 206],
		bone: [220, 204, 178],
		lav: [148, 120, 182],
		sage: [96, 168, 142],
		foam: [146, 206, 184],
	},
	dark: {
		crema: [242, 200, 132],
		amber: [234, 174, 100],
		rose: [232, 150, 160],
		umber: [214, 156, 124],
		peri: [166, 178, 240],
		bone: [240, 230, 210],
		lav: [198, 176, 226],
		sage: [148, 218, 194],
		foam: [196, 238, 222],
	},
} satisfies Record<string, Record<string, Rgb>>;
type Pal = (typeof PALETTE)["light"];

/** The contraction takes under a third of the cycle, the opening the rest. */
function pulse(t: number, period: number) {
	const k = period * 0.29;
	const p = mod(t, period);
	return p < k ? ease(p / k) : 1 - ease((p - k) / (period - k));
}

type Spec = {
	kind: "nettle" | "moon" | "crystal" | "comb";
	/** Bell radius at rest, px. */
	size: number;
	x: number;
	/** Where the animal is at t = 30, the still frame. */
	y30: number;
	/** Drift upward, px per second. */
	speed: number;
	alpha: number;
	period: number;
	/** Seconds into the pulse cycle at t = 30. */
	at30: number;
	/** Lift of one stroke, px. */
	thrust: number;
	sway: number;
	swayRate: number;
	swayPhase: number;
	/** How far back in time the end of a filament remembers, seconds. */
	lag: number;
	squeeze: number;
	/** Bell height over radius at rest. */
	dome: number;
	/** Extent above and below the origin, for wrapping the route. */
	up: number;
	down: number;
};

type Pose = { x: number; y: number; p: number };

function poseOf(s: Spec, t: number): Pose {
	const p = pulse(t + s.at30 - 30, s.period);
	return {
		x: s.x + s.sway * Math.sin(t * s.swayRate + s.swayPhase),
		y: s.y30 - s.speed * (t - 30) - s.thrust * p,
		p,
	};
}

const N = 96;

type Body = {
	c: Ctx;
	s: Spec;
	t: number;
	pal: Pal;
	r: number;
	h: number;
	/** Past offsets, one per step down a filament. */
	lx: Float32Array;
	ly: Float32Array;
	lp: Float32Array;
};

function bodyFor(c: Ctx, s: Spec, t: number, pal: Pal, now: Pose): Body {
	const lx = new Float32Array(N + 1);
	const ly = new Float32Array(N + 1);
	const lp = new Float32Array(N + 1);
	for (let k = 0; k <= N; k++) {
		const past = poseOf(s, t - (k / N) * s.lag);
		lx[k] = past.x - now.x;
		ly[k] = past.y - now.y;
		lp[k] = past.p;
	}
	return { c, s, t, pal, r: 0, h: 0, lx, ly, lp };
}

type Hang = {
	back?: boolean;
	/** Sideways sway as a fraction of the bell size. */
	spread?: number;
	/** Sideways drift down the filament, as a fraction of the bell size. */
	fan?: number;
	/** Wavelength multiplier for the sway. */
	wave?: number;
	/** How flat the rim ellipse is that the root sits on. */
	flat?: number;
};

/** A point `k/N` of the way down a filament rooted at `root` (-1 to 1) on the rim. */
function strand(
	b: Body,
	k: number,
	root: number,
	length: number,
	id: number,
	o: Hang = {},
): [number, number] {
	const q = k / N;
	const pp = b.lp[k];
	const rim = Math.sqrt(Math.max(0, 1 - root * root)) * b.r * (o.flat ?? 0.13);
	const size = b.s.size;
	return [
		b.lx[k] +
			root * size * (1 - pp * b.s.squeeze) +
			(o.fan ?? 0) * q * size +
			Math.sin(q * 3.8 * (o.wave ?? 1) - b.t * 0.65 + id) *
				q *
				size *
				(o.spread ?? 0.23) *
				(1 - pp * 0.48),
		(o.back ? -rim : rim) + q * length + b.ly[k],
	];
}

function vertical(
	c: Ctx,
	y0: number,
	y1: number,
	stops: [number, Rgb, number][],
) {
	const g = c.createLinearGradient(0, y0, 0, y1);
	for (const [u, col, a] of stops) g.addColorStop(u, tint(col, a));
	return g;
}

/** Bell outline: a dome over a scalloped rim, `lobes` lappets across the front. */
function bell(
	c: Ctx,
	r: number,
	h: number,
	flat: number,
	lobes: number,
	depth: number,
) {
	const rimAt = (a: number) =>
		Math.sin(a) * r * flat + depth * Math.abs(Math.sin(a * lobes)) ** 0.7;
	c.beginPath();
	c.moveTo(-r, 0);
	c.bezierCurveTo(-r * 0.94, -h * 0.76, -r * 0.53, -h, 0, -h);
	c.bezierCurveTo(r * 0.53, -h, r * 0.94, -h * 0.76, r, 0);
	const steps = lobes * 8;
	for (let i = 0; i <= steps; i++) {
		const a = (i / steps) * Math.PI;
		c.lineTo(r * Math.cos(a), rimAt(a));
	}
	c.closePath();
	return rimAt;
}

/** One radial canal over the dome, from the crown down to the rim at angle `a`. */
function canal(
	c: Ctx,
	r: number,
	h: number,
	flat: number,
	a: number,
	reverse = false,
) {
	const x = Math.cos(a) * r;
	const y = Math.sin(a) * r * flat;
	const x0 = Math.cos(a) * r * 0.12;
	if (reverse) {
		c.bezierCurveTo(x * 0.86, -h * 0.34 + y, x * 0.5, -h * 0.8, x0, -h * 0.72);
	} else {
		c.moveTo(x0, -h * 0.72);
		c.bezierCurveTo(x * 0.5, -h * 0.8, x * 0.86, -h * 0.34 + y, x, y);
	}
}

/** A point on the dome at azimuth `a` and elevation `e` (0 at the rim, up to the crown). */
function onDome(
	r: number,
	h: number,
	flat: number,
	a: number,
	e: number,
): [number, number] {
	return [
		r * Math.cos(a) * Math.cos(e),
		-h * Math.sin(e) + Math.sin(a) * r * flat * Math.cos(e),
	];
}

/** A true meridian from the crown to the rim; every one meets at the apex. */
function meridian(c: Ctx, r: number, h: number, flat: number, a: number) {
	for (let i = 0; i <= 12; i++) {
		const [x, y] = onDome(r, h, flat, a, 1.5 * (1 - i / 12));
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
}

/** A tapering wedge of pigment between two meridians. */
function wedge(
	c: Ctx,
	r: number,
	h: number,
	flat: number,
	a: number,
	half: number,
) {
	c.beginPath();
	meridian(c, r, h, flat, a - half);
	for (let i = 12; i >= 0; i--) {
		const [x, y] = onDome(r, h, flat, a + half, 1.5 * (1 - i / 12));
		c.lineTo(x, y);
	}
	c.closePath();
}

/** A ruffled ribbon down from the manubrium: oral arms, folded and lacy. */
function arm(
	b: Body,
	root: number,
	length: number,
	id: number,
	width: number,
	freq: number,
	fill: CanvasGradient,
	line: CanvasGradient,
	bars: boolean,
	hang: Hang,
) {
	const { c } = b;
	const left: [number, number][] = [];
	const right: [number, number][] = [];
	const steps = N;
	for (let k = 0; k <= steps; k++) {
		const q = k / N;
		const [x, y] = strand(b, k, root, length, id + 0.5, hang);
		const env = Math.sin(Math.PI * (q * 0.94 + 0.03)) ** 0.7 * (1 - 0.4 * q);
		const lace = (ph: number) =>
			0.35 +
			0.65 *
				Math.abs(
					Math.sin(q * freq + id * 1.3 + ph + 0.4 * Math.sin(b.t * 0.5 + id)),
				);
		left.push([x - width * env * lace(0), y]);
		right.push([x + width * env * lace(1.9), y]);
	}
	c.beginPath();
	for (const [i, [x, y]] of left.entries()) {
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	for (let i = right.length - 1; i >= 0; i--)
		c.lineTo(right[i][0], right[i][1]);
	c.closePath();
	c.fillStyle = fill;
	c.fill();
	c.strokeStyle = line;
	c.lineWidth = 1.7;
	c.stroke();
	if (bars) {
		c.beginPath();
		for (let k = 6; k < steps - 4; k += 4) {
			c.moveTo(left[k][0], left[k][1]);
			c.lineTo(right[k][0], right[k][1]);
		}
		c.lineWidth = 1.6;
		c.globalAlpha *= 0.55;
		c.stroke();
		c.globalAlpha /= 0.55;
	}
}

function nettle(b: Body) {
	const { c, s, pal, r, h } = b;
	const L = s.size;
	c.lineCap = "round";
	c.lineJoin = "round";

	// Long marginal tentacles: rosehip at the bell, cooling to lavender.
	c.strokeStyle = vertical(c, 0, L * 3.9, [
		[0, pal.rose, 0.85],
		[0.3, pal.rose, 0.62],
		[0.75, pal.lav, 0.42],
		[1, pal.lav, 0],
	]);
	c.lineWidth = 1.9;
	for (let g = 0; g < 9; g++) {
		const base = (g / 8) * 1.8 - 0.9;
		const reach = L * (3 + 0.8 * Math.sin(g * 2.1) ** 2);
		for (let m = 0; m < 3; m++) {
			const id = g * 1.3 + m * 0.5;
			c.beginPath();
			for (let k = 0; k <= N; k += 2) {
				const [x, y] = strand(
					b,
					k,
					base + (m - 1) * 0.04,
					reach * (1 - m * 0.07),
					id,
					{
						back: g % 3 === 1,
						fan: base * 0.16 + (m - 1) * 0.1,
						spread: 0.3 + 0.12 * Math.sin(id * 3),
						wave: 1.25 + 0.3 * m,
					},
				);
				if (k === 0) c.moveTo(x, y);
				else c.lineTo(x, y);
			}
			c.stroke();
		}
	}

	// Four oral arms, long and frilled.
	const fill = vertical(c, 0, L * 2.6, [
		[0, pal.crema, 0.5],
		[0.5, pal.amber, 0.34],
		[1, pal.rose, 0.12],
	]);
	const line = vertical(c, 0, L * 2.6, [
		[0, pal.amber, 0.85],
		[0.6, pal.rose, 0.75],
		[1, pal.lav, 0.35],
	]);
	const lengths = [2.5, 2.05, 2.7, 2.25];
	for (let j = 0; j < 4; j++) {
		arm(
			b,
			(j - 1.5) * 0.2,
			L * lengths[j],
			j,
			L * 0.14,
			30 + j * 5,
			fill,
			line,
			true,
			{
				fan: (j - 1.5) * 0.34,
				spread: 0.2 + 0.05 * j,
				wave: 1.1 + j * 0.2,
			},
		);
	}

	// The bell, in translucent layers.
	const rim = bell(c, r, h, 0.17, 16, L * 0.05);
	c.fillStyle = vertical(c, -h, 0, [
		[0, pal.crema, 0.3],
		[0.55, pal.crema, 0.2],
		[1, pal.amber, 0.22],
	]);
	c.fill();
	c.save();
	bell(c, r, h, 0.17, 16, L * 0.05);
	c.clip();
	for (let k = 0; k < 4; k++) {
		c.beginPath();
		c.ellipse(0, 4 + k * 3.4, r * (1 - k * 0.012), r * 0.21, 0, 0, TAU);
		c.strokeStyle = tint(pal.amber, 0.15 + k * 0.025);
		c.lineWidth = 4;
		c.stroke();
	}
	// Radial pigment stripes, narrow at the crown, broad and deep at the margin.
	for (let j = 0; j < 14; j++) {
		const a = (j / 14) * TAU + 0.07 * Math.sin(j * 2.3);
		const front = 0.5 + 0.5 * Math.sin(a);
		const half = 0.13 + 0.02 * Math.sin(j * 1.7);
		wedge(c, r, h, 0.17, a, half);
		c.fillStyle = vertical(c, -h, 4, [
			[0, pal.amber, 0.1 + 0.12 * front],
			[0.5, pal.rose, 0.18 + 0.3 * front],
			[1, pal.rose, 0.3 + 0.55 * front],
		]);
		c.fill();
		c.strokeStyle = tint(pal.rose, 0.18 + 0.5 * front);
		c.lineWidth = 1.6;
		c.stroke();
	}
	// The crown stays warm, and the pigment ring and rim stay deep.
	const glow = c.createRadialGradient(0, -h * 0.82, 0, 0, -h * 0.82, r * 0.5);
	glow.addColorStop(0, tint(pal.crema, 0.5));
	glow.addColorStop(1, tint(pal.crema, 0));
	c.fillStyle = glow;
	c.fillRect(-r, -h, r * 2, h);
	// The cruciform stomach, the deepest colour in the animal.
	c.lineWidth = Math.max(4, r * 0.07);
	c.strokeStyle = tint(pal.umber, 0.6);
	c.beginPath();
	for (let j = 0; j < 4; j++) {
		const a = Math.PI / 4 + (j / 4) * TAU;
		c.moveTo(0, -h * 0.36);
		c.quadraticCurveTo(
			Math.cos(a) * r * 0.16,
			-h * 0.4 + Math.sin(a) * h * 0.06,
			Math.cos(a) * r * 0.34,
			-h * 0.36 + Math.sin(a) * h * 0.13,
		);
	}
	c.stroke();
	c.restore();

	// Margin: a pigment band, then the lappets themselves.
	c.beginPath();
	for (let i = 0; i <= 128; i++) {
		const a = (i / 128) * Math.PI;
		const x = r * Math.cos(a);
		const y = rim(a);
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	c.strokeStyle = tint(pal.rose, 0.92);
	c.lineWidth = 3;
	c.stroke();
	bell(c, r, h, 0.17, 16, L * 0.05);
	c.strokeStyle = tint(pal.amber, 0.55);
	c.lineWidth = 2.2;
	c.stroke();
}

function moon(b: Body) {
	const { c, s, pal, r, h } = b;
	const L = s.size;
	c.lineCap = "round";
	c.lineJoin = "round";

	// A close fringe of short tentacles all round the margin.
	c.strokeStyle = vertical(c, 0, L * 0.7, [
		[0, pal.peri, 0.72],
		[1, pal.bone, 0.05],
	]);
	c.lineWidth = 1.7;
	c.beginPath();
	for (let j = 0; j < 44; j++) {
		const root = (j / 43) * 1.94 - 0.97;
		const length = L * (0.38 + 0.26 * Math.sin(j * 1.9) ** 2);
		for (let k = 0; k <= 36; k += 2) {
			const [x, y] = strand(b, k, root, length, j * 0.5, {
				back: j % 3 === 0,
				spread: 0.1,
			});
			if (k === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
	}
	c.stroke();

	const fill = vertical(c, 0, L * 1.5, [
		[0, pal.bone, 0.55],
		[1, pal.lav, 0.22],
	]);
	const line = vertical(c, 0, L * 1.5, [
		[0, pal.lav, 0.8],
		[1, pal.peri, 0.4],
	]);
	for (let j = 0; j < 4; j++) {
		arm(
			b,
			(j - 1.5) * 0.2,
			L * (1.3 + (j % 2) * 0.35),
			j + 0.5,
			L * 0.09,
			30,
			fill,
			line,
			false,
			{
				fan: (j - 1.5) * 0.22,
				spread: 0.16,
				wave: 1 + j * 0.25,
			},
		);
	}

	const rim = bell(c, r, h, 0.17, 8, L * 0.016);
	c.fillStyle = vertical(c, -h, 0, [
		[0, pal.bone, 0.3],
		[0.6, pal.peri, 0.16],
		[1, pal.peri, 0.32],
	]);
	c.fill();
	c.save();
	bell(c, r, h, 0.17, 8, L * 0.016);
	c.clip();
	for (let k = 0; k < 5; k++) {
		c.beginPath();
		c.ellipse(0, 3 + k * 3, r * (1 - k * 0.012), r * 0.21, 0, 0, TAU);
		c.strokeStyle = tint(pal.peri, 0.12 + k * 0.025);
		c.lineWidth = 4;
		c.stroke();
	}
	c.strokeStyle = tint(pal.peri, 0.55);
	c.lineWidth = 1.5;
	for (let j = 0; j < 18; j++) {
		c.beginPath();
		canal(c, r, h, 0.17, (j / 18) * TAU);
		c.stroke();
	}
	// Four horseshoe gonads, seen through the tissue.
	for (let j = 0; j < 4; j++) {
		const a = Math.PI / 4 + (j / 4) * TAU;
		c.save();
		c.translate(Math.cos(a) * r * 0.29, -h * 0.43 + Math.sin(a) * h * 0.18);
		c.scale(1, 0.66);
		c.rotate(a + Math.PI);
		c.beginPath();
		c.arc(0, 0, r * 0.125, 0.65, TAU - 0.65);
		c.strokeStyle = tint(pal.lav, 0.95);
		c.lineWidth = r * 0.065;
		c.stroke();
		c.restore();
	}
	c.restore();
	bell(c, r, h, 0.17, 8, L * 0.016);
	c.strokeStyle = tint(pal.peri, 0.62);
	c.lineWidth = 2.2;
	c.stroke();
	c.beginPath();
	for (let i = 0; i <= 96; i++) {
		const a = (i / 96) * Math.PI;
		const x = r * Math.cos(a);
		const y = rim(a);
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	c.strokeStyle = tint(pal.lav, 0.85);
	c.lineWidth = 2.8;
	c.stroke();
}

function crystal(b: Body) {
	const { c, s, pal, r, h } = b;
	const L = s.size;
	c.lineCap = "round";
	c.lineJoin = "round";

	// Very many fine tentacles; spread thinly they print as a stippled fringe.
	c.strokeStyle = vertical(c, 0, L * 4.4, [
		[0, pal.sage, 0.82],
		[0.45, pal.foam, 0.6],
		[1, pal.foam, 0],
	]);
	c.lineWidth = 1.6;
	c.beginPath();
	for (let j = 0; j < 34; j++) {
		const a = (j / 34) * TAU;
		const root = Math.cos(a);
		const length = L * (2 + 2.4 * (0.5 + 0.5 * Math.sin(j * 3.1 + 1)));
		for (let k = 0; k <= N; k += 3) {
			const [x, y] = strand(b, k, root, length, j * 0.71, {
				back: Math.sin(a) < 0,
				flat: 0.4,
				spread: 0.42 + 0.2 * Math.sin(j * 1.7),
				fan: root * 1.15 + 0.2 * Math.sin(j * 2.3),
				wave: 1.7 + 0.5 * Math.sin(j),
			});
			const wob = Math.sin((k / N) * 11 - b.t * 0.8 + j) * (k / N) * L * 0.06;
			if (k === 0) c.moveTo(x + wob, y);
			else c.lineTo(x + wob, y);
		}
	}
	c.stroke();

	// The manubrium hangs from the centre like a small stalk with four lips.
	const [mx, my] = strand(b, 14, 0, L * 0.9, 0.3);
	c.beginPath();
	c.moveTo(-L * 0.1, -h * 0.2);
	c.quadraticCurveTo(mx * 0.5 - L * 0.07, my * 0.5, mx - L * 0.12, my);
	c.lineTo(mx + L * 0.12, my);
	c.quadraticCurveTo(mx * 0.5 + L * 0.07, my * 0.5, L * 0.1, -h * 0.2);
	c.closePath();
	c.fillStyle = tint(pal.sage, 0.5);
	c.fill();
	c.strokeStyle = tint(pal.sage, 0.9);
	c.lineWidth = 1.7;
	c.stroke();

	const rim = bell(c, r, h, 0.4, 6, 0);
	c.fillStyle = vertical(c, -h, 0, [
		[0, pal.foam, 0.2],
		[1, pal.sage, 0.3],
	]);
	c.fill();
	c.save();
	bell(c, r, h, 0.4, 6, 0);
	c.clip();
	c.strokeStyle = tint(pal.sage, 0.62);
	c.lineWidth = 1.6;
	c.beginPath();
	for (let j = 0; j < 26; j++) meridian(c, r, h, 0.4, (j / 26) * TAU + 0.05);
	c.stroke();
	// Gonads along the canals, the deepest sage.
	c.strokeStyle = tint(pal.sage, 0.95);
	c.lineWidth = 2.6;
	c.beginPath();
	for (let j = 0; j < 8; j++) {
		const a = (j / 8) * TAU + 0.2;
		c.moveTo(Math.cos(a) * r * 0.3, -h * 0.5 + Math.sin(a) * h * 0.1);
		c.lineTo(Math.cos(a) * r * 0.62, -h * 0.2 + Math.sin(a) * h * 0.1);
	}
	c.stroke();
	c.restore();
	bell(c, r, h, 0.4, 6, 0);
	c.strokeStyle = tint(pal.foam, 0.8);
	c.lineWidth = 2;
	c.stroke();
	// Marginal bulbs.
	c.fillStyle = tint(pal.bone, 0.95);
	c.beginPath();
	for (let j = 0; j < 22; j++) {
		const a = (j / 21) * Math.PI;
		c.moveTo(r * Math.cos(a) + 1.4, rim(a));
		c.arc(r * Math.cos(a), rim(a), 1.4, 0, TAU);
	}
	c.fill();
}

function comb(b: Body) {
	const { c, s, pal, t } = b;
	const L = s.size;
	c.lineCap = "round";
	c.lineJoin = "round";

	// Two long tentacles with side branches, trailing and coiling.
	for (const side of [-1, 1]) {
		const pts: [number, number][] = [];
		for (let k = 0; k <= N; k += 2) {
			const q = k / N;
			const [x, y] = strand(b, k, side * 0.6, L * 6.2, side * 1.7, {
				spread: 0.3,
				fan: side * 0.25,
			});
			const coil = Math.sin(q * 8 - t * 0.7 + side) * q * L * 0.5;
			pts.push([x + coil, y + L * 0.1]);
		}
		c.beginPath();
		for (const [i, [x, y]] of pts.entries()) {
			if (i === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.strokeStyle = vertical(c, 0, L * 6, [
			[0, pal.lav, 0.8],
			[0.6, pal.lav, 0.45],
			[1, pal.peri, 0],
		]);
		c.lineWidth = 1.8;
		c.stroke();
		c.beginPath();
		for (let i = 3; i < pts.length - 2; i += 2) {
			const [x, y] = pts[i];
			const dir = i % 4 === 1 ? 1 : -1;
			c.moveTo(x, y);
			c.lineTo(x + dir * L * 0.2, y + L * 0.22);
		}
		c.lineWidth = 1.6;
		c.strokeStyle = tint(pal.peri, 0.45);
		c.stroke();
	}

	// An egg of clear jelly, a faint wall and a pale fill.
	const rx = L * 0.78;
	c.beginPath();
	c.ellipse(0, 0, rx, L, 0, 0, TAU);
	c.fillStyle = vertical(c, -L, L, [
		[0, pal.foam, 0.08],
		[1, pal.lav, 0.08],
	]);
	c.fill();
	c.strokeStyle = tint(pal.lav, 0.5);
	c.lineWidth = 1.7;
	c.stroke();

	// Eight rows of comb plates; the beat runs down each row as a bright wave.
	const spin = t * 0.17;
	const ROW = 14;
	for (let i = 0; i < 8; i++) {
		const phi = (i / 8) * TAU + spin;
		const depth = Math.cos(phi);
		const xs = Math.sin(phi);
		const front = depth > 0 ? 0.35 + 0.65 * depth : 0.12;
		const row: [number, number][] = [];
		for (let m = 0; m <= ROW; m++) {
			const theta = 0.28 + (m / ROW) * 2.6;
			row.push([rx * Math.sin(theta) * xs, -L * Math.cos(theta)]);
		}
		c.beginPath();
		for (const [m, [x, y]] of row.entries()) {
			if (m === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.strokeStyle = tint(pal.lav, 0.6 * front);
		c.lineWidth = 1.6;
		c.stroke();
		const out = xs >= 0 ? 1 : -1;
		for (let m = 1; m < ROW; m += 1) {
			const wave = 0.5 + 0.5 * Math.sin(m * 0.8 - t * 4.2 + i * 0.7);
			const [x, y] = row[m];
			const [x0, y0] = row[m - 1];
			const [x1, y1] = row[m + 1];
			const d = Math.hypot(x1 - x0, y1 - y0) || 1;
			// Each plate leans out from the row, along its normal.
			const nx = (-(y1 - y0) / d) * out;
			const ny = ((x1 - x0) / d) * out;
			const len = L * (0.1 + 0.1 * wave) * (0.4 + 0.6 * Math.abs(xs));
			c.beginPath();
			c.moveTo(x, y);
			c.lineTo(x + nx * len, y + ny * len);
			c.strokeStyle = tint(
				wave > 0.5 ? pal.foam : pal.peri,
				(0.35 + 0.5 * wave) * front,
			);
			c.lineWidth = 1.7;
			c.stroke();
		}
	}
	// Apical organ and mouth.
	c.fillStyle = tint(pal.umber, 0.95);
	c.beginPath();
	c.arc(0, -L * 0.92, 1.8, 0, TAU);
	c.arc(0, L * 0.94, 1.8, 0, TAU);
	c.fill();
}

const DRAW = { nettle, moon, crystal, comb };

function stage(W: number, H: number): Spec[] {
	const phone = W < 600;
	const wide = W >= 1100;
	const margin = wide ? (W - 976) / 2 : 0;
	const size = phone
		? 64
		: wide
			? Math.min(100, Math.max(58, margin * 0.4))
			: 84;
	const left = phone
		? W * 0.27
		: wide
			? Math.max(size * 1.2, margin * 0.55)
			: W * 0.16;
	const right =
		W -
		(phone ? W * 0.24 : wide ? Math.max(size * 1.0, margin * 0.5) : W * 0.14);
	const base = {
		sway: 14,
		swayRate: 0.085,
		swayPhase: 0,
		lag: 2.3,
		squeeze: 0.19,
		dome: 0.62,
	};
	const make = (
		kind: Spec["kind"],
		scale: number,
		x: number,
		y30: number,
		speed: number,
		alpha: number,
		period: number,
		at30: number,
		extra: Partial<Spec> = {},
	): Spec => {
		const sz = size * scale;
		const reach = { nettle: 4.1, moon: 2.4, crystal: 3.6, comb: 7 }[kind];
		return {
			...base,
			kind,
			size: sz,
			x,
			y30,
			speed,
			alpha,
			period,
			at30,
			thrust: sz * 0.21,
			up: sz,
			down: sz * reach,
			...extra,
		};
	};
	// Far to near, so the near bell is painted over the far tentacles.
	return [
		make(
			"comb",
			0.4,
			right - size * 0.7,
			H * (phone ? 0.74 : 0.58),
			3.2,
			0.72,
			5,
			0,
			{
				sway: 9,
				swayRate: 0.11,
				swayPhase: 1.3,
				lag: 3.4,
				thrust: 0,
			},
		),
		make(
			"crystal",
			0.5,
			left + size * 0.58,
			H * (phone ? 0.5 : 0.25),
			4.4,
			0.82,
			3.1,
			1.9,
			{
				sway: 10,
				swayRate: 0.07,
				swayPhase: 2.2,
				lag: 1.9,
				squeeze: 0.26,
				dome: 0.34,
			},
		),
		make("moon", 0.72, right, H * (phone ? 0.56 : 0.3), 6.3, 0.88, 4.5, 3.0, {
			dome: 0.56,
			swayPhase: 2,
			swayRate: 0.07,
			lag: 2.8,
		}),
		make("nettle", 0.93, left, H * (phone ? 0.6 : 0.43), 8, 1, 3.9, 3.0, {
			swayPhase: 0.5,
			dome: 0.72,
			lag: 2.6,
		}),
	];
}

export const bloom: Scene = ({ dither: c }, { t, W, H, dark }) => {
	const pal = dark ? PALETTE.dark : PALETTE.light;
	for (const s of stage(W, H)) {
		const now = poseOf(s, t);
		// The route wraps while the whole animal is off the page.
		const top = -s.down - 30;
		const span = H + s.up + s.down + 60;
		const y = top + mod(now.y - top, span);
		const b = bodyFor(c, s, t, pal, now);
		b.r = s.size * (1 - now.p * s.squeeze);
		b.h = s.size * (s.dome + now.p * 0.12);
		c.save();
		c.translate(now.x, y);
		c.globalAlpha = s.alpha;
		DRAW[s.kind](b);
		c.restore();
	}
};
