import type { Scene } from "../engine";
import { bloom } from "./bloom";
import { cherry } from "./cherry";
import { dandelion } from "./dandelion";
import { koi } from "./koi";
import { moonflower } from "./moonflower";

export const SCENES: Record<string, Scene> = {
	moonflower,
	bloom,
	cherry,
	dandelion,
	koi,
};
