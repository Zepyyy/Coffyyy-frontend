import type { Scene } from "../engine";

const N = 760;
// Cached material coordinates and filament strengths; rendering has no history.
const material = Array.from({ length: N + 1 }, (_, i) => {
	const u = i / N;
	return { u, grain: 0.35 + 0.65 * Math.sin(i * 2.399) ** 2 };
});
const ink = (rgb: string, a: number) => `rgb(${rgb} / ${a})`;

function hem(u: number, t: number, W: number, H: number) {
	const phase = u * 15 - t * 0.23;
	return {
		x: W * (-0.22 + 1.44 * u + 0.026 * Math.sin(phase)),
		y:
			H *
			(0.65 -
				0.16 * Math.sin(u * Math.PI) +
				0.13 * Math.sin(u * 9.5 + t * 0.19) +
				0.055 * Math.sin(phase + 0.8 * Math.sin(u * 7 + t * 0.12))),
	};
}

/** A continuous emission hem feeds individually resolved magnetic filaments. */
export const aurora: Scene = ({ dither: c }, { W, H, t, dark }) => {
	const jade = dark ? "53 255 164" : "0 105 65";
	const ice = dark ? "195 255 224" : "0 133 93";
	const violet = dark ? "139 98 255" : "83 28 163";
	c.save();
	c.lineJoin = "round";
	for (let i = 0; i < N; i++) {
		const { u, grain } = material[i];
		const a = hem(u, t, W, H);
		const b = hem(material[i + 1].u, t, W, H);
		const bundle =
			0.25 + 0.75 * Math.sin(u * 39 + 0.8 * Math.sin(u * 17 - t * 0.15)) ** 2;
		const height =
			H *
			(0.16 +
				0.22 * (0.5 + 0.5 * Math.sin(u * 12 - t * 0.16)) +
				0.065 * Math.sin(u * 71 + t * 0.2) ** 2);
		const lean = W * (0.018 * Math.sin(u * 10 + t * 0.12));
		const strength = grain * bundle;
		const gradient = c.createLinearGradient(a.x, a.y, a.x + lean, a.y - height);
		gradient.addColorStop(0, ink(ice, 0.92));
		gradient.addColorStop(0.045, ink(jade, 0.86));
		gradient.addColorStop(0.28, ink(jade, 0.58));
		gradient.addColorStop(0.64, ink(violet, 0.38));
		gradient.addColorStop(1, ink(violet, 0));
		// A trace of connected surface, subordinate to the resolved rays.
		c.globalAlpha = 0.035 * bundle;
		c.fillStyle = gradient;
		c.beginPath();
		c.moveTo(a.x, a.y);
		c.lineTo(b.x, b.y);
		c.lineTo(b.x + lean, b.y - height);
		c.lineTo(a.x + lean, a.y - height);
		c.closePath();
		c.fill();
		c.globalAlpha = 0.38 + 0.62 * strength;
		c.strokeStyle = gradient;
		c.lineWidth = (0.65 + 1.05 * strength) * Math.max(1, W / 1440);
		c.beginPath();
		for (let j = 0; j <= 18; j++) {
			const v = j / 18;
			const x =
				a.x + lean * v + W * 0.003 * Math.sin(u * 32 + v * 3 - t * 0.3) * v;
			const y = a.y - height * v;
			if (j === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.stroke();
		// Short ascending pulses remain attached to their parent field lines.
		const stream = (t * 0.12 + u * 7.3) % 1;
		c.globalAlpha = strength * Math.sin(Math.PI * stream) * 0.4;
		c.strokeStyle = ink(ice, 0.8);
		c.beginPath();
		c.moveTo(a.x + lean * stream, a.y - height * stream);
		c.lineTo(a.x + lean * (stream + 0.045), a.y - height * (stream + 0.045));
		c.stroke();
		c.globalAlpha = 0.68 + 0.25 * bundle;
		c.strokeStyle = ink(ice, 0.95);
		c.lineWidth = 1.5;
		c.beginPath();
		c.moveTo(a.x, a.y);
		c.lineTo(b.x, b.y);
		c.stroke();
	}
	c.restore();
};
