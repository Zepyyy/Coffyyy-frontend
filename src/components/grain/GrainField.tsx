import { useEffect, useRef, useState } from "react";
import { createGrain, type GrainEngine, type Scene } from "./engine";
import "./GrainField.css";

type Props = {
	scene: Scene;
	/** The page of text the ASCII lattice holds. */
	text: string;
	/** undefined follows the OS; true forces motion; false draws one still. */
	animated?: boolean;
};

const reduceQuery = "(prefers-reduced-motion: reduce)";

export default function GrainField({ scene, text, animated }: Props) {
	const root = useRef<HTMLDivElement>(null);
	const blur = useRef<HTMLCanvasElement>(null);
	const dither = useRef<HTMLCanvasElement>(null);
	const ascii = useRef<HTMLCanvasElement>(null);
	const engine = useRef<GrainEngine | null>(null);
	const initial = useRef({ scene, text });
	const [osReduce, setOsReduce] = useState(
		() => window.matchMedia?.(reduceQuery).matches ?? false,
	);
	const motion = animated ?? !osReduce;

	useEffect(() => {
		if (animated !== undefined || !window.matchMedia) return;
		const mq = window.matchMedia(reduceQuery);
		const on = () => setOsReduce(mq.matches);
		mq.addEventListener("change", on);
		return () => mq.removeEventListener("change", on);
	}, [animated]);

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
		mo.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
		if (import.meta.env.DEV)
			(window as unknown as { __grain?: GrainEngine }).__grain = grain;
		return () => {
			ro.disconnect();
			mo.disconnect();
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
