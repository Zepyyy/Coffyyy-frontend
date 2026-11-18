/**
 * Grain: one page-wide field of 1px dots, dithered on the GPU (dither-gl.ts).
 * Colour keeps its hue; lightness snaps to a few steps through blue noise
 * pinned to the page, and dots ease between steps so the field never blinks.
 *
 * Scenes draw in plain Canvas2D, in CSS pixels. Alpha is coverage and colour is
 * hue: black means the page's ink, a colour pulls the dot toward itself. Paint
 * real colour and shading; the dither supplies the texture.
 */

import {
	createDitherGL,
	type DitherGL,
	type Mask,
	type Zone,
} from "./dither-gl";

export type Box = { x: number; y: number; w: number; h: number };

/** Shared journal column. Keep in sync with .journal-page in index.css. */
export function backgroundFrame(W: number, content: Box): Box {
	if (W < 640) return content;
	const gutter = Math.max(40, Math.min(152, W * 0.1875 - 80));
	const w = Math.min(976, Math.max(0, W - 2 * gutter));
	return { ...content, x: (W - w) / 2, w };
}

export type SceneEnv = {
	/** Seconds since the field started. Never jumps. */
	t: number;
	dt: number;
	/** Field size in CSS pixels. */
	W: number;
	H: number;
	/** Pointer in field space; `a` eases 0 (absent) to 1 (present). */
	pointer: { x: number; y: number; a: number };
	/** Live content rects, plus a shared horizontal `frame` for scene sizing. */
	anchors: Record<string, Box>;
	/** Dark paper: dots read lighter, so colours usually need their own values. */
	dark: boolean;
};

export type Layers = {
	dither: CanvasRenderingContext2D;
};

/** Draw with black (ink) or a colour at the wanted alpha. Erase with destination-out. */
export type Scene = (layers: Layers, env: SceneEnv) => void;

/**
 * The owner's print. Fine (1px dots, blue noise) dissolves into continuous
 * tone, like an engraving. Coarse (2px dots, an ordered Bayer lattice) is the
 * original stitched look: line work turns to beads and pale fills to lace.
 */
export type Print = "fine" | "coarse";
type Material = {
	/** CSS pixels per dot, before rounding to whole device pixels. */
	dot: number;
	mask: Mask;
	/** Coverage response; below 1 lifts faint fills toward strong lines. */
	coverage?: number;
};
const MATERIALS: Record<Print, Material> = {
	fine: { dot: 1, mask: "blue" },
	coarse: { dot: 2, mask: "bayer", coverage: 0.8 },
};

/**
 * Frame pacing: the display's rate while frames are cheap, stepping down only
 * when the main thread is genuinely loaded. A fixed 24fps reads as lag.
 * Each entry: [ms between frames, average cost (ms) that moves down a tier].
 */
const TIERS: [number, number][] = [
	[0, 7],
	[1000 / 30, 11],
	[1000 / 20, Number.POSITIVE_INFINITY],
];
const FRAME_MS = 1000 / 60;
/** Cost below which a tier steps back up. */
const RECOVER_BELOW = 4;
/** After a scene or theme change, dots stop holding old steps for this long. */
const RELEASE_S = 0.6;
const STILL_T = 30;
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

export type GrainOptions = {
	root: HTMLElement;
	dither: HTMLCanvasElement;
	scene: Scene;
	print?: Print;
};

export type GrainEngine = {
	setScene: (scene: Scene) => void;
	setPrint: (print: Print) => void;
	setMotion: (on: boolean) => void;
	layout: () => void;
	refreshPalette: () => void;
	refreshContent: () => void;
	/** Test hook: frames drawn so far. Cheap; no GPU readback. */
	stats: () => { frames: number };
	/** Test hook: each dot's displayed step, 0..255, GL rows bottom-up. */
	steps: () => { w: number; h: number; data: Uint8Array };
	dispose: () => void;
};

