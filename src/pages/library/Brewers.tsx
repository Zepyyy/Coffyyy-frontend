import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Link } from "react-router";
import BrewerCard from "@/components/library/BrewerCard";
import CollectionTools, {
	type CollectionFilter,
} from "@/components/library/CollectionTools";
import { archiveBrewerById } from "@/db/crud/delete";
import { updateBrewerById } from "@/db/crud/update";
import { useAllBrewers, useBrewerUsage } from "@/hooks/api/useBrewers";
import { filterBrewerCollection } from "@/lib/brewerLibrary";
import { brewerLibraryPath, brewLogPath } from "@/lib/libraryRoutes";

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

export default function BrewersLibrary() {
	const brewers = useAllBrewers();
	const usage = useBrewerUsage();
	const [includeArchived, setIncludeArchived] = useState(false);
	const allBrewers = useAllBrewers(includeArchived);
	const [search, setSearch] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [categories, setCategories] = useState<string[]>([]);
	const [brands, setBrands] = useState<string[]>([]);

	const categoryOptions = useMemo(
		() => optionsFor(allBrewers.map((brewer) => brewer.type)),
		[allBrewers],
	);
	const brandOptions = useMemo(
		() => optionsFor(allBrewers.map((brewer) => brewer.brand)),
		[allBrewers],
	);
	const filteredBrewers = useMemo(
		() => filterBrewerCollection(allBrewers, { search, categories, brands }),
		[allBrewers, brands, categories, search],
	);

	async function togglePinned(id: number, pinned: boolean) {
		await updateBrewerById({ pinned }, id);
	}

	async function restoreBrewer(id: number) {
		await archiveBrewerById(id, false);
	}

	const filters: CollectionFilter[] = [
		{
			key: "category",
			label: "Category",
			options: categoryOptions,
			selected: categories,
			onToggle: (value) => toggle(value, setCategories),
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
						Equipment you reach for.
					</p>
					<h2 className="mt-1 font-News text-3xl">Brewers</h2>
				</div>
				<Link
					to="/log/brewer"
					className="border border-foreground/15 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] transition-colors hover:border-foreground"
				>
					Add brewer
				</Link>
			</div>
			<CollectionTools
				search={search}
				setSearch={setSearch}
				count={filteredBrewers.length}
				filters={filters}
				filtersOpen={filtersOpen}
				setFiltersOpen={setFiltersOpen}
				archiveToggle={{ includeArchived, setIncludeArchived }}
			/>
			{filteredBrewers.length === 0 ? (
				<div className="space-y-3 border border-dashed border-border p-12 text-center">
					<p className="font-News text-2xl text-foreground/60">
						{allBrewers.length === 0 ? "No brewers yet" : "No brewers match"}
					</p>
					<p className="font-Recursive text-sm text-muted-foreground">
						{allBrewers.length === 0
							? "Add your first brewer to start building the collection."
							: "Try a different search or remove a filter."}
					</p>
					{brewers.length === 0 && (
						<Link
							to="/log/brewer"
							className="inline-block border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm"
						>
							Add your first brewer
						</Link>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{filteredBrewers.map((brewer) => (
						<BrewerCard
							key={brewer.id}
							brewer={brewer}
							lastUsed={usage.get(brewer.id)?.lastUsed}
							brewCount={usage.get(brewer.id)?.brewCount}
							methods={usage.get(brewer.id)?.methods}
							pinned={brewer.archived ? false : brewer.pinned}
							onTogglePinned={
								brewer.archived
									? undefined
									: () => togglePinned(brewer.id, !brewer.pinned)
							}
							onRestore={
								brewer.archived ? () => restoreBrewer(brewer.id) : undefined
							}
							to={brewerLibraryPath(brewer.id)}
							startBrewTo={brewLogPath({ brewerId: brewer.id })}
						/>
					))}
				</div>
			)}
		</section>
	);
}
