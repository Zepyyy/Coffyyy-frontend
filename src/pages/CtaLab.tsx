import { useEffect, useState } from "react";
import CurrentStudy from "@/components/motion/CurrentStudy";
import PrintStudy from "@/components/motion/PrintStudy";
import ContinuityStudy from "@/components/motion/ContinuityStudy";
import "./CtaLab.css";

const STUDIES = [
	{
		id: "current",
		name: "Current",
		title: "A surface with a pulse",
		description:
			"Move across it, or tap. The current gathers around your touch, then finds its own rhythm again.",
	},
	{
		id: "type",
		name: "Type",
		title: "Type you can play",
		description:
			"Move across the letters, or tap to roll the whole phrase. The motion lives in the typography.",
	},
	{
		id: "continuity",
		name: "Continuity",
		title: "The same brew, becoming the next",
		description:
			"Repeat, adjust, save. The values remain the same objects as the record changes shape. Demo data only.",
	},
];
export default function CtaLab({
	standalone = false,
}: {
	standalone?: boolean;
}) {
	const [selected, setSelected] = useState(() => {
		const id = new URLSearchParams(window.location.search).get("study");
		return STUDIES.some((study) => study.id === id) ? id! : "current";
	});
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
						onClick={() => setSelected(study.id)}
					>
						{study.name}
					</button>
				))}
			</nav>
			<div className="motion-context">
				<p className="motion-eyebrow">Friday · your brew journal</p>
				<p className="motion-greeting">Good morning.</p>
			</div>
			<div className="motion-stage" key={selected}>
				{selected === "current" && <CurrentStudy animated={animated} />}
				{selected === "type" && <PrintStudy animated={animated} />}
				{selected === "continuity" && <ContinuityStudy animated={animated} />}
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
