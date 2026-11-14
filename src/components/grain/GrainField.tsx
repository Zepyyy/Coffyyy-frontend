import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { createGrain, type GrainEngine, type Scene } from "./engine";
import "./GrainField.css";

type Props = {
	scene: Scene;
	/** The page of text the ASCII lattice holds. */
	text: string;
	/** undefined follows the device; booleans are explicit playback choices. */
	animated?: boolean;
};

export default function GrainField({ scene, text, animated }: Props) {
	const root = useRef<HTMLDivElement>(null);
	const blur = useRef<HTMLCanvasElement>(null);
	const dither = useRef<HTMLCanvasElement>(null);
	const ascii = useRef<HTMLCanvasElement>(null);
	const engine = useRef<GrainEngine | null>(null);
	const initial = useRef({ scene, text });
	const osReduce = useReducedMotion();
	const motion = animated ?? !osReduce;

	useEffect(() => {
		if (!root.current || !blur.current || !dither.current || !ascii.current)
			return;
		let grain: GrainEngine;
		try {
			grain = createGrain({
				root: root.current,
				blur: blur.current,
				dither: dither.current,
				ascii: ascii.current,
				...initial.current,
			});
		} catch {
			// Decoration only: no canvas support simply means plain paper.
			return;
		}
		engine.current = grain;
		grain.layout();
		const ro = new ResizeObserver(() => grain.layout());
		ro.observe(root.current);
		const mo = new MutationObserver(() => grain.refreshPalette());
		// The field survives journal navigation. Refresh text masks when React
		// replaces content, including while the scene is set to a still.
		let contentFrame = 0;
		const refreshContent = () => {
			cancelAnimationFrame(contentFrame);
			contentFrame = requestAnimationFrame(() => grain.refreshContent());
		};
		const contentObserver = new MutationObserver(refreshContent);
		const contentResize = new ResizeObserver(refreshContent);
		if (root.current.parentElement) {
			contentObserver.observe(root.current.parentElement, {
				childList: true,
				subtree: true,
			});
			contentResize.observe(root.current.parentElement);
		}
		mo.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
		if (import.meta.env.DEV)
			(window as unknown as { __grain?: GrainEngine }).__grain = grain;
		return () => {
			ro.disconnect();
			mo.disconnect();
			contentObserver.disconnect();
			contentResize.disconnect();
			cancelAnimationFrame(contentFrame);
			grain.dispose();
			engine.current = null;
		};
	}, []);

	useEffect(() => engine.current?.setScene(scene), [scene]);
	useEffect(() => engine.current?.setText(text), [text]);
	useEffect(() => engine.current?.setMotion(motion), [motion]);

	return (
		<div ref={root} className="grain-field" aria-hidden>
			<canvas ref={blur} className="grain-field__blur" />
			<canvas ref={dither} className="grain-field__dither" />
			<canvas ref={ascii} className="grain-field__ascii" />
		</div>
	);
}
