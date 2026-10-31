import type { Scene } from "../engine";
import { cupJourney, steam } from "./plume";

// A plate has a fixed camera. Only the illumination and the air change.
// Seconds, including milliseconds, avoid a minute/hour boundary in the light.
function sun() {
	const now = new Date();
	const hour =
		now.getHours() +
		now.getMinutes() / 60 +
		now.getSeconds() / 3600 +
		now.getMilliseconds() / 3600000;
	return ((hour - 6) / 24) * Math.PI * 2;
}
const ink = (a: number) => `rgb(0 0 0 / ${a})`;
type C = CanvasRenderingContext2D;
function shape(c: C, points: number[][], tone: number) {
	c.fillStyle = ink(tone);
	c.beginPath();
	points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
	c.closePath();
	c.fill();
}
function ellipse(
	c: C,
	x: number,
	y: number,
	rx: number,
	ry: number,
	tone: number,
	cut = false,
) {
	c.fillStyle = ink(tone);
	c.beginPath();
	c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
	if (cut) {
		c.globalCompositeOperation = "destination-out";
		c.fillStyle = "#000";
		c.fill();
		c.globalCompositeOperation = "source-over";
		c.fillStyle = ink(tone);
	}
	c.fill();
}
function line(c: C, points: number[][], tone = 0.6, width = 2) {
	c.strokeStyle = ink(tone);
	c.lineWidth = width;
	c.beginPath();
	points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
	c.stroke();
}
// Front half of a regular octagon. Depth projects upward, exposing the top.
function facets(
	c: C,
	top: number,
	bottom: number,
	rt: number,
	rb: number,
	light: number,
) {
	const angles = [-Math.PI / 2, -Math.PI / 4, 0, Math.PI / 4, Math.PI / 2];
	for (let i = 0; i < 4; i++) {
		const a = angles[i];
		const b = angles[i + 1];
		const normal = (a + b) / 2;
		const diffuse = Math.max(
			0,
			Math.sin(normal) * Math.cos(light) + Math.cos(normal) * Math.sin(light),
		);
		// Ambient + diffuse, with a small reflected-light contribution at the edge.
		const tone = 0.6 - 0.43 * diffuse - 0.06 * Math.abs(Math.sin(normal));
		shape(
			c,
			[
				[Math.sin(a) * rt, top + Math.cos(a) * rt * 0.18],
				[Math.sin(b) * rt, top + Math.cos(b) * rt * 0.18],
				[Math.sin(b) * rb, bottom + Math.cos(b) * rb * 0.18],
				[Math.sin(a) * rb, bottom + Math.cos(a) * rb * 0.18],
			],
			tone,
		);
	}
}
function cylinder(
	c: C,
	x: number,
	y: number,
	w: number,
	h: number,
	light: number,
	strength = 1,
) {
	// Strip integration of a cylinder normal, rather than a decorative gradient.
	for (let i = 0; i < 32; i++) {
		const u = (i + 0.5) / 16 - 1;
		const diffuse = Math.max(
			0,
			u * Math.cos(light) + Math.sqrt(1 - u * u) * Math.sin(light),
		);
		c.fillStyle = ink((0.61 - diffuse * 0.46 - Math.abs(u) * 0.05) * strength);
		c.fillRect(x + (i * w) / 32, y, w / 32 + 0.3, h);
	}
}
function shadow(c: C, light: number, width: number) {
	// A contact patch and the longer, lighter penumbra; direction follows the sun.
	ellipse(c, -Math.cos(light) * 50, 8, width * 1.3, 13, 0.07);
	ellipse(c, 0, 4, width, 6, 0.16);
}
/** Plates need open margin; below this the journey starts at the cup. */
const PLATE_MIN_WIDTH = 1100;

