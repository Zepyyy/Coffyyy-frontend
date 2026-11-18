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

export const lakeside: Scene = ({ dither: c }, { W, H, t, dark }) => {
	const stone = dark ? "#93a8ad" : "#526b6c";
	const distance = dark ? "#a3a3b6" : "#9c999f";
	const silt = dark ? "#c8bda0" : "#5f6251";
	const water = dark ? "#839fab" : "#98b3b3";
	const horizon = H * 0.61;
	c.save();
	c.scale(W / 100, H / 100);
	// Fade the foot of the bluff into mist, keeping the shoulder in relief.
	const wash = c.createLinearGradient(0, 35, 0, 61);
	wash.addColorStop(0, stone);
	wash.addColorStop(1, stone + "28");
	c.fillStyle = distance;
	c.globalAlpha = 0.28;
	c.fill(farBank);
	c.globalAlpha = 0.78;
	c.fillStyle = wash;
	c.fill(bluff);
	c.fillStyle = dark ? "#d0c4b1" : "#baa996";
	c.globalAlpha = 0.67;
	c.fill(folds);
	c.restore();

	c.save();
	const surface = c.createLinearGradient(0, horizon, 0, H);
	surface.addColorStop(0, water + "00");
	surface.addColorStop(0.55, water + "33");
	surface.addColorStop(1, water + "14");
	c.fillStyle = surface;
	c.fillRect(0, horizon, W, H - horizon);
	// Broken ribbons of the reflected headland widen toward the viewer.
	for (let i = 0; i < 29; i++) {
		const depth = (i + 0.5) / 29;
		const swell = Math.sin(t * 0.42 - depth * 17);
		const y = horizon + H * depth * depth * 0.25;
		const x = W * (0.54 + 0.37 * depth + 0.045 * Math.sin(i * 2.8));
		const thickness = 0.7 + H * depth * 0.003;
		c.fillStyle = stone;
		c.globalAlpha = (1 - depth) * (0.25 + 0.09 * swell);
		c.beginPath();
		c.moveTo(x + 4 * swell, y);
		c.quadraticCurveTo(W * 0.87, y - thickness, W, y);
		c.lineTo(W, y + thickness);
		c.closePath();
		c.fill();
	}

	c.globalAlpha = 0.78;
	c.fillStyle = silt;
	c.save();
	c.scale(W / 100, H / 100);
	c.fill(shore);
	c.restore();

	const unit = Math.min(1.65, W / 660, H / 440);
	c.translate(W * 0.15, H * 0.81);
	c.scale(unit, unit);
	c.fill(reeds);
	c.globalAlpha = 0.9;
	c.fill(angler);
	const lift = Math.sin(t * 0.52);
	c.lineWidth = 1.35;
	c.strokeStyle = silt;
	c.beginPath();
	c.moveTo(17, -14);
	c.quadraticCurveTo(47, -37, 78, -43 + lift);
	c.stroke();

	// A slack line ends in one slow pulse on the open water.
	c.lineWidth = 0.8;
	c.globalAlpha = 0.36;
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
