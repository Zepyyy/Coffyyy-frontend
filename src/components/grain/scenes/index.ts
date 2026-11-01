import type { BrewMethod } from "@/types/BrewTypes";
import type { Scene } from "../engine";
import { atlas } from "./atlas";
import { bloom } from "./bloom";
import { espresso, moka, v60 } from "./brewer";
import { cherry } from "./cherry";
import { dandelion } from "./dandelion";
import { jelly } from "./jelly";
import { koi } from "./koi";
import { veil } from "./veil";
import { whale } from "./whale";

export const SCENES: Record<string, Scene> = {
	atlas,
	bloom,
	cherry,
	dandelion,
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
