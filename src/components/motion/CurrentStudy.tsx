import { useCallback, useEffect, useRef, useState } from "react";
import "./CurrentStudy.css";

/* ---------- deterministic coherent noise (seeded Perlin) ---------- */

function mulberry32(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const GX = [1, -1, 1, -1, 0.7071, -0.7071, 0.7071, -0.7071];
const GY = [1, 1, -1, -1, 0.7071, 0.7071, -0.7071, -0.7071];

function makeNoise(seed: number) {
	const rnd = mulberry32(seed);
	const p = new Uint8Array(512);
	const base = Array.from({ length: 256 }, (_, i) => i);
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rnd() * (i + 1));
		[base[i], base[j]] = [base[j], base[i]];
	}
	for (let i = 0; i < 512; i++) p[i] = base[i & 255];

	return (x: number, y: number) => {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const xf = x - xi;
		const yf = y - yi;
		const X = xi & 255;
		const Y = yi & 255;
		const g00 = p[p[X] + Y] & 7;
		const g10 = p[p[X + 1] + Y] & 7;
		const g01 = p[p[X] + Y + 1] & 7;
		const g11 = p[p[X + 1] + Y + 1] & 7;
		const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
		const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
		const n00 = GX[g00] * xf + GY[g00] * yf;
		const n10 = GX[g10] * (xf - 1) + GY[g10] * yf;
		const n01 = GX[g01] * xf + GY[g01] * (yf - 1);
		const n11 = GX[g11] * (xf - 1) + GY[g11] * (yf - 1);
		const a = n00 + u * (n10 - n00);
		const b = n01 + u * (n11 - n01);
		return (a + v * (b - a)) * 1.41;
	};
}

const noise = makeNoise(20261030);

/* ---------- tuning ---------- */

const INK_LEVELS = 12;
const HOT_LEVELS = 10;
const STRAND_SPACING = 2.7; // px between strands in free flow
const SAMPLE_STEP = 5; // px between samples along a strand (6 when wide)
const STILL_T = 11.4; // frozen frame for reduced motion
const THREADS = [0.16, 0.31, 0.47, 0.62, 0.79];
const RIPPLE_LIFE = 2.6;

type Palette = { ink: string; accent: string; dark: boolean };
type Ripple = { x: number; y: number; age: number; amp: number };

const clamp = (v: number, lo: number, hi: number) =>
	v < lo ? lo : v > hi ? hi : v;
