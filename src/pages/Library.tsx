import { useLiveQuery } from "dexie-react-hooks";
import { Coffee } from "lucide-react";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { Link } from "react-router";
import BeanCard from "@/components/library/BeanCard";
import FilterCard from "@/components/library/FilterCard";
import MachineCard from "@/components/library/MachineCard";
import { Button } from "@/components/ui/button";
import { addRandomBean, addRandomMachine } from "@/db/crud/add";
import { db } from "@/db/db";
import { cn } from "@/lib/utils";

type Tab = "beans" | "machines";

export default function Library() {
	const [tab, setTab] = useState<Tab>("beans");
	const [search, setSearch] = useState("");
	const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
	const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
	const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
	const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

	const beans = useLiveQuery(() => db.Beans.toArray(), []);
	const machines = useLiveQuery(() => db.Machines.toArray(), []);

	const sortedBeans = useMemo(
		() => [...(beans ?? [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
		[beans],
	);
	const sortedMachines = useMemo(
		() => [...(machines ?? [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
		[machines],
	);

	const countryCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const bean of sortedBeans) {
			for (const country of bean.origin ?? []) {
				const trimmed = country.trim();
				if (!trimmed) continue;
				counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
			}
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [sortedBeans]);

	const processCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const bean of sortedBeans) {
			const process = bean.process?.trim();
			if (!process || process === "?") continue;
			counts.set(process, (counts.get(process) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [sortedBeans]);

	const typeCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const machine of sortedMachines) {
			const type = machine.type?.trim();
			if (!type) continue;
			counts.set(type, (counts.get(type) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [sortedMachines]);

	const brandCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const machine of sortedMachines) {
			const brand = machine.brand?.trim();
			if (!brand) continue;
			counts.set(brand, (counts.get(brand) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]);
	}, [sortedMachines]);

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
		return sortedBeans.filter((b) => {
			const matchesSearch =
				!q ||
				[
					b.name,
					b.brand,
					...(b.origin ?? []),
					...(b.flavors ?? []),
					...(b.tastingNotes ?? []),
					...(b.variety ?? []),
					b.dominantNote,
					b.process,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(q);
			const matchesCountry =
				selectedCountries.length === 0 ||
				(b.origin ?? []).some((country) =>
					selectedCountries.includes(country.trim()),
				);
			const matchesProcess =
				selectedProcesses.length === 0 ||
				selectedProcesses.includes(b.process?.trim());
			return matchesSearch && matchesCountry && matchesProcess;
		});
	}, [search, selectedCountries, selectedProcesses, sortedBeans]);

	const filteredMachines = useMemo(() => {
		const q = search.trim().toLowerCase();
		return sortedMachines.filter((m) => {
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
	}, [search, selectedBrands, selectedTypes, sortedMachines]);

	const beanCountryOptions = useMemo(
		() =>
			countryCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedCountries.includes(label),
			})),
		[countryCounts, selectedCountries],
	);

	const beanProcessOptions = useMemo(
		() =>
			processCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedProcesses.includes(label),
			})),
		[processCounts, selectedProcesses],
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
			brandCounts.map(([label, count]) => ({
				label,
				count,
				active: selectedBrands.includes(label),
			})),
		[brandCounts, selectedBrands],
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
										? `Beans${sortedBeans.length > 0 ? ` (${sortedBeans.length})` : ""}`
										: `Machines${sortedMachines.length > 0 ? ` (${sortedMachines.length})` : ""}`}
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
										title="Process"
										options={beanProcessOptions}
										onToggle={(value) =>
											toggleSelection(value, setSelectedProcesses)
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

						<div className="grid grid-cols-1 gap-2 pt-1">
							<Button variant="add" onClick={() => addRandomBean()}>
								Add Random Bean
							</Button>
							<Button variant="add" onClick={() => addRandomMachine()}>
								Add Random Machine
							</Button>
						</div>
					</div>
				</aside>

				<section className="min-w-0">
					{tab === "beans" && (
						<div>
							{filteredBeans.length === 0 ? (
								<div className="rounded-xl border border-dashed border-border p-2 text-center">
									{sortedBeans.length === 0 ? (
										<div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
											<div className="flex size-12 items-center justify-center rounded-full bg-muted">
												<Coffee className="size-6 text-muted-foreground" />
											</div>
											<div>
												<p className="font-News text-lg text-primary-800 dark:text-primary-100">
													No beans yet
												</p>
												<p className="mt-0.5 font-Recursive text-sm text-muted-foreground">
													Add your first bean to get started.
												</p>
											</div>
											<Link
												to="/log/bean"
												className="h-9 px-4 py-2 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50"
											>
												Add a bean
											</Link>
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											No beans match your search.
										</p>
									)}
								</div>
							) : (
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
									{filteredBeans.map((bean) => (
										<BeanCard
											key={bean.id ?? `${bean.name}-${bean.brand}`}
											bean={bean}
										/>
									))}
								</div>
							)}
						</div>
					)}

					{tab === "machines" && (
						<div>
							{filteredMachines.length === 0 ? (
								<div className="rounded-xl border border-dashed border-border p-8 text-center">
									<p className="text-sm text-muted-foreground">
										{sortedMachines.length === 0
											? "No equipment yet."
											: "No machines match your search."}
									</p>
									{sortedMachines.length === 0 && (
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
								</div>
							)}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
