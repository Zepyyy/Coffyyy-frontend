import type { Scene } from "../engine";

const TAU = Math.PI * 2;
const mod = (x: number, n: number) => ((x % n) + n) % n;
const ease = (x: number) => x * x * (3 - 2 * x);

/** One second of propulsion, two and a half seconds opening again. */
function pulse(t: number) {
	const p = mod(t, 3.5);
	return p < 1 ? ease(p) : 1 - ease((p - 1) / 2.5);
}

function pose(t: number, W: number, H: number, side: number) {
	// The unseen part of the route is long enough to leave quiet paper.
	const travel = mod(t - 30 + side * 70, 170);
	const y =
		H * (W < 600 ? 0.59 : 0.43) - travel * 9 - 21 * pulse(t + side * 1.7);
	const lane = W < 600 ? 82 : Math.max(112, (W - 1024) / 2 + 6);
	return {
		x: (side ? W - lane : lane) + 21 * Math.sin(t * 0.085 + side * 2),
		y: travel > 120 ? y + 170 * 9 : y,
		p: pulse(t + side * 1.7),
	};
}

function dome(c: CanvasRenderingContext2D, r: number, h: number) {
	c.beginPath();
	c.moveTo(-r, 0);
	c.bezierCurveTo(-r * 0.94, -h * 0.76, -r * 0.53, -h, 0, -h);
	c.bezierCurveTo(r * 0.53, -h, r * 0.94, -h * 0.76, r, 0);
	for (let i = 0; i <= 96; i++) {
		const a = (i / 96) * Math.PI;
		c.lineTo(r * Math.cos(a), Math.sin(a) * r * 0.17 + 1.8 * Math.sin(a * 16));
	}
	c.closePath();
}

export const jelly: Scene = ({ dither: c }, { t, W, H }) => {
	const size = W < 600 ? 68 : 100;
	for (let side = 1; side >= 0; side--) {
		const s = side ? 0.79 : 1;
		const now = pose(t, W, H, side);
		const r = size * s * (1 - now.p * 0.19);
		const h = size * s * (0.65 + now.p * 0.12);
		if (now.y < -size * 3.8 || now.y > H + size * 1.5) continue;
		c.save();
		c.translate(now.x, now.y);
		c.lineCap = "round";
		c.lineJoin = "round";

		// Each point remembers the bell at an earlier time. The lag grows
		// continuously down the filament, including through a propulsion stroke.
		const strand = (q: number, root: number, length: number, id: number) => {
			const past = pose(t - q * 2.3, W, H, side);
			// Unwrap the route before comparing historical positions.
			let dy = past.y - now.y;
			if (Math.abs(dy) > 500) dy = q * 2.3 * 9;
			return [
				past.x -
					now.x +
					root * size * s * (1 - past.p * 0.19) +
					Math.sin(q * 3.8 - t * 0.65 + id) *
						q *
						size *
						0.23 *
						(1 - past.p * 0.48),
				Math.sqrt(Math.max(0, 1 - root * root)) * r * 0.13 + q * length + dy,
			];
		};
		for (let j = 0; j < 12; j++) {
			const root = (j / 11) * 1.9 - 0.95;
			const length = size * s * (1.65 + 0.65 * Math.sin(j * 2.4) ** 2);
			c.beginPath();
			for (let k = 0; k <= 64; k++) {
				const q = k / 64;
				const [x, y] = strand(q, root, length, j * 0.31);
				if (k === 0) c.moveTo(x, y);
				else c.lineTo(x, y);
			}
			c.strokeStyle = "rgb(0 0 0 / 0.8)";
			c.lineWidth = 2.2 * s;
			c.stroke();
		}

		// Four folded oral arms: quiet central ribbons with scalloped edges.
		for (let j = 0; j < 4; j++) {
			const root = (j - 1.5) * 0.18;
			c.beginPath();
			for (const edge of [1, -1]) {
				for (let k = 0; k <= 90; k++) {
					const q = edge === 1 ? k / 90 : 1 - k / 90;
					const [x, y] = strand(q, root, size * s * (1.43 + j * 0.12), j + 0.5);
					const fold =
						(3.2 + 2.1 * Math.sin(q * 46 + j)) *
						Math.sin(Math.PI * (q * 0.93 + 0.04));
					const px = x + edge * fold * s;
					if (k === 0 && edge === 1) c.moveTo(px, y);
					else c.lineTo(px, y);
				}
			}
			c.closePath();
			c.fillStyle = "rgb(0 0 0 / 0.52)";
			c.fill();
			c.strokeStyle = "rgb(0 0 0 / 0.75)";
			c.lineWidth = 1.5;
			c.stroke();
		}

		// Optical density comes from nested membranes, never a grey blur.
		dome(c, r, h);
		c.fillStyle = "rgb(0 0 0 / 0.22)";
		c.fill();
		c.save();
		dome(c, r, h);
		c.clip();
		for (let k = 0; k < 5; k++) {
			c.beginPath();
			c.ellipse(0, 3 + k * 3, r * (1 - k * 0.012), r * 0.21, 0, 0, TAU);
			c.strokeStyle = `rgb(0 0 0 / ${0.13 + k * 0.025})`;
			c.lineWidth = 4;
			c.stroke();
		}
		// Radial gastrovascular canals follow the curvature of the dome.
		for (let j = 0; j < 20; j++) {
			const a = (j / 20) * TAU;
			const x = Math.cos(a) * r;
			const y = Math.sin(a) * r * 0.17;
			c.beginPath();
			c.moveTo(Math.cos(a) * r * 0.12, -h * 0.72);
			c.bezierCurveTo(x * 0.5, -h * 0.8, x * 0.86, -h * 0.34 + y, x, y);
			c.strokeStyle = "rgb(0 0 0 / 0.44)";
			c.lineWidth = 1.4;
			c.stroke();
		}
		// The moon jelly's unmistakable four horseshoes, seen through tissue.
		for (let j = 0; j < 4; j++) {
			const a = Math.PI / 4 + (j / 4) * TAU;
			c.save();
			c.translate(Math.cos(a) * r * 0.29, -h * 0.43 + Math.sin(a) * h * 0.18);
			c.scale(1, 0.66);
			c.rotate(a + Math.PI);
			c.beginPath();
			c.arc(0, 0, r * 0.125, 0.65, TAU - 0.65);
			c.strokeStyle = "rgb(0 0 0 / 0.98)";
			c.lineWidth = r * 0.065;
			c.stroke();
			c.restore();
		}
		c.restore();
		// Crisp dome edge and the scalloped velarium below it.
		dome(c, r, h);
		c.strokeStyle = "rgb(0 0 0 / 0.52)";
		c.lineWidth = 2.4;
		c.stroke();
		c.beginPath();
		for (let j = 0; j <= 96; j++) {
			const a = (j / 96) * Math.PI;
			const x = r * Math.cos(a);
			const y = Math.sin(a) * r * 0.17 + 1.8 * Math.sin(a * 16);
			if (j === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.strokeStyle = "rgb(0 0 0 / 0.9)";
		c.lineWidth = 3;
		c.stroke();
		c.restore();
	}
};
