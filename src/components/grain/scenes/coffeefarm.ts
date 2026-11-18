import type { Scene } from "../engine";

// Two overlapping slopes turn around the patio. Their upper edges give the
// hillside its contour. The lower field meets the clay of the drying patio.
const upperField = new Path2D(
	"M70 122 C119 109 172 103 205 79 C239 55 270 21 319 25 Q357 28 394 44 Q447 65 501 31 V122 Q428 101 383 87 Q343 73 312 74 Q270 73 224 95 Q165 126 70 122Z",
);
const lowerField = new Path2D(
	"M167 120 Q221 100 257 77 Q294 53 327 62 C368 72 383 85 423 82 Q470 78 501 54 V135 Q458 132 428 122 Q378 106 333 107 Q282 106 248 114 Q209 124 167 120Z",
);
const patio = new Path2D("M0 132 L154 105 306 108 213 145 47 147Z");
const cherries = new Path2D(
	"M34 132 Q88 122 151 112 L274 113 Q252 118 226 121 Q211 123 204 128 Q189 134 158 137 L62 140Z",
);
// One continuous brim, bowed head and rounded back. The hem and the legs
// merge into the field at the feet.
const picker = new Path2D(
	"M-12 1 Q-13 -9 -9 -19 Q-6 -25 0 -26 L-3 -28 -11 -29 Q-8 -32 -3 -32 Q-3 -39 4 -39 Q9 -38 10 -32 L18 -29 12 -27 Q13 -23 8 -21 L10 -16 18 -12 16 -9 5 -13 2 -16 2 -8 6 1 2 2 -4 -5 -6 2Z",
);
const raker = new Path2D(
	"M-7 1 L-5 -13 Q-5 -21 1 -26 Q-3 -30 0 -34 Q4 -38 8 -34 Q11 -31 8 -27 L6 -24 Q10 -22 11 -18 L17 -16 21 -18 23 -15 18 -12 7 -13 4 -16 0 -9 4 0 1 2 -4 -5 -4 2Z",
);
const basket = new Path2D("M-1 -10 Q7 -13 15 -10 L12 0 Q5 3 2 -1Z");

export const coffeefarm: Scene = ({ dither: c }, { W, H, dark, t }) => {
	const scale = Math.min(1.42, W / 510, (H - 26) / 156);
	c.save();
	c.translate(W - 500 * scale, H - 26 - 156 * scale);
	c.scale(scale, scale);
	const draw = (shape: Path2D, color: string, opacity: number) => {
		c.globalAlpha = opacity;
		c.fillStyle = color;
		c.fill(shape);
	};
	draw(upperField, dark ? "#b8bf84" : "#88945d", 0.49);
	draw(lowerField, dark ? "#96b59a" : "#527857", 0.63);
	draw(patio, dark ? "#d8aa87" : "#b99777", 0.55);
	draw(cherries, dark ? "#df9075" : "#aa503c", 0.76);

	const shirt = dark ? "#d1ae8b" : "#765646";
	for (const [x, y, size, facing] of [
		[312, 66, 0.81, 1],
		[418, 98, 1, -1],
	]) {
		c.save();
		c.translate(x, y);
		c.scale(size * facing, size);
		draw(picker, shirt, 0.87);
		c.translate(12, -2);
		draw(basket, dark ? "#e1af69" : "#ba8649", 0.88);
		c.restore();
	}

	// The patio worker pulls the rake toward the near edge of the cherries.
	const pull = Math.sin(t * 0.64);
	c.save();
	c.translate(149, 116);
	c.scale(-0.88, 0.88);
	c.rotate(pull * 0.035);
	draw(raker, shirt, 0.9);
	c.strokeStyle = dark ? "#e9c69a" : "#805d45";
	c.lineWidth = 2.5;
	c.lineCap = "round";
	c.beginPath();
	c.moveTo(21, -17);
	c.lineTo(43 + 4 * pull, 13);
	c.moveTo(36 + 4 * pull, 15);
	c.lineTo(51 + 4 * pull, 11);
	c.stroke();
	c.restore();
	c.restore();
};
