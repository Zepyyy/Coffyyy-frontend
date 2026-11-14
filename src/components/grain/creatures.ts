/**
 * Every background the owner can pick, in picker order. Explorations are
 * work in progress: tagged in the picker, but just as selectable.
 * Kept apart from the scenes so the header stays light.
 */
export type Background = {
	id: string;
	name: string;
	exploration?: boolean;
	note?: string;
};

export const BACKGROUNDS: readonly Background[] = [
	{ id: "cherry", name: "Coffee branch" },
	{ id: "bloom", name: "Bloom" },
	{ id: "dandelion", name: "Dandelion" },
	{ id: "moonflower", name: "Passionflower" },
	{ id: "koi", name: "Koi" },
	{
		id: "lakeside",
		name: "Lakeside",
		exploration: true,
		note: "A mountain lake at golden hour, with a village and someone fishing off the dock.",
	},
	{
		id: "passionflower-study",
		name: "Passionflower garden",
		exploration: true,
		note: "Anemones, airy verbena and a visiting bee beside the passion vine.",
	},
];

/** First visit, and any saved pick that no longer exists. */
export const DEFAULT_BACKGROUND = "cherry";
