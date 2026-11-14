import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
const snapshot = () => window.matchMedia?.(query).matches ?? false;

function subscribe(onChange: () => void) {
	const media = window.matchMedia?.(query);
	media?.addEventListener("change", onChange);
	return () => media?.removeEventListener("change", onChange);
}

/** Live OS preference, shared by motion and the controls describing it. */
export function useReducedMotion() {
	return useSyncExternalStore(subscribe, snapshot, () => true);
}
