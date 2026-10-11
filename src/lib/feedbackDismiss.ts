/**
 * Brews the user chose not to rate right away come back as a prompt on the
 * dashboard. Dismissing one is remembered locally so it stays dismissed.
 */
const KEY = "coffyyy.dismissedFeedbackBrewIds";

export function getDismissedFeedbackBrewIds(): number[] {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((id): id is number => typeof id === "number")
			: [];
	} catch {
		return [];
	}
}

export function dismissFeedbackBrew(id: number) {
	try {
		const dismissed = getDismissedFeedbackBrewIds();
		if (!dismissed.includes(id)) {
			localStorage.setItem(KEY, JSON.stringify([...dismissed, id]));
		}
	} catch {
		// Storage unavailable (private mode): dismissal just won't persist.
	}
}
