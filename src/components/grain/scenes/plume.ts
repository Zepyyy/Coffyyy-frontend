import type { Layers, Scene, SceneEnv } from "../engine";

/**
 * One ribbon of steam, leaving the real cup on the Log a brew key.
 * It twists like silk: its two edges cross at travelling nodes, so it stays
 * one continuous form rather than a set of wisps. Distance is what sets the
 * material: solid grain near the cup, letters mid-flight, air at the end.
 */

const POINTS = 90;
const TAU = Math.PI * 2;

type Strand = { phase: number; width: number; tone: number };

const STRANDS: Strand[] = [
	{ phase: 0, width: 1, tone: 0.62 },
	{ phase: 2.1, width: 0.72, tone: 0.42 },
];

type Path = { x: number[]; y: number[]; nx: number[]; ny: number[] };

/** Where the steam starts and how it leaves. */
export type Journey = {
	x: number;
	y: number;
	dir: number;
	/** Horizontal distance covered. */
	reach: number;
	/** Height gained, nearly all of it early. */
	rise: number;
	/** How quickly the height is gained. */
	climb: number;
	/** How far cooling steam sinks back by the end. */
	settle: number;
	/** Trade the grain for letters early, when type sits right above. */
	early?: boolean;
};

function spine(env: SceneEnv, j: Journey, t: number): Path {
	const { pointer } = env;
	const path: Path = { x: [], y: [], nx: [], ny: [] };
	for (let i = 0; i <= POINTS; i++) {
		const s = i / POINTS;
		// Waves leave the cup and grow with distance.
		const amp = 4 + 18 * s + 34 * s * s;
		const wave =
			Math.sin(TAU * (s * 1.5 - t * 0.045)) +
			0.42 * Math.sin(TAU * (s * 3.1 - t * 0.07) + 1.3);
		let x = j.x + j.dir * j.reach * s ** 1.5;
		let y =
			j.y -
			j.rise * (1 - Math.exp(-s * j.climb)) +
			j.settle * s * s +
			amp * wave;
		if (pointer.a > 0.01) {
			// A hand moving through steam pushes it aside.
			const dx = x - pointer.x;
			const dy = y - pointer.y;
			const push =
				(pointer.a * 54 * Math.exp(-(dx * dx + dy * dy) / 16000)) /
				Math.max(1, Math.hypot(dx, dy) / 40);
			x += dx * 0.004 * push;
			y += Math.sign(dy || 1) * push;
		}
		path.x.push(x);
		path.y.push(y);
	}
	for (let i = 0; i <= POINTS; i++) {
		const a = Math.max(0, i - 1);
		const b = Math.min(POINTS, i + 1);
		const dx = path.x[b] - path.x[a];
		const dy = path.y[b] - path.y[a];
		const len = Math.hypot(dx, dy) || 1;
		path.nx.push(-dy / len);
		path.ny.push(dx / len);
	}
	return path;
}

/** Material by distance: [fraction of the journey, strength]. */
type Stops = Array<[number, number]>;

const SOLID: Stops = [
	[0, 1],
	[0.3, 0.9],
	[0.52, 0],
	[1, 0],
];
const LETTERS: Stops = [
	[0.12, 0],
	[0.36, 1],
	[0.74, 0.8],
	[0.98, 0],
];
/** Phones reach the greeting early, and grain behind type reads as noise. */
const SOLID_SHORT: Stops = [
	[0, 1],
	[0.06, 0.8],
	[0.14, 0],
	[1, 0],
];
const LETTERS_EARLY: Stops = [
	[0.05, 0],
	[0.16, 0.7],
	[0.74, 0.8],
	[0.98, 0],
];
const AIR: Stops = [
	[0.1, 0.2],
	[0.72, 1],
	[1, 0.5],
];

function ribbon(
	c: CanvasRenderingContext2D,
	p: Path,
	strand: Strand,
	t: number,
	scale: number,
	from: number,
	to: number,
	stops: Stops,
) {
	c.beginPath();
	for (let side = 0; side < 2; side++) {
		for (let n = 0; n <= POINTS; n++) {
			const i = side === 0 ? n : POINTS - n;
			const s = i / POINTS;
			const half = (4.5 + 40 * s ** 1.1) * strand.width * scale;
			// The edges twist out of step, so the ribbon narrows but never parts.
			const turn = TAU * (s * 2.4 - t * 0.04) + strand.phase;
			const off =
				side === 0
					? half * (0.62 + 0.38 * Math.cos(turn))
					: -half * (0.62 + 0.38 * Math.cos(turn + 1.9));
			const x = p.x[i] + p.nx[i] * off;
			const y = p.y[i] + p.ny[i] * off;
			if (i === 0 && side === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
	}
	c.closePath();
	// The tone lives in the fill, so a ribbon never touches what is around it.
	const fill = c.createLinearGradient(from, 0, to, 0);
	for (const [at, a] of stops)
		fill.addColorStop(at, `rgb(0 0 0 / ${a * strand.tone})`);
	c.fillStyle = fill;
	c.fill();
}

export function steam(layers: Layers, env: SceneEnv, j: Journey) {
	// Waves are measured along the journey, so a longer one must run slower
	// to keep the same speed on screen.
	const t = env.t * Math.min(1, 1440 / env.W);
	const p = spine(env, j, t);
	const scale = Math.min(1, env.W / 820) * 0.45 + 0.55;
	const far = j.x + j.dir * j.reach;
	const solid = j.early ? SOLID_SHORT : SOLID;
	const letters = j.early ? LETTERS_EARLY : LETTERS;
	for (const strand of STRANDS) {
		ribbon(layers.dither, p, strand, t, scale, j.x, far, solid);
		ribbon(layers.ascii, p, strand, t, scale, j.x, far, letters);
		ribbon(layers.blur, p, strand, t, scale * 1.3, j.x, far, AIR);
	}
}

/** The steam leaving the real cup on the Log a brew key. */
export function cupJourney({ W, H, anchors }: SceneEnv): Journey {
	const cup = anchors.cup;
	const x = cup ? cup.x + cup.w * 0.5 : W * 0.78;
	const y = cup ? cup.y + cup.h * 0.2 : H * 0.14;
	// Phones stack the key under the greeting, so the only open air is above.
	const narrow = W < 640;
	return {
		x,
		y,
		dir: x > W / 2 ? -1 : 1,
		reach: Math.max(W * 0.86, 340),
		rise: narrow ? y * 0.66 : Math.min(y - 34, 84),
		climb: narrow ? 11 : 7,
		settle: narrow ? 18 : Math.min(H * 0.09, 74),
		early: narrow,
	};
}

export const plume: Scene = (layers, env) => {
	steam(layers, env, cupJourney(env));
};
