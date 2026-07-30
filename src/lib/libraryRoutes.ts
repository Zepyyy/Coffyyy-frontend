export const LIBRARY_PATHS = {
	root: "/library",
	beans: "/library/beans",
	brewers: "/library/brewers",
} as const;

export const LIBRARY_DEFAULT_PATH = LIBRARY_PATHS.beans;

export const LIBRARY_ROUTE_SEGMENTS = {
	beans: "beans",
	brewers: "brewers",
	beanDetail: ":beanId",
	brewerDetail: ":brewerId",
} as const;

export const LIBRARY_ROUTE_PATTERNS = {
	beans: `${LIBRARY_PATHS.root}/${LIBRARY_ROUTE_SEGMENTS.beans}`,
	beanDetail: `${LIBRARY_PATHS.root}/${LIBRARY_ROUTE_SEGMENTS.beans}/${LIBRARY_ROUTE_SEGMENTS.beanDetail}`,
	brewers: `${LIBRARY_PATHS.root}/${LIBRARY_ROUTE_SEGMENTS.brewers}`,
	brewerDetail: `${LIBRARY_PATHS.root}/${LIBRARY_ROUTE_SEGMENTS.brewers}/${LIBRARY_ROUTE_SEGMENTS.brewerDetail}`,
} as const;

export function beanLibraryPath(beanId: number | string) {
	return `${LIBRARY_PATHS.beans}/${beanId}`;
}

export function parseBeanIdParam(value: string | undefined) {
	if (value == null || value.trim() === "") return undefined;
	const beanId = Number(value);
	return Number.isInteger(beanId) && beanId > 0 ? beanId : undefined;
}

export function brewerLibraryPath(brewerId: number | string) {
	return `${LIBRARY_PATHS.brewers}/${brewerId}`;
}

export function brewLogPath({
	beanId,
	brewerId,
}: {
	beanId?: number;
	brewerId?: number;
} = {}) {
	const params = new URLSearchParams();
	if (beanId != null) params.set("beanId", String(beanId));
	if (brewerId != null) params.set("brewerId", String(brewerId));
	const query = params.toString();
	return query ? `/log/brew?${query}` : "/log/brew";
}
