import { passionflowerStudy } from "./passionflower-study";
import { nocturne } from "./nocturne";
import { moonflower } from "./moonflower";
import type { Scene } from "../engine";
import { bloom } from "./bloom";
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
	jelly,
	koi,
	lakeside,
	reflection,
	veil,
	willow,
};
