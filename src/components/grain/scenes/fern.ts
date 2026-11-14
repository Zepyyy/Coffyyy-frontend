import type { Scene } from "../engine";

type Ctx = CanvasRenderingContext2D;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
	const u = clamp(v);
	return u * u * (3 - 2 * u);
};

/** A lanceolate pinna, cut into attached pinnules rather than a feather line. */
function pinna(c: Ctx, length: number, width: number) {
	// A pinna has its own midrib and alternating, overlapping pinnules.
	c.beginPath();
	c.moveTo(0, 0);
	c.quadraticCurveTo(length * 0.55, -width * 0.3, length, -length * 0.13);
	c.lineWidth = Math.max(1.6, width * 0.24);
	c.stroke();
	c.beginPath();
	for (let j = 0; j < 9; j++) {
		const q = 0.12 + j * 0.092;
		const x = length * q;
		const y = -length * 0.13 * q * q;
		const reach = width * Math.sin(Math.PI * q ** 0.8);
		for (const side of [-1, 1]) {
			c.moveTo(x - length * 0.055, y);
			c.bezierCurveTo(
				x - length * 0.04,
				y + side * reach * 0.8,
				x + length * 0.09,
				y + side * reach * 1.25,
				x + length * 0.12,
				y + side * reach,
			);
			c.quadraticCurveTo(
				x + length * 0.13,
				y + side * reach * 0.3,
				x + length * 0.045,
				y,
			);
			c.closePath();
		}
	}
	c.fill();
}

/** Permanent mature fronds shelter one slowly unfurling shoot. Growth holds; it never rewinds. */
export const fern: Scene = ({ dither: c }, { W, H, t, dark, anchors }) => {
	const phone = W < 640;
	const scale = phone ? 1 : Math.min(1.1, W / 1440);
	const baseY = phone
		? (anchors["shelf-heading"]?.y ?? H * 0.43) - 22
		: Math.min(H - 22, 870);
	const baseX = phone ? W * 0.68 : W * 0.28;
	const green = dark ? "#79b59a" : "#286e56";
	const sage = dark ? "#b2c6a2" : "#718d68";
	const russet = dark ? "#c59a79" : "#8a624b";
	c.save();
	c.lineCap = "round";
	c.lineJoin = "round";
	// Unequal fans share a crown. The youngest, tallest crozier occupies the
	// rising right diagonal; a low back frond provides a contrasting silhouette.
	const specs = phone
		? [
				[-0.85, 43, 1, 0],
				[0.2, 62, 0, 3],
			]
		: [
				[-0.48, 270, 1, 0],
				[0.68, 370, 1, 1],
				[0.96, 390, 0, 3],
			];
	for (const [angle, size, mature, id] of specs) {
		const age = Math.max(0, t + 62);
		// One-way growth settles into a held mature pose; wind continues afterwards.
		const growth = mature ? 1 : 0.08 + 0.92 * smooth(age / 260);
		const L = size * scale;
		const sway = Math.sin(t * 0.19 - id * 0.8) * 0.012;
		c.save();
		c.translate(baseX + id * 7 * scale, baseY);
		c.rotate(angle + sway);
		// Rachis bends increasingly toward the light. Its tangent also gives
		// every pinna its attachment frame.
		const point = (q: number) => ({ x: L * 0.22 * q * q, y: -L * q });
		c.globalAlpha = 0.78;
		c.strokeStyle = russet;
		c.lineWidth = 3.6 * scale;
		c.beginPath();
		c.moveTo(0, 0);
		for (let j = 1; j <= 64; j++) {
			const p = point((growth * j) / 64);
			c.lineTo(p.x, p.y);
		}
		c.stroke();
		for (let j = 0; j < 20; j++) {
			const q = 0.22 + j * 0.038;
			const release = smooth((growth - q) / 0.075);
			if (release <= 0) continue;
			const p = point(q);
			const width = L * 0.17 * Math.sin((Math.PI * (q - 0.12)) / 0.9) ** 0.85;
			for (const side of [-1, 1]) {
				c.save();
				c.translate(p.x, p.y + (side === 1 ? 4 * scale : 0));
				const elapsed = Math.max(0, (growth - q) * 230);
				const settle = mature
					? 0
					: Math.sin(elapsed * 0.7) * Math.exp(-elapsed / 8) * 0.09;
				c.rotate(
					-Math.PI / 2 +
						Math.atan(0.44 * q) +
						side *
							(0.3 +
								release * (0.85 + 0.13 * Math.sin(j * 1.9 + side)) +
								settle),
				);
				c.fillStyle = side === -1 ? green : sage;
				c.strokeStyle = green;
				c.globalAlpha = side === -1 ? 0.65 : 0.53;
				pinna(
					c,
					width * release,
					Math.max(phone ? 1.8 : 4, width * 0.14) * release,
				);
				c.restore();
			}
		}
		if (!mature && growth < 0.99) {
			const p = point(growth);
			const radius = L * 0.105 * (1 - smooth((growth - 0.65) / 0.35));
			c.save();
			c.translate(p.x, p.y);
			c.rotate(Math.atan(0.44 * growth));
			c.beginPath();
			// Tangential entry at the lower left; the open spiral has real air
			// between turns, wide enough to survive the two-pixel lattice.
			for (let j = 0; j <= 90; j++) {
				const u = j / 90;
				const a = Math.PI - u * Math.PI * 3.2;
				const r = radius * (1 - u * 0.86);
				const x = radius + Math.cos(a) * r;
				// Subtract radial drift at entry: tangent continues the rachis.
				const y = Math.sin(a) * r - radius * u * 0.27;
				if (j === 0) c.moveTo(x, y);
				else c.lineTo(x, y);
			}
			c.strokeStyle = sage;
			c.globalAlpha = 0.85;
			c.lineWidth = Math.max(2.4, 5.5 * scale * (1 - growth * 0.45));
			c.stroke();
			c.restore();
		}
		c.restore();
	}
	c.restore();
};
