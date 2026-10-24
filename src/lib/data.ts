/**
 * Application data boundary.
 *
 * UI code talks to this module only. Implementations can later be swapped for
 * a sync-aware adapter without changing screens. Dexie remains the local
 * cache; its live queries observe writes immediately.
 */
export {
	getBean,
	getAllBeans,
	getBeanCount,
	getAllBeanNames,
	getBeanDominantNote,
	getBeanFilters,
	getBeanSuggestions,
} from "./api/beans";
export {
	getRecentBrews,
	getLatestUnratedBrew,
	getLastBrew,
	getLastBrewForBean,
	getBrewsForHistoryView,
	getHistorySidebarStats,
	getBrewsForBeanId,
	getBrewSuggestions,
	getGrindSettingsForBean,
	getLastUsedMachineId,
	getBrewFormStart,
} from "./api/brews";
export type { BrewFormStart, GrindSettingSummary } from "./api/brews";
export {
	getAllMachines,
	getMachineCount,
	getMachineNameById,
	getMachineBrewCount,
	getAllMachineNames,
	getMachineFilters,
	getMachineSuggestions,
} from "./api/machines";
export {
	getAllRecipes,
	getRecipe,
	getRecipesForMethod,
	getRecipeCount,
} from "./api/recipes";
export {
	getBrewCountForBean,
	getUniqueBeansBrewedCount,
	getBeanBrewInsights,
	getBrewCountForBeanId,
	getBeanDialInStates,
	getBeanMethods,
	getBrewMethodsInUse,
} from "./api/stats";
export { getPromotionSource, getRecipeBrewStats } from "./api/recipeStats";
export type { RecipeBrewStats } from "./api/recipeStats";
export { getDatabaseCounts } from "./api/database";

export {
	addBean,
	addBrew,
	addMachine,
	addRecipe,
} from "../db/crud/add";
export {
	deleteBeanById,
	deleteBrewById,
	deleteMachineById,
	deleteRecipeById,
} from "../db/crud/delete";
export {
	linkBrewToRecipe,
	updateBeanById,
	updateBeanByName,
	updateBrewById,
	updateBrewByName,
	updateMachineById,
	updateRecipeById,
} from "../db/crud/update";
export {
	clearDatabase,
	resetDatabaseWithSeed,
} from "../db/crud/seed";
export type { DatabaseSeedCounts, DatabaseSeedSummary } from "../db/crud/seed";
