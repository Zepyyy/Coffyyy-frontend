/**
 * Grain: one page-wide field, three materials at three depths.
 *
 *   blur   - far. A very low-res layer softened by CSS.
 *   dither - middle. An ordered 8x8 dot lattice.
 *   ascii  - near. A lattice of 8x16 tiles holding a fixed page of text.
 *
 * Both lattices are pinned to the page, four columns and two rows per 32px
 * blueprint square. Nothing ever re-rolls: a dot or glyph only holds a tone,
 * and that tone eases over time. So a passing shape fades cells in and out
 * rather than flipping them, which is what stops the dither from blinking.
 *
 * Scenes draw silhouettes in plain Canvas2D, in CSS pixels, with alpha as tone.
 */

export type Box = { x: number; y: number; w: number; h: number };

export type SceneEnv = {
	/** Seconds since the field started. Never jumps. */
	t: number;
	dt: number;
	/** Field size in CSS pixels. */
	W: number;
	H: number;
	/** Pointer in field space; `a` eases 0 (absent) to 1 (present). */
	pointer: { x: number; y: number; a: number };
	/** Live rects of `[data-grain-anchor="name"]` elements in field space. */
	anchors: Record<string, Box>;
};

export type Layers = {
	blur: CanvasRenderingContext2D;
	dither: CanvasRenderingContext2D;
	ascii: CanvasRenderingContext2D;
};

/** Draw with black at the wanted alpha. Erase with destination-out. */
export type Scene = (layers: Layers, env: SceneEnv) => void;

const FRAME_MS = 1000 / 24;
const ASCII_CW = 8;
const ASCII_CH = 16;
const BLUR_CELL = 16;
const DOT = 2;
/** Tone easing, seconds. Slow enough that no cell can pop between frames. */
const ATTACK = 0.09;
const DECAY = 0.26;
/** Hard limit on tone change per second: a cell cannot pop at any frame rate. */
const MAX_SLEW = 1.4;
/** Width of the soft threshold: dots fade across this band, never flip. */
const DITHER_BAND = 0.16;
const STILL_T = 30;
const TONE_LEVELS = 14;
/** Close enough to its target that a cell stops costing anything. */
const SETTLED = 0.0025;

const glyphCache = new Map<number, string>();
const glyphChar = (code: number) => {
	let ch = glyphCache.get(code);
	if (!ch) {
		ch = String.fromCharCode(code);
		glyphCache.set(code, ch);
	}
	return ch;
};

