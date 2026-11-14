import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BACKGROUND_EXPLORATIONS } from "@/components/grain/explorations";
import { BACKGROUNDS } from "@/components/grain/creatures";
import { setGrainPrefs } from "@/components/grain/useGrainPrefs";
import ContinuityStudy from "@/components/motion/ContinuityStudy";
import "./CtaLab.css";

const FIELDS = BACKGROUNDS.filter((b) => b.id !== "auto");

export default function CtaLab({
	standalone = false,
}: {
	standalone?: boolean;
}) {
	const [animated, setAnimated] = useState(true);
	useEffect(() => {
		if (standalone) return;
		const url = new URL(window.location.href);
		url.searchParams.set("study", "continuity");
		window.history.replaceState(window.history.state, "", url);
	}, [standalone]);
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
			<nav className="motion-tabs" aria-label="Field studies on the real Home">
				{FIELDS.map((field) => (
					<Link
						key={field.id}
						to="/home"
						onClick={() => setGrainPrefs({ scene: field.id })}
					>
						{field.name}
					</Link>
				))}
			</nav>
			<section
				className="background-studies"
				aria-labelledby="background-studies-title"
			>
				<h2 id="background-studies-title">Background explorations</h2>
				<p>
					Desktop studies, still under review. Try them on your Home; your saved
					background stays yours.
				</p>
				{BACKGROUND_EXPLORATIONS.map((study) => (
					<div className="background-study" key={study.id}>
						<div>
							<h3>{study.name}</h3>
							<p>{study.note}</p>
						</div>
						<Link to={`/home?grain=${study.id}`}>Watch</Link>
						<Link to={`/home?grain=${study.id}&grainMotion=off`}>Still</Link>
					</div>
				))}
			</section>
			<div className="motion-stage">
				<ContinuityStudy animated={animated} />
			</div>
			<div className="motion-description">
				<h2>The same brew, becoming the next</h2>
				<p>
					Repeat, adjust, save. The values remain the same objects as the record
					changes shape. Demo data only.
				</p>
			</div>
			<p className="motion-disclaimer">
				Exploration · interactions use sample data and don’t change your
				journal.
			</p>
		</div>
	);
}
