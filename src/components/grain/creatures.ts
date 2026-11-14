import { BACKGROUND_STUDIES } from "./studies";

/** Names for the picker. Kept apart from the scenes so the header stays light. */
export const BACKGROUNDS = [
	{ id: "auto", name: "Follow my brews" },
	...BACKGROUND_STUDIES.map(({ id, name }) => ({ id, name })),
	{ id: "koi", name: "Koi" },
	{ id: "jelly", name: "Jellyfish" },
	{ id: "veil", name: "Betta" },
	{ id: "bloom", name: "Bloom" },
	{ id: "cherry", name: "Coffee branch" },
	{ id: "dandelion", name: "Dandelion" },
	{ id: "moonflower", name: "Passionflower" },
	{ id: "nocturne", name: "Nocturne" },
	{ id: "lakeside", name: "Lakeside" },
	{ id: "moka", name: "Moka" },
	{ id: "v60", name: "V60" },
	{ id: "espresso", name: "Espresso" },
] as const;