function plate(
	draw: (c: C, light: number) => void,
	outlet: [number, number],
	size = 1,
): Scene {
	// The plate is still and its light moves by the hour, so one bitmap a minute.
	const bitmap = document.createElement("canvas");
	let bitmapKey = "";
	return (layers, env) => {
		const { W, H } = env;
		if (W < PLATE_MIN_WIDTH) {
			steam(layers, env, cupJourney(env));
			return;
		}
		const scale = Math.min(W / 1100, H / 770, 1.65) * size;
		const x = W * 0.89;
		const y = H - 65;
		const target = layers.dither;
		const m = target.getTransform();
		const key = `${W}x${H}@${m.a}:${Math.floor(Date.now() / 60000)}`;
		if (key !== bitmapKey) {
			bitmapKey = key;
			bitmap.width = target.canvas.width;
			bitmap.height = target.canvas.height;
			const c = bitmap.getContext("2d");
			if (c) {
				c.setTransform(m);
				c.translate(x, y);
				c.scale(scale, scale);
				draw(c, sun());
			}
		}
		target.save();
		target.setTransform(1, 0, 0, 1, 0, 0);
		target.drawImage(bitmap, 0, 0);
		target.restore();
		const ox = x + outlet[0] * scale;
		const oy = y + outlet[1] * scale;
		steam(layers, env, {
			x: ox,
			y: oy,
			dir: -1,
			reach: ox - 20,
			rise: oy - 96,
			climb: 6,
			settle: 40,
		});
	};
}

export const moka = plate(
	(c, light) => {
		shadow(c, light, 86);
		// Bakelite D handle is behind the metal vessel; the hole remains paper.
		c.strokeStyle = ink(0.79);
		c.lineWidth = 18;
		c.lineJoin = "bevel";
		c.beginPath();
		c.moveTo(62, -310);
		c.lineTo(127, -291);
		c.lineTo(119, -202);
		c.lineTo(76, -177);
		c.stroke();
		facets(c, -150, -10, 56, 88, light);
		facets(c, -169, -149, 58, 56, light);
		facets(c, -322, -180, 83, 61, light);
		// Raised pouring lip and eight-sided sloping lid.
		shape(
			c,
			[
				[-78, -317],
				[-112, -342],
				[-99, -286],
				[-74, -266],
			],
			0.48,
		);
		facets(c, -348, -323, 30, 83, light);
		line(
			c,
			[
				[-83, -322],
				[0, -307],
				[83, -322],
			],
			0.61,
			2.2,
		);
		shape(
			c,
			[
				[-16, -350],
				[-12, -367],
				[12, -367],
				[16, -350],
			],
			0.78,
		);
		ellipse(c, -39, -127, 6, 5, 0.66);
		ellipse(c, -40, -128, 2, 2, 0.15, true);
		line(
			c,
			[
				[-86, -9],
				[0, 6],
				[86, -9],
			],
			0.53,
			3,
		);
	},
	[-17, -351],
);

export const v60 = plate(
	(c, light) => {
		shadow(c, light, 85);
		// Server handle, glass neck, and optically thin conical glass body.
		c.strokeStyle = ink(0.38);
		c.lineWidth = 8;
		c.beginPath();
		c.moveTo(48, -170);
		c.bezierCurveTo(136, -192, 137, -73, 79, -71);
		c.stroke();
		c.save();
		c.beginPath();
		c.moveTo(-42, -185);
		c.lineTo(42, -185);
		c.bezierCurveTo(36, -130, 75, -85, 85, -21);
		c.quadraticCurveTo(0, 7, -85, -21);
		c.bezierCurveTo(-75, -85, -36, -130, -42, -185);
		c.closePath();
		c.clip();
		cylinder(c, -90, -190, 180, 200, light, 0.35);
		cylinder(c, -90, -68, 180, 66, light, 0.66);
		ellipse(c, 0, -67, 72, 12, 0.31);
		c.restore();
		line(
			c,
			[
				[-42, -182],
				[-40, -143],
				[-66, -81],
				[-85, -21],
				[-61, -12],
				[61, -12],
				[85, -21],
				[66, -81],
				[40, -143],
				[42, -182],
			],
			0.44,
			2,
		);
		ellipse(c, 0, -186, 57, 10, 0.48);
		// Ceramic V60: 60-degree cone, rolled rim, spiral ribs terminating at throat.
		facets(c, -337, -198, 106, 27, light);
		for (let i = -5; i <= 5; i++) {
			const u = i / 6;
			c.strokeStyle = ink(0.3 + 0.17 * Math.abs(u));
			c.lineWidth = 3;
			c.beginPath();
			c.moveTo(u * 101, -330 + 8 * (1 - u * u));
			c.bezierCurveTo(u * 90 + 8, -278, u * 46 + 10, -237, u * 26, -197);
			c.stroke();
		}
		c.strokeStyle = ink(0.55);
		c.lineWidth = 9;
		c.beginPath();
		c.ellipse(108, -291, 23, 32, 0.3, -1.5, 1.6);
		c.stroke();
		ellipse(c, 0, -338, 107, 18, 0.62);
		ellipse(c, 0, -341, 96, 12, 0.16, true);
		line(
			c,
			[
				[-63, -193],
				[63, -193],
			],
			0.6,
			5,
		);
	},
	[0, -345],
);

