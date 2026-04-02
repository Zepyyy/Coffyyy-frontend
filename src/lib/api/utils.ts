export function uniqueSorted(values: Array<string>) {
	return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
		(a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }),
	);
}
