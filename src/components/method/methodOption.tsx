import { methodConfig } from "@/lib/brewMethods";
import { methodInkClass } from "@/lib/methodIdentity";
import type { BrewMethod } from "@/types/BrewTypes";
import { MethodIcon } from "./MethodMarks";

/** A SegmentedControl option for a method: its icon, name and ink. */
export function methodOption<T extends BrewMethod>(method: T, label?: string) {
	return {
		value: method,
		label: label ?? methodConfig(method).label,
		icon: <MethodIcon method={method} label={false} />,
		className: methodInkClass(method),
	};
}
