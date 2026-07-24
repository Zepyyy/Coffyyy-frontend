import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Link } from "react-router";
import AddCard from "@/components/library/AddCard";
import BeanCard from "@/components/library/BeanCard";
import FilterCard from "@/components/library/FilterCard";
import MachineCard from "@/components/library/MachineCard";
import { useAllBeans, useBeanCount } from "@/hooks/api/useBeans";
import { useAllMachines, useMachineCount } from "@/hooks/api/useMachines";
import { useBeanDialInStates } from "@/hooks/api/useStats";
import { cn } from "@/lib/utils";

type Tab = "beans" | "machines";

export default function Library() {
	const [tab, setTab] = useState<Tab>("beans");
	const [search, setSearch] = useState("");
	const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
	const [selectedBrand, setSelectedBrand] = useState<string[]>([]);
	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
	const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

	const beansCount = useBeanCount();
	const machinesCount = useMachineCount();
	const allBeans = useAllBeans();
	const allMachines = useAllMachines();
	const activeMachines = allMachines.filter(
		(machine) => machine.deletedAt === undefined,
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
			const type = machine.type?.trim();
			if (!type) continue;
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
				[...(b.origin ?? []), b.dominantNote, b.brand]
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

	const filteredMachines = useMemo(() => {
		const q = search.trim().toLowerCase();
		return activeMachines.filter((m) => {
			const matchesSearch =
				!q ||
				[m.name, m.brand, m.model, m.type]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(q);
			const matchesType =
				selectedTypes.length === 0 ||
				(m.type != null && selectedTypes.includes(m.type.trim()));
			const matchesBrand =
				selectedBrands.length === 0 ||
				(m.brand != null && selectedBrands.includes(m.brand.trim()));
			return matchesSearch && matchesType && matchesBrand;
		});
	}, [search, selectedBrands, selectedTypes, activeMachines]);

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

	return (
		<div className="mx-auto w-full max-w-4/5">
			<div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-8">
				<aside className="lg:sticky lg:top-20 lg:self-start max-w-fit lg:block hidden">
					<div className="space-y-5 p-2 backdrop-blur-xs lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
						<div className="border-l-5 border-primary-200 pl-5">
							<h1 className="text-4xl font-News italic tracking-tight text-foreground/90">
								Library
							</h1>
							<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Your beans and equipment
							</p>
						</div>

						<div className="flex w-full items-center gap-1 bg-background/15 p-1">
							{(["beans", "machines"] as Tab[]).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setTab(t)}
									className={cn(
										"flex-1 px-4 py-1.5 text-sm font-medium capitalize transition-opacity",
										tab === t
											? "border border-primary-200 border-b-4 bg-primary-200/15 text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{t === "beans"
										? `Beans${beansCount > 0 ? ` (${beansCount})` : ""}`
										: `Machines${machinesCount > 0 ? ` (${machinesCount})` : ""}`}
								</button>
							))}
						</div>

						<input
							className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							placeholder={`Search ${tab}...`}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>

						<div className="space-y-4">
							{tab === "beans" ? (
								<>
									<FilterCard
										title="Countries"
										options={beanCountryOptions}
										onToggle={(value) =>
											toggleSelection(value, setSelectedCountries)
										}
									/>
									<FilterCard
										title="Brand"
										options={beanBrandOptions}
										onToggle={(value) =>
											toggleSelection(value, setSelectedBrand)
										}
									/>
								</>
							) : (
								<>
									<FilterCard
										title="Type"
										options={machineTypeOptions}
										onToggle={(value) =>
											toggleSelection(value, setSelectedTypes)
										}
									/>
									<FilterCard
										title="Brand"
										options={machineBrandOptions}
										onToggle={(value) =>
											toggleSelection(value, setSelectedBrands)
										}
									/>
								</>
							)}
						</div>
					</div>
				</aside>

				<section className="min-w-0">
					{tab === "beans" && (
						<div>
							{filteredBeans.length === 0 ? (
								<>
									{allBeans.length === 0 ? (
										<div className="border border-dashed border-border p-12 text-center space-y-3 w-full h-full">
											<p className="font-News text-2xl text-foreground/60">
												No beans
											</p>
											<p className="font-Recursive text-sm text-muted-foreground">
												Add your first bean to get started.
											</p>
											<AddCard
												to="/log/bean"
												label="Add bean"
												className="min-h-24"
											/>
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											No beans match your search.
										</p>
									)}
								</>
							) : (
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
									{filteredBeans.map((bean) => (
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
										className="min-h-24"
									/>
								</div>
							)}
						</div>
					)}

					{tab === "machines" && (
						<div>
							{filteredMachines.length === 0 ? (
								<div className="rounded-xl border border-dashed border-border p-8 text-center">
									<p className="text-sm text-muted-foreground">
										{activeMachines.length === 0
											? "No equipment yet."
											: "No machines match your search."}
									</p>
									{activeMachines.length === 0 && (
										<Link
											to="/log/machine"
											className="mt-3 inline-block rounded-lg bg-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/70"
										>
											Add your first machine
										</Link>
									)}
								</div>
							) : (
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
									{filteredMachines.map((machine) => (
										<MachineCard
											key={machine.id ?? `${machine.name}-${machine.model}`}
											machine={machine}
										/>
									))}
									<AddCard to="/log/machine" label="Add machine" />
								</div>
							)}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
