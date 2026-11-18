import type { BrewSessionIdentity } from "@/types/BrewTypes";
import type { BrewLogForm } from "./brewForm";
export interface BrewSession {
	identity: BrewSessionIdentity;
	startedAt: number;
	form: BrewLogForm & { machineId: number; beanId: number };
	bean: string;
	brewer: string;
	steps: { atSeconds: number; grams: number }[];
	step: number;
	useStarter: boolean;
	entryKey: string;
	actuals?: { seconds: string; water: string; temperature: string };
}

const storageKey = "coffyyy.running-v60.v1";
export function readSession(): BrewSession | null {
	try {
		const s = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
		return s?.identity?.attemptId &&
			s.identity.beanLocalId &&
			s.identity.machineLocalId &&
			s.form?.machineId &&
			s.form.beanId &&
			Number.isFinite(s.startedAt) &&
			Array.isArray(s.steps)
			? s
			: null;
	} catch {
		return null;
	}
}
export function storeSession(session: BrewSession | null) {
	try {
		if (session) sessionStorage.setItem(storageKey, JSON.stringify(session));
		else sessionStorage.removeItem(storageKey);
	} catch {
		/* Brewing still works when browser storage is unavailable. */
	}
}
