import type { Scene } from "../engine";

const TAU = Math.PI * 2;
const SPEED = 22;
const QUIET = 25;
const mod = (n: number, d: number) => ((n % d) + d) % d;
const ink = (a: number) => `rgb(0 0 0 / ${a})`;
type C = CanvasRenderingContext2D;
type Point = [number, number];
type Table = ReadonlyArray<readonly [number, number]>;

function curve(table: Table, q: number) {
	if (q <= table[0][0]) return table[0][1];
	const last = table.length - 1;
	if (q >= table[last][0]) return table[last][1];
	let i = 0;
	while (table[i + 1][0] < q) i++;
	const slope = (k: number) => {
		const a = table[Math.max(0, k - 1)];
		const b = table[Math.min(last, k + 1)];
		return (b[1] - a[1]) / (b[0] - a[0]);
	};
	const [x0, y0] = table[i];
	const [x1, y1] = table[i + 1];
	const h = x1 - x0;
	const u = (q - x0) / h;
	return (
		(2 * u ** 3 - 3 * u ** 2 + 1) * y0 +
		(u ** 3 - 2 * u ** 2 + u) * slope(i) * h +
		(-2 * u ** 3 + 3 * u ** 2) * y1 +
		(u ** 3 - u ** 2) * slope(i + 1) * h
	);
}

// The low rostrum, deep throat and narrow caudal stock are separate volumes.
const BACK: Table = [
	[0, -20],
	[0.012, -35],
	[0.035, -51],
	[0.12, -79],
	[0.27, -103],
	[0.43, -94],
	[0.59, -65],
	[0.67, -59],
	[0.705, -83],
	[0.73, -51],
	[0.83, -25],
	[0.94, -14],
	[1, -12],
];
const BELLY: Table = [
	[0, -20],
	[0.012, 8],
	[0.025, 27],
	[0.085, 78],
	[0.19, 121],
	[0.32, 141],
	[0.47, 119],
	[0.61, 78],
	[0.77, 37],
	[0.9, 18],
	[1, 12],
];

const PROFILE = Array.from({ length: 121 }, (_, j) => ({
	x: (-j / 120) * 1000,
	back: curve(BACK, j / 120),
	belly: curve(BELLY, j / 120),
}));

function barnacle(c: C, x: number, y: number, r: number, dark: boolean) {
	c.beginPath();
	for (let j = 0; j <= 8; j++) {
		const a = (j / 8) * TAU;
		const radius = r * (j % 2 ? 0.84 : 1);
		const px = x + Math.cos(a) * radius;
		const py = y + Math.sin(a) * radius * 0.8;
		if (j === 0) c.moveTo(px, py);
		else c.lineTo(px, py);
	}
	c.fillStyle = dark ? "#c2b99e" : "#ab9f88";
	c.fill();
	c.strokeStyle = ink(0.8);
	c.lineWidth = 2;
	c.stroke();
	c.beginPath();
	c.ellipse(x, y, r * 0.35, r * 0.26, -0.4, 0, TAU);
	c.fillStyle = ink(0.88);
	c.fill();
	c.beginPath();
	for (let j = 0; j < 3; j++) {
		const a = (j * TAU) / 3 + 0.3;
		c.moveTo(x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.3);
		c.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.65);
	}
	c.strokeStyle = ink(0.56);
	c.lineWidth = 1.8;
	c.stroke();
}

