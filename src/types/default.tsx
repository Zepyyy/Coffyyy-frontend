export type ThemeContextType = {
	theme: string;
	toggleTheme: () => void;
};

export type Beans = {
	id?: number;
	brand?: string;
	botanic?: string;
	city?: Array<string>;
	dominantNote?: string;
	finished?: boolean;
	flavors?: Array<string>;
	name?: string;
	origin?: Array<string>;
	roastLevel?: number;
	tastingNotes?: Array<string>;
	variety?: Array<string>;
};
