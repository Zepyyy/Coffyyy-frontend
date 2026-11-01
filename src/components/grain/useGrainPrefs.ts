import { useSyncExternalStore } from "react";
import { BACKGROUNDS } from "./creatures";

/** Which background the owner picked; `auto` follows the last brew method. */
export type GrainPrefs = { scene: string; motion: boolean };

const KEY = "coffyyy:grain";
const listeners = new Set<() => void>();
/** First visit: the coffee branch. Any pick the owner makes is saved and wins. */
const FALLBACK: GrainPrefs = { scene: "cherry", motion: true };
let cache: GrainPrefs | null = null;

function read(): GrainPrefs {
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
		const scene =
			typeof raw?.scene === "string" &&
			BACKGROUNDS.some((b) => b.id === raw.scene)
				? raw.scene
				: FALLBACK.scene;
		return { scene, motion: raw?.motion !== false };
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
