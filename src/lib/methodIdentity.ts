import type { BrewMethod } from "@/types/BrewTypes";

/**
 * Class that sets `--method` to this method's ink (see index.css). Put it on
 * any element whose descendants should write in the method's colour.
 */
export function methodInkClass(method: BrewMethod | undefined): string {
	return `method-${method ?? "espresso"}`;
}
