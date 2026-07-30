import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import BeanCard from "@/components/library/BeanCard";
import CollectionTools, {
	type CollectionFilter,
} from "@/components/library/CollectionTools";
import { archiveBeanById } from "@/db/crud/delete";
import { db } from "@/db/db";
import { updateBeanById } from "@/db/crud/update";
import { useAllBeans, useBeanUsage } from "@/hooks/api/useBeans";
import { filterBeanCollection } from "@/lib/beanLibrary";
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
	const usage = useBeanUsage();
	const [includeArchived, setIncludeArchived] = useState(false);
	const allBeans = useAllBeans(includeArchived);
	const [search, setSearch] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [origins, setOrigins] = useState<string[]>([]);
	const [brands, setBrands] = useState<string[]>([]);

	const beanIdsWithBrewHistory =
		useLiveQuery(
			async () =>
				new Set(
					(await db.Brews.toArray())
						.map((brew) => brew.beanId)
						.filter((id): id is number => typeof id === "number"),
				),
			[],
		) ?? new Set<number>();
	const originOptions = useMemo(
		() => optionsFor(allBeans.flatMap((bean) => bean.origin ?? [])),
		[allBeans],
	);
	const brandOptions = useMemo(
		() => optionsFor(allBeans.map((bean) => bean.brand)),
		[allBeans],
	);
	const filteredBeans = useMemo(() => {
		return filterBeanCollection(allBeans, { search, origins, brands });
	}, [allBeans, brands, origins, search]);

	async function togglePinned(id: number, pinned: boolean) {
		await updateBeanById({ pinned }, id);
	}

	async function restoreBean(id: number) {
		await archiveBeanById(id, false);
	}

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
				archiveToggle={{ includeArchived, setIncludeArchived }}
			/>
			{filteredBeans.length === 0 ? (
				<div className="space-y-3 border border-dashed border-border p-12 text-center">
					<p className="font-News text-2xl text-foreground/60">
						{allBeans.length === 0 ? "No beans yet" : "No beans match"}
					</p>
					<p className="font-Recursive text-sm text-muted-foreground">
						{allBeans.length === 0
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
							pinned={bean.archived ? false : bean.pinned}
							onTogglePinned={
								bean.archived
									? undefined
									: () => togglePinned(bean.id, !bean.pinned)
							}
							onRestore={bean.archived ? () => restoreBean(bean.id) : undefined}
							hasBrewHistory={beanIdsWithBrewHistory.has(bean.id)}
							lastUsed={usage.get(bean.id)?.lastUsed}
							lastMethod={usage.get(bean.id)?.lastMethod}
							brewCount={usage.get(bean.id)?.brewCount}
							to={beanLibraryPath(bean.id)}
							startBrewTo={
								bean.archived ? undefined : brewLogPath({ beanId: bean.id })
							}
						/>
					))}
				</div>
			)}
		</section>
	);
}
