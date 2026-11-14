import type { Scene } from "../engine";

type Point = { x: number; y: number };

/** A projected ash canopy: the subject is the perforated light on the paper.
 * Branch coordinates carry a delayed travelling bend; paired leaflets inherit
 * their rachis and add only a small local twist. No simulation or frame history.
 */
export const sunshade: Scene = ({ dither: g }, { W, H, t, dark, anchors }) => {
	const phone = W < 640;
	const scale = phone ? 0.78 : Math.min(1.35, W / 1050);
	const leaves = new Path2D();
	const wood = new Path2D();
	const ribs = new Path2D();
	const wind = (delay: number) =>
		Math.sin(t * 0.19 - delay) * 0.65 + Math.sin(t * 0.33 - delay * 1.4) * 0.24;
	const leaf = (
		x: number,
		y: number,
		angle: number,
		length: number,
		width: number,
	) => {
		const c = Math.cos(angle),
			s = Math.sin(angle);
		const p = (u: number, v: number): Point => ({
			x: x + c * u - s * v,
			y: y + s * u + c * v,
		});
		const a = p(length * 0.31, -width),
			b = p(length * 0.79, -width * 0.62);
		const tip = p(length, 0),
			d = p(length * 0.69, width * 0.85),
			e = p(length * 0.23, width * 0.78);
		leaves.moveTo(x, y);
		leaves.bezierCurveTo(a.x, a.y, b.x, b.y, tip.x, tip.y);
		leaves.bezierCurveTo(d.x, d.y, e.x, e.y, x, y);
		leaves.closePath();
		ribs.moveTo(x, y);
		ribs.quadraticCurveTo(
			p(length * 0.48, 2).x,
			p(length * 0.48, 2).y,
			tip.x,
			tip.y,
		);
	};

	// The phone projection occupies the open seam above the shelf, not its cards.
	const shelfY = anchors["shelf-heading"]?.y ?? Math.min(H * 0.48, 340);
	const apertures = new Path2D();
	for (let branch = 0; branch < (phone ? 1 : 2); branch++) {
		const ox = phone ? W * 0.3 : W * (branch ? 0.94 : 0.79);
		const oy = phone ? shelfY - 48 : 38 + branch * 100;
		const reach = phone ? Math.min(190, W * 0.49) : 270 * scale;
		const angle = phone ? -0.035 : branch ? 1.82 : 0.55;
		const point = (u: number): Point => {
			const bend = wind(u * 2.4 + branch) * (phone ? 3 : 12) * u * u;
			return {
				x: ox + Math.cos(angle) * reach * u - Math.sin(angle) * bend,
				y: oy + Math.sin(angle) * reach * u + Math.cos(angle) * bend,
			};
		};
		wood.moveTo(ox, oy);
		for (let j = 1; j <= 24; j++) {
			const p = point(j / 24);
			wood.lineTo(p.x, p.y);
		}
		for (let pair = 0; pair < 5; pair++) {
			const u = 0.13 + pair * 0.17;
			const length =
				(phone ? 27 : 64) * (1 - pair * 0.09) * (phone ? 1 : scale);
			for (const side of [-1, 1]) {
				const p = point(u + side * 0.018);
				const a = angle + side * (0.92 + wind(u * 3 + branch) * 0.065);
				leaf(p.x, p.y, a, length, length * 0.28);
				// Narrow, tapered openings follow the same moving rachis.
				// Separate filled islands: no evenodd overlap inversions.
				const next = point(u + 0.11);
				const dx = Math.cos(a + side * 0.27),
					dy = Math.sin(a + side * 0.27);
				apertures.moveTo(p.x + dx * length * 0.48, p.y + dy * length * 0.48);
				apertures.quadraticCurveTo(
					p.x + dx * length * 1.1,
					p.y + dy * length * 1.1,
					next.x + dx * length * 0.94,
					next.y + dy * length * 0.94,
				);
				apertures.quadraticCurveTo(
					next.x + dx * length * 0.52,
					next.y + dy * length * 0.52,
					p.x + dx * length * 0.48,
					p.y + dy * length * 0.48,
				);
				apertures.closePath();
			}
		}
		const tip = point(1);
		leaf(tip.x, tip.y, angle, phone ? 23 : 44 * scale, phone ? 7 : 13 * scale);
	}

	g.save();
	g.lineCap = "round";
	g.fillStyle = dark ? "#9bbcc9" : "#c5a253";
	g.globalAlpha = dark ? 0.19 : 0.24;
	g.fill(apertures);
	// A faint displaced penumbra has a hard, low-tone boundary, not a blur.
	g.translate(7 * scale, 10 * scale);
	g.fillStyle = dark ? "#739da4" : "#929764";
	g.globalAlpha = dark ? 0.065 : 0.085;
	g.fill(leaves);
	g.translate(-7 * scale, -10 * scale);
	g.fillStyle = dark ? "#8baaaa" : "#77885b";
	g.globalAlpha = dark ? 0.26 : 0.34;
	g.fill(leaves);
	g.strokeStyle = dark ? "#85a4aa" : "#7c8055";
	g.lineWidth = 3.2 * scale;
	g.stroke(wood);
	g.globalAlpha = 0.075;
	g.lineWidth = 1.8;
	g.stroke(ribs);

	g.restore();
};
