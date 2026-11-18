import { isBrewMethod, type BrewMethod } from "@/lib/brewMethods";

const KEY = "coffyyy.brew-selection";

type BrewSelection = {
	method?: BrewMethod;
	brewers?: Partial<Record<BrewMethod, string>>;
};

export function readBrewSelection(): BrewSelection {
	try {
		const value = JSON.parse(localStorage.getItem(KEY) ?? "{}");
		return isBrewMethod(value?.method) ? value : {};
	} catch {
		return {};
	}
}

export function rememberBrewSelection(method: BrewMethod, brewerId?: string) {
	const selection = readBrewSelection();
	try {
		localStorage.setItem(
			KEY,
			JSON.stringify({
				method,
				brewers: {
					...selection.brewers,
					...(brewerId != null && { [method]: brewerId }),
				},
			}),
		);
	} catch {
		// Brewing is still available when browser storage is disabled.
	}
}
