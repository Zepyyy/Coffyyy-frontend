import type { Scene } from "../engine";
import { buildLoop, type Loop, type Point, spineOn, trace } from "./swim";

/**
 * Koi seen from above, as if the page were still water and the cards lay on
 * it. Each fish keeps one long curving route that takes it under the cards
 * and back out into open paper. Body in grain, patches dark, tail fanning.
 */

type Fish = {
	length: number;
	speed: number;
	/** Where on its route the fish starts, as a fraction of the whole loop. */
	start: number;
	route: Point[];
	patches: Array<[number, number]>;
};

/**
 * Routes are fractions of the water, which starts below the greeting and the
 * shelf heading. Fish never cross text: they use the margins and go under cards.
 */
const FISH: Fish[] = [
	{
		length: 430,
		speed: 40,
		start: 0.3,
		route: [
			[0.05, 0.08],
			[0.03, 0.52],
			[0.16, 0.92],
			[0.46, 0.8],
			[0.72, 0.96],
			[0.95, 0.72],
			[0.96, 0.22],
			[0.7, 0.08],
			[0.4, 0.3],
			[0.2, 0.12],
		],
		patches: [
			[0.2, 0.6],
			[0.46, 0.75],
			[0.7, 0.5],
		],
	},
	{
		length: 300,
		speed: 33,
		start: 0.2,
		route: [
			[0.96, 0.9],
			[0.62, 0.72],
			[0.34, 0.94],
			[0.04, 0.74],
			[0.1, 0.2],
			[0.42, 0.1],
			[0.66, 0.34],
			[0.95, 0.12],
		],
		patches: [
			[0.3, 0.7],
			[0.6, 0.6],
		],
	},
];

const halfWidth = (length: number) => (q: number) => {
	const body = Math.sin(Math.PI * q ** 0.56) ** 0.82;
	return length * 0.105 * body * (1 - 0.32 * q);
};

let cached = "";
let loops: Loop[] = [];

export const koi: Scene = (layers, { t, W, H, anchors }) => {
	// Routes are fixed once the shelf is known, so a card opening later on
	// cannot make a fish jump.
	const shelf = anchors.shelf;
	const key = `${W}x${H}:${shelf ? 1 : 0}`;
	const narrow = W < 640;
	const scale = narrow ? 0.56 : Math.min(1, 0.6 + W / 2600);
	if (key !== cached) {
		cached = key;
		const top = shelf ? shelf.y : H * 0.3;
		const depth = Math.max(200, H - top - 40);
		// Phones have no margin, so routes draw in and stay under the cards.
		const spread = narrow ? 0.6 : 1;
		loops = FISH.map((f) =>
			buildLoop(
				f.route.map(
					([x, y]) =>
						[W * (0.5 + (x - 0.5) * spread), top + y * depth] as Point,
				),
			),
		);
	}
	const c = layers.dither;
	FISH.forEach((fish, index) => {
		const length = fish.length * scale;
		const loop = loops[index];
		const s = spineOn(
			loop,
			fish.start * loop.length + fish.speed * t,
			length,
			34,
			{ waves: 0.9, reach: length * 0.075, beat: 0.42, stiff: 0.22 },
			t,
		);
		const n = s.x.length - 1;
		const width = halfWidth(length);

		// Pectoral fins, sculling slowly.
		const fin = Math.round(n * 0.2);
		const scull = 0.34 + 0.2 * Math.sin(t * 1.1 + index);
		for (const side of [1, -1]) {
			const rootX = s.x[fin] + s.nx[fin] * width(0.2) * side * 0.8;
			const rootY = s.y[fin] + s.ny[fin] * width(0.2) * side * 0.8;
			const back = Math.atan2(s.y[fin + 3] - s.y[fin], s.x[fin + 3] - s.x[fin]);
			const angle = back - side * (0.55 + scull);
			c.save();
			c.translate(rootX, rootY);
			c.rotate(angle);
			c.fillStyle = "rgb(0 0 0 / 0.58)";
			c.beginPath();
			c.ellipse(length * 0.08, 0, length * 0.085, length * 0.042, 0, 0, 7);
			c.fill();
			c.restore();
		}

		// The tail fan splits and follows the last of the body.
		const tx = s.x[n];
		const ty = s.y[n];
		const tail = Math.atan2(ty - s.y[n - 3], tx - s.x[n - 3]);
		c.save();
		c.translate(tx, ty);
		c.rotate(tail);
		c.fillStyle = "rgb(0 0 0 / 0.62)";
		c.beginPath();
		c.moveTo(-6, 0);
		c.quadraticCurveTo(
			length * 0.1,
			-length * 0.1,
			length * 0.17,
			-length * 0.07,
		);
		c.quadraticCurveTo(length * 0.08, 0, length * 0.17, length * 0.07);
		c.quadraticCurveTo(length * 0.1, length * 0.1, -6, 0);
		c.fill();
		c.restore();

		// Body.
		trace(c, s, width);
		c.fillStyle = "rgb(0 0 0 / 0.56)";
		c.fill();
		c.save();
		trace(c, s, width);
		c.clip();
		for (const [at, size] of fish.patches) {
			const i = Math.round(at * n);
			c.fillStyle = "rgb(0 0 0 / 1)";
			c.beginPath();
			c.ellipse(
				s.x[i],
				s.y[i],
				length * 0.1 * size + 8,
				length * 0.075 * size + 6,
				Math.atan2(s.y[i + 1] - s.y[i - 1], s.x[i + 1] - s.x[i - 1]),
				0,
				7,
			);
			c.fill();
		}
		c.restore();

		// Eyes, set wide on the head, are what make it look back at you.
		const eye = Math.round(n * 0.07);
		const reach = width(0.07) * 0.72;
		c.fillStyle = "rgb(0 0 0 / 1)";
		for (const side of [1, -1]) {
			c.beginPath();
			c.arc(
				s.x[eye] + s.nx[eye] * reach * side,
				s.y[eye] + s.ny[eye] * reach * side,
				Math.max(2.4, length * 0.0085),
				0,
				7,
			);
			c.fill();
		}
	});
};
