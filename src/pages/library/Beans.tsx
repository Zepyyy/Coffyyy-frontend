import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Link } from "react-router";
import BeanCard from "@/components/library/BeanCard";
import CollectionTools, {
	type CollectionFilter,
} from "@/components/library/CollectionTools";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useBeanDialInStates } from "@/hooks/api/useStats";
import { beanLibraryPath, brewLogPath } from "@/lib/libraryRoutes";

function toggle(value: string, setter: Dispatch<SetStateAction<string[]>>) {
	setter((current) =>
		current.includes(value)
			? current.filter((item) => item !== value)
			: [...current, value],
	);
}

function optionsFor(values: string[]) {
	const counts = new Map<string, number>();
	for (const value of values) {
		const normalized = value.trim();
		if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([label, count]) => ({ label, count }));
}

export default function BeansLibrary() {
	const beans = useAllBeans();
	const [search, setSearch] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [origins, setOrigins] = useState<string[]>([]);
	const [brands, setBrands] = useState<string[]>([]);

	const beanIds = useMemo(
		() =>
			beans
				.map((bean) => bean.id)
				.filter((id): id is number => typeof id === "number"),
		[beans],
	);
	const dialInStates = useBeanDialInStates(beanIds);
	const dialInByBeanId = useMemo(
		() => new Map(dialInStates.map((state) => [state.beanId, state])),
		[dialInStates],
	);
	const originOptions = useMemo(
		() => optionsFor(beans.flatMap((bean) => bean.origin ?? [])),
		[beans],
	);
	const brandOptions = useMemo(
		() => optionsFor(beans.map((bean) => bean.brand)),
		[beans],
	);
	const filteredBeans = useMemo(() => {
		const query = search.trim().toLowerCase();
		return beans
			.filter((bean) => {
				const searchable = [
					bean.name,
					bean.brand,
					bean.dominantNote,
					...(bean.origin ?? []),
				]
					.join(" ")
					.toLowerCase();
				return (
					(!query || searchable.includes(query)) &&
					(origins.length === 0 ||
						(bean.origin ?? []).some((origin) =>
							origins.includes(origin.trim()),
						)) &&
					(brands.length === 0 || brands.includes(bean.brand.trim()))
				);
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [beans, brands, origins, search]);

	const filters: CollectionFilter[] = [
		{
			key: "origin",
			label: "Origin",
			options: originOptions,
			selected: origins,
			onToggle: (value) => toggle(value, setOrigins),
		},
		{
			key: "brand",
			label: "Brand",
			options: brandOptions,
			selected: brands,
			onToggle: (value) => toggle(value, setBrands),
		},
	];

	return (
		<section className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="font-Recursive text-sm text-muted-foreground">
						Beans worth remembering.
					</p>
					<h2 className="mt-1 font-News text-3xl">Beans</h2>
				</div>
				<Link
					to="/log/bean"
					className="border border-foreground/15 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:border-foreground"
				>
					Add bean
				</Link>
			</div>
			<CollectionTools
				search={search}
				setSearch={setSearch}
				count={filteredBeans.length}
				filters={filters}
				filtersOpen={filtersOpen}
				setFiltersOpen={setFiltersOpen}
			/>
			{filteredBeans.length === 0 ? (
				<div className="space-y-3 border border-dashed border-border p-12 text-center">
					<p className="font-News text-2xl text-foreground/60">
						{beans.length === 0 ? "No beans yet" : "No beans match"}
					</p>
					<p className="font-Recursive text-sm text-muted-foreground">
						{beans.length === 0
							? "Add your first bean to start building the collection."
							: "Try a different search or remove a filter."}
					</p>
					{beans.length === 0 && (
						<Link
							to="/log/bean"
							className="inline-block border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm"
						>
							Add your first bean
						</Link>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{filteredBeans.map((bean) => (
						<BeanCard
							key={bean.id}
							bean={bean}
							dialInState={dialInByBeanId.get(bean.id)}
							to={beanLibraryPath(bean.id)}
							startBrewTo={brewLogPath({ beanId: bean.id })}
						/>
					))}
				</div>
			)}
		</section>
	);
}
