/**
 * Stable client-generated IDs for local rows.
 *
 * crypto.randomUUID() only exists in secure contexts (localhost, HTTPS) and
 * in newer browsers. The app is routinely opened from a phone over plain
 * HTTP, so fall back to a UUID v4 built on crypto.getRandomValues, which is
 * available in every browser, and to Math.random as a last resort.
 */
export function randomId(): string {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}

	if (
		typeof crypto !== "undefined" &&
		typeof crypto.getRandomValues === "function"
	) {
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
		bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
		const hex = [...bytes]
			.map((byte) => byte.toString(16).padStart(2, "0"))
			.join("");
		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}

	return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (digit) =>
		(
			Number(digit) ^
			(Math.floor(Math.random() * 256) & (15 >> (Number(digit) / 4)))
		).toString(16),
	);
}
