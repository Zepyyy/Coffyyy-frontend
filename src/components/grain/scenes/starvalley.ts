import type { Scene } from "../engine";

// The sill, cat and cup share one baseline. The valley runs out into bare
// paper at the open end of the sill; only the jamb goes up into the sky.
const opening = new Path2D("M0 13 C97 -6 209 5 288 42 Q353 70 391 127 L0 128Z");
const ridge = new Path2D(
	"M0 42 Q44 45 83 65 Q137 90 191 73 T263 66 Q307 82 335 73 L397 81 V129 H0Z",
);
const woods = new Path2D(
	"M0 85 Q43 66 76 78 T155 98 Q194 108 232 94 Q272 79 301 80 Q353 83 392 70 V130 H0Z",
);
const sill = new Path2D("M0 127 L392 127 403 132 389 137 0 142Z");
const cat = new Path2D(
	"M38 123 C26 117 27 99 34 87 C45 68 74 65 95 71 Q115 76 124 89 " +
		"L128 76 Q135 82 139 89 Q145 88 150 91 L161 81 160 99 " +
		"Q168 110 161 117 Q158 123 148 124 Q157 124 158 128 " +
		"Q143 133 124 128 C95 135 57 134 38 123Z",
);
const tail = new Path2D(
	"M34 101 C27 123 54 132 86 132 C102 132 118 131 126 126 Q133 120 126 118 Q121 117 115 122 C80 129 48 119 44 105 Q39 97 34 101Z",
);
const mug = new Path2D(
	"M186 105 Q199 102 214 105 L212 122 Q211 129 201 129 Q189 129 188 123Z",
);
const handle = new Path2D("M212 108 C228 103 228 122 212 122");

export const starvalley: Scene = ({ dither: c }, { W, H, dark, t }) => {
	const scale = Math.min(1.45, W / 465, (H - 26) / 151);
	c.save();
	c.translate(0, H - 26 - 151 * scale);
	c.scale(scale, scale);
	const draw = (shape: Path2D, color: string, opacity: number) => {
		c.fillStyle = color;
		c.globalAlpha = opacity;
		c.fill(shape);
	};
	const indigo = dark ? "#9ca6d1" : "#474a77";
	const wood = dark ? "#cba889" : "#805c53";
	c.save();
	c.clip(opening);
	draw(opening, indigo, 0.11);
	c.fillStyle = dark ? "#e2cef0" : "#777395";
	c.globalAlpha = 0.65;
	for (const [x, y, r] of [
		[51, 27, 2.2],
		[118, 37, 1.5],
		[196, 39, 2.7],
	]) {
		c.fillRect(x - r / 2, y - r, r, 2 * r);
		c.fillRect(x - r, y - r / 2, 2 * r, r);
	}
	draw(ridge, dark ? "#b6a0c8" : "#887aa7", 0.26);
	draw(woods, indigo, 0.32);

	// Only a roof, a wall and one warm window survive at this distance.
	c.fillStyle = indigo;
	c.globalAlpha = 0.81;
	c.fillRect(283, 65, 19, 17);
	c.beginPath();
	c.moveTo(278, 67);
	c.lineTo(290, 54);
	c.lineTo(306, 66);
	c.closePath();
	c.fill();
	c.fillStyle = "#ffaa48";
	c.fillRect(289, 69, 7, 8);
	c.fillStyle = dark ? "#f5cc84" : "#cf9436";
	for (let i = 0; i < 5; i++) {
		const phase = t * 0.64 + i * 2.7;
		c.globalAlpha = 0.36 + 0.3 * Math.sin(phase);
		c.beginPath();
		c.arc(
			235 + i * 26 + 5 * Math.sin(phase),
			75 + 9 * Math.cos(phase * 0.7),
			2.4,
			0,
			2 * Math.PI,
		);
		c.fill();
	}

	c.restore();

	const jamb = c.createLinearGradient(0, 0, 0, 129);
	jamb.addColorStop(0, wood + "00");
	jamb.addColorStop(0.4, wood + "54");
	jamb.addColorStop(1, wood + "a6");
	c.fillStyle = jamb;
	c.globalAlpha = 1;
	c.fillRect(0, 0, 12, 130);
	draw(sill, wood, 0.55);
	draw(cat, dark ? "#dab79f" : "#79605d", 0.95);
	draw(tail, dark ? "#847a97" : "#b08c85", 0.75);
	c.strokeStyle = dark ? "#44425b" : "#e2c5b6";
	c.lineWidth = 2;
	c.beginPath();
	c.moveTo(146, 106);
	c.quadraticCurveTo(150, 110, 155, 106);
	c.stroke();
	const glaze = dark ? "#dbaa78" : "#bd7751";
	c.strokeStyle = glaze;
	c.lineWidth = 4;
	c.stroke(handle);
	draw(mug, glaze, 0.83);
	c.restore();
};