function animal(
	c: C,
	x: number,
	y: number,
	length: number,
	t: number,
	dark: boolean,
	calf = false,
) {
	const scale = length / 1000;
	const width = Math.max(2.5, 1.8 / scale);
	const lag = calf ? 1.7 : 0;
	const bend = (q: number) => {
		const grow = Math.max(0, (q - 0.34) / 0.66);
		return 36 * grow * grow * Math.sin(t * 0.6 - q * 3.5 - lag);
	};
	const point = (px: number, py: number): Point => [px, py + bend(-px / 1000)];
	const move = (px: number, py: number) => c.moveTo(...point(px, py));
	const line = (px: number, py: number) => c.lineTo(...point(px, py));
	const bezier = (
		a: number,
		b: number,
		d: number,
		e: number,
		f: number,
		g: number,
	) => c.bezierCurveTo(...point(a, b), ...point(d, e), ...point(f, g));
	const body = (outline = false) => {
		c.beginPath();
		for (let j = 0; j < PROFILE.length; j++) {
			const p = PROFILE[j];
			if (!j) move(p.x, p.back);
			else line(p.x, p.back);
		}
		for (let j = PROFILE.length - 1; j >= 0; j--) {
			const p = PROFILE[j];
			if (outline && j === PROFILE.length - 1) move(p.x, p.belly);
			else line(p.x, p.belly);
		}
		if (!outline) c.closePath();
	};
	const underside = () => {
		c.beginPath();
		move(0, -18);
		bezier(-84, -4, -163, 29, -239, 30);
		bezier(-336, 17, -376, 47, -453, 53);
		bezier(-530, 48, -553, 78, -635, 65);
		bezier(-735, 39, -815, 34, -950, 14);
		line(-1000, 12);
		for (let j = PROFILE.length - 1; j >= 0; j--)
			line(PROFILE[j].x, PROFILE[j].belly);
		c.closePath();
	};
	c.save();
	c.translate(x, y);
	c.scale(scale, scale);
	c.lineCap = "round";
	c.lineJoin = "round";

	// The far pectoral is foreshortened, visible beyond the rolled shoulder.
	c.save();
	c.translate(-300, 0);
	c.rotate(0.06 * Math.sin(t * 0.38 - 0.8));
	c.beginPath();
	c.moveTo(0, 27);
	c.bezierCurveTo(-50, -31, -93, -101, -152, -153);
	c.bezierCurveTo(-170, -164, -174, -154, -157, -139);
	c.bezierCurveTo(-112, -86, -39, -44, -26, 14);
	c.closePath();
	c.fillStyle = ink(0.2);
	c.fill();
	c.strokeStyle = ink(0.62);
	c.lineWidth = width;
	c.stroke();
	for (let j = 0; j < 12; j++) {
		c.beginPath();
		c.moveTo(-17 - j * 11, -14 - j * 10);
		c.quadraticCurveTo(-30 - j * 11, -14 - j * 11, -41 - j * 10, -31 - j * 10);
		c.strokeStyle = ink(0.4);
		c.stroke();
	}
	c.restore();

	// A rolled fluke: unequal projected lobes, a deep notch and ragged trailing edges.
	const fluke = () => {
		c.beginPath();
		move(-978, -7);
		bezier(-1001, -32, -1007, -128, -1158, -143);
		bezier(-1144, -115, -1120, -86, -1121, -74);
		for (let j = 0; j <= 11; j++) {
			const u = j / 11;
			line(-1121 + u * 56, -74 + u * 84 + (j % 2 ? 5 : 0));
		}
		line(-1082, 35);
		for (let j = 0; j <= 13; j++) {
			const u = j / 13;
			line(-1082 - u * 101, 35 + u * 119 + (j % 2 ? -7 : 0));
		}
		bezier(-1046, 161, -1011, 55, -978, 9);
		c.closePath();
	};
	fluke();
	const tailTone = c.createLinearGradient(-1040, -140, -1150, 165);
	tailTone.addColorStop(0, ink(0.45));
	tailTone.addColorStop(0.48, ink(0.12));
	tailTone.addColorStop(1, ink(0.26));
	c.fillStyle = tailTone;
	c.fill();
	c.strokeStyle = ink(0.78);
	c.lineWidth = width;
	c.stroke();
	c.save();
	fluke();
	c.clip();
	for (let side = -1; side <= 1; side += 2) {
		for (let j = 0; j < 14; j++) {
			const u = j / 14;
			c.beginPath();
			move(-992 - u * 158, side * (15 + u * 110));
			bezier(
				-1030 - u * 120,
				side * (8 + u * 90),
				-1055 - u * 96,
				side * (12 + u * 95),
				-1070 - u * 115,
				side * (25 + u * 135),
			);
			c.strokeStyle = ink(0.56);
			c.lineWidth = width;
			c.stroke();
		}
	}
	c.restore();

	// Halftone paper is transparent; the animal still occludes its far appendages.
	c.save();
	c.globalCompositeOperation = "destination-out";
	body();
	c.fillStyle = "#000";
	c.fill();
	c.restore();
	body();
	const skin = c.createLinearGradient(0, -110, -40, 145);
	skin.addColorStop(0, ink(0.4));
	skin.addColorStop(0.34, ink(0.23));
	skin.addColorStop(0.68, ink(0.055));
	skin.addColorStop(1, ink(0.2));
	c.fillStyle = skin;
	c.fill();
	c.save();
	body();
	c.clip();

	// Broken meridians bow around the flank; their spacing survives the dot lattice.
	const step = Math.max(15, 8 / scale);
	for (let px = 24; px < 990; px += step) {
		const q = px / 1000;
		const top = curve(BACK, q);
		const depth = curve(BELLY, q) - top;
		const start = 0.04 + 0.035 * (1 + Math.sin(px * 0.039));
		const end = 0.36 + 0.19 * Math.sin(px * 0.029) ** 2;
		c.beginPath();
		for (let k = 0; k <= 16; k++) {
			const v = start + ((end - start) * k) / 16;
			const bow = Math.sin(v * Math.PI) * 39 * Math.sin(q * Math.PI) ** 0.65;
			const xx = -px - bow;
			const yy = top + depth * v;
			if (!k) move(xx, yy);
			else line(xx, yy);
		}
		c.lineWidth = width;
		c.strokeStyle = ink(0.64 + 0.1 * Math.sin(q * Math.PI));
		c.stroke();
		c.beginPath();
		move(-px - 18, top + 4);
		bezier(
			-px - 2,
			top + depth * 0.08,
			-px + 8,
			top + depth * 0.16,
			-px + 16,
			top + depth * 0.3,
		);
		c.strokeStyle = ink(0.27);
		c.stroke();
	}
	for (let j = 0; j < 9; j++) {
		c.beginPath();
		move(-68, -34 - j * 6);
		bezier(-247, -72 - j * 5, -484, -56 - j * 8, -664, -18 - j * 7);
		bezier(-762, -6 - j * 5, -863, -7 - j * 3, -1005, -3 - j * 2);
		c.strokeStyle = ink(j % 2 ? 0.48 : 0.3);
		c.lineWidth = width;
		c.stroke();
	}

	underside();
	const pale = c.createLinearGradient(-150, -10, -290, 145);
	pale.addColorStop(
		0,
		dark ? "rgb(162 177 212 / 0.72)" : "rgb(83 108 161 / 0.7)",
	);
	pale.addColorStop(
		0.5,
		dark ? "rgb(177 187 208 / 0.62)" : "rgb(112 127 163 / 0.6)",
	);
	pale.addColorStop(
		1,
		dark ? "rgb(214 202 169 / 0.65)" : "rgb(166 148 110 / 0.5)",
	);
	c.fillStyle = pale;
	c.fill();

	// Throat grooves fan from the chin to the navel and wrap out of sight below.
	const grooves = calf ? 6 : 12;
	for (let j = 0; j < grooves; j++) {
		const v = (j * 11) / (grooves - 1);
		c.beginPath();
		move(-16 - v * 4, -5 + v * 4);
		bezier(
			-119 - v * 7,
			26 + v * 8.2,
			-326 - v * 8.5,
			63 + v * 6.7,
			-542 - v * 7.4,
			63 + v * 1.05,
		);
		c.strokeStyle = ink(0.72);
		c.lineWidth = width;
		c.stroke();
	}
	if (!calf) {
		for (let j = 0; j < 3; j++) {
			c.beginPath();
			move(-402 - j * 16, -17);
			bezier(-417 - j * 16, -9, -427 - j * 16, 2, -434 - j * 16, 17);
			c.lineWidth = width * 0.8;
			c.strokeStyle = ink(0.5);
			c.stroke();
		}
	}
	c.restore();
	body(true);
	c.strokeStyle = ink(0.72);
	c.lineWidth = width;
	c.stroke();

	// The near pectoral hangs from the shoulder; its tip lags the body's stroke.
	c.save();
	c.translate(-287, 52);
	c.rotate(0.07 * Math.sin(t * 0.39 - 1.2 - lag));
	const finPoint = (u: number, edge: number): Point => {
		const half = 31 * Math.sin(Math.PI * (0.07 + 0.93 * u)) ** 0.8;
		const scallop = edge > 0 ? 1 + 0.26 * Math.sin(u * Math.PI * 15) : 0.72;
		return [
			-326 * u + edge * 0.44 * half * scallop,
			151 * u + 13 * Math.sin(Math.PI * u) + edge * 0.9 * half * scallop,
		];
	};
	const fin = () => {
		c.beginPath();
		for (const edge of [1, -1]) {
			for (let j = 0; j <= 60; j++) {
				const u = edge > 0 ? j / 60 : 1 - j / 60;
				const p = finPoint(u, edge);
				if (!j && edge > 0) c.moveTo(...p);
				else c.lineTo(...p);
			}
		}
		c.closePath();
	};
	c.save();
	c.globalCompositeOperation = "destination-out";
	fin();
	c.fillStyle = "#000";
	c.fill();
	c.restore();
	fin();
	const finTone = c.createLinearGradient(-40, -10, -80, 65);
	finTone.addColorStop(0, ink(0.52));
	finTone.addColorStop(
		0.44,
		dark ? "rgb(159 165 186 / 0.42)" : "rgb(116 127 152 / 0.35)",
	);
	finTone.addColorStop(
		1,
		dark ? "rgb(213 205 182 / 0.55)" : "rgb(168 157 133 / 0.28)",
	);
	c.fillStyle = finTone;
	c.fill();
	c.strokeStyle = ink(0.78);
	c.lineWidth = width;
	c.stroke();
	c.save();
	fin();
	c.clip();
	const finStrokes = calf ? 9 : 27;
	for (let j = 1; j < finStrokes; j++) {
		const u = j / finStrokes;
		const a = finPoint(u, -0.9);
		const b = finPoint(u + 0.04, 0.93);
		c.beginPath();
		c.moveTo(...a);
		c.quadraticCurveTo(-326 * u - 9, 151 * u + 7, ...b);
		c.strokeStyle = ink(0.53);
		c.lineWidth = width;
		c.stroke();
	}
	c.beginPath();
	c.moveTo(-4, 2);
	c.quadraticCurveTo(-139, 70, -316, 148);
	c.strokeStyle = ink(0.42);
	c.stroke();
	c.restore();
	if (!calf) {
		for (let j = 0; j < 6; j++) {
			const p = finPoint(0.12 + j * 0.043, 1);
			barnacle(c, p[0], p[1], 4.3 + 1.2 * Math.sin(j * 2) ** 2, dark);
		}
	}
	c.restore();

	// The jaw is a bowed lip, ending behind a small, hooded eye.
	c.beginPath();
	move(-2, -19);
	bezier(-67, -6, -136, 17, -216, 24);
	bezier(-233, 25, -246, 17, -252, 8);
	c.strokeStyle = ink(0.92);
	c.lineWidth = width * 1.22;
	c.stroke();
	c.beginPath();
	move(-15, -8);
	bezier(-85, 8, -149, 29, -219, 32);
	c.strokeStyle = ink(0.43);
	c.lineWidth = width;
	c.stroke();
	c.save();
	c.globalCompositeOperation = "destination-out";
	c.beginPath();
	c.ellipse(-211, 0, 6.5, 4.2, -0.18, 0, TAU);
	c.fillStyle = "#000";
	c.fill();
	c.restore();
	c.beginPath();
	c.ellipse(-211, 0, 3.3, 2.7, 0, 0, TAU);
	c.fillStyle = ink(0.96);
	c.fill();
	c.beginPath();
	c.moveTo(-223, 1);
	c.bezierCurveTo(-221, -10, -207, -12, -201, -3);
	c.moveTo(-226, -9);
	c.bezierCurveTo(-218, -21, -202, -20, -193, -11);
	c.strokeStyle = ink(0.9);
	c.lineWidth = width;
	c.stroke();
	c.beginPath();
	move(-236, -19);
	bezier(-250, -11, -258, 2, -259, 17);
	move(-245, -29);
	bezier(-268, -15, -275, 11, -268, 33);
	c.strokeStyle = ink(0.47);
	c.stroke();

	if (!calf) {
		for (let row = 0; row < 2; row++) {
			for (let j = 0; j < 7 - row; j++) {
				const q = 0.017 + j * 0.025 + row * 0.014 + 0.003 * Math.sin(j * 2.6);
				const px = -q * 1000;
				const py = curve(BACK, q) + row * (21 + 6 * Math.sin(j * 1.9)) + 2;
				c.beginPath();
				c.ellipse(px, py, 5.1 + j * 0.18, 3.6, -0.24, 0, TAU);
				c.fillStyle = dark
					? "rgb(176 178 183 / 0.65)"
					: "rgb(136 139 144 / 0.4)";
				c.fill();
				c.strokeStyle = ink(0.74);
				c.lineWidth = width * 0.85;
				c.stroke();
				c.beginPath();
				c.arc(px + 1, py, 1.6, 0, TAU);
				c.fillStyle = ink(0.8);
				c.fill();
			}
		}
		for (let j = 0; j < 11; j++) {
			const row = Math.floor(j / 4);
			const px = -46 - (j % 4) * 11 - row * 4;
			const py = curve(BELLY, -px / 1000) - 3 - row * 8 + 3 * Math.sin(j * 2.3);
			barnacle(c, px, py, 4.5 + 2.5 * Math.sin(j * 1.7) ** 2, dark);
		}
		c.beginPath();
		move(-158, -78);
		bezier(-164, -85, -177, -86, -185, -82);
		c.strokeStyle = ink(0.85);
		c.lineWidth = width * 1.2;
		c.stroke();
	}
	c.restore();
}

