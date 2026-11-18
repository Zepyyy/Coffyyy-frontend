/**
 * Every background the owner can pick, in picker order. Explorations are
 * work in progress: tagged in the picker, but just as selectable.
 * Kept apart from the scenes so the header stays light.
 */
export type Background = {
	id: string;
	name: string;
	/** The grain the scene is drawn for; the owner can switch it per background. */
	print?: "fine" | "coarse";
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
		print: "coarse",
		exploration: true,
		note: "A mountain lake at golden hour, with a village and someone fishing off the dock.",
	},
	{
		id: "beangarden",
		name: "Bean garden",
		exploration: true,
		note: "Every bean in your library is a plant in the border. Brews grow it; a finished bag goes to seed.",
	},
	{
		id: "dayvine",
		name: "Day and night vine",
		exploration: true,
		note: "Morning glories open with the morning and close by afternoon; moonflowers open at dusk for the night moths.",
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