export function createGrain(options: GrainOptions): GrainEngine {
	const { root } = options;
	let scene = options.scene;
	// The scene's drawing goes straight to a GPU texture, so keep it on the GPU.
	const source = document.createElement("canvas");
	const maybeCtx = source.getContext("2d");
	if (!maybeCtx) throw new Error("no 2d context");
	const ctx: CanvasRenderingContext2D = maybeCtx;
	const readColor = colorReader();
	// Dev only: `?grainDots=fine` keeps 1px dots on software WebGL, for stills.
	const devParams = import.meta.env.DEV
		? new URLSearchParams(location.search)
		: new URLSearchParams();
	const fine = devParams.get("grainDots") === "fine";
	// Dev only: `?grainDot=2&grainMask=bayer&grainCoverage=0.8` overrides the
	// print, to compare materials side by side.
	const materialOf = (p: Print): Material => {
		const base = MATERIALS[p];
		const dot = Number(devParams.get("grainDot")) || base.dot;
		const m = devParams.get("grainMask");
		const cov = Number(devParams.get("grainCoverage")) || base.coverage;
		return {
			dot,
			mask: m === "bayer" || m === "blue" ? m : base.mask,
			coverage: cov,
		};
	};
	let material = materialOf(options.print ?? "fine");

	let W = 0;
	let H = 0;
	let dpr = 1;
	let ditherScale = 1;
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
	let aimX = 0;
	let aimY = 0;
	let pointerOn = false;
	let motion = true;
	let visible = true;
	let disposed = false;
	let raf = 0;
	let last = 0;
	let lastDraw = 0;
	let clock = 0;
	let frames = 0;
	let tier = 0;
	let releaseUntil = 0;
	/** Smoothed main-thread cost of a frame, ms. */
	let cost = 0;
	let settled = false;
	const gl: DitherGL = createDitherGL(options.dither, () => {
		layout();
		if (motion) render(clock, 0, true);
	});

	function readPalette() {
		const cs = getComputedStyle(root);
		palette = {
			ink: readColor(cs.getPropertyValue("--grain-ink").trim(), palette.ink),
			paper: readColor(cs.getPropertyValue("--paper").trim(), palette.paper),
			accent: readColor(cs.getPropertyValue("--accent").trim(), palette.accent),
			gain: Number.parseFloat(cs.getPropertyValue("--grain-gain")) || 1,
		};
		gl.setPalette({ ...palette, dark: isDark() });
	}

	const isDark = () => document.documentElement.classList.contains("dark");

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
		if (next.content) {
			const page = document.querySelector(".journal-page");
			next.frame = page ? rel(page) : backgroundFrame(W, next.content);
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
		gl.setZones(zones as Zone[], 1 / ditherScale, H);
	}

	function layout() {
		W = root.clientWidth;
		H = root.clientHeight;
		if (!W || !H) return;
		dpr = Math.min(window.devicePixelRatio || 1, 2.5);

		// Whole device pixels per dot, so fractional DPRs cannot moire. Software
		// WebGL gets dots twice as wide: a quarter of the pixels to move.
		const dot =
			Math.max(1, Math.round(material.dot * dpr)) *
			(gl.software && !fine && material.dot < 2 ? 2 : 1);
		gl.setMask(material.mask, material.coverage);
		const dw = Math.ceil((W * dpr) / dot);
		const dh = Math.ceil((H * dpr) / dot);
		ditherScale = dw / W;
		source.width = dw;
		source.height = dh;
		gl.resize(dw, dh);
		options.dither.style.width = `${(dw * dot) / dpr}px`;
		options.dither.style.height = `${(dh * dot) / dpr}px`;

		readPalette();
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

	function render(t: number, dt: number, instant: boolean) {
		if (!W || !H) return;
		prepare(ctx, ditherScale, ditherScale);
		scene({ dither: ctx }, { t, dt, W, H, pointer, anchors, dark: isDark() });
		gl.frame(source, dt, instant, clock < releaseUntil ? 0 : 1);
		frames++;
	}

	function renderStill() {
		render(STILL_T, 0, true);
	}

	function loop(now: number) {
		raf = 0;
		if (!motion || !visible || disposed || document.hidden) return;
		raf = requestAnimationFrame(loop);
		// A few ms of slack so a 60Hz tier never skips frames to vsync jitter.
		if (now - lastDraw < TIERS[tier][0] - 2) return;
		const dt = Math.min(0.1, last ? (now - last) / 1000 : FRAME_MS / 1000);
		last = now;
		lastDraw = now;
		clock += dt;
		// Scenes get a pointer with mass, so a flick of the mouse is a slow lean.
		const glide = pointer.a < 0.02 ? 1 : 1 - Math.exp(-dt * 3.5);
		pointer.x += (aimX - pointer.x) * glide;
		pointer.y += (aimY - pointer.y) * glide;
		pointer.a += ((pointerOn ? 1 : 0) - pointer.a) * (1 - Math.exp(-dt * 1.6));
		if (now - lastScan > 900) {
			lastScan = now;
			scanDom();
		}
		const start = performance.now();
		render(clock, dt, false);
		cost += (performance.now() - start - cost) * 0.05;
		if (cost > TIERS[tier][1] && tier < TIERS.length - 1) tier++;
		else if (cost < RECOVER_BELOW && tier > 0) tier--;
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
		aimX = e.clientX - b.left;
		aimY = e.clientY - b.top;
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

	return {
		setScene(next) {
			scene = next;
			releaseUntil = clock + RELEASE_S;
			if (!motion) renderStill();
		},
		setPrint(next) {
			const m = materialOf(next);
			if (
				m.dot === material.dot &&
				m.mask === material.mask &&
				m.coverage === material.coverage
			)
				return;
			material = m;
			// A new lattice: re-dither from the source rather than re-map old dots.
			layout();
			if (motion) render(clock, 0, true);
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
		refreshContent() {
			scanDom();
			if (!motion) renderStill();
		},
		refreshPalette() {
			readPalette();
			releaseUntil = clock + RELEASE_S;
			// Steps are measured from the paper, so a theme change re-dithers at once.
			if (motion) render(clock, 0, true);
			else renderStill();
		},
		stats() {
			return { frames };
		},
		steps() {
			return { w: source.width, h: source.height, data: gl.readSteps() };
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
			gl.dispose();
		},
	};
}
