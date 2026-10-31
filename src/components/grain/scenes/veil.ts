import type { Box, Scene } from "../engine";

type Point = [number, number];
type Fin = "tail" | "dorsal" | "anal";
const TAU = Math.PI * 2;
const VARIANTS = 2;
const TW = 160;
const TH = 168;
/** Tissue pixel = this many tissue units; small fish need far less detail. */
const TS = 0.5;
/** Fins reach this fraction of their full span: calmer, so the head reads. */
const FIN = 0.6;
const tissues: {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
}[] = [];

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

/** Paint one fish into a tissue plate at its own moment in the swim. */
function paint(
	c: CanvasRenderingContext2D,
	t: number,
	dark: boolean,
	turn: number,
) {
	const size = 0.5;
	const drift = 1;
	const now = pose(t);
	const heading = now.a * turn;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.clearRect(0, 0, TW, TH);
	c.setTransform(TS, 0, 0, TS, 36, 84);
	const roast = dark ? "#bba5a9" : "#62505c";
	const rose = dark ? "#c797a6" : "#956473";
	const edge = dark ? "#bdc2dc" : "#8589b0";
	c.save();
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
			const a = -0.95 + u * 1.9;
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
		const reach = kind === "tail" ? FIN : FIN * 0.72;
		ex = rx + (ex - rx) * reach;
		ey = ry + (ey - ry) * reach;
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
			c.globalAlpha = 0.13 + 0.1 * (0.5 + 0.5 * Math.sin(j * 0.95 - t * 0.36));
			c.fill();
		}
		// Thirteen caudal trunks split twice: 104 fine distal rays.
		c.beginPath();
		for (let j = 0; j < primaries; j++) {
			for (let branch = 0; branch < (kind === "tail" ? 4 : 2); branch++) {
				for (let k = 0; k <= 12; k++) {
					const q = k / 12;
					const spread = Math.max(0, (q - 0.27) / 0.73);
					const branches = kind === "tail" ? 4 : 2;
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
		c.globalAlpha = 0.3;
		c.lineWidth = 1.8;
		c.stroke();
		c.beginPath();
		for (let j = 0; j <= 60; j++) {
			const [x, y] = point(kind, j / 60, 1);
			if (!j) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.globalAlpha = 0.5;
		c.lineWidth = 3.6;
		c.stroke();
	};
	fin("dorsal", 10);
	fin("tail", 13);
	fin("anal", 23);
	c.globalAlpha = 1;
	body(c);
	c.fillStyle = dark ? "rgb(166 151 162 / 0.8)" : "rgb(75 61 72 / 0.8)";
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
	c.lineWidth = 4;
	c.stroke();
	// Rounded operculum, upturned mouth, iris and a small paper catchlight.
	c.beginPath();
	c.moveTo(-43, -22);
	c.bezierCurveTo(-22, -13, -28, 14, -43, 20);
	c.moveTo(-68, 3);
	c.lineTo(-56, 2);
	c.stroke();
	c.beginPath();
	c.ellipse(-55, -7, 11, 11.4, -0.2, 0, TAU);
	c.fillStyle = edge;
	c.fill();
	c.beginPath();
	c.arc(-56, -7, 6.4, 0, TAU);
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
		c.globalAlpha = 0.3;
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
}

type Fish = {
	/** Distance behind the leader along the route, px. */
	lag: number;
	/** Sideways offset from the route, px (+ = right of travel). */
	side: number;
	/** Size relative to the school's unit. */
	scale: number;
	phase: number;
	variant: number;
	alpha: number;
	/** Small heading jitter, radians. */
	yaw: number;
};

// Four loose pairs spread a quarter-cycle apart on the route, so both gutters
// always hold fish. Each fish lags and staggers a little so none read as copies.
const F = (
	lag: number,
	side: number,
	scale: number,
	phase: number,
	variant: number,
	yaw: number,
): Fish => ({ lag, side, scale, phase, variant, alpha: 0.92, yaw });
const GROUPS: { at: number; fish: Fish[] }[] = [
	{ at: 0, fish: [F(0, 0, 1, 0, 0, 0), F(165, 32, 0.92, 9, 1, 0.06)] },
	{
		at: 0.25,
		fish: [F(0, 20, 0.95, 17, 1, -0.05), F(190, -30, 0.9, 26, 0, 0.05)],
	},
	{
		at: 0.5,
		fish: [F(0, -10, 0.97, 33, 0, -0.04), F(175, 36, 0.9, 5, 1, 0.05)],
	},
	{
		at: 0.75,
		fish: [F(0, 24, 0.93, 12, 1, 0.04), F(180, -28, 0.95, 21, 0, -0.06)],
	},
];
const VARIANT_SHIFT = [0, 14];
const SPEED = 15;

type Run = { x: number[]; y: number[]; d: number[]; len: number };
type Route = { key: string; runs: Run[]; len: number };
let route: Route | null = null;

/** Open Catmull-Rom run through the points, sampled by arc length. */
function sample(pts: Point[]): Run {
	const n = pts.length;
	const x: number[] = [];
	const y: number[] = [];
	const d: number[] = [];
	let len = 0;
	for (let i = 0; i < n - 1; i++) {
		const p0 = pts[Math.max(0, i - 1)];
		const p1 = pts[i];
		const p2 = pts[i + 1];
		const p3 = pts[Math.min(n - 1, i + 2)];
		for (let k = 0; k < 24; k++) {
			const u = k / 24;
			const u2 = u * u;
			const u3 = u2 * u;
			const f = (a: number, b: number, c: number, e: number) =>
				0.5 *
				(2 * b +
					(-a + c) * u +
					(2 * a - 5 * b + 4 * c - e) * u2 +
					(-a + 3 * b - 3 * c + e) * u3);
			const px = f(p0[0], p1[0], p2[0], p3[0]);
			const py = f(p0[1], p1[1], p2[1], p3[1]);
			if (x.length)
				len += Math.hypot(px - x[x.length - 1], py - y[y.length - 1]);
			x.push(px);
			y.push(py);
			d.push(len);
		}
	}
	x.push(pts[n - 1][0]);
	y.push(pts[n - 1][1]);
	len += Math.hypot(
		x[x.length - 1] - x[x.length - 2],
		y[y.length - 1] - y[y.length - 2],
	);
	d.push(len);
	return { x, y, d, len };
}

/** Point and heading at arc length m along the cycle; null while off its runs. */
function at(r: Route, m0: number) {
	let m = ((m0 % r.len) + r.len) % r.len;
	let run = r.runs[0];
	if (m >= run.len) {
		m -= run.len;
		run = r.runs[1];
	}
	const n = run.x.length;
	let lo = 0;
	let hi = n - 1;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (run.d[mid] <= m) lo = mid;
		else hi = mid - 1;
	}
	const j = Math.min(n - 1, lo + 1);
	const span = run.d[j] - run.d[lo] || 1;
	const q = Math.min(1, (m - run.d[lo]) / span);
	const x = run.x[lo] + (run.x[j] - run.x[lo]) * q;
	const y = run.y[lo] + (run.y[j] - run.y[lo]) * q;
	const b = Math.max(0, lo - 2);
	const f = Math.min(n - 1, lo + 3);
	return { x, y, a: Math.atan2(run.y[f] - run.y[b], run.x[f] - run.x[b]) };
}

/**
 * Up the left gutter, down the right one, wandering side to side. Each run
 * starts and ends well off-screen, so the hop from one to the other is never
 * seen. A gutter too narrow for a fish is skipped. Needs only the content's
 * x and width, so it works whatever the page.
 */
function routeFor(W: number, H: number, content: Box | undefined): Route {
	const edge = content ?? {
		x: Math.max(0, (W - 1024) / 2),
		y: 0,
		w: 1024,
		h: 0,
	};
	const gl = Math.max(0, edge.x);
	const gr = Math.max(0, W - edge.x - edge.w);
	const key = [W, H, gl, gr].map(Math.round).join();
	if (route && route.key === key) return route;
	const wander = (g: number) =>
		g < 90 ? 0 : Math.min(70, Math.max(0, g / 2 - 90));
	const cl = gl / 2;
	const cr = W - gr / 2;
	const al = wander(gl);
	const ar = wander(gr);
	const ys = [H + 130, H * 0.8, H * 0.58, H * 0.36, H * 0.14, -130];
	const sway = [0, 1, -1, 1, -0.6, 0];
	const left = ys.map((y, i): Point => [cl + al * sway[i], y]);
	const right = ys.map((y, i): Point => [cr - ar * sway[i], y]).reverse();
	const runs = [
		gl < 90 ? { x: [0], y: [0], d: [0], len: 0 } : sample(left),
		gr < 90 ? { x: [0], y: [0], d: [0], len: 0 } : sample(right),
	];
	route = { key, runs, len: runs[0].len + runs[1].len };
	return route;
}

/** Sparse specks and bubbles trailing from the school, fading in and out. */
function trail(
	c: CanvasRenderingContext2D,
	t: number,
	r: Route,
	head: number,
	k: number,
	gi: number,
) {
	const span = 560;
	const n = 10;
	c.fillStyle = "rgb(0 0 0 / 0.3)";
	c.strokeStyle = "rgb(0 0 0 / 0.34)";
	c.lineWidth = 1.2;
	for (let i = 0; i < n; i++) {
		const rate = 3.2 + (i % 4) * 1.1;
		const raw = (i / n) * span + t * rate + gi * 97;
		const cycle = Math.floor(raw / span);
		const u = raw / span - cycle;
		const h = (cycle * 7 + i * 13 + gi * 5) % 11;
		const p = at(r, head + 50 - u * span);
		const fade = Math.sin(Math.PI * u) ** 1.5;
		if (fade < 0.04) continue;
		const spread = (22 + (h % 5) * 9 + u * 26) * (h % 2 ? 1 : -1);
		const nx = -Math.sin(p.a);
		const ny = Math.cos(p.a);
		const x = p.x + nx * spread + 5 * Math.sin(t * 0.13 + i * 2.1);
		const y = p.y + ny * spread + 5 * Math.cos(t * 0.11 + i * 1.7);
		c.globalAlpha = fade;
		if (i % 4 === 0) {
			c.beginPath();
			c.arc(x, y, 2.6 + k * 4 + (h % 3) * 0.6, 0, TAU);
			c.stroke();
		} else {
			const d = i % 3 === 0 ? 3 : 2;
			c.fillRect(x, y, d, d);
		}
	}
	c.globalAlpha = 1;
}

export const veil: Scene = ({ dither: target }, env) => {
	const { t, W, H, dark } = env;
	if (!tissues.length) {
		for (let i = 0; i < VARIANTS; i++) {
			const canvas = document.createElement("canvas");
			canvas.width = TW;
			canvas.height = TH;
			const context = canvas.getContext("2d", { willReadFrequently: true });
			if (!context) return;
			tissues.push({ canvas, context });
		}
	}
	const phone = W < 600;
	const turn = phone ? 0.15 : 1;
	for (let i = 0; i < VARIANTS; i++) {
		paint(tissues[i].context, t + VARIANT_SHIFT[i], dark, turn);
	}
	if (phone) {
		// The hero's open corners, right of the date, title and subtitle (field y
		// is css y minus the 64px header). Those quiet zones must dim, not blank,
		// for the fish to show; see data-grain-quiet depth.
		const slots: [number, number][] = [
			[W - 185, 36],
			[W - 92, 35],
			[W - 40, 86],
			[W - 150, 130],
		];
		GROUPS.flatMap((g) => g.fish)
			.slice(0, 4)
			.forEach((fish, i) => {
				const own = pose(t + fish.phase);
				const sc = (0.33 * fish.scale) / TS;
				target.save();
				target.translate(slots[i][0] + own.x * 0.1, slots[i][1] + own.y * 0.2);
				target.rotate(own.a * turn * 0.4 + fish.yaw);
				target.scale(sc, sc);
				target.globalAlpha = fish.alpha;
				target.drawImage(
					tissues[fish.variant % VARIANTS].canvas,
					-36,
					-84,
					TW,
					TH,
				);
				target.restore();
			});
		return;
	}
	const r = routeFor(W, H, env.anchors.content);
	if (r.len < 1) return;
	const gutter = Math.max(
		env.anchors.content?.x ?? 0,
		W -
			(env.anchors.content ? env.anchors.content.x + env.anchors.content.w : W),
		env.anchors.content ? 0 : Math.max(0, (W - 1024) / 2),
	);
	const k = 0.8 * Math.min(0.45, Math.max(0.26, (gutter - 10) / 250));
	const spread = Math.min(1.8, Math.max(0.5, (gutter - 170) / 90));
	const head = 40 + t * SPEED;
	GROUPS.forEach((g, gi) => {
		const h0 = head + g.at * r.len;
		trail(target, t, r, h0 - 190, k, gi);
		g.fish.forEach((fish) => {
			const own = pose(t + fish.phase);
			const p = at(r, h0 - fish.lag + 12 * Math.sin(t * 0.045 + fish.phase));
			const off =
				fish.side * spread * (1 + 0.25 * Math.sin(t * 0.06 + fish.phase * 1.3));
			const x = p.x - Math.sin(p.a) * off + own.x * 0.15;
			const y = p.y + Math.cos(p.a) * off + own.y * 0.15;
			if (x < -140 || x > W + 140 || y < -140 || y > H + 140) return;
			const sc = (k * fish.scale) / TS;
			target.save();
			target.translate(x, y);
			// The head is the tissue's -x end, so it leads when turned against travel.
			target.rotate(p.a + Math.PI + own.a * 0.3 + fish.yaw);
			target.scale(sc, sc);
			target.globalAlpha = fish.alpha;
			target.drawImage(
				tissues[fish.variant % VARIANTS].canvas,
				-36,
				-84,
				TW,
				TH,
			);
			target.restore();
		});
	});
};
