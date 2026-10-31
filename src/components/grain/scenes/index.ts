import type { BrewMethod } from "@/types/BrewTypes";
import type { Scene } from "../engine";
import { espresso, moka, v60 } from "./brewer";
import { kaldi } from "./kaldi";
import { plume } from "./plume";

export const SCENES: Record<string, Scene> = {
	espresso,
	kaldi,
	moka,
	plume,
	v60,
};

/** The plate on the page is whatever the journal last brewed with. */
export function sceneForMethod(method: BrewMethod | undefined): Scene {
	if (method === "espresso") return espresso;
	if (method === "moka") return moka;
	if (method === "pour-over") return v60;
	return plume;
}
