import type { Scene } from "../engine";

type Point = [number, number];
type Fin = "tail" | "dorsal" | "anal";
const TAU = Math.PI * 2;
let tissue: HTMLCanvasElement | undefined;
let tissueContext: CanvasRenderingContext2D | null = null;

function pose(t: number) {
	return {
		x: 18 * Math.sin((t - 30) * 0.095),
		y: 15 * Math.sin((t - 30) * 0.13),
		a: -0.12 + 0.18 * Math.sin((t - 30) * 0.11),
	};
}

function body(c: CanvasRenderingContext2D) {
	c.beginPath();
	c.moveTo(-70, -3);
	c.bezierCurveTo(-62, -13, -52, -26, -30, -26);
	c.bezierCurveTo(0, -27, 25, -12, 54, -8);
	c.lineTo(54, 8);
	c.bezierCurveTo(24, 12, 1, 29, -30, 23);
	c.bezierCurveTo(-49, 22, -58, 11, -66, 5);
	c.quadraticCurveTo(-73, 6, -70, -3);
	c.closePath();
}

export const veil: Scene = ({ dither: target }, { t, W, H, dark }) => {
	if (!tissue) {
		tissue = document.createElement("canvas");
		tissue.width = 200;
		tissue.height = 210;
		tissueContext = tissue.getContext("2d", { willReadFrequently: true });
	}
	const c = tissueContext;
	if (!c) return;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.clearRect(0, 0, 200, 210);
	c.setTransform(0.5, 0, 0, 0.5, 45, 105);
	const phone = W < 600;
	const size = phone ? 0.9 : Math.min(1.12, W / 1280);
	const now = pose(t);
	const baseX = phone ? W - 15 : Math.max(112, (W - 1024) / 2 - 40);
	const baseY = phone ? Math.min(H - 250, 540) : Math.min(H - 205, 690);
	const roast = dark ? "#bba5a9" : "#62505c";
	const rose = dark ? "#c797a6" : "#956473";
	const edge = dark ? "#bdc2dc" : "#8589b0";
	c.save();
	const drift = phone ? 0.1 : 1;
	const turn = phone ? 0.15 : 1;
	const heading = now.a * turn + (phone ? Math.PI / 2 : 0);
	c.lineCap = "round";
	c.lineJoin = "round";

	const history = Array.from({ length: 13 }, (_, k) => {
		const q = k / 12;
		const past = pose(t - q * q * 3.8);
		const a = (past.a - now.a) * turn;
		const dx = ((past.x - now.x) * drift) / size;
		const dy = (past.y - now.y) / size;
		return {
			cos: Math.cos(a),
			sin: Math.sin(a),
			x: dx * Math.cos(heading) + dy * Math.sin(heading),
			y: -dx * Math.sin(heading) + dy * Math.cos(heading),
		};
	});
	// Distal tissue remembers older translation and rotation, even through a turn.
	const point = (kind: Fin, u: number, q: number): Point => {
		const past = history[Math.round(q * 12)];
		let rx: number;
		let ry: number;
		let ex: number;
		let ey: number;
		if (kind === "tail") {
			const a = -1.43 + u * 2.92;
			rx = 51;
			ry = (u - 0.5) * 14;
			const length = 1 + 0.065 * Math.sin(u * 31) + 0.035 * Math.sin(u * 71);
			ex = 61 + Math.cos(a) * 185 * length;
			ey = Math.sin(a) * 151 * length + 12;
		} else {
			const sign = kind === "dorsal" ? -1 : 1;
			rx = (kind === "dorsal" ? -17 : -39) + u * (kind === "dorsal" ? 65 : 87);
			ry = sign * (22 - u * 13);
			ex = rx + 22 + 107 * u;
			ey = sign * (31 + 92 * Math.sin(u * 1.9) ** 0.7) + u * 13;
		}
		const fold = Math.sin(u * 18 - q * 4.2 - t * 0.36);
		const wave =
			q *
			q *
			(kind === "tail" ? 1 : 0.6) *
			(16 * fold + 7 * Math.sin(u * 37 + q * 6 - t * 0.27));
		const x =
			rx +
			(ex - rx) * q +
			wave * 0.8 -
			18 * Math.sin(q * Math.PI) * Math.sin(u * 12 - t * 0.3);
		const y = ry + (ey - ry) * q + wave + 8 * q * Math.sin(q * 5 - t * 0.43);
		return [
			x * past.cos - y * past.sin + past.x,
			x * past.sin + y * past.cos + past.y,
		];
	};

	const fin = (kind: Fin, primaries: number) => {
		const gradient = c.createLinearGradient(
			28,
			0,
			kind === "tail" ? 246 : 145,
			kind === "dorsal" ? -110 : 100,
		);
		gradient.addColorStop(0, roast);
		gradient.addColorStop(0.44, rose);
		gradient.addColorStop(1, edge);
		c.fillStyle = gradient;
		c.strokeStyle = gradient;
		// Separate pleats overlap optically. Their edges share the ray geometry.
		for (let j = 0; j < primaries; j++) {
			c.beginPath();
			for (let side = 0; side < 2; side++) {
				const u = (j + side) / primaries;
				for (let k = 0; k <= 12; k++) {
					const q = side ? 1 - k / 12 : k / 12;
					const [x, y] = point(kind, u, q);
					if (!side && !k) c.moveTo(x, y);
					else c.lineTo(x, y);
				}
			}
			c.closePath();
			c.globalAlpha = 0.16 + 0.17 * (0.5 + 0.5 * Math.sin(j * 0.95 - t * 0.36));
			c.fill();
		}
		// Thirteen caudal trunks split twice: 104 fine distal rays.
		c.beginPath();
		for (let j = 0; j < primaries; j++) {
			for (let branch = 0; branch < (kind === "tail" ? 8 : 4); branch++) {
				for (let k = 0; k <= 12; k++) {
					const q = k / 12;
					const spread = Math.max(0, (q - 0.27) / 0.73);
					const branches = kind === "tail" ? 8 : 4;
					const secondary = (Math.floor(branch / 2) + 0.5) / (branches / 2);
					const tip = (branch + 0.5) / branches;
					const s =
						q < 0.65
							? secondary
							: secondary + ((tip - secondary) * (q - 0.65)) / 0.35;
					const u = (j + 0.5 + (s - 0.5) * spread) / primaries;
					const [x, y] = point(kind, u, q);
					if (!k) c.moveTo(x, y);
					else c.lineTo(x, y);
				}
			}
		}
		c.globalAlpha = 0.58;
		c.lineWidth = 1.8;
		c.stroke();
		c.beginPath();
		for (let j = 0; j <= 180; j++) {
			const [x, y] = point(kind, j / 180, 1);
			if (!j) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.globalAlpha = 0.58;
		c.lineWidth = 2;
		c.stroke();
	};
	fin("dorsal", 10);
	fin("tail", 13);
	fin("anal", 23);
	c.globalAlpha = 1;
	body(c);
	c.fillStyle = dark ? "rgb(166 151 162 / 0.22)" : "rgb(75 61 72 / 0.2)";
	c.fill();
	c.save();
	body(c);
	c.clip();
	// Crescent scales wrap around the flank, shrinking toward the peduncle.
	for (let row = -3; row <= 3; row++) {
		c.beginPath();
		for (let col = 0; col < 13; col++) {
			const x = -40 + col * 7.3 + (row % 2) * 3.6;
			const y = row * 6.6;
			c.moveTo(x + 5.1 * Math.cos(-1.12), y + 4.4 * Math.sin(-1.12));
			c.ellipse(x, y, 5.1, 4.4, 0, -1.12, 1.12);
			c.strokeStyle = roast;
			c.globalAlpha = 0.74 - Math.abs(row) * 0.06;
			c.lineWidth = 2.2;
		}
		c.stroke();
	}
	for (let j = 0; j < 16; j++) {
		c.beginPath();
		c.moveTo(-46 + j * 6, 13);
		c.quadraticCurveTo(-43 + j * 6, 20, -46 + j * 6, 26);
		c.strokeStyle = roast;
		c.globalAlpha = 0.35;
		c.lineWidth = 1.8;
		c.stroke();
	}
	c.restore();
	body(c);
	c.strokeStyle = roast;
	c.lineWidth = 2.4;
	c.stroke();
	// Rounded operculum, upturned mouth, iris and a small paper catchlight.
	c.beginPath();
	c.moveTo(-43, -22);
	c.bezierCurveTo(-22, -13, -28, 14, -43, 20);
	c.moveTo(-68, 3);
	c.lineTo(-56, 2);
	c.stroke();
	c.beginPath();
	c.ellipse(-55, -7, 5.4, 5.8, -0.2, 0, TAU);
	c.fillStyle = edge;
	c.fill();
	c.beginPath();
	c.arc(-56, -7, 3, 0, TAU);
	c.fillStyle = "rgb(0 0 0 / 0.95)";
	c.fill();
	// Paired tapered pelvic streamers and the near-side pectoral fan.
	for (let j = 0; j < 2; j++) {
		c.beginPath();
		c.moveTo(-35 + j * 8, 17);
		c.bezierCurveTo(
			-18 + j * 7,
			48,
			-16,
			77,
			16 + j * 9,
			91 + 7 * Math.sin(t * 0.5),
		);
		c.bezierCurveTo(-5, 59, -16, 25, -29 + j * 8, 16);
		c.fillStyle = rose;
		c.globalAlpha = 0.6;
		c.fill();
	}
	for (let j = 0; j < 9; j++) {
		c.beginPath();
		c.moveTo(-30, 3);
		c.quadraticCurveTo(-4, 9 + j * 2, 2 + 4 * Math.sin(t * 0.7), -7 + j * 4);
		c.strokeStyle = edge;
		c.lineWidth = 1.8;
		c.globalAlpha = 0.5;
		c.stroke();
	}
	c.restore();
	// A bounded tissue plate keeps hundreds of ray strokes out of page readback.
	target.save();
	target.translate(baseX + now.x * drift, baseY + now.y);
	target.scale(size, size);
	target.rotate(heading);
	target.drawImage(tissue, -90, -210, 400, 420);
	target.restore();
};