export const whale: Scene = ({ dither: c }, { t, W, H, dark, anchors }) => {
	const phone = W < 700;
	const L = phone ? 390 : Math.min(950, Math.max(700, W * 0.64));
	const start = -10;
	const end = W + L * 1.2 + 10;
	const cycle = end - start + QUIET * SPEED;
	const margin = Math.max(64, (W - 976) / 2);
	const stillX = phone ? W * 0.86 : W - margin + L * 0.211 + 26;
	const x = start + mod((t - 30) * SPEED + stillX - start, cycle);
	if (x > end) return;
	const contentBottom = anchors.content
		? anchors.content.y + anchors.content.h
		: 230;
	const y = phone
		? contentBottom + 13
		: H - 251 + 10 * Math.sin(((x - stillX) / (W + L)) * Math.PI);
	c.save();
	if (phone) {
		// Only the chin and eye cross the gap; the rest slips beneath the cards.
		const shelfTop = anchors.shelf?.y ?? contentBottom + 138;
		c.beginPath();
		c.rect(0, 0, W, contentBottom + 24);
		c.rect(0, shelfTop, W, Math.max(0, H - shelfTop));
		c.clip();
	}
	const calfL = L * 0.32;
	animal(c, x - L * 0.63, y + L * 0.155, calfL, t - 1.9, dark, true);
	animal(c, x, y, L, t, dark);
	// A small wake remembers the head's earlier position, rather than orbiting it.
	for (let j = 0; j < 9; j++) {
		const age = 1.8 + j * 0.85;
		const bx = x - L * 0.08 - age * SPEED + 5 * Math.sin(t * 0.2 + j);
		const by = y - L * 0.095 - age * 10 + 4 * Math.sin(j * 2.1);
		c.beginPath();
		c.arc(bx, by, 2.1 + (j % 3) * 0.9, 0.3, TAU - 0.45);
		c.strokeStyle = ink(0.28 - j * 0.016);
		c.lineWidth = 1.8;
		c.stroke();
	}
	if (phone) {
		c.globalCompositeOperation = "destination-out";
		const fade = c.createLinearGradient(
			0,
			contentBottom + 14,
			0,
			contentBottom + 24,
		);
		fade.addColorStop(0, "rgb(0 0 0 / 0)");
		fade.addColorStop(1, "#000");
		c.fillStyle = fade;
		c.fillRect(0, contentBottom + 14, W, 10);
	}
	c.restore();
};
