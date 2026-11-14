/** null follows the device; booleans are the owner's explicit playback choice. */
export type MotionPreference = boolean | null;

/** A dashboard trial can request playback without changing the saved choice. */
export function pageMotion(
	saved: MotionPreference,
	preview: boolean,
	requested: string | null,
): MotionPreference {
	if (preview && requested === "on") return true;
	if (preview && requested === "off") return false;
	return saved;
}
