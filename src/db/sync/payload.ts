import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";

export function beanSyncPayload(bean: Beans): Record<string, unknown> {
	return {
		name: bean.name,
		flavors: bean.flavors,
		rating: bean.rating,
		roastLevel: bean.roastLevel,
		countries: bean.origin,
		cities: [],
		botanic: enumValue(bean.botanic, "ARABICA"),
		varieties: bean.variety,
		brands: bean.brand ? [bean.brand] : [],
		status: enumValue(bean.status, "NEW"),
		dominantNote: enumValue(bean.dominantNote, "FRUITY"),
		designation: enumValue(bean.designation, "PURE_ORIGIN"),
		finished: bean.finished,
	};
}

export function machineSyncPayload(machine: Machines): Record<string, unknown> {
	return {
		name: machine.name,
		brand: machine.brand,
		type: machine.type,
		purchaseDate: machine.purchaseDate || null,
		model: machine.model,
		grindRange: machine.grindRange,
		capacity: machine.capacity,
	};
}

export function brewSyncPayload(
	brew: Brews,
	beanLocalId: string | undefined,
	machineLocalId: string | undefined,
): Record<string, unknown> {
	return {
		beanId: beanLocalId,
		machineId: machineLocalId,
		beanWeight: brew.beanWeight,
		espressoWeight: brew.espressoWeight,
		extractionTime: brew.extractionTime ?? "",
		flow: brew.flow ?? "",
		overallRating: brew.overallRating ?? 0,
		tasteScore: brew.tasteScore ?? 0,
		strengthScore: brew.strengthScore ?? 0,
		grindSize: brew.grindSize,
		date: new Date(brew.date).toISOString(),
	};
}

function enumValue(value: string, fallback: string) {
	return value ? value.replaceAll(" ", "_").toUpperCase() : fallback;
}
