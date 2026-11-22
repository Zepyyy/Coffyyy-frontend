const KEY = "sync";

/** Link that connects whichever browser opens it (hash never hits servers). */
export function buildSyncLink(code: string, origin = window.location.origin) {
	return `${origin}/#${KEY}=${encodeURIComponent(code)}`;
}

/** Accepts a bare sync code or a whole sync link, e.g. pasted from a scanner app. */
export function parseSyncCode(input: string) {
	const value = input.trim();
	const hash = value.indexOf("#");
	if (hash === -1) return value;
	return new URLSearchParams(value.slice(hash + 1)).get(KEY)?.trim() ?? "";
}

/**
 * Reads the sync code out of the address bar and removes it. Must run before
 * the router: the "/" redirect drops the hash.
 */
export function takeSyncCodeFromUrl() {
	if (!window.location.hash) return null;
	const code = parseSyncCode(window.location.hash);
	if (!code) return null;
	window.history.replaceState(
		window.history.state,
		"",
		window.location.pathname + window.location.search,
	);
	return code;
}
