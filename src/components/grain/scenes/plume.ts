import type { Layers, SceneEnv } from "../engine";

/**
 * One ribbon of steam climbing an empty margin. It twists like silk: its two
 * edges cross out of step, so it stays one continuous form. Height sets the
 * material, solid grain at the outlet and letters above it, and it never goes
 * anywhere near text. It thins out on bare paper rather than turning to haze.
 */

const POINTS = 70;
const TAU = Math.PI * 2;

type Stops = Array<[number, number]>;

const STRANDS = [
	{ phase: 0, width: 1, tone: 0.66 },
	{ phase: 2.1, width: 0.7, tone: 0.44 },
];

const SOLID: Stops = [
	[0, 1],
	[0.18, 0.95],
	[0.36, 0],
	[1, 0],
];
const LETTERS: Stops = [
	[0.12, 0],
	[0.3, 1],
	[0.72, 0.85],
	[1, 0],
];

/** Where the steam starts and the corridor it has to stay inside. */
export type Column = {
	x: number;
	y: number;
	/** Height of the top of the climb. */
	top: number;
	/** Horizontal centre of the open margin. */
	centre: number;
	/** Half the width of that margin. */
	room: number;
};

type Path = { x: number[]; y: number[] };

function spine(env: SceneEnv, j: Column): Path {
	const { t, pointer } = env;
	const path: Path = { x: [], y: [] };
	const sway = Math.max(6, j.room * 0.42);
	for (let i = 0; i <= POINTS; i++) {
		const s = i / POINTS;
		const wave =
			Math.sin(TAU * (s * 1.7 - t * 0.05)) +
			0.4 * Math.sin(TAU * (s * 3.3 - t * 0.08) + 1.3);
		const y = j.y + (j.top - j.y) * s;
		// Ease from the outlet into the middle of the margin as it climbs.
		const glide = Math.min(1, s * 2.2);
		let x =
			j.x +
			(j.centre - j.x) * glide * glide * (3 - 2 * glide) +
			(sway * s ** 0.8 * wave) / 1.4;
		if (pointer.a > 0.01) {
			// A hand parts steam: the shift is an odd, continuous function of the
			// distance to it, so passing through the ribbon can never make it jump.
			const dx = (x - pointer.x) / 46;
			const dy = (y - pointer.y) / 90;
			x += pointer.a * 26 * dx * Math.exp(-(dx * dx + dy * dy) / 2);
		}
		path.x.push(x);
		path.y.push(y);
	}
	return path;
}

function ribbon(
	c: CanvasRenderingContext2D,
	p: Path,
	strand: (typeof STRANDS)[number],
	j: Column,
	t: number,
	stops: Stops,
) {
	const widest = Math.max(10, Math.min(30, j.room * 0.5));
	c.beginPath();
	for (let side = 0; side < 2; side++) {
		for (let n = 0; n <= POINTS; n++) {
			const i = side === 0 ? n : POINTS - n;
			const s = i / POINTS;
			const half = (4 + widest * s ** 1.1) * strand.width;
			// The edges twist out of step, so the ribbon narrows but never parts.
			const turn = TAU * (s * 2.2 - t * 0.04) + strand.phase;
			const off =
				side === 0
					? half * (0.62 + 0.38 * Math.cos(turn))
					: -half * (0.62 + 0.38 * Math.cos(turn + 1.9));
			if (i === 0 && side === 0) c.moveTo(p.x[i] + off, p.y[i]);
			else c.lineTo(p.x[i] + off, p.y[i]);
		}
	}
	c.closePath();
	const fill = c.createLinearGradient(0, j.y, 0, j.top);
	for (const [at, a] of stops)
		fill.addColorStop(at, `rgb(0 0 0 / ${a * strand.tone})`);
	c.fillStyle = fill;
	c.fill();
}

export function steam(layers: Layers, env: SceneEnv, j: Column) {
	const p = spine(env, j);
	for (const strand of STRANDS) {
		ribbon(layers.dither, p, strand, j, env.t, SOLID);
		ribbon(layers.ascii, p, strand, j, env.t, LETTERS);
	}
}
