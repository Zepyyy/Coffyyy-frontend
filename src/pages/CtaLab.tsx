import { useEffect, useState } from "react";
import TextureStudy from "@/components/motion/TextureStudy";
import ContinuityStudy from "@/components/motion/ContinuityStudy";
import "./CtaLab.css";

const STUDIES = [
	{
		id: "ascii",
		name: "ASCII",
		title: "Characters carried by a soft shape",
		description:
			"A sparse character texture leaves room around the action. Move across it, or tap to gently disturb it.",
	},
	{
		id: "dither",
		name: "Dither",
		title: "Ink becoming grain",
		description:
			"A print-like texture drifts as one surface. Soft edges dissolve into an ordered pattern.",
	},
	{
		id: "blur",
		name: "Blur",
		title: "Softness behind the action",
		description:
			"Quiet layers of ink move behind the label. The shape remains soft as it responds to touch.",
	},
	{
		id: "continuity",
		name: "Continuity",
		title: "The same brew, becoming the next",
		description:
			"Repeat, adjust, save. The values remain the same objects as the record changes shape. Demo data only.",
	},
] as const;
export default function CtaLab({
	standalone = false,
}: {
	standalone?: boolean;
}) {
	const [selected, setSelected] = useState(() => {
		const id = new URLSearchParams(window.location.search).get("study");
		return STUDIES.find((study) => study.id === id)?.id ?? "ascii";
	});
	const [textureMode, setTextureMode] = useState<"ascii" | "dither" | "blur">(
		selected === "continuity" ? "ascii" : selected,
	);
	const [animated, setAnimated] = useState(true);
	const active = STUDIES.find((study) => study.id === selected)!;
	useEffect(() => {
		if (standalone) return;
		const url = new URL(window.location.href);
		url.searchParams.set("study", selected);
		window.history.replaceState(window.history.state, "", url);
	}, [selected, standalone]);
	return (
		<div className="motion-lab" data-motion={animated ? "on" : "off"}>
			<header className="motion-lab-heading">
				<div>
					<p className="motion-eyebrow">Coffyyy · interactive studies</p>
					<h1>Find the feeling.</h1>
				</div>
				<button
					type="button"
					className="motion-switch"
					aria-pressed={animated}
					onClick={() => setAnimated(!animated)}
				>
					Motion {animated ? "on" : "off"}
					<span aria-hidden>{animated ? "Ⅱ" : "▷"}</span>
				</button>
			</header>
			<nav className="motion-tabs" aria-label="Motion studies">
				{STUDIES.map((study) => (
					<button
						key={study.id}
						type="button"
						aria-pressed={selected === study.id}
						onClick={() => {
							setSelected(study.id);
							if (study.id !== "continuity") setTextureMode(study.id);
						}}
					>
						{study.name}
					</button>
				))}
			</nav>
			<div className="motion-context">
				<p className="motion-eyebrow">Friday · your brew journal</p>
				<p className="motion-greeting">Good morning.</p>
			</div>
			<div className="motion-stage">
				<div className="motion-panel" hidden={selected === "continuity"}>
					<TextureStudy
						mode={textureMode}
						animated={animated && selected !== "continuity"}
					/>
				</div>
				<div className="motion-panel" hidden={selected !== "continuity"}>
					<ContinuityStudy animated={animated && selected === "continuity"} />
				</div>
			</div>
			<div className="motion-description">
				<h2>{active.title}</h2>
				<p>{active.description}</p>
			</div>
			<div className="motion-shelf" aria-hidden>
				<div>
					<span className="motion-eyebrow">Colombia</span>
					<strong>Moonwalk</strong>
					<span>Chocolate · orange</span>
				</div>
				<div>
					<span className="motion-eyebrow">Ethiopia</span>
					<strong>Guji</strong>
					<span>Jasmine · stone fruit</span>
				</div>
			</div>
			<p className="motion-disclaimer">
				Exploration · interactions use sample data and don’t change your
				journal.
			</p>
		</div>
	);
}
