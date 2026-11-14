import { useSearchParams } from "react-router";
import GrainField from "./GrainField";
import { SCENES } from "./scenes";
import { useGrainPrefs } from "./useGrainPrefs";

/**
 * The journal's background creature, with the owner's saved pick. Keep it in
 * the shared app shell so navigation preserves its clock. Mark page content with
 * `data-grain-anchor="content"` plus `data-grain-quiet` so dots keep off text.
 */
export default function PageGrain() {
	const [searchParams] = useSearchParams();
	const prefs = useGrainPrefs();
	const grainParam = searchParams.get("grain");
	const scene =
		(grainParam && SCENES[grainParam]) || SCENES[prefs.scene] || SCENES.cherry;
	return (
		<GrainField
			scene={scene}
			animated={
				grainParam ? searchParams.get("grainMotion") !== "off" : prefs.motion
			}
		/>
	);
}
