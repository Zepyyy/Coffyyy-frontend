import { api } from "@/lib/axios";
import type {
	BeanFilters,
	BeanSuggestions,
	Beans,
} from "@/types/BeanTypes";
import { uniqueSorted } from "./utils";

type BackendBean = Omit<Beans, "countries" | "cities" | "varieties" | "brands" | "process" | "botanic" | "designation" | "status" | "dominantNote"> & {
	countries: string[];
	cities: string[];
	varieties: string[];
	brands: string[];
	botanic: string;
	designation: string;
	status: string;
	dominantNote: string;
};

export type BeanWrite = Omit<Beans, "id">;

const titleCase = (value: string) =>
	value
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");

const enumValue = (value: string) => value.replaceAll(" ", "_").toUpperCase();

export function fromBackendBean(bean: BackendBean): Beans {
	return {
		...bean,
		countries: bean.countries ?? [],
		cities: bean.cities ?? [],
		varieties: bean.varieties ?? [],
		brands: bean.brands ?? [],
		botanic: titleCase(bean.botanic) as Beans["botanic"],
		designation: titleCase(bean.designation) as Beans["designation"],
		status: titleCase(bean.status) as Beans["status"],
		dominantNote: titleCase(bean.dominantNote) as Beans["dominantNote"],
	};
}

export function toBackendBean(bean: BeanWrite | Partial<Beans>) {
	const value = { ...(bean as Partial<Beans>) };
	delete value.id;
	delete value.process;
	const payload: Record<string, unknown> = { ...value };
	if (value.brands !== undefined) payload.brands = value.brands;
	if (value.countries !== undefined) payload.countries = value.countries;
	if (value.cities !== undefined) payload.cities = value.cities;
	if (value.varieties !== undefined) payload.varieties = value.varieties;
	if (value.botanic) payload.botanic = enumValue(value.botanic);
	if (value.designation) payload.designation = enumValue(value.designation);
	if (value.status) payload.status = enumValue(value.status);
	if (value.dominantNote) payload.dominantNote = enumValue(value.dominantNote);
	return payload;
}

export async function listBeans() {
	const response = await api.get<BackendBean[]>("/bean");
	return response.data.map(fromBackendBean);
}

export async function getBean(beanId: number) {
	const response = await api.get<BackendBean>(`/bean/${beanId}`);
	return fromBackendBean(response.data);
}

export async function createBean(bean: BeanWrite) {
	const response = await api.post<BackendBean>("/bean", toBackendBean(bean));
	return fromBackendBean(response.data);
}

export async function updateBean(id: number, bean: Partial<Beans>) {
	const response = await api.patch<BackendBean>(`/bean/${id}`, toBackendBean(bean));
	return fromBackendBean(response.data);
}

export async function deleteBean(id: number) {
	await api.delete(`/bean/${id}`);
}

export function getBeanFilters(beans: Beans[]): BeanFilters[] {
	return beans.map((bean) => ({
		countries: bean.countries,
		dominantNote: bean.dominantNote,
		roastLevel: bean.roastLevel,
		brands: bean.brands,
	}));
}

export function getBeanSuggestions(beans: Beans[]): BeanSuggestions {
	const extractArray = (field: keyof Beans) =>
		beans
			.map((bean) => bean[field])
			.filter((value): value is string[] => Array.isArray(value))
			.flat();

	return {
		brands: uniqueSorted(extractArray("brands")),
		countries: uniqueSorted(extractArray("countries")),
		cities: uniqueSorted(extractArray("cities")),
		varieties: uniqueSorted(extractArray("varieties")),
		flavors: uniqueSorted(extractArray("flavors")),
	};
}
