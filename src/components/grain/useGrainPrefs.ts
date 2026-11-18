import { useSyncExternalStore } from "react";
import { BACKGROUNDS, DEFAULT_BACKGROUND } from "./creatures";
import type { Print } from "./engine";
import type { MotionPreference } from "./motion";

/** Which background the owner picked. */
export type GrainPrefs = {
	scene: string;
	motion: MotionPreference;
	print: Print;
};

const KEY = "coffyyy:grain";
const listeners = new Set<() => void>();
/** First visit. Any pick the owner makes is saved and wins. */
const FALLBACK: GrainPrefs = {
	scene: DEFAULT_BACKGROUND,
	motion: null,
	print: "fine",
};
let cache: GrainPrefs | null = null;

function read(): GrainPrefs {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
		const scene =
			typeof raw?.scene === "string" &&
			BACKGROUNDS.some((b) => b.id === raw.scene)
				? raw.scene
				: FALLBACK.scene;
		const motion = typeof raw?.motion === "boolean" ? raw.motion : null;
		const print = raw?.print === "coarse" ? "coarse" : "fine";
		return { scene, motion, print };
	} catch {
		return FALLBACK;
	}
}

function snapshot() {
	cache ??= read();
	return cache;
}

export function setGrainPrefs(patch: Partial<GrainPrefs>) {
	cache = { ...snapshot(), ...patch };
	try {
		localStorage.setItem(KEY, JSON.stringify(cache));
	} catch {
		// Private mode: the choice just lasts until reload.
	}
	for (const l of listeners) l();
}

function subscribe(l: () => void) {
	listeners.add(l);
	return () => listeners.delete(l);
}

export function useGrainPrefs(): GrainPrefs {
	return useSyncExternalStore(subscribe, snapshot, () => FALLBACK);
}
