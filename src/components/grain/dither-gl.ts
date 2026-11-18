/**
 * The dither pass, on the GPU. A scene's Canvas2D drawing is read as colour
 * over paper, then each dot snaps to one of a few lightness steps in OKLab.
 * A fixed blue-noise mask, pinned to the page, decides which way a dot rounds,
 * so flat colour reads as solid tone and only gradients turn to speckle.
 *
 * Dots never pop. Each one holds its step until the source moves clearly past
 * it (hysteresis), then slides to the new step over a couple of frames.
 *
 * State lives in a pair of textures at dot resolution, one dot per texel:
 *   r  displayed step / LEVELS, eased
 *   gb chroma (OKLab a, b), eased so a passing shape leaves no flash of hue
 *   a  held step / LEVELS, the hysteresis memory
 */

import { BLUE_NOISE_64 } from "./blue-noise";

export type Rgb = [number, number, number];
export type Zone = {
	x: number;
	y: number;
	w: number;
	h: number;
	depth: number;
};

/** Lightness steps between paper and the deepest tone. */
const LEVELS = 6;
/**
 * Steps crowd toward the paper: step k sits at (k / LEVELS) ^ CURVE of the
 * range. Faint washes then become a fine, near-paper tint instead of sparse
 * speckle that crawls like static, and thin bright lines stop jumping straight
 * to full contrast.
 */
const CURVE = 1.35;
/** Deepest tone, OKLab L. Stronger scene colours clip here. */
const END_L = { light: 0.34, dark: 0.8 };
/** Scene alpha at full strength. Below 1 so paper always breathes a little. */
const ALPHA = 0.7;
/**
 * Coverage response. Below 1 lifts faint fills toward strong lines, so a body
 * reads as a body and not as an outline with bright veins. Scenes were painted
 * for a field that compressed tone like this.
 */
const COVERAGE = 0.55;
/** How far past a step boundary the source must move before a dot changes. */
const HYSTERESIS = 0.18;
/** Steps per second. Two frames for a dot to fade fully in at 24fps. */
const SLEW = 12;
const HUE_EASE = 0.1;
const CHROMA_GAIN = 1.1;
const MAX_ZONES = 32;

const LAB = /* glsl */ `
vec3 toLinear(vec3 c) {
	return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 toSrgb(vec3 c) {
	c = clamp(c, 0.0, 1.0);
	return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 oklab(vec3 srgb) {
	vec3 c = toLinear(srgb);
	vec3 lms = vec3(
		0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b,
		0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b,
		0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b);
	lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
	return vec3(
		0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
		1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
		0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z);
}
vec3 srgbFromLab(vec3 lab) {
	vec3 lms = vec3(
		lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z,
		lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z,
		lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z);
	lms = lms * lms * lms;
	return toSrgb(vec3(
		4.0767416621 * lms.x - 3.3077118401 * lms.y + 0.2309699613 * lms.z,
		-1.2684380046 * lms.x + 2.6097574011 * lms.y - 0.3413193965 * lms.z,
		-0.0041960771 * lms.x - 0.7034186147 * lms.y + 1.7076147010 * lms.z));
}
`;

