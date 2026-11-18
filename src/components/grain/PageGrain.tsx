import { useSearchParams } from "react-router";
import { DEFAULT_BACKGROUND } from "./creatures";
import GrainField from "./GrainField";
import { pageMotion } from "./motion";
import { SCENES } from "./scenes";
import { printFor, useGrainPrefs } from "./useGrainPrefs";

/**
 * The journal's background creature, with the owner's saved pick. Keep it in
 * the shared app shell so navigation preserves its clock. Mark page content with
 * `data-grain-anchor="content"` plus `data-grain-quiet` so dots keep off text.
 */
export default function PageGrain() {
	const [searchParams] = useSearchParams();
	const prefs = useGrainPrefs();
	const grainParam = searchParams.get("grain");
	const motion = pageMotion(
		prefs.motion,
		Boolean(grainParam && SCENES[grainParam]),
		searchParams.get("motion") ?? searchParams.get("grainMotion"),
	);
	const id =
		grainParam && SCENES[grainParam]
			? grainParam
			: SCENES[prefs.scene]
				? prefs.scene
				: DEFAULT_BACKGROUND;
	return (
		<GrainField
			scene={SCENES[id]}
			print={printFor(prefs, id)}
			animated={motion ?? undefined}
		/>
	);
}
