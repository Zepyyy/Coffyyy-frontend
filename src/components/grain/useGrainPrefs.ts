import { useSyncExternalStore } from "react";
import { BACKGROUNDS, DEFAULT_BACKGROUND } from "./creatures";
import type { Print } from "./engine";
import type { MotionPreference } from "./motion";

/** Which background the owner picked. */
export type GrainPrefs = {
	scene: string;
	motion: MotionPreference;
	/** Grain switched away from a background's own default, by background id. */
	prints: Record<string, Print>;
};

const KEY = "coffyyy:grain";
const listeners = new Set<() => void>();
/** First visit. Any pick the owner makes is saved and wins. */
const FALLBACK: GrainPrefs = {
	scene: DEFAULT_BACKGROUND,
	motion: null,
	prints: {},
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
		const prints: Record<string, Print> = {};
		for (const { id } of BACKGROUNDS) {
			const print = raw?.prints?.[id];
			if (print === "fine" || print === "coarse") prints[id] = print;
		}
		return { scene, motion, prints };
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

/** The grain a background renders with: the owner's switch, else its own default. */
export function printFor(prefs: GrainPrefs, id: string): Print {
	return (
		prefs.prints[id] ?? BACKGROUNDS.find((b) => b.id === id)?.print ?? "fine"
	);
}

export function setPrint(id: string, print: Print) {
	setGrainPrefs({ prints: { ...snapshot().prints, [id]: print } });
}
