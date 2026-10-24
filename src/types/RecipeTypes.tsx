import type { components } from "@/lib/api/schema.gen";

export type SnapshotRecipe = components["schemas"]["Recipe"];
/** Brew methods that support recipes (moka has none). */
export type RecipeMethod = SnapshotRecipe["method"];

// Local row: Dexie keys replace snapshot localId references, createdAt is a Date.
export type Recipes = Omit<
	SnapshotRecipe,
	"localId" | "beanLocalId" | "createdAt"
> & {
	id: number;
	localId?: string;
	beanId?: number;
	createdAt: Date;
};

/** Input for addRecipe: id, localId and createdAt are assigned on save. */
export type NewRecipe = Omit<Recipes, "id" | "localId" | "createdAt">;

/** Editable recipe fields; method is immutable after creation. */
export type RecipeChanges = Partial<
	Omit<Recipes, "id" | "localId" | "method" | "createdAt">
>;
