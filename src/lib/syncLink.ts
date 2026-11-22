const KEY = "sync";

/** Link that opens the app with the sync code prefilled (hash never hits servers). */
export function buildSyncLink(code: string, origin = window.location.origin) {
	return `${origin}/#${KEY}=${encodeURIComponent(code)}`;
}

export function readSyncCodeFromHash(hash = window.location.hash) {
	const value = new URLSearchParams(hash.replace(/^#/, "")).get(KEY);
	return value?.trim() || null;
}

export function clearSyncHash() {
	if (readSyncCodeFromHash())
		window.history.replaceState(
			null,
			"",
			window.location.pathname + window.location.search,
		);
}
