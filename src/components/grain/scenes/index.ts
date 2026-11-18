import { passionflowerStudy } from "./passionflower-study";
import { moonflower } from "./moonflower";
import type { Scene } from "../engine";
import { bloom } from "./bloom";
import { cherry } from "./cherry";
import { dandelion } from "./dandelion";
import { koi } from "./koi";
import { lakeside } from "./lakeside";
import { starvalley } from "./starvalley";
import { coffeefarm } from "./coffeefarm";

export const SCENES: Record<string, Scene> = {
	"passionflower-study": passionflowerStudy,
	moonflower,
	bloom,
	cherry,
	dandelion,
	koi,
	lakeside,
	starvalley,
	coffeefarm,
};
