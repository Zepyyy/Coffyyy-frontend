import type { Scene } from "../engine";

/** A reed at a shallow pool: reflected anatomy is displaced by shared impacts. */
export const rain: Scene = ({ dither: c }, { W, H, t, dark, anchors }) => {
	const phone = W < 600;
	const shelf = anchors.shelf;
	const s = phone ? 0.36 : Math.min(1, W / 1200);
	const x = phone
		? W * 0.76
		: Math.max(88, (anchors.frame?.x ?? W * 0.15) - 55);
	const y = phone
		? (anchors["shelf-heading"]?.y ?? H * 0.44) - 30
		: Math.min(H - 80, shelf ? shelf.y + shelf.h + 150 : H * 0.77);
	const ink = dark ? "139,185,165" : "45,91,79";
	const blue = dark ? "119,173,186" : "61,113,133";
	const gold = dark ? "204,172,117" : "155,113,61";
	const tint = (rgb: string, a: number) => `rgba(${rgb},${a})`;
	const phase = ((t % 24) + 24) % 24;
	const impacts = [
		{ x: 132, y: 30, age: phase - 2 },
		{ x: 210, y: 42, age: phase - 4.8 },
	].filter((p) => p.age > 0 && p.age < 7);
	const wave = (px: number, py: number) => {
		let v = 0;
		for (const p of impacts) {
			const front = Math.hypot(px - p.x, (py - p.y) / 0.26) - p.age * 24;
			v +=
				Math.sin(front * 0.13) *
				Math.exp(-((front / 30) ** 2)) *
				Math.sin((p.age / 7) * Math.PI) *
				6;
		}
		return v;
	};
	c.save();
	if (phone) {
		c.beginPath();
		c.rect(0, y - 52, W, 78);
		c.clip();
	}
	c.translate(x, y);
	c.scale(s, s);
	c.lineCap = "round";
	// A single organic pool boundary, with pigment confined to the water body.
	c.beginPath();
	c.moveTo(-72, 6);
	c.bezierCurveTo(-25, -10, 72, 8, 131, 3);
	c.bezierCurveTo(208, -5, 320, 24, 364, 43);
	c.bezierCurveTo(315, 66, 183, 82, 80, 66);
	c.bezierCurveTo(-12, 61, -77, 31, -72, 6);
	c.fillStyle = tint(blue, 0.13);
	c.fill();
	const reed = () => {
		c.lineWidth = 3.4;
		c.strokeStyle = tint(ink, 0.8);
		c.beginPath();
		c.moveTo(0, 0);
		c.bezierCurveTo(17, -38, 14, -89, 54, -112);
		c.stroke();
		c.fillStyle = tint(ink, 0.67);
		c.beginPath();
		c.moveTo(13, -43);
		c.bezierCurveTo(-21, -91, -47, -93, -59, -77);
		c.bezierCurveTo(-30, -86, -11, -51, 13, -43);
		c.fill();
		c.beginPath();
		c.moveTo(13, -47);
		c.bezierCurveTo(44, -82, 69, -73, 88, -57);
		c.bezierCurveTo(59, -75, 36, -55, 13, -47);
		c.fill();
		c.save();
		c.translate(54, -112);
		c.rotate(0.85);
		c.fillStyle = tint(gold, 0.85);
		c.beginPath();
		c.ellipse(0, -9, 6, 18, 0, 0, Math.PI * 2);
		c.fill();
		c.restore();
	};
	// Mirror actual blade and seedhead geometry; horizontal slices bend together.
	for (let j = 0; j < 20; j++) {
		const yy = j * 3.2;
		c.save();
		c.beginPath();
		c.rect(-90, yy, 200, 2.3);
		c.clip();
		c.translate(wave(20, yy) + Math.sin(yy * 0.24) * 2.8, 3);
		c.scale(1, -0.47);
		c.globalAlpha = 0.55 * (1 - j / 24);
		reed();
		c.restore();
	}
	reed();
	// Irregular short contour fragments connect to the bank, never span the page.
	for (let j = 0; j < 8; j++) {
		const xx = 24 + j * 34;
		const yy = 17 + (j % 3) * 16;
		c.strokeStyle = tint(j === 4 ? gold : blue, 0.34);
		c.lineWidth = 2.7;
		c.beginPath();
		c.moveTo(xx, yy);
		c.bezierCurveTo(
			xx + 17,
			yy - 4 + wave(xx, yy),
			xx + 31,
			yy + 6,
			xx + 48,
			yy + 1,
		);
		c.stroke();
	}
	for (const p of impacts) {
		for (let k = 0; k < 2; k++) {
			const r = p.age * 24 - k * 17;
			if (r < 0) continue;
			c.strokeStyle = tint(blue, 0.48 * Math.min(1, r / 12) * (1 - p.age / 7));
			c.lineWidth = 2.8;
			for (let side = 0; side < 2; side++) {
				c.beginPath();
				for (let n = 0; n <= 36; n++) {
					const a = side * Math.PI + 0.22 + (n / 36) * 2.6;
					const xx = p.x + Math.cos(a) * r;
					const yy = p.y + Math.sin(a) * r * 0.26;
					if (!n) c.moveTo(xx, yy + wave(xx, yy) * 0.15);
					else c.lineTo(xx, yy + wave(xx, yy) * 0.15);
				}
				c.stroke();
			}
		}
	}
	c.restore();
};