const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const t = clamp((v - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};

function hash(n: number) {
	let h = Math.imul(n | 0, 2654435761);
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function bayer(n: number): number[][] {
	if (n === 1) return [[0]];
	const p = bayer(n / 2);
	const s = n / 2;
	const m = Array.from({ length: n }, () => new Array<number>(n).fill(0));
	for (let y = 0; y < s; y++)
		for (let x = 0; x < s; x++) {
			const v = 4 * p[y][x];
			m[y][x] = v;
			m[y][x + s] = v + 2;
			m[y + s][x] = v + 3;
			m[y + s][x + s] = v + 1;
		}
	return m;
}
const BAYER = new Float32Array(64);
bayer(8).forEach((row, y) =>
	row.forEach((v, x) => {
		BAYER[y * 8 + x] = (v + 0.5) / 64;
	}),
);

type Rgb = [number, number, number];
type Palette = { ink: Rgb; paper: Rgb; accent: Rgb; gain: number };

function colorReader() {
	const c = document.createElement("canvas");
	c.width = c.height = 1;
	const g = c.getContext("2d", { willReadFrequently: true });
	return (css: string, fallback: Rgb): Rgb => {
		if (!g || !css) return fallback;
		g.clearRect(0, 0, 1, 1);
		// A colour this canvas cannot parse leaves the sentinel in place.
		g.fillStyle = "#010203";
		g.fillStyle = css;
		if (g.fillStyle === "#010203") return fallback;
		g.fillRect(0, 0, 1, 1);
		const d = g.getImageData(0, 0, 1, 1).data;
		return [d[0], d[1], d[2]];
	};
}

const rgb = (c: Rgb) => `rgb(${c[0]} ${c[1]} ${c[2]})`;

type Source = {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	w: number;
	h: number;
	cur: Float32Array;
	quiet: Float32Array;
	/** Cells that changed this frame; x1 < x0 means nothing did. */
	x0: number;
	y0: number;
	x1: number;
	y1: number;
};

function makeSource(): Source {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("no 2d context");
	return {
		canvas,
		ctx,
		w: 0,
		h: 0,
		cur: new Float32Array(0),
		quiet: new Float32Array(0),
		x0: 0,
		y0: 0,
		x1: -1,
		y1: -1,
	};
}

export type GrainOptions = {
	root: HTMLElement;
	dither: HTMLCanvasElement;
	ascii: HTMLCanvasElement;
	blur: HTMLCanvasElement;
	scene: Scene;
	text: string;
};

export type GrainEngine = {
	setScene: (scene: Scene) => void;
	setText: (text: string) => void;
	setMotion: (on: boolean) => void;
	layout: () => void;
	refreshPalette: () => void;
	/** Test hook: tone statistics for the anti-blink check. */
	stats: () => { alive: number; maxStep: number };
	dispose: () => void;
};

export function createGrain(options: GrainOptions): GrainEngine {
	const { root } = options;
	let scene = options.scene;
	let text = options.text;
	const ditherOut = options.dither.getContext("2d");
	const asciiOut = options.ascii.getContext("2d");
	const blurOut = options.blur.getContext("2d");
	if (!ditherOut || !asciiOut || !blurOut) throw new Error("no 2d context");

	const dither = makeSource();
	const ascii = makeSource();
	const readColor = colorReader();
	const buckets: number[][] = Array.from({ length: TONE_LEVELS }, () => []);

	let W = 0;
	let H = 0;
	let dpr = 1;
	let ditherImage: ImageData | null = null;
	let ditherScale = 0.5;
	let cols = 0;
	let rows = 0;
	let glyphs = new Uint16Array(0);
	let fontFamily = "monospace";
	let palette: Palette = {
		ink: [90, 80, 70],
		paper: [252, 251, 248],
		accent: [180, 130, 80],
		gain: 1,
	};
	let anchors: Record<string, Box> = {};
	let quietKey = "";
	let lastScan = 0;

	const pointer = { x: 0, y: 0, a: 0 };
	let pointerOn = false;
	let motion = true;
	let visible = true;
	let disposed = false;
	let raf = 0;
	let last = 0;
	let lastDraw = 0;
	let clock = 0;
	let maxStep = 0;
	let settled = false;

	function readPalette() {
		const cs = getComputedStyle(root);
		palette = {
			ink: readColor(cs.getPropertyValue("--grain-ink").trim(), palette.ink),
			paper: readColor(cs.getPropertyValue("--paper").trim(), palette.paper),
			accent: readColor(cs.getPropertyValue("--accent").trim(), palette.accent),
			gain: Number.parseFloat(cs.getPropertyValue("--grain-gain")) || 1,
		};
		fontFamily = cs.fontFamily || "monospace";
	}

	function resizeSource(s: Source, w: number, h: number) {
		s.w = w;
		s.h = h;
		s.canvas.width = w;
		s.canvas.height = h;
		s.cur = new Float32Array(w * h);
		s.quiet = new Float32Array(w * h);
	}

	/** Rebuilds each lattice's letters so that rows read as running text. */
	function buildGlyphs() {
		glyphs = new Uint16Array(cols * rows);
		const len = Math.max(1, text.length);
		for (let r = 0; r < rows; r++) {
			const offset = Math.floor(hash(r + 11) * len);
			for (let q = 0; q < cols; q++)
				glyphs[r * cols + q] = text.charCodeAt((offset + q) % len) || 32;
		}
	}

	function scanDom() {
		const base = root.getBoundingClientRect();
		const rel = (el: Element): Box => {
			const r = el.getBoundingClientRect();
			return {
				x: r.left - base.left,
				y: r.top - base.top,
				w: r.width,
				h: r.height,
			};
		};
		const next: Record<string, Box> = {};
		for (const el of document.querySelectorAll("[data-grain-anchor]")) {
			const name = el.getAttribute("data-grain-anchor");
			if (name) next[name] = rel(el);
		}
		anchors = next;

		// `data-grain-quiet` thins the field around small text. A value below 1
		// only dims it, for display type that can stand on top of a shape.
		const zones = [...document.querySelectorAll("[data-grain-quiet]")]
			.map((el) => ({
				...rel(el),
				depth:
					Number.parseFloat(el.getAttribute("data-grain-quiet") ?? "") || 1,
			}))
			.filter((b) => b.w > 0 && b.h > 0);
		const key = `${W}x${H}:${zones
			.map((b) => `${b.x | 0},${b.y | 0},${b.w | 0},${b.h | 0},${b.depth}`)
			.join(";")}`;
		if (key === quietKey) return;
		quietKey = key;
		for (const [s, cw, ch] of [
			[dither, W / dither.w, H / dither.h],
			[ascii, ASCII_CW, ASCII_CH],
		] as const) {
			for (let j = 0; j < s.h; j++) {
				const y = (j + 0.5) * ch;
				for (let i = 0; i < s.w; i++) {
					const x = (i + 0.5) * cw;
					let m = smooth(0, 90, H - y);
					for (const b of zones) {
						const dx = Math.max(b.x - x, 0, x - b.x - b.w);
						const dy = Math.max(b.y - y, 0, y - b.y - b.h);
						m *=
							1 - b.depth * (1 - smooth(0, 28, Math.sqrt(dx * dx + dy * dy)));
					}
					s.quiet[j * s.w + i] = m;
				}
			}
		}
	}

	function layout() {
		W = root.clientWidth;
		H = root.clientHeight;
		if (!W || !H) return;
		dpr = Math.min(window.devicePixelRatio || 1, 2.5);

		// Whole device pixels per dot, so fractional DPRs cannot moire.
		const dot = Math.max(1, Math.round(DOT * dpr));
		const dw = Math.ceil((W * dpr) / dot);
		const dh = Math.ceil((H * dpr) / dot);
		ditherScale = dw / W;
		resizeSource(dither, dw, dh);
		options.dither.width = dw;
		options.dither.height = dh;
		options.dither.style.width = `${(dw * dot) / dpr}px`;
		options.dither.style.height = `${(dh * dot) / dpr}px`;
		ditherImage = ditherOut?.createImageData(dw, dh) ?? null;

		cols = Math.ceil(W / ASCII_CW);
		rows = Math.ceil(H / ASCII_CH);
		resizeSource(ascii, cols, rows);
		options.ascii.width = Math.round(W * dpr);
		options.ascii.height = Math.round(H * dpr);

		options.blur.width = Math.ceil(W / BLUR_CELL);
		options.blur.height = Math.ceil(H / BLUR_CELL);

		readPalette();
		buildGlyphs();
		quietKey = "";
		scanDom();
		settled = true;
		if (!motion) renderStill();
	}

	function prepare(c: CanvasRenderingContext2D, sx: number, sy: number) {
		c.setTransform(1, 0, 0, 1, 0, 0);
		c.globalCompositeOperation = "source-over";
		c.globalAlpha = 1;
		c.filter = "none";
		c.clearRect(0, 0, c.canvas.width, c.canvas.height);
		c.setTransform(sx, 0, 0, sy, 0, 0);
		c.fillStyle = "#000";
		c.strokeStyle = "#000";
	}

	function ease(s: Source, dt: number, instant: boolean) {
		const data = s.ctx.getImageData(0, 0, s.w, s.h).data;
		const up = instant ? 1 : 1 - Math.exp(-dt / ATTACK);
		const down = instant ? 1 : 1 - Math.exp(-dt / DECAY);
		const limit = instant ? 1 : MAX_SLEW * dt;
		const { cur, quiet, w, h } = s;
		let x0 = w;
		let y0 = h;
		let x1 = -1;
		let y1 = -1;
		for (let y = 0, i = 0; y < h; y++) {
			for (let x = 0; x < w; x++, i++) {
				const c = cur[i];
				const alpha = data[i * 4 + 3];
				if (alpha === 0 && c === 0) continue;
				const target = (alpha / 255) * quiet[i];
				const move = (target - c) * (target > c ? up : down);
				let next = c + (move > limit ? limit : move < -limit ? -limit : move);
				if (Math.abs(target - next) < SETTLED) next = target;
				if (next === c) continue;
				// Reported per nominal frame, so slow machines compare fairly.
				const step = (Math.abs(next - c) * (FRAME_MS / 1000)) / (dt || 1);
				if (step > maxStep && !instant) maxStep = step;
				cur[i] = next;
				if (x < x0) x0 = x;
				if (x > x1) x1 = x;
				if (y < y0) y0 = y;
				y1 = y;
			}
		}
		s.x0 = x0;
		s.y0 = y0;
		s.x1 = x1;
		s.y1 = y1;
	}

	function paintDither() {
		if (!ditherImage || !ditherOut || dither.x1 < dither.x0) return;
		const { w, cur, x0, y0, x1, y1 } = dither;
		const out = ditherImage.data;
		const [r, g, b] = palette.ink;
		const ink = 0.62 * palette.gain * 255;
		for (let y = y0; y <= y1; y++) {
			const row = (y & 7) * 8;
			for (let x = x0; x <= x1; x++) {
				const i = y * w + x;
				const v = cur[i];
				let a = 0;
				if (v > 0.003) {
					// Soft threshold: a dot's alpha moves with the tone it holds.
					const t = (v - BAYER[row + (x & 7)]) / DITHER_BAND + 0.5;
					a = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
				}
				const o = i * 4;
				out[o] = r;
				out[o + 1] = g;
				out[o + 2] = b;
				out[o + 3] = a * ink;
			}
		}
		ditherOut.putImageData(ditherImage, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
	}

	function paintAscii() {
		if (!asciiOut || ascii.x1 < ascii.x0) return;
		const c = asciiOut;
		const { cur } = ascii;
		// One cell of margin, because a wide glyph can overhang its tile.
		const x0 = Math.max(0, ascii.x0 - 1);
		const y0 = Math.max(0, ascii.y0 - 1);
		const x1 = Math.min(cols - 1, ascii.x1 + 1);
		const y1 = Math.min(rows - 1, ascii.y1 + 1);
		c.setTransform(dpr, 0, 0, dpr, 0, 0);
		c.clearRect(
			x0 * ASCII_CW,
			y0 * ASCII_CH,
			(x1 - x0 + 1) * ASCII_CW,
			(y1 - y0 + 1) * ASCII_CH,
		);
		for (const list of buckets) list.length = 0;
		for (let r = y0; r <= y1; r++)
			for (let q = x0; q <= x1; q++) {
				const v = cur[r * cols + q];
				if (v > 0.02)
					buckets[Math.min(TONE_LEVELS - 1, (v * TONE_LEVELS) | 0)].push(
						r * cols + q,
					);
			}
		const gain = palette.gain;
		// Tiles first, one pass per tone level, so fill state changes stay cheap.
		c.fillStyle = rgb(palette.ink);
		for (let level = 0; level < TONE_LEVELS; level++) {
			const list = buckets[level];
			if (list.length === 0) continue;
			const v = (level + 0.5) / TONE_LEVELS;
			c.globalAlpha = v * v * 0.8 * gain;
			c.beginPath();
			for (const i of list)
				c.rect(
					(i % cols) * ASCII_CW,
					((i / cols) | 0) * ASCII_CH,
					ASCII_CW - 1,
					ASCII_CH - 1,
				);
			c.fill();
		}
		// Glyphs sit on fixed positions, so text can never shimmer sub-pixel.
		c.font = `12.5px ${fontFamily}`;
		c.textAlign = "center";
		c.textBaseline = "middle";
		c.fillStyle = rgb(palette.ink);
		let inverted = false;
		for (let level = 0; level < TONE_LEVELS; level++) {
			const list = buckets[level];
			if (list.length === 0) continue;
			const v = (level + 0.5) / TONE_LEVELS;
			if (v > 0.6 && !inverted) {
				inverted = true;
				c.fillStyle = rgb(palette.paper);
			}
			c.globalAlpha = inverted
				? smooth(0.6, 0.72, v)
				: Math.min(1, smooth(0.04, 0.3, v) * 0.85 * gain);
			for (const i of list) {
				const code = glyphs[i];
				if (code === 32) continue;
				c.fillText(
					glyphChar(code),
					((i % cols) + 0.5) * ASCII_CW,
					(((i / cols) | 0) + 0.5) * ASCII_CH + 0.5,
				);
			}
		}
		c.globalAlpha = 1;
	}

	function tintBlur() {
		if (!blurOut) return;
		blurOut.setTransform(1, 0, 0, 1, 0, 0);
		blurOut.globalCompositeOperation = "source-in";
		blurOut.globalAlpha = palette.gain;
		blurOut.fillStyle = rgb(palette.ink);
		blurOut.fillRect(0, 0, options.blur.width, options.blur.height);
		blurOut.globalCompositeOperation = "source-over";
		blurOut.globalAlpha = 1;
	}

	function render(t: number, dt: number, instant: boolean) {
		if (!W || !H || !blurOut) return;
		prepare(dither.ctx, ditherScale, ditherScale);
		prepare(ascii.ctx, 1 / ASCII_CW, 1 / ASCII_CH);
		prepare(blurOut, 1 / BLUR_CELL, 1 / BLUR_CELL);
		scene(
			{ blur: blurOut, dither: dither.ctx, ascii: ascii.ctx },
			{ t, dt, W, H, pointer, anchors },
		);
		ease(dither, dt, instant);
		ease(ascii, dt, instant);
		paintDither();
		paintAscii();
		tintBlur();
	}

	function repaint() {
		for (const s of [dither, ascii]) {
			s.x0 = 0;
			s.y0 = 0;
			s.x1 = s.w - 1;
			s.y1 = s.h - 1;
		}
		paintDither();
		paintAscii();
	}

	function renderStill() {
		render(STILL_T, 0, true);
		repaint();
	}

	function loop(now: number) {
		raf = 0;
		if (!motion || !visible || disposed || document.hidden) return;
		raf = requestAnimationFrame(loop);
		if (now - lastDraw < FRAME_MS) return;
		const dt = Math.min(0.1, last ? (now - last) / 1000 : FRAME_MS / 1000);
		last = now;
		lastDraw = now;
		clock += dt;
		pointer.a += ((pointerOn ? 1 : 0) - pointer.a) * (1 - Math.exp(-dt * 3));
		if (now - lastScan > 900) {
			lastScan = now;
			scanDom();
		}
		render(clock, dt, false);
	}

	function start() {
		if (motion && visible && !disposed && !raf && !document.hidden) {
			last = 0;
			raf = requestAnimationFrame(loop);
		}
	}
	function stop() {
		if (raf) cancelAnimationFrame(raf);
		raf = 0;
	}

	const onPointer = (e: PointerEvent) => {
		if (e.pointerType !== "mouse" && e.type === "pointermove") return;
		const b = root.getBoundingClientRect();
		pointer.x = e.clientX - b.left;
		pointer.y = e.clientY - b.top;
		pointerOn = true;
	};
	const onLeave = () => {
		pointerOn = false;
	};
	const onRelease = (e: PointerEvent) => {
		if (e.pointerType !== "mouse") pointerOn = false;
	};
	const onVisibility = () => {
		if (document.hidden) stop();
		else start();
	};
	window.addEventListener("pointermove", onPointer, { passive: true });
	window.addEventListener("pointerdown", onPointer, { passive: true });
	window.addEventListener("pointerup", onRelease, { passive: true });
	window.addEventListener("pointercancel", onRelease, { passive: true });
	document.documentElement.addEventListener("pointerleave", onLeave);
	document.addEventListener("visibilitychange", onVisibility);
	const io = new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		if (visible) start();
		else stop();
	});
	io.observe(root);

	document.fonts?.ready.then(() => {
		if (disposed) return;
		readPalette();
		repaint();
	});

	return {
		setScene(next) {
			scene = next;
			if (!motion) renderStill();
		},
		setText(next) {
			text = next;
			buildGlyphs();
			repaint();
		},
		setMotion(on) {
			motion = on;
			if (on) start();
			else {
				stop();
				if (settled) renderStill();
			}
		},
		layout,
		refreshPalette() {
			readPalette();
			repaint();
		},
		stats() {
			let alive = 0;
			for (const v of dither.cur) if (v > 0.02) alive++;
			const step = maxStep;
			maxStep = 0;
			return { alive, maxStep: step };
		},
		dispose() {
			disposed = true;
			stop();
			io.disconnect();
			window.removeEventListener("pointermove", onPointer);
			window.removeEventListener("pointerdown", onPointer);
			window.removeEventListener("pointerup", onRelease);
			window.removeEventListener("pointercancel", onRelease);
			document.documentElement.removeEventListener("pointerleave", onLeave);
			document.removeEventListener("visibilitychange", onVisibility);
		},
	};
}
