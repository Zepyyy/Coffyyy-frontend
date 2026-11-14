import { passionflowerStudy } from "./passionflower-study";
import { nocturne } from "./nocturne";
import { moonflower } from "./moonflower";
import type { BrewMethod } from "@/types/BrewTypes";
import type { Scene } from "../engine";
import { bloom } from "./bloom";
import { espresso, moka, v60 } from "./brewer";
import { cherry } from "./cherry";
import { dandelion } from "./dandelion";
import { jelly } from "./jelly";
import { koi } from "./koi";
import { lakeside } from "./lakeside";
import { reflection } from "./reflection";
import { veil } from "./veil";
import { willow } from "./willow";

export const SCENES: Record<string, Scene> = {
	"passionflower-study": passionflowerStudy,
	nocturne,
	moonflower,
	bloom,
	cherry,
	dandelion,
	espresso,
	jelly,
	koi,
	lakeside,
	moka,
	reflection,
	v60,
	veil,
	willow,
};

/** The plate on the page is whatever the journal last brewed with. */
export function sceneForMethod(method: BrewMethod | undefined): Scene {
	if (method === "espresso") return espresso;
	if (method === "pour-over") return v60;
	return moka;
}
