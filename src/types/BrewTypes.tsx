import type { BeanCardProps } from "./BeanTypes";

export type Brews = {
	id: number;
	bean: string | undefined;
	overallRating:
		| "Excellent"
		| "Good"
		| "Mid"
		| "Horrible"
		| "Burnt🔥"
		| "default";
	grindSize: string;
	date: Date;
	acidity:
		| "⚡ Too sharp/sour"
		| "🍋 Bright/Lively"
		| "😊 Balanced"
		| "😴 Flat/Dull"
		| "default";
	adjustementNeeded:
		| "Keep this setting 👍"
		| "Grind finer next time ⬇️"
		| "Grind coarser next time ⬆️"
		| "Try different machine 🔄"
		| "Fuck this bean ‼️"
		| "default";
	aftertaste:
		| "✨ Amazing - lingering sweetness"
		| "👍 Pleasant"
		| "😐 Neutral"
		| "👎 Unpleasant/harsh"
		| "default";
	bitterness:
		| "👍 Barely noticeable"
		| "🍫 Pleasant bitter"
		| "😐 None"
		| "😖 Too bitter"
		| "default";
	mouthfeel:
		| "💧 Thin/Watery"
		| "😊 Balanced"
		| "😐 Neutral"
		| "😖 Too watery"
		| "🔥 Fluffy/airy"
		| "default";
	strength: "‼️ Too strong" | "🍃 Just right" | "💧Too weak" | "default";
	machine: string | undefined;
	tasteProfiles: Array<string>;
};

export type BrewForm = {
	bean: string | undefined;
	overallRating: string;
	grindSize: string;
	date: Date;
	acidity: string;
	adjustementNeeded: string;
	aftertaste: string;
	bitterness: string;
	mouthfeel: string;
	strength: string;
	machine: string | undefined;
	tasteProfiles: Array<string>;
};

export type BrewSuggestions = {
	bean: Array<BeanCardProps>;
	grindSize: Array<string>;
	overallRating: Array<string>;
	adjustementNeeded: Array<string>;
	aftertaste: Array<string>;
	acidity: Array<string>;
	bitterness: Array<string>;
	mouthfeel: Array<string>;
	strength: Array<string>;
	machine: Array<string>;
	tasteProfiles: Array<string>;
};
