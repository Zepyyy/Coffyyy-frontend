export function formatShortDate(value: Date | string, includeYear = false) {
	return new Date(value).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
		...(includeYear ? { year: "numeric" } : {}),
	});
}
