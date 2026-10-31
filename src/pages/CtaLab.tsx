import { useEffect, useState } from "react";
import { Link } from "react-router";
import ContinuityStudy from "@/components/motion/ContinuityStudy";
import "./CtaLab.css";

const FIELDS = [
	{ id: "moka", name: "Moka" },
	{ id: "v60", name: "V60" },
	{ id: "espresso", name: "Espresso" },
	{ id: "koi", name: "Koi" },
	{ id: "whale", name: "Whale" },
	{ id: "jelly", name: "Jellyfish" },
] as const;

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
					<Link key={field.id} to={`/home?grain=${field.id}`}>
						{field.name}
					</Link>
				))}
			</nav>
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
