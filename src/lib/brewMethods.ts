import type { BrewMethod, Brews } from "@/types/BrewTypes";

export type MethodSpecificMeasurements = Pick<
	Brews,
	| "espressoWeight"
	| "yieldWeight"
	| "extractionTime"
	| "flow"
	| "waterAmount"
	| "heatLevel"
	| "brewTime"
>;

/** Keep measurements meaningful to the selected Brew method. */
export function isolateMethodMeasurements(
	method: BrewMethod,
	measurements: MethodSpecificMeasurements,
): MethodSpecificMeasurements {
	if (method === "Espresso") {
		return {
			espressoWeight: measurements.espressoWeight,
			extractionTime: measurements.extractionTime,
			flow: measurements.flow,
			yieldWeight: undefined,
			waterAmount: undefined,
			heatLevel: undefined,
			brewTime: undefined,
		};
	}

	return {
		espressoWeight: undefined,
		yieldWeight: measurements.yieldWeight,
		extractionTime: undefined,
		flow: undefined,
		waterAmount: measurements.waterAmount,
		heatLevel: measurements.heatLevel,
		brewTime: measurements.brewTime,
	};
}
