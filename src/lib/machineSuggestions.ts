import type { MachineSuggestions, Machines } from "@/types/MachineTypes";

function uniqueSorted(values: Array<string>) {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
		(a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }),
	);
}

export function buildMachineSuggestions(
	machines: Array<Machines>,
): MachineSuggestions {
	const names: Array<string> = [];
	const brands: Array<string> = [];
	const models: Array<string> = [];
	const types: Array<string> = ["Espresso", "Moka Pot"];
	const grindRanges: Array<string> = [];
	const capacities: Array<string> = [];

	for (const machine of machines) {
		if (machine.name) names.push(machine.name);
		if (machine.brand) brands.push(machine.brand);
		if (machine.model) models.push(machine.model);
		if (machine.type) types.push(machine.type);
		if (machine.grindRange) grindRanges.push(machine.grindRange);
		if (machine.capacity) capacities.push(machine.capacity);
	}

	return {
		names: uniqueSorted(names),
		brands: uniqueSorted(brands),
		models: uniqueSorted(models),
		types: uniqueSorted(types),
		grindRanges: uniqueSorted(grindRanges),
		capacities: uniqueSorted(capacities),
	};
}
