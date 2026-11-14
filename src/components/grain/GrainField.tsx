import { useEffect, useRef, useState } from "react";
import { createGrain, type GrainEngine, type Scene } from "./engine";
import "./GrainField.css";

type Props = {
	scene: Scene;
	/** undefined follows the OS; true forces motion; false draws one still. */
	animated?: boolean;
};

const reduceQuery = "(prefers-reduced-motion: reduce)";

export default function GrainField({ scene, animated }: Props) {
	const root = useRef<HTMLDivElement>(null);
	const dither = useRef<HTMLCanvasElement>(null);
	const engine = useRef<GrainEngine | null>(null);
	const initial = useRef({ scene });
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
		if (!root.current || !dither.current)
			return;
		let grain: GrainEngine;
		try {
			grain = createGrain({
				root: root.current,
				dither: dither.current,
				...initial.current,
			});
		} catch {
			// Decoration only: no WebGL2 or canvas simply means plain paper.
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
	useEffect(() => engine.current?.setMotion(motion), [motion]);

	return (
		<div ref={root} className="grain-field" aria-hidden>
			<canvas ref={dither} className="grain-field__dither" />
		</div>
	);
}
