/**
 * Painting straight into the dither lattice: one raster cell is one dot.
 *
 * Scenes with thousands of small parts (leaves, hatching, water lines) cost a
 * few milliseconds here, where a canvas call per part costs microseconds each.
 * The raster is plain RGBA with straight alpha, composited like canvas
 * source-over, and handed to the engine with one putImageData per frame.
 */

export type Rgb = [number, number, number];

/** Straight-alpha source-over of one cell. */
export function blend(
	d: Uint8ClampedArray,
	i: number,
	r: number,
	g: number,
	b: number,
	a: number,
) {
	const da = d[i + 3] * (1 / 255);
	const oa = a + da * (1 - a);
	if (oa <= 0) return;
	const k = a / oa;
	d[i] += (r - d[i]) * k;
	d[i + 1] += (g - d[i + 1]) * k;
	d[i + 2] += (b - d[i + 2]) * k;
	d[i + 3] = oa * 255;
}

/** A blade's half width along its length, sampled at 65 stations. */
export function profile(at: number[], width: number[]) {
	const out = new Float32Array(65);
	for (let i = 0; i <= 64; i++) {
		const u = i / 64;
		let k = 0;
		while (k < at.length - 2 && u > at[k + 1]) k++;
		out[i] =
			width[k] +
			((width[k + 1] - width[k]) * (u - at[k])) / (at[k + 1] - at[k]);
	}
	return out;
}

/**
 * One blade (a leaf, a petal, a scale), scan-converted row by row with soft
 * edges. (bx, by) is the base, (dx, dy) the unit axis, all in raster cells.
 * A rib colour, when given, runs down the middle third of the width.
 */
export function blade(
	R: ImageData,
	bx: number,
	by: number,
	dx: number,
	dy: number,
	L: number,
	hw: number,
	shape: Float32Array,
	col: Rgb,
	a: number,
	rib: Rgb | null = null,
	ra = 0,
) {
	const { width: w, height: h, data: d } = R;
	const nx = dy;
	const ny = -dx;
	const m = hw + 0.6;
	const ex = bx + dx * L;
	const ey = by + dy * L;
	const y0 = Math.max(0, Math.floor(Math.min(by, ey) - m));
	const y1 = Math.min(h - 1, Math.ceil(Math.max(by, ey) + m));
	const xa = Math.max(0, Math.floor(Math.min(bx, ex) - m));
	const xb = Math.min(w - 1, Math.ceil(Math.max(bx, ex) + m));
	if (y1 < y0 || xb < xa || L <= 0) return;
	const invL = 64 / L;
	for (let y = y0; y <= y1; y++) {
		const py = y + 0.5 - by;
		// The row's span inside the blade's box: 0 <= u <= L, |v| <= m.
		let lo = xa - bx;
		let hi = xb + 1 - bx;
		const pu = py * dy;
		if (dx > 1e-4 || dx < -1e-4) {
			const u0 = -pu / dx;
			const u1 = (L - pu) / dx;
			if (u0 < u1) {
				if (u0 > lo) lo = u0;
				if (u1 < hi) hi = u1;
			} else {
				if (u1 > lo) lo = u1;
				if (u0 < hi) hi = u0;
			}
		} else if (pu < 0 || pu > L) continue;
		const pv = py * ny;
		if (nx > 1e-4 || nx < -1e-4) {
			const v0 = (-m - pv) / nx;
			const v1 = (m - pv) / nx;
			if (v0 < v1) {
				if (v0 > lo) lo = v0;
				if (v1 < hi) hi = v1;
			} else {
				if (v1 > lo) lo = v1;
				if (v0 < hi) hi = v0;
			}
		} else if (pv < -m || pv > m) continue;
		const xs = Math.max(xa, Math.ceil(bx + lo - 0.5));
		const xe = Math.min(xb, Math.floor(bx + hi - 0.5));
		let i = (y * w + xs) * 4;
		for (let x = xs; x <= xe; x++, i += 4) {
			const px = x + 0.5 - bx;
			const u = px * dx + pu;
			if (u < 0 || u > L) continue;
			const v = px * nx + pv;
			const av = v < 0 ? -v : v;
			const half = hw * shape[(u * invL) | 0];
			let cov = half - av + 0.5;
			if (cov <= 0) continue;
			if (cov > 1) cov = 1;
			if (rib && av < 0.55 && u > L * 0.04 && u < L * 0.86)
				blend(d, i, rib[0], rib[1], rib[2], ra * cov);
			else blend(d, i, col[0], col[1], col[2], a * cov);
		}
	}
}

/**
 * A polyline one or two cells wide, each cell plotted once per call even
 * where segments meet. `stamp` is a scratch array the size of the raster.
 */
let stampId = 0;
export function polyline(
	R: ImageData,
	stamp: Uint32Array,
	xs: Float32Array,
	ys: Float32Array,
	n: number,
	scale: number,
	col: Rgb,
	a: number,
	thick: boolean,
) {
	const { width: w, height: h, data: d } = R;
	stampId = (stampId + 1) >>> 0 || 1;
	const id = stampId;
	for (let k = 0; k < n; k++) {
		const x0 = xs[k] * scale;
		const y0 = ys[k] * scale;
		const x1 = xs[k + 1] * scale;
		const y1 = ys[k + 1] * scale;
		const steps =
			Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 1.5) + 1;
		for (let j = 0; j <= steps; j++) {
			const f = j / steps;
			const x = (x0 + (x1 - x0) * f) | 0;
			const y = (y0 + (y1 - y0) * f) | 0;
			for (let o = 0; o < (thick ? 2 : 1); o++) {
				const xx = x + o;
				if (xx < 0 || y < 0 || xx >= w || y >= h) continue;
				const c = y * w + xx;
				if (stamp[c] === id) continue;
				stamp[c] = id;
				blend(d, c * 4, col[0], col[1], col[2], a);
			}
		}
	}
}
