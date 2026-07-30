export function isSelectableForBrew(
	item: { archived?: boolean } | undefined,
): boolean {
	return item != null && !item.archived;
}

export function canPermanentlyDelete(brewCount: number): boolean {
	return brewCount === 0;
}
