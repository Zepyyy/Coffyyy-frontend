import type { Scene } from "../engine";

const TAU = Math.PI * 2;
const seed = (n: number) => {
	const v = Math.sin(n * 127.1 + 19.7) * 43758.5453;
	return v - Math.floor(v);
};

/** Fixed mineral globe: a spherical terminator slowly uncovers its terrain. */
export const penumbra: Scene = ({ dither: c }, { W, H, t, dark, anchors }) => {
	const phone = W < 640;
	const r = phone ? 30 : Math.min(112, W * 0.085);
	const x = phone
		? W * 0.8
		: Math.max(r + 20, (anchors.frame?.x ?? W * 0.16) - r - 24);
	const shelf = anchors.shelf;
	const y = phone
		? (anchors["shelf-heading"]?.y ?? H * 0.4) - 48
		: Math.min(
				H - r - 100,
				Math.max(490, (shelf ? shelf.y + shelf.h : H * 0.55) + r + 34),
			);
	const lilac = dark ? "181,166,206" : "115,97,143";
	const slate = dark ? "126,146,177" : "79,96,125";
	const copper = dark ? "228,183,145" : "170,111,79";
	const ink = (rgb: string, a: number) => `rgba(${rgb},${a})`;
	// Orthographic projection of a great-circle day/night boundary.
	const phase = 0.36 + 0.17 * Math.sin(t / 73);
	c.save();
	c.translate(x, y);
	c.rotate(0.3);
	c.beginPath();
	c.arc(0, 0, r, 0, TAU);
	c.clip();
	c.fillStyle = ink(slate, 0.09);
	c.fillRect(-r, -r, r * 2, r * 2);
	c.save();
	c.beginPath();
	c.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5);
	c.ellipse(0, 0, r * phase, r, 0, -Math.PI / 2, Math.PI / 2, true);
	c.closePath();
	c.clip();
	c.fillStyle = ink(lilac, dark ? 0.53 : 0.47);
	c.fillRect(-r, -r, r * 2, r * 2);
	// Scattered impact basins, compressed toward the limb; no latitude bands.
	for (let i = 0; i < (phone ? 7 : 28); i++) {
		const lon = -1.35 + seed(i * 4) * 1.4;
		const lat = -1.12 + seed(i * 4 + 1) * 2.24;
		const bx = r * Math.cos(lat) * Math.sin(lon);
		const by = r * Math.sin(lat);
		const size = r * (0.045 + seed(i * 4 + 2) * 0.105);
		const squash = Math.max(0.25, Math.cos(lon));
		c.beginPath();
		c.ellipse(bx, by, size * squash, size, -lat * 0.4, 0, TAU);
		c.fillStyle = ink(slate, 0.3);
		c.fill();
		c.strokeStyle = ink(slate, 0.45);
		c.lineWidth = phone ? 1.8 : 2.5;
		c.stroke();
		c.beginPath();
		c.ellipse(bx, by, size * squash, size, -lat * 0.4, 2.2, 4.8);
		c.strokeStyle = ink(copper, 0.65);
		c.stroke();
	}
	c.restore();
	// Atmosphere stays on the lit limb, inside the silhouette.
	c.beginPath();
	c.arc(0, 0, r - 1.3, 1.72, 4.56);
	c.strokeStyle = ink(copper, 0.66);
	c.lineWidth = phone ? 2.2 : 3;
	c.stroke();
	c.restore();
};
