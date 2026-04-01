import type { BeanCardProps } from "@/types/BeanTypes";
import type { BrewSuggestions } from "@/types/BrewTypes";

export function buildBrewSuggestions(
	beanCardInfo: Array<BeanCardProps>,
	machineRecords: Array<string>,
): BrewSuggestions {
	const bean: Array<BeanCardProps> = beanCardInfo;
	const grindSize: Array<string> = [];
	const beanWeight: Array<number> = [];
	const espressoWeight: Array<number> = [];
	const extractionTime: Array<string> = [];
	const flow: Array<string> = ["Even", "One-sided", "Uneven"];
	const overallRating: Array<string> = [
		"Excellent",
		"Good",
		"Mid",
		"Horrible",
		"Burnt🔥",
	];
	const machine: Array<string> = machineRecords ?? [];

	return {
		bean,
		grindSize,
		beanWeight,
		espressoWeight,
		extractionTime,
		flow,
		overallRating,
		machine,
	};
}
