import { useEffect, useRef } from "react";
import "./PrintStudy.css";

const LETTERS = Array.from("Log a brew");

/** A tactile print face. Demo only: it never navigates or saves. */
export default function PrintStudy({
	animated = true,
}: {
	animated?: boolean;
}) {
	const host = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		const node = host.current;
		const cancel = () =>
			node
				?.querySelectorAll<HTMLElement>(".print-stack")
				.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
		if (!animated) cancel();
		return cancel;
	}, [animated]);
	const reset = () =>
		host.current
			?.querySelectorAll<HTMLElement>(".print-letter")
			.forEach((el) => el.style.setProperty("--pressure", "0"));
	function stamp() {
		if (!animated) return;
		host.current
			?.querySelectorAll<HTMLElement>(".print-stack")
			.forEach((el, index) => {
				el.getAnimations()
					.filter((a) => a instanceof Animation && a.id === "stamp")
					.forEach((a) => a.cancel());
				const motion = el.animate(
					[
						{ transform: "translateY(0)" },
						{ transform: "translateY(-50%)", offset: 0.42 },
						{ transform: "translateY(-50%)", offset: 0.64 },
						{ transform: "translateY(0)" },
					],
					{
						duration: 920,
						delay: index * 38,
						easing: "cubic-bezier(.22,.72,.12,1)",
					},
				);
				motion.id = "stamp";
			});
	}
	return (
		<button
			type="button"
			ref={host}
			className="print-study"
			data-animated={animated}
			aria-label="Try the kinetic type treatment"
			onClick={stamp}
			onPointerLeave={reset}
			onPointerMove={(event) => {
				if (!animated || event.pointerType === "touch") return;
				host.current
					?.querySelectorAll<HTMLElement>(".print-letter")
					.forEach((el) => {
						const box = el.getBoundingClientRect();
						const distance = Math.abs(event.clientX - box.left - box.width / 2);
						el.style.setProperty(
							"--pressure",
							String(Math.max(0, 1 - distance / 85)),
						);
					});
			}}
		>
			<span className="print-caption" aria-hidden>
				Your next brew
			</span>
			<span className="print-word" aria-hidden>
				{LETTERS.map((letter, index) => (
					<span
						key={index}
						className="print-letter"
						style={{ "--letter": index } as React.CSSProperties}
					>
						<span className="print-stack">
							<span>{letter === " " ? "\u00a0" : letter}</span>
							<span>{letter === " " ? "\u00a0" : letter}</span>
						</span>
					</span>
				))}
			</span>
			<span className="print-bottom" aria-hidden>
				<span>18 g → 36 g · Espresso</span>
				<span>↗</span>
			</span>
		</button>
	);
}