const VERT = /* glsl */ `#version 300 es
void main() {
	vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
	gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const UPDATE = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uSrc;
uniform sampler2D uPrev;
uniform sampler2D uNoise;
uniform ivec2 uGrid;
uniform float uCss;
uniform float uH;
uniform vec3 uInk;
uniform vec3 uPaper;
uniform float uPaperL;
uniform float uRange;
uniform float uAlpha;
uniform vec4 uZones[${MAX_ZONES}];
uniform float uDepth[${MAX_ZONES}];
uniform int uZoneCount;
uniform bool uInstant;
uniform float uHold;
uniform float uSlew;
uniform float uHueStep;
out vec4 outState;
${LAB}
const float LEVELS = ${LEVELS}.0;
const float CURVE = ${CURVE};
const float HYST = ${HYSTERESIS};

float stepAt(float f, float threshold) {
	return clamp(floor(f) + step(threshold, fract(f)), 0.0, LEVELS);
}

void main() {
	ivec2 p = ivec2(gl_FragCoord.xy);
	// Canvas rows run top-down; GL rows bottom-up. The mask is pinned top-left.
	int row = uGrid.y - 1 - p.y;
	vec4 src = texelFetch(uSrc, ivec2(p.x, row), 0);
	vec2 css = (vec2(p.x, row) + 0.5) * uCss;

	// Fade out toward the field's bottom edge, and away from quiet text.
	float quiet = smoothstep(0.0, 90.0, uH - css.y);
	for (int i = 0; i < ${MAX_ZONES}; i++) {
		if (i >= uZoneCount) break;
		vec4 b = uZones[i];
		vec2 d = max(max(b.xy - css, vec2(0.0)), css - b.xy - b.zw);
		quiet *= 1.0 - uDepth[i] * (1.0 - smoothstep(0.0, 28.0, length(d)));
	}

	// A colour pulls the dot from ink toward itself; black is pure ink.
	float a = pow(src.a * quiet, ${COVERAGE}) * uAlpha;
	float pull = max(src.r, max(src.g, src.b));
	vec3 hue = uInk + (src.rgb - uInk) * pull;
	vec3 lab = oklab(mix(uPaper, hue, a));
	float tone = clamp((uPaperL - lab.x) / uRange, 0.0, 1.0);
	float f = pow(tone, 1.0 / CURVE) * LEVELS;
	float rank = texelFetch(uNoise, ivec2(p.x & 63, row & 63), 0).r;
	float threshold = (rank * 255.0 + 0.5) / 256.0;

	vec4 prev = texelFetch(uPrev, p, 0);
	float held = floor(prev.a * LEVELS + 0.5);
	float shown = prev.r * LEVELS;
	vec2 chroma = (prev.gb - 0.5) * 0.8;
	float target;
	if (uInstant) {
		target = stepAt(f, threshold);
		shown = target;
		chroma = lab.yz;
	} else {
		// The band narrows to nothing at bare paper. A fixed band would let dots
		// with a low threshold hold their first step forever once inked: ghosts.
		float band = min(HYST * uHold, max(f, 0.0));
		target = clamp(held, stepAt(f - band, threshold), stepAt(f + band, threshold));
		shown += clamp(target - shown, -uSlew, uSlew);
		// A dot arriving from paper takes its colour at once; a fading one keeps it.
		if (prev.r * LEVELS < 0.01) chroma = lab.yz;
		else if (a > 0.002) {
			// Chroma is stored in 8 bits. At high frame rates an eased step falls
			// under one quantum and rounds back, leaving the old hue stuck as a
			// stain; always move at least one quantum.
			vec2 d = lab.yz - chroma;
			chroma += sign(d) * min(abs(d), max(abs(d) * uHueStep, vec2(0.8 / 255.0)));
		}
	}
	outState = vec4(shown / LEVELS, chroma / 0.8 + 0.5, target / LEVELS);
}`;

const DISPLAY = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform float uPaperL;
uniform float uRange;
uniform float uChromaGain;
out vec4 outColor;
${LAB}
const float LEVELS = ${LEVELS}.0;
const float CURVE = ${CURVE};

