import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./ContinuityStudy.css";

type Phase = "specimen" | "editing" | "receipt";

/** One object changes jobs: a remembered attempt, its next draft, its receipt. */
export default function ContinuityStudy({
	animated = true,
}: {
	animated?: boolean;
}) {
	const [phase, setPhase] = useState<Phase>("specimen");
	const [dose, setDose] = useState("18");
	const [yieldWeight, setYieldWeight] = useState("36");
	const root = useRef<HTMLFormElement>(null);
	const doseInput = useRef<HTMLInputElement>(null);
	const previous = useRef(new Map<string, DOMRect>());
	const animations = useRef<Animation[]>([]);
	const ratio =
		Number(dose) > 0 && Number(yieldWeight) > 0
			? (Number(yieldWeight) / Number(dose)).toFixed(1).replace(/\.0$/, "")
			: "—";

	function move(next: Phase) {
		previous.current.clear();
		root.current
			?.querySelectorAll<HTMLElement>("[data-continuity]")
			.forEach((element) => {
				previous.current.set(
					element.dataset.continuity!,
					element.getBoundingClientRect(),
				);
			});
		setPhase(next);
	}

	useLayoutEffect(() => {
		animations.current.forEach((animation) => animation.cancel());
		animations.current = [];
		if (animated) {
			root.current
				?.querySelectorAll<HTMLElement>("[data-continuity]")
				.forEach((element) => {
					const before = previous.current.get(element.dataset.continuity!);
					if (!before) return;
					const after = element.getBoundingClientRect();
					if (!after.width || !after.height) return;
					animations.current.push(
						element.animate(
							[
								{
									transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width}, ${before.height / after.height})`,
								},
								{ transform: "translate(0, 0) scale(1, 1)" },
							],
							{
								duration: phase === "receipt" ? 760 : 640,
								easing: "cubic-bezier(.2,.85,.2,1)",
								fill: "both",
							},
						),
					);
				});
		}
		previous.current.clear();
		if (phase === "editing") doseInput.current?.focus({ preventScroll: true });
	}, [phase, animated]);

	useEffect(
		() => () => animations.current.forEach((animation) => animation.cancel()),
		[],
	);

	function reset() {
		setDose("18");
		setYieldWeight("36");
		move("specimen");
	}

	return (
		<form
			ref={root}
			className="continuity-study"
			data-phase={phase}
			data-animated={animated}
			aria-label="Repeat a brew motion study"
			onSubmit={(event) => {
				event.preventDefault();
				if (phase === "editing") move("receipt");
			}}
		>
			<div
				className="continuity-sheet"
				data-continuity="sheet"
				aria-hidden="true"
			/>
			<p className="continuity-state" aria-live="polite">
				{phase === "specimen"
					? "From your journal"
					: phase === "editing"
						? "Your next attempt"
						: "Brew saved · demo only"}
			</p>
			<span className="continuity-method" data-continuity="method">
				Espresso
			</span>
			<h3 className="continuity-title" data-continuity="title">
				Moonwalk
			</h3>
			<div className="continuity-value continuity-dose" data-continuity="dose">
				<label htmlFor="continuity-dose">
					Dose <span>g</span>
				</label>
				{phase === "editing" ? (
					<input
						ref={doseInput}
						id="continuity-dose"
						aria-label="Demo dose in grams"
						type="number"
						inputMode="decimal"
						min="1"
						max="100"
						step="0.1"
						required
						value={dose}
						onChange={(event) => setDose(event.target.value)}
						style={{ fontSize: "30px" }}
					/>
				) : (
					<span className="continuity-readout">
						{dose}
						<small>g</small>
					</span>
				)}
			</div>
			<span className="continuity-arrow" aria-hidden="true">
				→
			</span>
			<div
				className="continuity-value continuity-yield"
				data-continuity="yield"
			>
				<label htmlFor="continuity-yield">
					Yield <span>g</span>
				</label>
				{phase === "editing" ? (
					<input
						id="continuity-yield"
						aria-label="Demo yield in grams"
						type="number"
						inputMode="decimal"
						min="1"
						max="2000"
						step="0.1"
						required
						value={yieldWeight}
						onChange={(event) => setYieldWeight(event.target.value)}
						style={{ fontSize: "30px" }}
					/>
				) : (
					<span className="continuity-readout">
						{yieldWeight}
						<small>g</small>
					</span>
				)}
			</div>
			<div className="continuity-details" aria-hidden={phase === "specimen"}>
				<span>
					Ratio <strong>1:{ratio}</strong>
				</span>
				<span>
					{phase === "receipt"
						? "Ready for taste notes"
						: "Change what you want to try"}
				</span>
			</div>
			<span className="continuity-date">
				{phase === "receipt" ? "Just now" : "Yesterday · 28s · 5★"}
			</span>
			<div className="continuity-actions" data-continuity="actions">
				<button
					type="button"
					className="continuity-primary"
					onClick={() => {
						if (phase === "editing") {
							if (root.current?.reportValidity()) move("receipt");
						} else move("editing");
					}}
				>
					{phase === "editing"
						? "Save this attempt"
						: phase === "specimen"
							? "Repeat this brew"
							: "Repeat again"}
					<span aria-hidden="true">↗</span>
				</button>
			</div>
			{phase !== "specimen" && (
				<button type="button" className="continuity-reset" onClick={reset}>
					Reset study
				</button>
			)}
		</form>
	);
}
