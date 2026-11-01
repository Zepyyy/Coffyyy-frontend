import type { Box } from "../engine";

/** Where a scene may draw: gutter centres and a size factor per side. */
export type Lanes = {
	x: [number, number];
	f: [number, number];
	legacy: boolean;
};

export const MIN_GUTTER = 90;

/**
 * Lanes sit in the visible gutters beside the page's content column. A gutter
 * too narrow to hold a body (<90px) gets none; a modest one gets a smaller scale factor `f`.
 * Without an anchor, or on a phone, the old fixed lanes apply.
 */
export function lanesFor(W: number, content: Box | undefined): Lanes {
	if (!content || W < 600) {
		const lane = W < 600 ? 82 : Math.max(112, (W - 1024) / 2 + 6);
		return { x: [lane, W - lane], f: [1, 1], legacy: true };
	}
	const gl = Math.max(0, content.x);
	const gr = Math.max(0, W - content.x - content.w);
	const f = (g: number) =>
		g < MIN_GUTTER ? 0 : Math.min(1, Math.max(0.3, (g - 30) / 230));
	return {
		x: [gl / 2, W - gr / 2],
		f: [f(gl), f(gr)],
		legacy: false,
	};
}
