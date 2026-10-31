import type { Box, Scene } from "../engine";

const TAU = Math.PI * 2;
const mod = (x: number, n: number) => ((x % n) + n) % n;
const ease = (x: number) => x * x * (3 - 2 * x);

/** One second of propulsion, two and a half seconds opening again. */
function pulse(t: number) {
	const p = mod(t, 3.5);
	return p < 1 ? ease(p) : 1 - ease((p - 1) / 2.5);
}

type Cfg = {
	/** 1 = right margin, 0 = left. */
	side: number;
	seed: number;
	s: number;
	/** Shift from the lane toward the screen edge, in px (desktop / phone). */
	dx: number;
	dxPhone: number;
	alpha: number;
	/** Place on the shared loop, in bell-size units; same-side gaps exceed any two bodies. */
	u: number;
};

// One loop for all, so gaps never change: each jelly owns a slot in y, and
// wraps only while fully off-screen. Left slots 0/4.2/8.4, right 2.1/6.3/10.5.
const JELLIES: Cfg[] = [
	{ side: 1, seed: 1, s: 0.79, dx: 0, dxPhone: 0, alpha: 1, u: 2.1 },
	{ side: 0, seed: 0, s: 1, dx: 0, dxPhone: 0, alpha: 1, u: 0 },
	{ side: 0, seed: 2.4, s: 0.36, dx: 46, dxPhone: 30, alpha: 0.6, u: 4.2 },
	{ side: 1, seed: 3.1, s: 0.3, dx: 40, dxPhone: 42, alpha: 0.55, u: 10.5 },
	{ side: 1, seed: 4.3, s: 0.42, dx: 20, dxPhone: 10, alpha: 0.5, u: 6.3 },
	{ side: 0, seed: 5.2, s: 0.28, dx: 64, dxPhone: 44, alpha: 0.5, u: 8.4 },
];

/** Where the jellies may swim: gutter centres and a size factor per side. */
type Lanes = { x: [number, number]; f: [number, number]; legacy: boolean };

const MIN_GUTTER = 90;

/**
 * Lanes sit in the visible gutters beside the page's content column. A gutter
 * too narrow to hold a bell (<90px) gets none; a modest one gets smaller jellies.
 * Without an anchor, or on a phone, the old fixed lanes apply.
 */
function lanesFor(W: number, content: Box | undefined): Lanes {
	if (!content || W < 600) {
		const lane = W < 600 ? 82 : Math.max(112, (W - 1024) / 2 + 6);
		return { x: [lane, W - lane], f: [1, 1], legacy: true };
	}
	const gl = Math.max(0, content.x);
	const gr = Math.max(0, W - content.x - content.w);
	const f = (g: number) =>
		g < MIN_GUTTER ? 0 : Math.min(1, Math.max(0.3, (g - 30) / 230));
	return {
		x: [gl / 2, W - gr / 2],
		f: [f(gl), f(gr)],
		legacy: false,
	};
}

function pose(t: number, W: number, H: number, cfg: Cfg, L: Lanes) {
	const { side, seed } = cfg;
	const fs = L.f[side];
	const s = cfg.s * fs;
	const size = W < 600 ? 68 : 100;
	// Enters below the page, leaves above it, wraps unseen.
	const loop = H + size * 4.3;
	const y =
		H +
		size * 0.9 -
		mod(t * 9 + cfg.u * size, loop) -
		21 * pulse(t + seed * 1.7);
	const inset = (W < 600 ? cfg.dxPhone : cfg.dx) * fs * (side ? 1 : -1);
	const sway = 21 * s * Math.sin(t * 0.085 + seed * 2);
	let x = L.x[side] + inset + sway;
	if (!L.legacy) {
		// Keep the whole bell inside its gutter.
		const half = (side ? W - L.x[1] : L.x[0]) - 4;
		const reach = size * s + 4;
		const lo = L.x[side] - half + reach;
		const hi = L.x[side] + half - reach;
		x = lo < hi ? Math.min(hi, Math.max(lo, x)) : L.x[side];
	}
	return {
		x,
		y,
		p: pulse(t + seed * 1.7),
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

/** A few slow specks adrift in the margins, never over the page body. */
function snow(
	c: CanvasRenderingContext2D,
	t: number,
	W: number,
	H: number,
	L: Lanes,
) {
	const phone = W < 600;
	const n = phone ? 7 : 12;
	c.fillStyle = "rgb(0 0 0 / 0.32)";
	for (let i = 0; i < n; i++) {
		const side = i % 2;
		const u = mod(i * 0.618 + 0.13, 1);
		const speed = 2.2 + (i % 4) * 0.7;
		const y = mod(u * (H + 40) + t * speed, H + 40) - 20;
		let base: number;
		if (L.legacy) {
			const margin = phone ? 36 : Math.max(60, (W - 1024) / 2 - 8);
			base = side ? W - margin * (0.15 + u * 0.7) : margin * (0.15 + u * 0.7);
		} else {
			const half = side ? W - L.x[1] : L.x[0];
			if (!L.f[side]) continue;
			base = L.x[side] + (u - 0.5) * (half - 12) * 1.7;
		}
		const x = base + 5 * Math.sin(t * 0.1 + i * 2.3);
		const d = i % 3 === 0 ? 3 : 2;
		c.fillRect(x, y, d, d);
	}
}

export const jelly: Scene = ({ dither: c }, { t, W, H, anchors }) => {
	const size = W < 600 ? 68 : 100;
	const L = lanesFor(W, anchors.content);
	snow(c, t, W, H, L);
	for (const cfg of JELLIES) {
		if (!L.f[cfg.side]) continue;
		const s = cfg.s * L.f[cfg.side];
		const now = pose(t, W, H, cfg, L);
		const r = size * s * (1 - now.p * 0.19);
		const h = size * s * (0.65 + now.p * 0.12);
		if (now.y < -size * 3.8 || now.y > H + size * 1.5) continue;
		c.save();
		c.globalAlpha = cfg.alpha;
		c.translate(now.x, now.y);
		c.lineCap = "round";
		c.lineJoin = "round";

		// Each point remembers the bell at an earlier time. The lag grows
		// continuously down the filament, including through a propulsion stroke.
		const strand = (q: number, root: number, length: number, id: number) => {
			const past = pose(t - q * 2.3, W, H, cfg, L);
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
