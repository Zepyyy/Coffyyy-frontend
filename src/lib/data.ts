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
	getBrewsForHistoryView,
	getHistorySidebarStats,
	getBrewsForBeanId,
	getBrewSuggestions,
} from "./api/brews";
export {
	getAllMachines,
	getMachineCount,
	getMachineNameById,
	getAllMachineNames,
	getMachineFilters,
	getMachineSuggestions,
} from "./api/machines";
export {
	getBrewCountForBean,
	getUniqueBeansBrewedCount,
	getBeanBrewInsights,
	getBrewCountForBeanId,
	getBeanDialInStates,
} from "./api/stats";
export { getDatabaseCounts } from "./api/database";

export {
	addBean,
	addBrew,
	addMachine,
} from "../db/crud/add";
export {
	deleteBeanById,
	deleteBrewById,
	deleteMachineById,
} from "../db/crud/delete";
export {
	updateBeanById,
	updateBeanByName,
	updateBrewById,
	updateBrewByName,
	updateMachineById,
} from "../db/crud/update";
export { pushPendingOperations } from "./api/sync";
export {
	listPendingOperations,
	retryOperation,
	exportFailedOperations,
	countOutboxOperations,
	countFailedOperations,
	clearOutbox,
	listOutboxOperations,
	retryFailedOperations,
} from "../db/sync/outbox";
export {
	clearDatabase,
	resetDatabaseWithSeed,
} from "../db/crud/seed";
export type { DatabaseSeedCounts, DatabaseSeedSummary } from "../db/crud/seed";
