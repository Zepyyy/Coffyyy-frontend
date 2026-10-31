/**
 * Swimming, as geometry. A body never steers: its head runs along a closed
 * curve at constant speed and every other vertebra follows the same curve,
 * so the whole animal bends through a turn. A wave then travels from the
 * shoulders to the tail on top of that, growing as it goes.
 *
 * All of it is a pure function of distance swum, so any moment can be redrawn.
 */

export type Point = [number, number];

export type Loop = {
	xs: Float32Array;
	ys: Float32Array;
	step: number;
	length: number;
};

const SAMPLE_STEP = 3;

function catmull(a: number, b: number, c: number, d: number, u: number) {
	return (
		0.5 *
		(2 * b +
			(c - a) * u +
			(2 * a - 5 * b + 4 * c - d) * u * u +
			(3 * b - a - 3 * c + d) * u * u * u)
	);
}

/** A closed smooth curve through `points`, resampled to even spacing. */
export function buildLoop(points: Point[]): Loop {
	const dense: Point[] = [];
	const n = points.length;
	for (let i = 0; i < n; i++) {
		const [ax, ay] = points[(i + n - 1) % n];
		const [bx, by] = points[i];
		const [cx, cy] = points[(i + 1) % n];
		const [dx, dy] = points[(i + 2) % n];
		for (let k = 0; k < 120; k++) {
			const u = k / 120;
			dense.push([catmull(ax, bx, cx, dx, u), catmull(ay, by, cy, dy, u)]);
		}
	}
	let length = 0;
	const runs = new Float32Array(dense.length + 1);
	for (let i = 0; i < dense.length; i++) {
		const [x0, y0] = dense[i];
		const [x1, y1] = dense[(i + 1) % dense.length];
		length += Math.hypot(x1 - x0, y1 - y0);
		runs[i + 1] = length;
	}
	const count = Math.max(8, Math.floor(length / SAMPLE_STEP));
	const step = length / count;
	const xs = new Float32Array(count);
	const ys = new Float32Array(count);
	for (let i = 0, j = 0; i < count; i++) {
		const at = i * step;
		while (runs[j + 1] < at) j++;
		const u = (at - runs[j]) / Math.max(1e-6, runs[j + 1] - runs[j]);
		const [x0, y0] = dense[j];
		const [x1, y1] = dense[(j + 1) % dense.length];
		xs[i] = x0 + (x1 - x0) * u;
		ys[i] = y0 + (y1 - y0) * u;
	}
	return { xs, ys, step, length };
}

function pointOn(loop: Loop, distance: number): Point {
	const n = loop.xs.length;
	const at = ((distance % loop.length) + loop.length) % loop.length;
	const f = at / loop.step;
	const i = Math.floor(f) % n;
	const j = (i + 1) % n;
	const u = f - Math.floor(f);
	return [
		loop.xs[i] + (loop.xs[j] - loop.xs[i]) * u,
		loop.ys[i] + (loop.ys[j] - loop.ys[i]) * u,
	];
}

export type Spine = {
	x: Float32Array;
	y: Float32Array;
	/** Unit normal at each vertebra. */
	nx: Float32Array;
	ny: Float32Array;
};

export type Stroke = {
	/** Metres of wave per body length, roughly: more means a wrigglier animal. */
	waves: number;
	/** Sideways reach at the tail, in pixels. */
	reach: number;
	/** Tail beats per second. */
	beat: number;
	/** How much of the front of the body stays out of the wave, 0..1. */
	stiff?: number;
};

/** Vertebrae from nose (0) to tail (`count - 1`), `length` pixels apart in total. */
export function spineOn(
	loop: Loop,
	head: number,
	length: number,
	count: number,
	stroke: Stroke,
	t: number,
): Spine {
	const x = new Float32Array(count);
	const y = new Float32Array(count);
	const nx = new Float32Array(count);
	const ny = new Float32Array(count);
	const stiff = stroke.stiff ?? 0.2;
	for (let i = 0; i < count; i++) {
		const q = i / (count - 1);
		const [px, py] = pointOn(loop, head - q * length);
		const [ax, ay] = pointOn(loop, head - q * length + 4);
		const [bx, by] = pointOn(loop, head - q * length - 4);
		const dx = ax - bx;
		const dy = ay - by;
		const d = Math.hypot(dx, dy) || 1;
		const ox = -dy / d;
		const oy = dx / d;
		const grow = Math.max(0, (q - stiff) / (1 - stiff));
		const side =
			stroke.reach *
			grow *
			grow *
			Math.sin(Math.PI * 2 * (stroke.waves * q - stroke.beat * t));
		x[i] = px + ox * side;
		y[i] = py + oy * side;
	}
	for (let i = 0; i < count; i++) {
		const a = Math.max(0, i - 1);
		const b = Math.min(count - 1, i + 1);
		const dx = x[a] - x[b];
		const dy = y[a] - y[b];
		const d = Math.hypot(dx, dy) || 1;
		nx[i] = -dy / d;
		ny[i] = dx / d;
	}
	return { x, y, nx, ny };
}

/** Traces the outline given half-width as a function of 0 (nose) to 1 (tail). */
export function trace(
	c: CanvasRenderingContext2D,
	s: Spine,
	halfWidth: (q: number) => number,
) {
	const n = s.x.length;
	c.beginPath();
	for (let i = 0; i < n; i++) {
		const w = halfWidth(i / (n - 1));
		const px = s.x[i] + s.nx[i] * w;
		const py = s.y[i] + s.ny[i] * w;
		if (i === 0) c.moveTo(px, py);
		else c.lineTo(px, py);
	}
	for (let i = n - 1; i >= 0; i--) {
		const w = halfWidth(i / (n - 1));
		c.lineTo(s.x[i] - s.nx[i] * w, s.y[i] - s.ny[i] * w);
	}
	c.closePath();
}
