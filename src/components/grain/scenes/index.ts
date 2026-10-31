import type { BrewMethod } from "@/types/BrewTypes";
import type { Scene } from "../engine";
import { espresso, moka, v60 } from "./brewer";
import { jelly } from "./jelly";
import { koi } from "./koi";
import { veil } from "./veil";
import { whale } from "./whale";

export const SCENES: Record<string, Scene> = {
	espresso,
	jelly,
	koi,
	moka,
	v60,
	veil,
	whale,
};

/** The plate on the page is whatever the journal last brewed with. */
export function sceneForMethod(method: BrewMethod | undefined): Scene {
	if (method === "espresso") return espresso;
	if (method === "pour-over") return v60;
	return moka;
}
