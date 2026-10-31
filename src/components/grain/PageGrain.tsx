import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useSearchParams } from "react-router";
import * as data from "@/lib/data";
import type { Beans } from "@/types/BeanTypes";
import type { BrewMethod } from "@/types/BrewTypes";
import GrainField from "./GrainField";
import { SCENES, sceneForMethod } from "./scenes";
import { useGrainPrefs } from "./useGrainPrefs";

/** The page the ASCII lattice holds: this journal's own beans and notes. */
function journalText(beans: Beans[]) {
	const words = beans.flatMap((bean) => [
		bean.name,
		...(bean.origin ?? []),
		...(bean.flavors ?? []),
	]);
	const line =
		words.length > 0 ? words.join(" · ") : "coffyyy · a brew journal";
	return `${line} · `;
}

/** Survives page switches, so a remount never flashes the fallback plate. */
let lastMethod: BrewMethod | null | undefined;
let lastText: string | undefined;

/**
 * The page's background creature, with the owner's saved pick. Mount it first
 * inside a `relative` page, and mark the page's content with
 * `data-grain-anchor="content"` plus `data-grain-quiet` so dots keep off text.
 */
export default function PageGrain() {
	const [searchParams] = useSearchParams();
	const recent = useLiveQuery(() => data.getRecentBrews(1), []);
	const beans = useLiveQuery(() => data.getAllBeans(), []);
	const prefs = useGrainPrefs();
	const grainParam = searchParams.get("grain");
	const method = recent ? (recent[0]?.method ?? null) : lastMethod;
	const text = beans ? journalText(beans) : lastText;
	useEffect(() => {
		lastMethod = method;
		lastText = text;
	}, [method, text]);
	const chosen = (grainParam && SCENES[grainParam]) || SCENES[prefs.scene];
	// While the journal is still loading there is no honest "follow my brews"
	// answer, and a guess would flash the wrong plate. Wait one tick instead.
	if (!chosen && method === undefined) return null;
	const scene = chosen || sceneForMethod(method ?? undefined);
	return (
		<GrainField
			scene={scene}
			text={text ?? "coffyyy · a brew journal · "}
			animated={grainParam ? true : prefs.motion}
		/>
	);
}
