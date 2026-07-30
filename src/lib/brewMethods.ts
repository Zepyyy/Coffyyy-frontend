import type { BrewForm, BrewMethod, Brews } from "@/types/BrewTypes";

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

/** Choose the newest matching setup, preferring the selected Brewer when one exists. */
export function findLastUsedBrew(
	brews: Brews[],
	beanId: number | undefined,
	method: BrewMethod | undefined,
	brewerId?: number,
): Brews | null {
	if (beanId == null || method == null) return null;

	const matching = brews
		.filter((brew) => brew.beanId === beanId && brew.method === method)
		.sort((a, b) => +new Date(b.date) - +new Date(a.date));

	if (brewerId != null) {
		const brewerMatch = matching.find((brew) => brew.brewerId === brewerId);
		if (brewerMatch) return brewerMatch;
	}

	return matching[0] ?? null;
}

function hasValue(value: number | string | undefined) {
	return value !== undefined && value !== "";
}

function keepManualValue<T extends number | string | undefined>(
	current: T,
	suggestion: T | undefined,
): T {
	return hasValue(current) || suggestion === undefined ? current : suggestion;
}

/** Apply a Last used setup only to fields the user has not already entered. */
export function applyLastUsedBrew(form: BrewForm, lastUsed: Brews): BrewForm {
	const next = {
		...form,
		grindSize: keepManualValue(form.grindSize, lastUsed.grindSize),
		beanWeight: keepManualValue(form.beanWeight, lastUsed.beanWeight),
	};

	if (form.method === "Espresso") {
		return {
			...next,
			espressoWeight: keepManualValue(
				form.espressoWeight,
				lastUsed.espressoWeight,
			),
			extractionTime: keepManualValue(
				form.extractionTime,
				lastUsed.extractionTime,
			),
			flow: keepManualValue(form.flow, lastUsed.flow),
		};
	}

	if (form.method === "Moka Pot") {
		return {
			...next,
			yieldWeight: keepManualValue(form.yieldWeight, lastUsed.yieldWeight),
			waterAmount: keepManualValue(form.waterAmount, lastUsed.waterAmount),
			heatLevel: keepManualValue(form.heatLevel, lastUsed.heatLevel),
			brewTime: keepManualValue(form.brewTime, lastUsed.brewTime),
		};
	}

	return next;
}

export type BrewSummaryRow = {
	label: string;
	value: string;
};

function displayValue(value: number | string | undefined) {
	return value === undefined || value === "" ? "—" : String(value);
}

/** Build the method-first summary shown immediately before a Brew is saved. */
export function buildBrewSummary(
	form: BrewForm,
	beanName: string | undefined,
	brewerName: string | undefined,
): BrewSummaryRow[] {
	const rows: BrewSummaryRow[] = [
		{ label: "Brew method", value: form.method ?? "—" },
		{ label: "Bean", value: beanName ?? "—" },
		{ label: "Brewer", value: brewerName ?? "No brewer recorded" },
	];

	if (!form.method) return rows;

	rows.push({ label: "Grind size", value: displayValue(form.grindSize) });
	rows.push({
		label: "Coffee dose",
		value: form.beanWeight == null ? "—" : `${form.beanWeight} g`,
	});

	if (form.method === "Moka Pot") {
		rows.push({
			label: "Yield",
			value: form.yieldWeight == null ? "—" : `${form.yieldWeight} g`,
		});
		rows.push({
			label: "Water amount",
			value: form.waterAmount == null ? "—" : `${form.waterAmount} ml`,
		});
		rows.push({ label: "Heat level", value: form.heatLevel ?? "—" });
		rows.push({ label: "Total brew time", value: displayValue(form.brewTime) });
	} else {
		rows.push({
			label: "Espresso yield",
			value: form.espressoWeight == null ? "—" : `${form.espressoWeight} g`,
		});
		if (form.beanWeight && form.espressoWeight) {
			rows.push({
				label: "Ratio",
				value: `1:${(form.espressoWeight / form.beanWeight).toFixed(1)}`,
			});
		}
		rows.push({
			label: "Extraction time",
			value: displayValue(form.extractionTime),
		});
		rows.push({ label: "Flow", value: displayValue(form.flow) });
	}

	return rows;
}
