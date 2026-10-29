import {
	type Dispatch,
	type SetStateAction,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router";
import { SlidersHorizontal } from "lucide-react";
import AddCard from "@/components/library/AddCard";
import BeanCard from "@/components/library/BeanCard";
import FilterCard from "@/components/library/FilterCard";
import MachineCard from "@/components/library/MachineCard";
import RecipeCard from "@/components/library/RecipeCard";
import { Button } from "@/components/ui/button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useAllBeans, useBeanCount } from "@/hooks/api/useBeans";
import { useAllMachines, useMachineCount } from "@/hooks/api/useMachines";
import { useRecipeBrewStats } from "@/hooks/api/useRecipeStats";
import { useRecipes } from "@/hooks/api/useRecipes";
import { useBeanDialInStates } from "@/hooks/api/useStats";
import { methodConfig } from "@/lib/brewMethods";
import { cn } from "@/lib/utils";
import { verdictRank } from "@/lib/verdict";

type Tab = "beans" | "machines" | "recipes";
type BeanSort = "order" | "verdict";

const TABS: readonly Tab[] = ["beans", "machines", "recipes"];
const SEARCH_LABEL: Record<Tab, string> = {
	beans: "beans",
	machines: "brewers",
	recipes: "recipes",
};

export default function Library() {
	// `?tab=recipes` deep-links a section (the recipe form returns here).
	const [searchParams, setSearchParams] = useSearchParams();
	const tabParam = searchParams.get("tab") as Tab | null;
	const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "beans";
	const setTab = (next: Tab) =>
		setSearchParams(next === "beans" ? {} : { tab: next }, { replace: true });
	const [beanSort, setBeanSort] = useState<BeanSort>("order");
	const [search, setSearch] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
	const [selectedBrand, setSelectedBrand] = useState<string[]>([]);
	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
	const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
	const [selectedRecipeMethods, setSelectedRecipeMethods] = useState<string[]>(
		[],
	);

	const beansCount = useBeanCount();
	const machinesCount = useMachineCount();
	const allBeans = useAllBeans();
	const allMachines = useAllMachines();
	const activeMachines = allMachines;
	const allRecipes = useRecipes();
	const recipeBrewStats = useRecipeBrewStats();
	const beanNames = useMemo(
		() => new Map(allBeans.map((b) => [b.id, b.name])),
		[allBeans],
	);

	const beanIds = useMemo(
		() =>
			allBeans
				.map((b) => b.id)
				.filter((id): id is number => typeof id === "number"),
		[allBeans],
	);
	const beanDialInStates = useBeanDialInStates(beanIds);
	const beanDialInStateMap = useMemo(
		() => new Map(beanDialInStates.map((s) => [s.beanId, s])),
		[beanDialInStates],
	);

	const originCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const bean of allBeans) {
			for (const origin of bean.origin ?? []) {
				const trimmed = origin.trim();
				if (!trimmed) continue;
				counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
			}
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [allBeans]);

	const brandCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const bean of allBeans) {
			const brand = bean.brand?.trim();
			if (!brand || brand === "?") continue;
			counts.set(brand, (counts.get(brand) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [allBeans]);

	const typeCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const machine of activeMachines) {
			const type = methodConfig(machine.method).label;
			counts.set(type, (counts.get(type) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [activeMachines]);

	const brandsCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const machine of activeMachines) {
			const brand = machine.brand?.trim();
			if (!brand) continue;
			counts.set(brand, (counts.get(brand) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [activeMachines]);

	const toggleSelection = (
		value: string,
		setter: Dispatch<SetStateAction<string[]>>,
	) => {
		setter((prev) =>
			prev.includes(value)
				? prev.filter((item) => item !== value)
				: [...prev, value],
		);
	};

	const filteredBeans = useMemo(() => {
		const q = search.trim().toLowerCase();
		return allBeans.filter((b) => {
			const matchesSearch =
				!q ||
				[b.name, ...(b.origin ?? []), b.dominantNote, b.brand]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(q);
			const matchesCountry =
				selectedCountries.length === 0 ||
				(b.origin ?? []).some((origin) =>
					selectedCountries.includes(origin.trim()),
				);
			const matchesBrand =
				selectedBrand.length === 0 ||
				(b.brand != null && selectedBrand.includes(b.brand.trim()));
			return matchesSearch && matchesCountry && matchesBrand;
		});
	}, [search, selectedCountries, selectedBrand, allBeans]);

	// Verdict sort puts beans you love ahead of beans you avoid.
	const sortedBeans = useMemo(() => {
		if (beanSort === "order") return filteredBeans;
		return [...filteredBeans].sort(
			(a, b) =>
				verdictRank(a.status) - verdictRank(b.status) ||
				a.name.localeCompare(b.name),
		);
	}, [beanSort, filteredBeans]);

	const filteredMachines = useMemo(() => {
		const q = search.trim().toLowerCase();
		return activeMachines.filter((m) => {
			const matchesSearch =
				!q ||
				[m.name, m.brand, m.model, methodConfig(m.method).label]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(q);
			const matchesType =
				selectedTypes.length === 0 ||
				selectedTypes.includes(methodConfig(m.method).label);
			const matchesBrand =
				selectedBrands.length === 0 ||
				(m.brand != null && selectedBrands.includes(m.brand.trim()));
			return matchesSearch && matchesType && matchesBrand;
		});
	}, [search, selectedBrands, selectedTypes, activeMachines]);

	const recipeMethodCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const recipe of allRecipes) {
			const label = methodConfig(recipe.method).label;
			counts.set(label, (counts.get(label) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [allRecipes]);

	const filteredRecipes = useMemo(() => {
		const q = search.trim().toLowerCase();
		return allRecipes.filter((r) => {
			const methodLabel = methodConfig(r.method).label;
			const matchesSearch =
				!q ||
				[r.name, methodLabel, r.beanId ? beanNames.get(r.beanId) : ""]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(q);
			const matchesMethod =
				selectedRecipeMethods.length === 0 ||
				selectedRecipeMethods.includes(methodLabel);
			return matchesSearch && matchesMethod;
		});
	}, [search, selectedRecipeMethods, allRecipes, beanNames]);

	const beanCountryOptions = useMemo(
		() =>
			originCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedCountries.includes(label),
			})),
		[originCounts, selectedCountries],
	);

	const beanBrandOptions = useMemo(
		() =>
			brandCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedBrand.includes(label),
			})),
		[brandCounts, selectedBrand],
	);

	const machineTypeOptions = useMemo(
		() =>
			typeCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedTypes.includes(label),
			})),
		[selectedTypes, typeCounts],
	);

	const machineBrandOptions = useMemo(
		() =>
			brandsCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedBrands.includes(label),
			})),
		[brandsCounts, selectedBrands],
	);

	const recipeMethodOptions = useMemo(
		() =>
			recipeMethodCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedRecipeMethods.includes(label),
			})),
		[recipeMethodCounts, selectedRecipeMethods],
	);

	const beanFilters = (
		<>
			<FilterCard
				title="Countries"
				options={beanCountryOptions}
				onToggle={(value) => toggleSelection(value, setSelectedCountries)}
			/>
			<FilterCard
				title="Brand"
				options={beanBrandOptions}
				onToggle={(value) => toggleSelection(value, setSelectedBrand)}
			/>
		</>
	);

	const machineFilters = (
		<>
			<FilterCard
				title="Method"
				options={machineTypeOptions}
				onToggle={(value) => toggleSelection(value, setSelectedTypes)}
			/>
			<FilterCard
				title="Brand"
				options={machineBrandOptions}
				onToggle={(value) => toggleSelection(value, setSelectedBrands)}
			/>
		</>
	);

	const recipeFilters = (
		<FilterCard
			title="Method"
			options={recipeMethodOptions}
			onToggle={(value) => toggleSelection(value, setSelectedRecipeMethods)}
		/>
	);

	const filtersNode: ReactNode =
		tab === "beans"
			? beanFilters
			: tab === "machines"
				? machineFilters
				: recipeFilters;
	const activeFilterCount =
		tab === "beans"
			? selectedCountries.length + selectedBrand.length
			: tab === "machines"
				? selectedTypes.length + selectedBrands.length
				: selectedRecipeMethods.length;

	const hasRestrictions = search.trim().length > 0 || activeFilterCount > 0;
	const resultCount =
		tab === "beans"
			? sortedBeans.length
			: tab === "machines"
				? filteredMachines.length
				: filteredRecipes.length;
	const totalCount =
		tab === "beans"
			? allBeans.length
			: tab === "machines"
				? activeMachines.length
				: allRecipes.length;
	function clearCurrentFilters() {
		setSearch("");
		if (tab === "beans") {
			setSelectedCountries([]);
			setSelectedBrand([]);
		} else if (tab === "machines") {
			setSelectedTypes([]);
			setSelectedBrands([]);
		} else setSelectedRecipeMethods([]);
	}

	return (
		<div className="mx-auto w-full max-w-6xl">
			<div className="space-y-6">
				{/* Header: title, section switch, and search stay reachable on phones */}
				<div className="space-y-4">
					<div className="border-l-4 border-crema pl-5">
						<h1 className="font-display text-4xl italic tracking-tight text-foreground/90">
							Library
						</h1>
						<p className="mt-1 font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">
							Your beans, brewers and recipes
						</p>
					</div>

					<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
						<SegmentedControl
							ariaLabel="Library section"
							className="w-fit"
							options={[
								{
									value: "beans",
									label: `Beans${beansCount > 0 ? ` (${beansCount})` : ""}`,
								},
								{
									value: "machines",
									label: `Brewers${machinesCount > 0 ? ` (${machinesCount})` : ""}`,
								},
								{
									value: "recipes",
									label: `Recipes${allRecipes.length > 0 ? ` (${allRecipes.length})` : ""}`,
								},
							]}
							value={tab}
							onChange={setTab}
						/>
						<label className="relative block min-w-0 flex-1">
							<input
								className="h-9 w-full rounded-lg border border-line-strong bg-paper-raised px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60"
								placeholder={`Search ${SEARCH_LABEL[tab]}...`}
								aria-label={`Search ${SEARCH_LABEL[tab]}`}
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</label>
						{tab === "beans" && (
							<SegmentedControl
								ariaLabel="Sort beans"
								className="w-fit"
								options={[
									{ value: "order", label: "In order" },
									{ value: "verdict", label: "By verdict" },
								]}
								value={beanSort}
								onChange={setBeanSort}
							/>
						)}
					</div>

					{/* Filters live on the sidebar on desktop, in a drawer here */}
					<div className="lg:hidden">
						<button
							type="button"
							onClick={() => setFiltersOpen((o) => !o)}
							aria-expanded={filtersOpen}
							aria-controls="library-mobile-filters"
							className={cn(
								"inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-sans text-sm transition-colors",
								filtersOpen
									? "border-crema bg-crema-tint text-foreground"
									: "border-line-strong bg-paper-raised text-ink-soft hover:text-foreground",
							)}
						>
							<SlidersHorizontal className="size-3.5" aria-hidden />
							Filters
							{activeFilterCount > 0 && (
								<span className="rounded-full bg-ink px-1.5 font-data text-[10px] font-semibold text-paper">
									{activeFilterCount}
								</span>
							)}
						</button>
						{filtersOpen && (
							<div
								id="library-mobile-filters"
								className="rise mt-3 grid gap-4 sm:grid-cols-2"
							>
								{filtersNode}
							</div>
						)}
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
					<aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
						<div className="space-y-4 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
							{filtersNode}
						</div>
					</aside>

					<section className="min-w-0">
						<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
							<p
								role="status"
								className="font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint"
							>
								{resultCount} of {totalCount} {SEARCH_LABEL[tab]}
							</p>
							{hasRestrictions && (
								<Button variant="ghost" size="sm" onClick={clearCurrentFilters}>
									Clear search and filters
								</Button>
							)}
						</div>
						{tab === "beans" && (
							<div>
								{sortedBeans.length === 0 ? (
									<>
										{allBeans.length === 0 ? (
											<div className="h-full w-full space-y-3 rounded-xl border border-dashed border-line-strong bg-paper-raised/50 p-12 text-center">
												<p className="font-display text-2xl text-foreground/60">
													No beans
												</p>
												<p className="font-sans text-sm text-muted-foreground">
													Add your first bean to get started.
												</p>
												<Button asChild variant="ink" className="mt-2">
													<Link to="/log/bean">Add a bean</Link>
												</Button>
											</div>
										) : (
											<p className="text-sm text-muted-foreground">
												No beans match your search.
											</p>
										)}
									</>
								) : (
									<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4">
										{sortedBeans.map((bean) => (
											<BeanCard
												key={bean.id ?? `${bean.name}-${bean.brand}`}
												bean={bean}
												dialInState={
													bean.id ? beanDialInStateMap.get(bean.id) : undefined
												}
											/>
										))}
										<AddCard
											to="/log/bean"
											label="Add bean"
											className="h-32 min-h-0 self-start"
										/>
									</div>
								)}
							</div>
						)}

						{tab === "machines" && (
							<div>
								{filteredMachines.length === 0 ? (
									<div className="rounded-xl border border-dashed border-line-strong bg-paper-raised/50 p-8 text-center">
										<p className="text-sm text-muted-foreground">
											{activeMachines.length === 0
												? "No brewers yet."
												: "No brewers match your search."}
										</p>
										{activeMachines.length === 0 && (
											<Button asChild variant="ink" className="mt-3">
												<Link to="/log/machine">Add your first brewer</Link>
											</Button>
										)}
									</div>
								) : (
									<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4">
										{filteredMachines.map((machine) => (
											<MachineCard
												key={machine.id ?? `${machine.name}-${machine.model}`}
												machine={machine}
											/>
										))}
										<AddCard
											to="/log/machine"
											label="Add brewer"
											className="h-32 self-start"
										/>
									</div>
								)}
							</div>
						)}

						{tab === "recipes" && (
							<div>
								{filteredRecipes.length === 0 ? (
									allRecipes.length === 0 ? (
										<div className="space-y-3 rounded-xl border border-dashed border-line-strong bg-paper-raised/50 p-12 text-center">
											<p className="font-display text-2xl text-foreground/60">
												No recipes
											</p>
											<p className="font-sans text-sm text-muted-foreground">
												Write down a target, or save a good brew as one from
												History.
											</p>
											<Button asChild variant="ink" className="mt-2">
												<Link to="/log/recipe">Add a recipe</Link>
											</Button>
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											No recipes match your search.
										</p>
									)
								) : (
									<div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-4">
										{filteredRecipes.map((recipe) => (
											<RecipeCard
												key={recipe.id}
												recipe={recipe}
												beanName={
													recipe.beanId
														? beanNames.get(recipe.beanId)
														: undefined
												}
												stats={recipeBrewStats[recipe.id]}
											/>
										))}
										<AddCard
											to="/log/recipe"
											label="Add recipe"
											className="h-32 self-start"
										/>
									</div>
								)}
							</div>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}
