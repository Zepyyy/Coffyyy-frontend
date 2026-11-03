import { afterEach, describe, expect, it, vi } from "vitest";
import { backgroundFrame, type Layers, type SceneEnv } from "../engine";
import { dandelion } from "./dandelion";
import { jelly } from "./jelly";

type Point = [number, number];

function recordingContext() {
	const calls: unknown[] = [];
	const stems: Point[][] = [];
	let path: Point[] = [];
	const context = new Proxy({} as CanvasRenderingContext2D, {
		get: (_, name) => {
			if (name === "getTransform") return () => ({ a: 0.5 });
			return (...args: unknown[]) => {
				calls.push([name, ...args]);
				if (name === "beginPath") path = [];
				if (name === "moveTo" || name === "lineTo") path.push(args as Point);
				// The closed stem outline has 73 samples on each side.
				if (name === "fill" && path.length === 146) stems.push([...path]);
			};
		},
		set: (_, name, value) => {
			calls.push([name, value]);
			return true;
		},
	});
	return { context, calls, stems };
}

function env(W: number, contentWidth: number, H = 800): SceneEnv {
	return {
		W,
		H,
		t: 0,
		dt: 0,
		pointer: { x: 0, y: 0, a: 0 },
		dark: false,
		anchors: {
			content: { x: (W - contentWidth) / 2, y: 24, w: contentWidth, h: 400 },
			frame: backgroundFrame(W, {
				x: (W - contentWidth) / 2,
				y: 24,
				w: contentWidth,
				h: 400,
			}),
		},
	};
}

function layers(context: CanvasRenderingContext2D): Layers {
	return { dither: context, ascii: context, blur: context };
}

afterEach(() => vi.unstubAllGlobals());

describe("responsive background geometry", () => {
	it.each([
		["dandelion", dandelion],
		["jellyfish", jelly],
	] as const)("keeps %s the same size on Home and Library", (_, scene) => {
		const draw = (contentWidth: number) => {
			const { context, calls } = recordingContext();
			scene(layers(context), env(1366, contentWidth));
			return JSON.stringify(calls);
		};
		expect(draw(1152) === draw(976)).toBe(true);
	});

	it.each([
		[1024, 704],
		[1280, 656],
		[1366, 704],
		[1440, 836],
		[1920, 1016],
		[1920, 656],
		[2560, 1376],
	])("preserves both branch proportions at %ix%i", async (width, height) => {
		const ratio = async (W: number, H: number) => {
			vi.resetModules();
			const { cherry } = await import("./cherry");
			const contexts: ReturnType<typeof recordingContext>[] = [];
			vi.stubGlobal("document", {
				createElement: () => {
					const recording = recordingContext();
					contexts.push(recording);
					return { getContext: () => recording.context };
				},
			});
			cherry(layers(recordingContext().context), env(W, 976, H));
			return contexts.map(({ stems }) => {
				const stem = stems[0];
				expect(stem).toHaveLength(146);
				const span = (axis: number) =>
					Math.max(...stem.map((p) => p[axis])) -
					Math.min(...stem.map((p) => p[axis]));
				return span(1) / span(0);
			});
		};
		const wide = await ratio(2560, 1376);
		const laptop = await ratio(width, height);
		expect(laptop).toHaveLength(2);
		laptop.forEach((value, side) => {
			expect(Math.abs(value / wide[side] - 1)).toBeLessThan(0.15);
		});
	});
});
