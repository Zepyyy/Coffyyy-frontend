import { passionflowerStudy } from "./passionflower-study";
import { horizon } from "./horizon";
import { nocturne } from "./nocturne";
import { leaffall } from "./leaffall";
import { daylight } from "./daylight";
import { moonflower } from "./moonflower";
import type { Scene } from "../engine";
import { atlas } from "./atlas";
import { bloom } from "./bloom";
import { cherry } from "./cherry";
import { dandelion } from "./dandelion";
import { jelly } from "./jelly";
import { koi } from "./koi";
import { veil } from "./veil";
import { whale } from "./whale";

export const SCENES: Record<string, Scene> = {
	"passionflower-study": passionflowerStudy,
	horizon,
	nocturne,
	leaffall,
	daylight,
	moonflower,
	atlas,
	bloom,
	cherry,
	dandelion,
	jelly,
	koi,
	veil,
	whale,
};