const smooth = (a: number, b: number, v: number) => {
	const t = clamp((v - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
/** Per-strand grain: stable 0.5..1 multiplier so some threads sit fainter. */
const grain = (i: number) => {
	const h = Math.sin(i * 12.9898) * 43758.5453;
	return 0.5 + 0.5 * (h - Math.floor(h));
};

function readPalette(el: HTMLElement, ctx: CanvasRenderingContext2D): Palette {
	const cs = getComputedStyle(el);
	const resolve = (name: string, fallback: string) => {
		const raw = cs.getPropertyValue(name).trim();
		if (!raw) return fallback;
		ctx.fillStyle = "#010203";
		ctx.fillStyle = raw;
		// An unparseable value leaves the sentinel behind.
		return ctx.fillStyle === "#010203" ? fallback : raw;
	};
	const ink = resolve("--cs-ink", "#2a2622");
	const raised = resolve("--cs-raised", "#fffefb");
	ctx.fillStyle = raised;
	ctx.save();
	ctx.fillRect(0, 0, 1, 1);
	const pixel = ctx.getImageData(0, 0, 1, 1).data;
	const lum = (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
	ctx.restore();
	return { ink, accent: resolve("--cs-accent", "#b7864f"), dark: lum < 0.5 };
}

type Sim = {
	/** Draw one frame at time t (seconds). */
	draw: (t: number) => void;
	/** Advance dynamics by dt seconds. */
	step: (dt: number) => void;
	resize: () => void;
	readout: () => { pull: number; draw: number };
	status: () => "rest" | "follow" | "draw" | "released";
	pulse: (x: number, y: number) => void;
	hold: (on: boolean) => void;
	dispose: () => void;
};

function createSim(
	root: HTMLElement,
	canvas: HTMLCanvasElement,
	action: HTMLElement | null,
	interactive: boolean,
): Sim {
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("no 2d context");

	let W = 0;
	let H = 0;
	let N = 0;
	let M = 0;
	let dx = SAMPLE_STEP;
	let ys = new Float32Array(0);
	let palette = readPalette(root, ctx);
	let paletteAge = 0;

	// pointer / press dynamics
	let tx = 0; // target pointer x,y
	let ty = 0;
	let px = 0; // smoothed
	let py = 0;
	let s = 0; // follow strength 0..1 (slow return)
	let active = false;
	let lingerUntil = 0;
	let press = 0; // spring value
	let pressV = 0;
	let pressed = false;
	let downAt = 0;
	let downX = 0;
	let downY = 0;
	let released = 0; // seconds since a release, for status
	let gx = 0; // ambient attractor
	let gy = 0;
	let gPull = 0;
	let holding = false;
	let clock = 0;
	const ripples: Ripple[] = [];

	const resize = () => {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = root.clientWidth;
		H = root.clientHeight;
		canvas.width = Math.max(1, Math.round(W * dpr));
		canvas.height = Math.max(1, Math.round(H * dpr));
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		N = Math.round(clamp((H * 0.8) / STRAND_SPACING, 48, 120));
		dx = W > 700 ? SAMPLE_STEP + 1 : SAMPLE_STEP;
		M = Math.ceil(W / dx) + 1;
		ys = new Float32Array(N * M);
		palette = readPalette(root, ctx);
		if (!px && !py) {
			px = tx = W * 0.5;
			py = ty = H * 0.5;
		}
	};

	const field = (t: number) => {
		const spread = 0.8;
		const sigma0 = 0.27 * W;
		const sigmaP = sigma0 * (1 - 0.38 * clamp(press, 0, 1.2));
		const pPull = clamp(s * 0.5 + press * 0.46, -0.7, 1);
		const gSig = 0.2 * W;
		const gP = gPull;
		const k2 = 1 / (2 * sigmaP * sigmaP);
		const g2 = 1 / (2 * gSig * gSig);
		const front0 = 430; // ripple px/s
		const ripSig = 0.1 * W + 24;
		for (let i = 0; i < N; i++) {
			const v = (i + 0.5) / N;
			const baseY = H * (0.5 + (v - 0.5) * spread);
			const row = i * M;
			for (let j = 0; j < M; j++) {
				const x = j * dx;
				const u = x / W;
				const w1 = noise(u * 1.5 - t * 0.04, v * 1.9 + t * 0.021);
				const w2 = noise(
					u * 3.3 - t * 0.075 + 7.3 + w1 * 0.7,
					v * 3.2 - t * 0.032 + 3.1,
				);
				let y = baseY + H * (0.2 * w1 + 0.075 * w2);

				// ambient attractor
				if (gP > 0.001) {
					const d = x - gx;
					y += (gy - y) * gP * Math.exp(-d * d * g2);
				}
				// pointer bend / press draw
				if (pPull !== 0) {
					const d = x - px;
					y += (py - y) * pPull * Math.exp(-d * d * k2);
				}
				// transients
				for (let r = 0; r < ripples.length; r++) {
					const rp = ripples[r];
					const rx = x - rp.x;
					const ry = y - rp.y;
					const dist = Math.sqrt(rx * rx + ry * ry);
					const off = dist - rp.age * front0;
					const env = Math.exp(-(off * off) / (ripSig * ripSig));
					if (env > 0.01) {
						y +=
							rp.amp *
							H *
							0.1 *
							env *
							Math.sin(off * 0.05) *
							Math.exp(-rp.age / 0.95);
					}
				}
				ys[row + j] = y;
			}
		}
	};

	const draw = (t: number) => {
		if (!W || !H) return;
		if (paletteAge++ % 45 === 0) palette = readPalette(root, ctx);
		field(t);
		ctx.clearRect(0, 0, W, H);
		const dark = palette.dark;
		const baseGap = (H * 0.8) / N;
		const sheenC = ((t * 0.032) % 1.5) - 0.25;

		// 1. ribbons: soft satin bodies between groups of strands
		const ribbonAlpha = dark ? 0.07 : 0.05;
		const ribbons = [
			[0.04, 0.17, 0],
			[0.2, 0.27, 1],
			[0.33, 0.5, 0],
			[0.54, 0.6, 1],
			[0.63, 0.78, 0],
			[0.8, 0.95, 0],
		] as const;
		for (const [a, b, hot] of ribbons) {
			const ia = Math.floor(a * (N - 1));
			const ib = Math.floor(b * (N - 1));
			const p = new Path2D();
			p.moveTo(0, ys[ia * M]);
			for (let j = 1; j < M; j++) p.lineTo(j * dx, ys[ia * M + j]);
			for (let j = M - 1; j >= 0; j--) p.lineTo(j * dx, ys[ib * M + j]);
			p.closePath();
			ctx.globalAlpha = hot ? ribbonAlpha * 1.5 : ribbonAlpha;
			ctx.fillStyle = hot ? palette.accent : palette.ink;
			ctx.fill(p);
		}

		// 2. fine strands, bucketed by alpha / density so each frame is ~12 strokes
		const inkPaths = Array.from({ length: INK_LEVELS }, () => new Path2D());
		const hotPaths = Array.from({ length: HOT_LEVELS }, () => new Path2D());
		const gain = dark ? 0.8 : 1;
		for (let i = 0; i < N - 1; i++) {
			const g = grain(i);
			const row = i * M;
			let prevKey = -1;
			for (let j = 0; j < M - 1; j++) {
				const gap = Math.abs(ys[row + M + j] - ys[row + j]) + baseGap * 0.08;
				const d = baseGap / gap; // >1 bunched, <1 spread
				const x0 = j * dx;
				const sheen = 0.78 + 0.5 * Math.exp(-((x0 / W - sheenC) ** 2) / 0.02);
				const hot = smooth(1.3, 4.2, d);
				let key: number;
				let path: Path2D;
				if (hot > 0.03) {
					const lv = Math.min(HOT_LEVELS - 1, Math.floor(hot * HOT_LEVELS));
					key = 100 + lv;
					path = hotPaths[lv];
				} else {
					const a = clamp(
						(0.1 + 0.34 * smooth(0.3, 1.9, d)) * g * sheen * gain,
						0,
						0.62,
					);
					const lv = Math.min(
						INK_LEVELS - 1,
						Math.floor((a / 0.62) * INK_LEVELS),
					);
					key = lv;
					path = inkPaths[lv];
				}
				if (key !== prevKey) path.moveTo(x0, ys[row + j]);
				path.lineTo(x0 + dx, ys[row + j + 1]);
				prevKey = key;
			}
		}
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.lineWidth = 0.75;
		ctx.strokeStyle = palette.ink;
		for (let lv = 0; lv < INK_LEVELS; lv++) {
			ctx.globalAlpha = ((lv + 0.5) / INK_LEVELS) * 0.62;
			ctx.stroke(inkPaths[lv]);
		}
		ctx.strokeStyle = palette.accent;
		for (let lv = 0; lv < HOT_LEVELS; lv++) {
			ctx.globalAlpha = 0.14 + 0.62 * ((lv + 1) / HOT_LEVELS);
			ctx.stroke(hotPaths[lv]);
		}

		// 3. caramel threads: a few strands carried through the whole field
		ctx.strokeStyle = palette.accent;
		ctx.lineWidth = 1.35;
		ctx.globalAlpha = dark ? 0.8 : 0.72;
		for (const f of THREADS) {
			const i = Math.min(N - 1, Math.floor(f * N));
			const p = new Path2D();
			p.moveTo(0, ys[i * M]);
			for (let j = 1; j < M; j++) p.lineTo(j * dx, ys[i * M + j]);
			ctx.stroke(p);
		}
		ctx.globalAlpha = 1;
	};

	const step = (dt: number) => {
		clock += dt;
		// follow: slow in, slower out
		if (active && clock > lingerUntil && lingerUntil > 0 && !pressed) {
			// touch linger ended
			active = false;
			lingerUntil = 0;
		}
		const sTarget = active || pressed ? 1 : 0;
		const rate = sTarget > s ? 2.4 : 0.55;
		s += (sTarget - s) * (1 - Math.exp(-rate * dt));
		if (s < 0.002 && sTarget === 0) s = 0;
		const pf = 1 - Math.exp(-6 * dt);
		px += (tx - px) * pf;
		py += (ty - py) * pf;

		// press spring: smooth draw-in, underdamped release
		const k = 46;
		const c = pressed ? 2 * Math.sqrt(k) * 0.95 : 2 * Math.sqrt(k) * 0.26;
		pressV += (k * ((pressed ? 1 : 0) - press) - c * pressV) * dt;
		press += pressV * dt;
		if (!pressed && Math.abs(press) < 0.002 && Math.abs(pressV) < 0.01) {
			press = 0;
			pressV = 0;
		}
		released += dt;

		// ambient wanderer, replaced by the pointer as it arrives
		const wx = W * (0.5 + 0.3 * Math.sin(clock * 0.13 + 0.6));
		const wy = H * (0.5 + 0.2 * Math.sin(clock * 0.19));
		const hx = action ? action.offsetLeft + action.offsetWidth / 2 : wx;
		const hy = H - 38;
		const tgx = holding ? hx : wx;
		const tgy = holding ? hy : wy;
		gx += (tgx - gx) * (1 - Math.exp(-0.9 * dt));
		gy += (tgy - gy) * (1 - Math.exp(-0.9 * dt));
		const gTarget = (holding ? 0.5 : 0.3) * (1 - s);
		gPull += (gTarget - gPull) * (1 - Math.exp(-1.2 * dt));

		for (let i = ripples.length - 1; i >= 0; i--) {
			ripples[i].age += dt;
			if (ripples[i].age > RIPPLE_LIFE) ripples.splice(i, 1);
		}
	};

	const local = (e: PointerEvent) => {
		const r = canvas.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top] as const;
	};

	const onMove = (e: PointerEvent) => {
		const [x, y] = local(e);
		tx = x;
		ty = y;
		if (e.pointerType === "mouse") {
			active = true;
			lingerUntil = 0;
		}
	};
	const onDown = (e: PointerEvent) => {
		if (e.pointerType === "mouse" && e.button !== 0) return;
		const [x, y] = local(e);
		tx = x;
		ty = y;
		if (e.pointerType !== "mouse") {
			px = x;
			py = y;
		}
		active = true;
		lingerUntil = 0;
		pressed = true;
		downAt = performance.now();
		downX = x;
		downY = y;
	};
	const release = (e: PointerEvent, cancelled: boolean) => {
		if (!pressed) return;
		const [x, y] = local(e);
		const quick = performance.now() - downAt < 300;
		const still = Math.hypot(x - downX, y - downY) < 12;
		pressed = false;
		released = 0;
		if (!cancelled) {
			if (quick && still) {
				// a tap: make sure the transient reads
				press = Math.max(press, 0.9);
				pressV = 0;
			}
			ripples.push({ x: px, y: py, age: 0, amp: 1 });
			if (ripples.length > 4) ripples.shift();
		}
		if (e.pointerType !== "mouse") lingerUntil = clock + 1.5;
	};
	const onUp = (e: PointerEvent) => release(e, false);
	const onCancel = (e: PointerEvent) => release(e, true);
	const onLeave = (e: PointerEvent) => {
		if (e.pointerType === "mouse" && !pressed) active = false;
	};

	if (interactive) {
		root.addEventListener("pointermove", onMove);
		root.addEventListener("pointerdown", onDown);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", onCancel);
		root.addEventListener("pointerleave", onLeave);
	}

	resize();
	gx = W * 0.5;
	gy = H * 0.5;

	return {
		draw,
		step,
		resize,
		readout: () => ({
			pull: clamp(s * 0.5 + Math.max(0, press) * 0.46, 0, 1),
			draw: clamp(press, 0, 1),
		}),
		status: () =>
			pressed
				? "draw"
				: s > 0.08 && active
					? "follow"
					: released < 2.2 && s > 0.02
						? "released"
						: "rest",
		pulse: (x, y) => {
			tx = x;
			ty = y;
			px = x;
			py = y;
			press = Math.max(press, 0.9);
			pressV = 0;
			released = 0;
			active = true;
			lingerUntil = clock + 1.6;
			ripples.push({ x, y, age: 0, amp: 1 });
			if (ripples.length > 4) ripples.shift();
		},
		hold: (on) => {
			holding = on;
		},
		dispose: () => {
			root.removeEventListener("pointermove", onMove);
			root.removeEventListener("pointerdown", onDown);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", onCancel);
			root.removeEventListener("pointerleave", onLeave);
		},
	};
}

/**
 * A living ink/satin current for the "Log a brew" surface.
 *
 * `animated` undefined follows the OS reduced-motion setting; `true` forces
 * motion (a lab can opt in despite OS reduce); `false` holds a still frame.
 * Touch never blocks scrolling (`touch-action: pan-y pinch-zoom`).
 */
export default function CurrentStudy({ animated }: { animated?: boolean }) {
	const rootRef = useRef<HTMLElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const actionRef = useRef<HTMLButtonElement>(null);
	const simRef = useRef<Sim | null>(null);
	const [osReduce, setOsReduce] = useState(() =>
		typeof window !== "undefined" && window.matchMedia
			? window.matchMedia("(prefers-reduced-motion: reduce)").matches
			: false,
	);
	const motion = animated ?? !osReduce;

	useEffect(() => {
		if (animated !== undefined || !window.matchMedia) return;
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const on = () => setOsReduce(mq.matches);
		mq.addEventListener("change", on);
		return () => mq.removeEventListener("change", on);
	}, [animated]);

	useEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) return;
		const sim = createSim(root, canvas, actionRef.current, motion);
		simRef.current = sim;

		let raf = 0;
		let last = 0;
		let t = STILL_T;
		let visible = true;

		const paint = () => {
			sim.draw(t);
		};
		const frame = (now: number) => {
			raf = 0;
			const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
			last = now;
			const { pull } = sim.readout();
			t += dt * (1 + 0.8 * pull);
			sim.step(dt);
			paint();

			schedule();
		};
		const schedule = () => {
			if (motion && visible && !document.hidden && !raf)
				raf = requestAnimationFrame(frame);
		};
		const onVisibility = () => {
			last = 0;
			schedule();
		};

		const ro = new ResizeObserver(() => {
			sim.resize();
			if (!motion) paint();
		});
		ro.observe(root);
		const io = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			last = 0;
			schedule();
		});
		io.observe(root);
		document.addEventListener("visibilitychange", onVisibility);

		if (motion) schedule();
		else paint();

		return () => {
			if (raf) cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
			sim.dispose();
			simRef.current = null;
		};
	}, [motion]);

	const onAction = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
		const a = actionRef.current;
		const root = rootRef.current;
		if (a && root) {
			// keyboard activation has no pointer path; give it the same transient
			if (e.detail === 0)
				simRef.current?.pulse(
					a.offsetLeft + a.offsetWidth / 2,
					a.offsetTop + a.offsetHeight / 2,
				);
		}
	}, []);

	return (
		<section
			ref={rootRef}
			className="current-study"
			data-motion={motion ? "live" : "still"}
			aria-label="Log a brew"
		>
			<canvas ref={canvasRef} className="current-study__canvas" aria-hidden />

			<div className="current-study__foot">
				<div className="current-study__copy">
					<h2 className="current-study__label">Log a brew</h2>
					<p className="current-study__status">18 g → 36 g · Espresso</p>
				</div>
				<button
					ref={actionRef}
					type="button"
					className="current-study__action"
					aria-label="Try the current response"
					onClick={onAction}
					onFocus={(e) =>
						simRef.current?.hold(e.currentTarget.matches(":focus-visible"))
					}
					onBlur={() => simRef.current?.hold(false)}
				>
					↗
				</button>
			</div>
		</section>
	);
}
