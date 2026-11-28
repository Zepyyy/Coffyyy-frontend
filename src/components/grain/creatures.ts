/**
 * Every background the owner can pick, in picker order.
 * Kept apart from the scenes so the header stays light.
 */
export type Background = {
	id: string;
	name: string;
	/** The grain the scene is drawn for; the owner can switch it per background. */
	print?: "fine" | "coarse";
};

export const BACKGROUNDS: readonly Background[] = [
	{ id: "cherry", name: "Coffee branch" },
	{ id: "bloom", name: "Bloom" },
	{ id: "dandelion", name: "Dandelion" },
	{ id: "moonflower", name: "Passionflower" },
	{ id: "koi", name: "Koi" },
];

/** First visit, and any saved pick that no longer exists. */
export const DEFAULT_BACKGROUND = "cherry";
