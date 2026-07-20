import { db } from "@/db/db";
import * as beanApi from "@/lib/api/beans";
import * as brewApi from "@/lib/api/brews";
import * as machineApi from "@/lib/api/machines";
import * as statsApi from "@/lib/api/stats";
import type { BeanFilters, BeanSuggestions, BeanCardProps, Beans } from "@/types/BeanTypes";
import type { BrewSuggestions, Brews, BeanBrewInsights, BeanDialInState } from "@/types/BrewTypes";
import type { MachineFilters, MachineSuggestions, Machines, MachineCardProps } from "@/types/MachineTypes";

export type DataMode = "local" | "synced";

let dataMode: DataMode = "local";

export function setDataMode(mode: DataMode) {
	dataMode = mode;
}

export function getDataMode() {
	return dataMode;
}

const synced = () => dataMode === "synced";

export async function getBean(id: number | undefined) {
	if (id == null) return undefined;
	return synced() ? beanApi.getBean(id) : db.Beans.get(id);
}

export async function getAllBeans() {
	return synced() ? beanApi.listBeans() : db.Beans.toArray();
}

export async function getAllBeanNames() {
	return (await getAllBeans()).map((bean) => bean.name);
}

export async function getBeanCount() {
	return (await getAllBeans()).length;
}

export async function getBeanDominantNote(id: number | undefined) {
	return (await getBean(id))?.dominantNote;
}

export async function getBeanFilters(): Promise<BeanFilters[]> {
	return beanApi.getBeanFilters(await getAllBeans());
}

export async function getBeanSuggestions(): Promise<BeanSuggestions> {
	return beanApi.getBeanSuggestions(await getAllBeans());
}

export async function createBean(bean: beanApi.BeanWrite) {
	if (synced()) return beanApi.createBean(bean);
	if (await db.Beans.where("name").equals(bean.name).first()) {
		throw new Error(`Bean with name ${bean.name} already exists`);
	}
	return db.Beans.add(bean);
}

export async function updateBean(id: number, bean: Partial<Beans>) {
	if (synced()) return beanApi.updateBean(id, bean);
	await db.Beans.update(id, bean);
	return db.Beans.get(id);
}

export async function deleteBean(id: number) {
	if (synced()) return beanApi.deleteBean(id);
	await db.Beans.delete(id);
}

export async function getAllMachines() {
	return synced() ? machineApi.listMachines() : db.Machines.toArray();
}

export async function getMachine(id: number) {
	return synced() ? machineApi.getMachine(id) : db.Machines.get(id);
}

export async function getMachineCount() {
	return (await getAllMachines()).length;
}

export async function getAllMachineNames() {
	return (await getAllMachines()).map((machine) => machine.name);
}

export async function getMachineFilters(): Promise<MachineFilters[]> {
	return machineApi.getMachineFilters(await getAllMachines());
}

export async function getMachineSuggestions(): Promise<MachineSuggestions> {
	return machineApi.getMachineSuggestions(await getAllMachines());
}

export async function createMachine(machine: machineApi.MachineWrite) {
	if (synced()) return machineApi.createMachine(machine);
	if (await db.Machines.where("name").equals(machine.name).first()) {
		throw new Error(`Machine with name ${machine.name} already exists`);
	}
	return db.Machines.add(machine);
}

export async function updateMachine(id: number, machine: Partial<Machines>) {
	if (synced()) return machineApi.updateMachine(id, machine);
	await db.Machines.update(id, machine);
	return db.Machines.get(id);
}

export async function deleteMachine(id: number) {
	if (synced()) return machineApi.deleteMachine(id);
	await db.Machines.delete(id);
}

export async function getAllBrews() {
	return synced() ? brewApi.listBrews() : db.Brews.toArray();
}

export async function getRecentBrews(limit = 5) {
	const brews = await getAllBrews();
	return [...brews].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, limit);
}

export async function getLatestUnratedBrew() {
	const brews = await getAllBrews();
	return [...brews]
		.sort((a, b) => +new Date(b.date) - +new Date(a.date))
		.find((brew) => brew.tasteScore == null || brew.strengthScore == null || brew.overallRating == null) ?? null;
}

function asBeanCard(bean: Beans): BeanCardProps {
	return {
		id: bean.id,
		name: bean.name,
		countries: bean.countries,
		dominantNote: bean.dominantNote,
		varieties: bean.varieties,
		roastLevel: bean.roastLevel,
	};
}

function asMachineCard(machine: Machines): MachineCardProps {
	return { id: machine.id, name: machine.name, type: machine.type };
}

export async function getBrewSuggestions(): Promise<BrewSuggestions> {
	const [beans, machines] = await Promise.all([getAllBeans(), getAllMachines()]);
	return brewApi.getBrewSuggestions(beans.map(asBeanCard), machines.map(asMachineCard));
}

export async function getBrewsForHistoryView(
	sort: brewApi.HistorySortMode,
	search: string,
	minRating: number | null,
) {
	const [brews, beans, machines] = await Promise.all([getAllBrews(), getAllBeans(), getAllMachines()]);
	return brewApi.getBrewsForHistoryView(
		brews,
		beans.map(asBeanCard),
		machines.map(asMachineCard),
		sort,
		search,
		minRating,
	);
}

export async function getHistorySidebarStats() {
	return brewApi.getHistorySidebarStats(await getAllBrews());
}

export async function getBrewsForBeanId(beanId: number | undefined) {
	if (beanId == null) return [];
	const brews = await getAllBrews();
	return brews.filter((brew) => brew.beanId === beanId).sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function createBrew(brew: brewApi.BrewWrite) {
	if (synced()) return brewApi.createBrew(brew);
	return db.Brews.add(brew);
}

export async function updateBrew(id: number, brew: Partial<Brews>) {
	if (synced()) return brewApi.updateBrew(id, brew);
	await db.Brews.update(id, brew);
	return db.Brews.get(id);
}

export async function deleteBrew(id: number) {
	if (synced()) return brewApi.deleteBrew(id);
	await db.Brews.delete(id);
}

export async function getBrewCountForBean(bean: string | undefined) {
	return statsApi.getBrewCountForBean(await getAllBrews(), bean ?? "");
}

export async function getBeanBrewInsights(beanId: number | undefined): Promise<BeanBrewInsights | null> {
	return statsApi.getBeanBrewInsights(await getAllBrews(), beanId);
}

export async function getBrewCountForBeanId(beanId: number | undefined) {
	return statsApi.getBrewCountForBeanId(await getAllBrews(), beanId);
}

export async function getBeanDialInStates(beanIds: number[]): Promise<BeanDialInState[]> {
	return statsApi.getBeanDialInStates(await getAllBrews(), beanIds);
}

export async function getDatabaseCounts() {
	const [beans, machines, brews] = await Promise.all([getAllBeans(), getAllMachines(), getAllBrews()]);
	return { beans: beans.length, machines: machines.length, brews: brews.length };
}
