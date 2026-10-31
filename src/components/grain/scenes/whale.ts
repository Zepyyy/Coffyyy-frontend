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
	[0, -42],
	[0.025, -46],
	[0.1, -48],
	[0.19, -51],
	[0.27, -74],
	[0.36, -86],
	[0.46, -83],
	[0.59, -61],
	[0.67, -55],
	[0.705, -77],
	[0.73, -47],
	[0.83, -25],
	[0.94, -14],
	[1, -12],
];
const BELLY: Table = [
	[0, -42],
	[0.005, -12],
	[0.025, 39],
	[0.075, 104],
	[0.16, 145],
	[0.28, 158],
	[0.38, 163],
	[0.48, 137],
	[0.61, 81],
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
	appendagesOnly = false,
	family: "shoulder" | "chin" | null = null,
) {
	const scale = length / 1000;
	const width = Math.max(2.5, 1.8 / scale);
	const lag = calf ? 1.7 : 0;
	const bend = (q: number) => {
		const grow = Math.max(0, (q - 0.34) / 0.66);
		return 36 * grow * grow * Math.sin(t * 0.6 - q * 3.5 - lag);
	};
	const point = (px: number, py: number): Point => [
		calf && px < -280 ? -280 + (px + 280) * 0.78 : px,
		py * (calf ? 1.1 : 1) + bend(-px / 1000),
	];
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

	if (!appendagesOnly) {
		// Halftone paper is transparent; the animal still occludes its far appendages.
		c.save();
		c.globalCompositeOperation = "destination-out";
		body();
		c.fillStyle = "#000";
		c.fill();
		c.restore();
		if (calf) {
			c.save();
			c.globalCompositeOperation = "destination-out";
			body(true);
			c.strokeStyle = "#000";
			c.lineWidth = width * 2.6;
			c.stroke();
			c.restore();
		}

		body();
		const skin = c.createLinearGradient(0, -110, -40, 145);
		skin.addColorStop(0, ink(calf ? 0.14 : 0.4));
		skin.addColorStop(0.34, ink(calf ? 0.09 : 0.23));
		skin.addColorStop(0.68, ink(calf ? 0.02 : 0.055));
		skin.addColorStop(1, ink(calf ? 0.07 : 0.2));
		c.fillStyle = skin;
		c.fill();
		c.save();
		body();
		c.clip();

		const pale = c.createLinearGradient(-120, -50, -180, 160);
		pale.addColorStop(0, dark ? "rgb(162 177 212 / 0)" : "rgb(83 108 161 / 0)");
		pale.addColorStop(
			0.28,
			dark ? "rgb(162 177 212 / 0.12)" : "rgb(83 108 161 / 0.10)",
		);
		pale.addColorStop(
			0.58,
			dark ? "rgb(177 187 208 / 0.58)" : "rgb(112 127 163 / 0.50)",
		);
		pale.addColorStop(
			1,
			dark ? "rgb(214 202 169 / 0.7)" : "rgb(166 148 110 / 0.55)",
		);
		c.save();
		if (calf) c.globalAlpha = 0.38;
		c.fillStyle = pale;
		c.fillRect(-1000, -120, 1000, 320);
		c.restore();

		// Uneven islands of dark skin break into the countershaded throat.
		for (let j = 0; j < (calf ? 11 : 36); j++) {
			const q = 0.035 + j * (calf ? 0.078 : 0.025);
			const px = -q * 1000;
			const top = curve(BACK, q);
			const depth = curve(BELLY, q) - top;
			const py = top + depth * (0.34 + 0.18 * Math.sin(j * 1.71));
			const r = 9 + 12 * Math.sin(j * 2.3) ** 2;
			c.beginPath();
			move(px + r, py);
			bezier(px + r * 0.7, py - 10, px - r * 0.6, py - r * 0.8, px - r, py - 3);
			bezier(px - r * 1.4, py + 6, px - 3, py + 13, px + r, py);
			c.fillStyle = ink(0.12 + 0.15 * Math.sin(j * 3.1) ** 2);
			c.fill();
		}

		for (let j = 0; j < (calf ? 4 : 14); j++) {
			const q = 0.08 + j * (calf ? 0.19 : 0.056) + 0.009 * Math.sin(j * 2.3);
			const px = -q * 1000;
			const top = curve(BACK, q);
			const py =
				top + (curve(BELLY, q) - top) * (0.2 + 0.27 * Math.sin(j * 1.3) ** 2);
			c.beginPath();
			move(px + 12, py - 3);
			bezier(px - 3, py - 17, px - 22, py - 8, px - 28, py + 3);
			bezier(px - 16, py + 12, px + 6, py + 8, px + 12, py - 3);
			c.fillStyle = dark
				? "rgb(174 187 203 / 0.26)"
				: "rgb(126 143 169 / 0.22)";
			c.fill();
		}

		// Broken meridians bow around the flank; their spacing survives the dot lattice.
		const step = Math.max(15, 8 / scale);
		for (let px = 24; px < 990; px += step) {
			const q = px / 1000;
			const top = curve(BACK, q);
			const depth = curve(BELLY, q) - top;
			const start = 0.04 + 0.035 * (1 + Math.sin(px * 0.039));
			const end = 0.35 + 0.22 * Math.sin(px * 0.029) ** 2;
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
			c.strokeStyle = ink((calf ? 0.38 : 0.6) + 0.1 * Math.sin(q * Math.PI));
			c.stroke();
		}
		for (let j = 0; j < (calf ? 3 : 7); j++) {
			c.beginPath();
			move(-286 - j * 14, -60 - j * 3);
			bezier(-421, -90 - j * 2, -555, -44 - j * 4, -705, -17 - j * 5);
			bezier(-792, -9 - j * 4, -874, -8 - j * 2, -1005, -3 - j * 2);
			c.strokeStyle = ink(j % 2 ? 0.42 : 0.27);
			c.lineWidth = width;
			c.stroke();
		}

		if (!calf) {
			const scars = [
				[0.14, 0.29, 17, -9],
				[0.34, 0.23, 23, 7],
				[0.36, 0.29, 15, 4],
				[0.49, 0.48, 34, -11],
				[0.53, 0.51, 19, -6],
				[0.63, 0.28, 27, 12],
				[0.71, 0.37, 16, 8],
				[0.74, 0.48, 32, 5],
				[0.84, 0.43, 21, 3],
			];
			for (const [q, v, reach, lift] of scars) {
				const px = -q * 1000;
				const top = curve(BACK, q);
				const py = top + (curve(BELLY, q) - top) * v;
				c.save();
				c.globalCompositeOperation = "destination-out";
				c.beginPath();
				move(px + 3, py);
				bezier(
					px - reach * 0.3,
					py - 2,
					px - reach * 0.6,
					py + lift,
					px - reach,
					py + lift,
				);
				c.strokeStyle = "#000";
				c.lineWidth = 3.8;
				c.stroke();
				c.restore();
				if (dark) {
					c.strokeStyle = "rgb(207 205 189 / 0.72)";
					c.lineWidth = 3.8;
					c.stroke();
				}
			}
		}

		// Throat grooves fan from the chin to the navel and wrap out of sight below.
		const grooves = calf ? 5 : 11;
		for (let j = 0; j < grooves; j++) {
			const v = j / (grooves - 1);
			c.beginPath();
			move(-8 - v * 63, -21 + v * 106);
			bezier(
				-95 - v * 42,
				40 + v * 119,
				-257 - v * 47,
				79 + v * 95,
				-461 - v * 90,
				69 + v * 30,
			);
			c.strokeStyle = ink(0.68);
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
		c.strokeStyle = ink(calf ? 0.94 : 0.72);
		c.lineWidth = width;
		c.stroke();
	}

	// A taller shelf leaves only the lower stage; the calf then shelters at the chin.
	if (family === "shoulder") animal(c, -330, -85, 350, t - 1.9, dark, true);
	if (family === "chin") animal(c, -100, 130, 250, t - 1.9, dark, true);

	// The near pectoral hangs from the shoulder; its tip lags the body's stroke.
	c.save();
	c.translate(-287, 52);
	c.rotate(0.07 * Math.sin(t * 0.39 - 1.2 - lag));
	const finPoint = (u: number, edge: number): Point => {
		const half = 31 * Math.sin(Math.PI * (0.07 + 0.93 * u)) ** 0.8;
		const scallop = edge > 0 ? 1 + 0.26 * Math.sin(u * Math.PI * 15) : 0.72;
		return [
			-326 * u + edge * 0.44 * half * scallop,
			125 * u + 13 * Math.sin(Math.PI * u) + edge * 0.9 * half * scallop,
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
		c.quadraticCurveTo(-326 * u - 9, 125 * u + 7, ...b);
		c.strokeStyle = ink(0.53);
		c.lineWidth = width;
		c.stroke();
	}
	c.beginPath();
	c.moveTo(-4, 2);
	c.quadraticCurveTo(-139, 59, -316, 123);
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

	if (!appendagesOnly) {
		// The flat rostrum is a thin plate above the great bowed lower jaw.
		c.beginPath();
		move(-2, -37);
		bezier(-65, -35, -126, -34, -182, -32);
		bezier(-212, -31, -221, 27, -257, 31);
		c.strokeStyle = ink(0.98);
		c.lineWidth = width * 1.4;
		c.stroke();
		c.beginPath();
		move(-9, -25);
		bezier(-75, -24, -135, -23, -180, -20);
		bezier(-208, -18, -216, 38, -253, 40);
		c.strokeStyle = ink(0.45);
		c.lineWidth = width;
		c.stroke();

		// A quiet patch of skin lets the pupil and heavy lid survive the lattice.
		c.save();
		c.globalCompositeOperation = "destination-out";
		c.beginPath();
		c.ellipse(-268, 11, calf ? 18 : 11, calf ? 13 : 8, -0.12, 0, TAU);
		c.fillStyle = "#000";
		c.fill();
		c.restore();
		c.beginPath();
		c.ellipse(-268, 12, calf ? 12 : 6.4, calf ? 9 : 5.1, -0.1, 0, TAU);
		c.fillStyle = dark ? "rgb(205 201 185 / 0.78)" : ink(0.14);
		c.fill();
		c.save();
		if (dark) c.globalCompositeOperation = "destination-out";
		c.beginPath();
		c.ellipse(-268, 12, calf ? 8 : 4.1, calf ? 6 : 3.1, -0.1, 0, TAU);
		c.fillStyle = "#000";
		c.fill();
		c.restore();
		c.beginPath();
		move(-282, 13);
		bezier(-282, 1, -265, -2, -254, 9);
		move(-287, 1);
		bezier(-279, -11, -261, -12, -248, 0);
		c.strokeStyle = ink(0.88);
		c.lineWidth = width;
		c.stroke();
		c.beginPath();
		move(-291, 21);
		bezier(-300, 31, -303, 45, -300, 55);
		c.strokeStyle = ink(0.42);
		c.stroke();

		for (let j = 0; j < (calf ? 3 : 5); j++) {
			const px = -24 - j * (calf ? 56 : 33);
			c.beginPath();
			c.ellipse(px, -24 + j * 0.7, calf ? 7 : 5.8, calf ? 6 : 4, -0.1, 0, TAU);
			c.fillStyle = dark ? "rgb(170 176 190 / 0.66)" : ink(0.35);
			c.fill();
			c.strokeStyle = ink(0.72);
			c.lineWidth = width;
			c.stroke();
		}

		if (!calf) {
			for (let row = 0; row < 2; row++) {
				for (let j = 0; j < 6 - row; j++) {
					const q = 0.017 + j * 0.03 + row * 0.014 + 0.003 * Math.sin(j * 2.6);
					const px = -q * 1000;
					const py = curve(BACK, q) + row * (21 + 6 * Math.sin(j * 1.9)) - 1;
					c.beginPath();
					c.ellipse(px, py, 5.6 + j * 0.18, 5, -0.24, 0, TAU);
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
				const py =
					curve(BELLY, -px / 1000) - 3 - row * 8 + 3 * Math.sin(j * 2.3);
				barnacle(c, px, py, 4.5 + 2.5 * Math.sin(j * 1.7) ** 2, dark);
			}
			c.beginPath();
			move(-235, -63);
			bezier(-243, -69, -256, -72, -266, -69);
			c.strokeStyle = ink(0.85);
			c.lineWidth = width * 1.2;
			c.stroke();
		}
	}

	c.restore();
}

export const whale: Scene = ({ dither: c }, { t, W, H, dark, anchors }) => {
	const phone = W < 700;
	const L = phone ? 390 : Math.min(950, Math.max(700, W * 0.64));
	const start = -10;
	const end = W + L * 1.2 + 10;
	const cycle = end - start + QUIET * SPEED;
	const shelf = anchors.shelf;
	const crowded = shelf && shelf.y + shelf.h > H - 230;
	const stillX = phone ? W * 0.9 : W * (crowded ? 0.98 : 0.84);
	const x = start + mod((t - 30) * SPEED + stillX - start, cycle);
	if (x > end) return;
	const contentBottom = anchors.content
		? anchors.content.y + anchors.content.h
		: 300;
	const y = phone
		? contentBottom + 254
		: H - 165 + 8 * Math.sin(((x - stillX) / (W + L)) * Math.PI);
	c.save();
	if (!phone && shelf) {
		// The transparent Add bean tile must stay as quiet as the frosted cards.
		c.beginPath();
		c.rect(0, 0, W, H);
		c.rect(shelf.x, shelf.y, shelf.w, shelf.h);
		c.clip("evenodd");
	}
	if (phone) {
		// There is no portrait-height gap. Only appendages emerge between cards.
		const shelfTop = anchors.shelf?.y ?? contentBottom + 100;
		c.beginPath();
		c.rect(0, shelfTop + 83, W, Math.max(0, H - shelfTop - 83));
		c.clip();
	}
	animal(
		c,
		x,
		y,
		L,
		t,
		dark,
		false,
		phone,
		phone ? null : crowded ? "chin" : "shoulder",
	);
	// A small wake remembers the head's earlier position, rather than orbiting it.
	for (let j = 0; j < (phone ? 0 : 9); j++) {
		const age = 1.8 + j * 0.85;
		const bx = x - L * 0.08 - age * SPEED + 5 * Math.sin(t * 0.2 + j);
		const by = y - L * 0.095 - age * 10 + 4 * Math.sin(j * 2.1);
		c.beginPath();
		c.arc(bx, by, 2.1 + (j % 3) * 0.9, 0.3, TAU - 0.45);
		c.strokeStyle = ink(0.28 - j * 0.016);
		c.lineWidth = 1.8;
		c.stroke();
	}

	c.restore();
};
