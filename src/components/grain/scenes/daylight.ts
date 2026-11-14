import type { Scene } from "../engine";

const TAU = Math.PI * 2;
const noise = (n: number) => {
	const v = Math.sin(n * 127.1 + 91.7) * 43758.5453;
	return v - Math.floor(v);
};
let surface: HTMLCanvasElement | undefined;

/** Window projections, interrupted by foliage outside the room. All positions
 * derive from time; the transparent working surface isolates shadow erasure. */
export const daylight: Scene = ({ dither: target }, { W, H, t, dark }) => {
	if (!surface) surface = document.createElement("canvas");
	const width = Math.ceil(W / 2),
		height = Math.ceil(H / 2);
	if (surface.width !== width || surface.height !== height) {
		surface.width = width;
		surface.height = height;
	}
	const c = surface.getContext("2d");
	if (!c) return;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.clearRect(0, 0, width, height);
	c.scale(width / W, height / H);
	// A single offscreen window fans down and left. Its two unequal panes
	// share perspective and a narrow mullion, without a horizontal entrance.
	const gold = dark ? "184,175,130" : "183,130,57";
	const pale = dark ? "228,210,163" : "229,178,91";
	for (let band = 0; band < 150; band++) {
		const u = (band + 0.5) / 150;
		const edge = Math.pow(Math.sin(Math.PI * u), 0.65);
		const mullion = 1 - 0.91 * Math.exp(-Math.pow((u - 0.32) / 0.014, 2));
		const glint = Math.exp(-Math.pow((u - 0.075) / 0.025, 2));
		c.fillStyle = `rgba(${band % 11 < 3 ? pale : gold},${(0.22 * edge + 0.15 * glint) * mullion})`;
		c.beginPath();
		c.moveTo(W * (1.03 + u * 0.22), -H * 0.12);
		c.lineTo(W * (1.03 + (u + 1 / 150) * 0.22), -H * 0.12);
		c.lineTo(W * (-0.32 + (u + 1 / 150) * 1.25), H * 1.24);
		c.lineTo(W * (-0.32 + u * 1.25), H * 1.24);
		c.closePath();
		c.fill();
	}
	c.globalCompositeOperation = "destination-out";
	// Cast branches run across the beam, not along it. Different projection
	// depths have different penumbras, built from translucent expanded contours.
	for (let branch = 0; branch < 3; branch++) {
		const phase = branch * 1.83;
		const wind =
			Math.sin(t * 0.23 + phase) * 19 + Math.sin(t * 0.51 + phase) * 5;
		const bx = W * [0.96, 0.78, 0.45][branch] + wind;
		const by = H * [0.31, 0.68, 0.99][branch];
		c.save();
		c.translate(bx, by);
		c.rotate(-0.92 + Math.sin(t * 0.17 + phase) * 0.055);
		for (let soft = 4; soft >= 0; soft--) {
			c.strokeStyle = `rgba(0,0,0,${soft === 0 ? 0.67 : 0.11})`;
			c.lineWidth = 2.6 + soft * (branch % 2 ? 3.5 : 1.2);
			c.beginPath();
			c.moveTo(-190, 10);
			c.bezierCurveTo(-50, -20, 90, 16, 270, -35);
			c.stroke();
			for (let leaf = 0; leaf < 9; leaf++) {
				const x = -160 + leaf * 48;
				const side = leaf % 2 ? 1 : -1;
				const flutter = Math.sin(t * 0.39 + leaf * 0.8 + phase);
				c.save();
				c.translate(x, -leaf * 3);
				c.rotate(side * (0.68 + flutter * 0.07));
				const length = 76 + noise(leaf + branch * 12) * 43;
				const breadth = 22 + soft * (branch % 2 ? 3 : 1);
				c.fillStyle = `rgba(0,0,0,${soft === 0 ? 0.78 : 0.1})`;
				c.beginPath();
				c.moveTo(0, 0);
				c.bezierCurveTo(
					length * 0.35,
					-breadth,
					length * 0.8,
					-breadth,
					length,
					0,
				);
				c.bezierCurveTo(length * 0.65, breadth, length * 0.22, breadth, 0, 0);
				c.fill();
				c.restore();
			}
		}
		c.restore();
	}
	// Dust occupies the surviving light, so no particle escapes into shadow.
	c.globalCompositeOperation = "source-atop";
	for (let i = 0; i < 70; i++) {
		const x = noise(i * 3) * W + Math.sin(t * 0.12 + i) * 13;
		const y = noise(i * 3 + 1) * H + Math.sin(t * 0.16 + i * 2) * 17;
		c.fillStyle = `rgba(${pale},${0.18 + 0.24 * (0.5 + 0.5 * Math.sin(t * 0.4 + i))})`;
		c.beginPath();
		c.ellipse(x, y, 0.8 + noise(i + 72), 1.6, -0.4, 0, TAU);
		c.fill();
	}
	c.globalCompositeOperation = "source-over";
	target.drawImage(surface, 0, 0, W, H);
};
