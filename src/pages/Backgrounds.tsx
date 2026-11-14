import { Link, useNavigate, useSearchParams } from "react-router";
import GrainField from "@/components/grain/GrainField";
import { pageMotion } from "@/components/grain/motion";
import { SCENES } from "@/components/grain/scenes";
import { BACKGROUNDS } from "@/components/grain/creatures";
import { setGrainPrefs, useGrainPrefs } from "@/components/grain/useGrainPrefs";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import "./Backgrounds.css";

export default function Backgrounds() {
	const [params, setParams] = useSearchParams();
	const navigate = useNavigate();
	const prefs = useGrainPrefs();
	const reducedMotion = useReducedMotion();
	const requestedMotion = pageMotion(prefs.motion, true, params.get("motion"));
	const playing = requestedMotion ?? !reducedMotion;
	const selected =
		BACKGROUNDS.find((s) => s.id === params.get("scene")) ??
		BACKGROUNDS.find((s) => s.id === prefs.scene) ??
		BACKGROUNDS[0];

	function choose(id: string) {
		setParams(
			(current) => {
				const next = new URLSearchParams(current);
				next.set("scene", id);
				return next;
			},
			{ replace: true },
		);
	}

	function useBackground() {
		setGrainPrefs({ scene: selected.id, motion: requestedMotion });
		navigate("/home");
	}

	function toggleMotion() {
		setGrainPrefs({ motion: !playing });
		if (params.has("motion")) {
			setParams(
				(current) => {
					const next = new URLSearchParams(current);
					next.delete("motion");
					return next;
				},
				{ replace: true },
			);
		}
	}

	return (
		<div className="background-studies">
			<header className="background-studies__intro">
				<p className="background-studies__eyebrow">Backgrounds</p>
				<h1>Choose your background.</h1>
				<p>Preview each scene, then choose your favorite for the journal.</p>
			</header>
			<fieldset className="background-studies__choices">
				<legend className="sr-only">Background candidates</legend>
				{BACKGROUNDS.map(({ id, name, exploration }) => (
					<label key={id}>
						<input
							type="radio"
							name="background-study"
							value={id}
							checked={selected.id === id}
							onChange={() => choose(id)}
						/>
						<span>
							{name}
							{exploration && (
								<em className="background-studies__tag">exploration</em>
							)}
						</span>
					</label>
				))}
			</fieldset>
			<section
				className="background-studies__stage"
				aria-label={`${selected.name} background preview`}
			>
				<GrainField
					scene={SCENES[selected.id]}
					animated={requestedMotion ?? undefined}
				/>
				<button
					type="button"
					className="background-studies__motion"
					aria-pressed={playing}
					onClick={toggleMotion}
				>
					{playing ? "Pause motion" : "Play motion"}
				</button>
			</section>
			<div className="background-studies__caption">
				<div aria-live="polite" aria-atomic="true">
					<h2>{selected.name}</h2>
					{selected.note && <p>{selected.note}</p>}
				</div>
				<div className="background-studies__actions">
					<Link
						to={`/home?grain=${selected.id}&motion=${playing ? "on" : "off"}`}
					>
						Try on dashboard <span aria-hidden>↗</span>
					</Link>
					<button type="button" onClick={useBackground}>
						{prefs.scene === selected.id
							? "Keep this background"
							: "Use this background"}
					</button>
				</div>
			</div>
		</div>
	);
}
