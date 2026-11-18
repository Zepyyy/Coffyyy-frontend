import type { Scene } from "../engine";

// The far bank is a pair of overlapping ink washes. Both run out into
// unpainted paper on the left. The cuts follow the fall of the rock.
const farBank = new Path2D(
	"M24 60 Q35 59 43 55 L50 53 54 50 58 49 63 44 66 43 71 39 75 40 78 38 84 41 92 36 100 34 V61 H24Z",
);
const bluff = new Path2D(
	"M45 61 Q55 60 60 58 L66 57 70 54 73 53 78 48 80 47 83 42 85 41 88 36 91 35 93 32 96 33 100 31 V61Z",
);
const folds = new Path2D(
	"M93 32 Q91 37 88 40 L86 44 82 46 78 51 82 49 86 47 89 42 90 39Z " +
		"M100 37 L97 39 94 45 91 47 87 52 82 55 89 53 94 49 96 44Z " +
		"M80 47 L78 51 74 54 70 55 67 57 73 56 77 54Z",
);
const shore = new Path2D(
	"M-5 76 Q0 77 3 78.5 L5 78.4 Q9 80.3 12 79.9 T17 80.8 L19 81.4 20 81.3 Q21.5 82.1 22 82.6 L24 83.1 Q22 83.9 18.5 83.7 L17.8 84.2 13.6 84.5 Q12 85.4 8 85.7 L10 86.2 Q12 86.6 13.4 87 Q9 88.6 5.3 89.4 L3 90.6 Q1 92 -5 92.8Z",
);

// One contour from the nape down the back, around the tucked boot and
// over the knees to the hands. The bank swallows the bottom of the coat.
const angler = new Path2D(
	"M-11 2 Q-14 -3 -11 -12 Q-9 -21 -4 -26 Q0 -31 4 -31 " +
		"Q3 -34 5 -37 Q9 -41 13 -37 L15 -34 13 -32 Q13 -28 9 -27 " +
		"L8 -24 Q9 -19 13 -15 L19 -16 Q22 -17 22 -14 " +
		"Q20 -12 12 -11 L7 -14 5 -10 Q14 -14 18 -11 Q21 -9 20 -4 " +
		"L18 2 22 4 Q20 6 15 5 L14 0 10 -3 5 1 Q-1 5 -11 2Z",
);

const reeds = new Path2D();
for (let i = 0; i < 26; i++) {
	const x = ((i * 17) % 53) - 49;
	const height = 5 + ((i * 13) % 24);
	const lean = Math.sin(i * 7.7) * 7;
	reeds.moveTo(x, 3);
	reeds.quadraticCurveTo(x + 1, -height * 0.6, x + lean, -height);
	reeds.quadraticCurveTo(x + 2, -height * 0.45, x + 1.5, 3);
	reeds.closePath();
}

export const lakeside: Scene = ({ dither: c }, { W, H, t, dark, anchors }) => {
	const shelf = anchors.shelf;
	const heading = anchors["shelf-heading"];
	// When the mobile shelf occupies the foot, fit a sunset into the
	// right end of the space between the brew action and the Beans heading.
	const compact = W < 640 && shelf && heading && shelf.y + shelf.h > H * 0.8;
	const horizon = compact ? heading.y - 12 : H * 0.855;
	const height = compact ? 22 : Math.min(H * 0.19, W * 0.22, 170);
	const width = Math.min(W * (compact ? 0.41 : 0.58), 730);
	const left = W - width;
	const ochre = dark ? "#fca35d" : "#de873d";
	const plum = dark ? "#b77f9c" : "#80516d";
	const silt = dark ? "#d2a274" : "#805c48";
	c.save();
	const sunX = W - Math.min(W * 0.075, 103);
	const sunY = horizon - height * 0.91;
	const radius = height * 0.2;
	c.fillStyle = dark ? "#e9a164" : "#f0a144";
	c.globalAlpha = 0.65;
	c.beginPath();
	c.arc(sunX, sunY, radius, 0, Math.PI * 2);
	c.fill();

	c.save();
	c.translate(left, horizon - (61 * height) / 30);
	c.scale(width / 100, height / 30);
	c.fillStyle = dark ? "#aa707e" : "#d39991";
	c.globalAlpha = 0.46;
	c.fill(farBank);
	const wash = c.createLinearGradient(75, 34, 80, 61);
	wash.addColorStop(0, plum);
	wash.addColorStop(0.65, dark ? "#b17878" : "#bd8576");
	wash.addColorStop(1, ochre + "55");
	c.globalAlpha = 0.8;
	c.fillStyle = wash;
	c.fill(bluff);
	c.fillStyle = ochre;
	c.globalAlpha = 0.6;
	c.fill(folds);
	c.restore();

	// The bluff's reflection narrows to a few marks below the sun.
	// Paper shows through between strokes, even at the far waterline.
	for (let i = 0; i < 15; i++) {
		const depth = i / 15;
		const swell = Math.sin(t * 0.5 - i * 0.8);
		const y = horizon + 2 + height * depth ** 1.55 * 0.52;
		const x = sunX + width * (0.04 * Math.sin(i * 2.5) + 0.009 * swell);
		const span = width * (0.012 + 0.24 * (1 - depth) ** 3);
		c.fillStyle = i % 3 === 0 ? plum : ochre;
		c.globalAlpha = (0.6 - depth * 0.28) * (0.91 + swell * 0.09);
		c.beginPath();
		c.moveTo(x - span, y);
		c.quadraticCurveTo(x, y - 1 - depth, x + span, y);
		c.quadraticCurveTo(x, y + 2 + 2 * depth, x - span, y);
		c.fill();
	}

	if (compact) {
		c.restore();
		return;
	}

	// Bank and figure share the same local coordinates at every size.
	const bankWidth = Math.min(W * 0.28, 310);
	const bankHeight = Math.min(H * 0.1, 70);
	const seat = H * 0.94;
	c.save();
	c.translate(0, seat - 81 * bankHeight / 17);
	c.scale(bankWidth / 24, bankHeight / 17);
	c.fillStyle = silt;
	c.globalAlpha = 0.5;
	c.fill(shore);
	c.restore();

	const unit = Math.min(1.05, W / 650, H / 600);
	c.translate(bankWidth * 0.625, seat);
	c.scale(unit, unit);
	c.fillStyle = silt;
	c.globalAlpha = 0.48;
	c.fill(reeds);
	c.globalAlpha = 0.63;
	c.fill(angler);
	const lift = Math.sin(t * 0.52);
	c.lineWidth = 1.65;
	c.strokeStyle = silt;
	c.beginPath();
	c.moveTo(17, -14);
	c.quadraticCurveTo(47, -37, 78, -43 + lift);
	c.stroke();

	c.lineWidth = 1;
	c.globalAlpha = 0.34;
	c.beginPath();
	c.moveTo(78, -43 + lift);
	c.quadraticCurveTo(89, -27, 98, 16 + lift);
	c.stroke();
	const phase = (t / 6) % 1;
	c.globalAlpha = 0.48 * Math.sin(phase * Math.PI);
	c.beginPath();
	c.ellipse(98, 17 + lift, 3 + phase * 19, 0.8 + phase * 3, 0, 0, 2 * Math.PI);
	c.stroke();
	c.restore();
};