export const espresso = plate(
	(c, light) => {
		shadow(c, light, 126);
		// A compact leverless machine in three-quarter orthographic projection.
		shape(
			c,
			[
				[-119, -350],
				[65, -350],
				[105, -321],
				[-78, -321],
			],
			0.19,
		);
		shape(
			c,
			[
				[65, -350],
				[105, -321],
				[105, -24],
				[65, -44],
			],
			0.57 - 0.15 * Math.cos(light),
		);
		cylinder(c, -119, -321, 184, 230, light, 0.8);
		shape(
			c,
			[
				[-109, -259],
				[54, -259],
				[54, -89],
				[-109, -89],
			],
			0.16,
		);
		// Pressure gauge and switch, distinct from the group-head cylinder below.
		ellipse(c, -73, -289, 18, 18, 0.66);
		ellipse(c, -73, -289, 14, 14, 0.08, true);
		line(
			c,
			[
				[-73, -289],
				[-65, -298],
			],
			0.75,
			2,
		);
		for (let i = 0; i < 7; i++) {
			const a = Math.PI * (0.8 + i * 0.23);
			line(
				c,
				[
					[-73 + Math.cos(a) * 11, -289 + Math.sin(a) * 11],
					[-73 + Math.cos(a) * 13, -289 + Math.sin(a) * 13],
				],
				0.5,
				1,
			);
		}
		shape(
			c,
			[
				[15, -299],
				[30, -299],
				[30, -281],
				[15, -281],
			],
			0.7,
		);
		cylinder(c, -69, -259, 89, 30, light);
		ellipse(c, -24, -229, 45, 10, 0.68);
		cylinder(c, -53, -230, 57, 27, light);
		// Portafilter grip and twin spouts.
		line(
			c,
			[
				[-1, -215],
				[84, -200],
			],
			0.78,
			13,
		);
		line(
			c,
			[
				[-39, -201],
				[-39, -188],
				[-31, -184],
			],
			0.65,
			4,
		);
		line(
			c,
			[
				[-13, -201],
				[-13, -188],
				[-21, -184],
			],
			0.65,
			4,
		);
		// Steam wand sweeps into free space, clear of the cup.
		line(
			c,
			[
				[42, -260],
				[64, -241],
				[64, -162],
				[76, -147],
			],
			0.58,
			5,
		);
		ellipse(c, -22, -102, 32, 9, 0.6);
		cylinder(c, -54, -143, 64, 40, light, 0.65);
		ellipse(c, -22, -143, 32, 8, 0.57);
		ellipse(c, -22, -145, 27, 5, 0.2, true);
		c.strokeStyle = ink(0.44);
		c.lineWidth = 4;
		c.beginPath();
		c.ellipse(15, -125, 12, 13, 0, -1.7, 1.7);
		c.stroke();
		shape(
			c,
			[
				[-126, -88],
				[75, -88],
				[105, -60],
				[-99, -60],
			],
			0.25,
		);
		for (let i = 0; i < 15; i++)
			line(
				c,
				[
					[-114 + i * 12, -83],
					[-94 + i * 12, -66],
				],
				0.58,
				2,
			);
		shape(
			c,
			[
				[-99, -59],
				[105, -59],
				[105, -25],
				[-99, -25],
			],
			0.51,
		);
		line(
			c,
			[
				[-85, -24],
				[-85, -9],
				[-62, -9],
			],
			0.75,
			8,
		);
		line(
			c,
			[
				[77, -24],
				[77, -9],
				[97, -9],
			],
			0.75,
			8,
		);
	},
	[76, -148],
	1.05,
);