void main() {
	vec4 s = texelFetch(uState, ivec2(gl_FragCoord.xy), 0);
	float shown = s.r * LEVELS;
	if (shown < 0.004) {
		outColor = vec4(0.0);
		return;
	}
	// Below the first step a dot is that step, partly transparent, so paper
	// and the grid behind it show through while it fades.
	float level = max(shown, 1.0);
	vec3 rgb = srgbFromLab(vec3(uPaperL - pow(level / LEVELS, CURVE) * uRange, (s.gb - 0.5) * 0.8 * uChromaGain));
	float alpha = min(shown, 1.0);
	outColor = vec4(rgb * alpha, alpha);
}`;

export type DitherGL = {
	resize: (w: number, h: number) => void;
	setPalette: (p: {
		ink: Rgb;
		paper: Rgb;
		gain: number;
		dark: boolean;
	}) => void;
	/** Quiet zones in CSS pixels, `css` CSS pixels per dot, field height `H`. */
	setZones: (zones: Zone[], css: number, H: number) => void;
	/** Reads the scene canvas and advances every dot by `dt` seconds. */
	/** `hold` 0..1 scales hysteresis; 0 lets every dot follow the new source. */
	frame: (
		source: HTMLCanvasElement,
		dt: number,
		instant: boolean,
		hold?: number,
	) => void;
	/** Repaints the current state, e.g. after a palette change. */
	redraw: () => void;
	/** Displayed step per dot (0..255 = 0..LEVELS), for tests. */
	readSteps: () => Uint8Array;
	readonly lost: boolean;
	/** WebGL runs on the CPU (blocklisted or missing GPU): spend fewer dots. */
	readonly software: boolean;
	dispose: () => void;
};

function oklabL([r, g, b]: Rgb) {
	const lin = (v: number) => {
		const c = v / 255;
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	const [R, G, B] = [lin(r), lin(g), lin(b)];
	const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
	const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
	const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
	return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

function compile(gl: WebGL2RenderingContext, frag: string) {
	const program = gl.createProgram();
	for (const [type, text] of [
		[gl.VERTEX_SHADER, VERT],
		[gl.FRAGMENT_SHADER, frag],
	] as const) {
		const shader = gl.createShader(type);
		if (!shader) throw new Error("no shader");
		gl.shaderSource(shader, text);
		gl.compileShader(shader);
		if (
			!gl.getShaderParameter(shader, gl.COMPILE_STATUS) &&
			!gl.isContextLost()
		)
			throw new Error(gl.getShaderInfoLog(shader) ?? "shader failed");
		gl.attachShader(program, shader);
	}
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost())
		throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
	const uniforms = new Map<string, WebGLUniformLocation | null>();
	const u = (name: string) => {
		if (!uniforms.has(name))
			uniforms.set(name, gl.getUniformLocation(program, name));
		return uniforms.get(name) ?? null;
	};
	return { program, u };
}

export function createDitherGL(
	canvas: HTMLCanvasElement,
	onRestored: () => void,
): DitherGL {
	const maybe = canvas.getContext("webgl2", {
		alpha: true,
		premultipliedAlpha: true,
		antialias: false,
		depth: false,
		stencil: false,
		powerPreference: "low-power",
	});
	if (!maybe) throw new Error("no webgl2");
	const gl: WebGL2RenderingContext = maybe;
	const info = gl.getExtension("WEBGL_debug_renderer_info");
	const renderer = String(
		gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER),
	);
	const software = /swiftshader|llvmpipe|softpipe|software/i.test(renderer);

	let w = 1;
	let h = 1;
	let palette = {
		ink: [0, 0, 0] as Rgb,
		paper: [255, 255, 255] as Rgb,
		gain: 1,
		dark: false,
	};
	let zones: Zone[] = [];
	let css = 1;
	let fieldH = 1;
	let lost = false;
	let read = 0;

	type Resources = {
		update: ReturnType<typeof compile>;
		display: ReturnType<typeof compile>;
		vao: WebGLVertexArrayObject;
		src: WebGLTexture;
		noise: WebGLTexture;
		state: [WebGLTexture, WebGLTexture];
		fbo: [WebGLFramebuffer, WebGLFramebuffer];
	};
	let r: Resources;

	function texture(filter: number, wrap: number) {
		const t = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, t);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
		return t;
	}

	function init() {
		const noise = texture(gl.NEAREST, gl.REPEAT);
		const bytes = Uint8Array.from(atob(BLUE_NOISE_64), (c) => c.charCodeAt(0));
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.R8,
			64,
			64,
			0,
			gl.RED,
			gl.UNSIGNED_BYTE,
			bytes,
		);
		r = {
			update: compile(gl, UPDATE),
			display: compile(gl, DISPLAY),
			vao: gl.createVertexArray(),
			src: texture(gl.NEAREST, gl.CLAMP_TO_EDGE),
			noise,
			state: [
				texture(gl.NEAREST, gl.CLAMP_TO_EDGE),
				texture(gl.NEAREST, gl.CLAMP_TO_EDGE),
			],
			fbo: [gl.createFramebuffer(), gl.createFramebuffer()],
		};
		allocate();
	}

	function allocate() {
		canvas.width = w;
		canvas.height = h;
		for (let i = 0; i < 2; i++) {
			gl.bindTexture(gl.TEXTURE_2D, r.state[i]);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA8,
				w,
				h,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				null,
			);
			gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo[i]);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				r.state[i],
				0,
			);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		read = 0;
	}

	const onLost = (e: Event) => {
		e.preventDefault();
		lost = true;
	};
	const onRestore = () => {
		lost = false;
		init();
		onRestored();
	};
	canvas.addEventListener("webglcontextlost", onLost);
	canvas.addEventListener("webglcontextrestored", onRestore);
	init();

	const tones = () => {
		const paperL = oklabL(palette.paper);
		const end = palette.dark ? END_L.dark : END_L.light;
		return { paperL, range: paperL - end };
	};
	const unit = (c: Rgb): [number, number, number] => [
		c[0] / 255,
		c[1] / 255,
		c[2] / 255,
	];

	function display() {
		const { program, u } = r.display;
		const { paperL, range } = tones();
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, w, h);
		gl.useProgram(program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, r.state[read]);
		gl.uniform1i(u("uState"), 0);
		gl.uniform1f(u("uPaperL"), paperL);
		gl.uniform1f(u("uRange"), range);
		gl.uniform1f(u("uChromaGain"), CHROMA_GAIN);
		gl.bindVertexArray(r.vao);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
	}

	return {
		get lost() {
			return lost;
		},
		software,
		resize(nw, nh) {
			w = Math.max(1, nw);
			h = Math.max(1, nh);
			if (!lost) allocate();
		},
		setPalette(p) {
			palette = p;
		},
		setZones(next, cssPerDot, H) {
			zones = next.slice(0, MAX_ZONES);
			css = cssPerDot;
			fieldH = H;
		},
		frame(source, dt, instant, hold = 1) {
			if (lost) return;
			const { paperL, range } = tones();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, r.src);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				source,
			);

			const { program, u } = r.update;
			const write = 1 - read;
			gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo[write]);
			gl.viewport(0, 0, w, h);
			gl.useProgram(program);
			gl.uniform1i(u("uSrc"), 0);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, r.state[read]);
			gl.uniform1i(u("uPrev"), 1);
			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, r.noise);
			gl.uniform1i(u("uNoise"), 2);
			gl.uniform2i(u("uGrid"), w, h);
			gl.uniform1f(u("uCss"), css);
			gl.uniform1f(u("uH"), fieldH);
			gl.uniform3fv(u("uInk"), unit(palette.ink));
			gl.uniform3fv(u("uPaper"), unit(palette.paper));
			gl.uniform1f(u("uPaperL"), paperL);
			gl.uniform1f(u("uRange"), range);
			gl.uniform1f(u("uAlpha"), ALPHA * palette.gain);
			const boxes = new Float32Array(MAX_ZONES * 4);
			const depths = new Float32Array(MAX_ZONES);
			zones.forEach((z, i) => {
				boxes.set([z.x, z.y, z.w, z.h], i * 4);
				depths[i] = z.depth;
			});
			gl.uniform4fv(u("uZones"), boxes);
			gl.uniform1fv(u("uDepth"), depths);
			gl.uniform1i(u("uZoneCount"), zones.length);
			gl.uniform1i(u("uInstant"), instant ? 1 : 0);
			gl.uniform1f(u("uHold"), hold);
			// Capped per frame, so a slow frame still cannot snap a dot.
			gl.uniform1f(u("uSlew"), Math.min(SLEW * dt, 0.5));
			gl.uniform1f(u("uHueStep"), 1 - Math.exp(-dt / HUE_EASE));
			gl.bindVertexArray(r.vao);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			read = write;
			display();
		},
		redraw() {
			if (!lost) display();
		},
		readSteps() {
			const out = new Uint8Array(w * h * 4);
			if (lost) return new Uint8Array(w * h);
			gl.bindFramebuffer(gl.FRAMEBUFFER, r.fbo[read]);
			gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, out);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			const steps = new Uint8Array(w * h);
			for (let i = 0; i < steps.length; i++) steps[i] = out[i * 4];
			return steps;
		},
		dispose() {
			canvas.removeEventListener("webglcontextlost", onLost);
			canvas.removeEventListener("webglcontextrestored", onRestore);
			// Never lose the context on purpose: a remount reuses this canvas.
			if (lost) return;
			for (const t of [r.src, r.noise, ...r.state]) gl.deleteTexture(t);
			for (const f of r.fbo) gl.deleteFramebuffer(f);
			gl.deleteProgram(r.update.program);
			gl.deleteProgram(r.display.program);
			gl.deleteVertexArray(r.vao);
		},
	};
}
