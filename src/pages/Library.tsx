import { useLiveQuery } from "dexie-react-hooks";
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
	const [tab, setTab] = useState<Tab>("machines");
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
		<div className="flex relative">
			<div className="sm:flex flex-col hidden h-fit flex-wrap space-y-4 sticky top-20 left-10 mx-6">
				<div className="border-l-5 border-primary-200 pl-5 mb-6">
					<h1 className="text-5xl tracking-tight font-News italic text-foreground/90">
						Library
					</h1>
					<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
						Your beans and equipment
					</p>
				</div>
				<div className="flex-wrap min-w-fit max-w-1/2 mx-auto my-4">
					<div className="flex items-center gap-1 rounded-xl bg-background/15 w-fit">
						{(["beans", "machines"] as Tab[]).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => setTab(t)}
								className={cn(
									"px-4 py-1.5 text-sm font-medium transition-opacity capitalize",
									tab === t
										? "bg-primary-200/15 text-foreground border-primary-200 border border-b-4"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{t === "beans"
									? `Beans${sortedBeans.length > 0 ? ` (${sortedBeans.length})` : ""}`
									: `Machines${sortedMachines.length > 0 ? ` (${sortedMachines.length})` : ""}`}
							</button>
						))}
					</div>
				</div>
				<div className="space-y-3">
					<input
						className="h-10 w-full max-w-sm rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
						placeholder={`Search ${tab}…`}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<div className="flex flex-col gap-4 my-6">
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
									onToggle={(value) => toggleSelection(value, setSelectedTypes)}
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
					<Button className="" variant={"add"} onClick={() => addRandomBean()}>
						Add Bean
					</Button>
					<Button
						className=""
						variant={"add"}
						onClick={() => addRandomMachine()}
					>
						Add Machine
					</Button>
				</div>
			</div>
			<div className="flex max-w-7xl mx-auto">
				{/* Content */}
				{tab === "beans" && (
					<div>
						{filteredBeans.length === 0 ? (
							<div className="rounded-xl border border-dashed border-border p-8 text-center">
								<p className="text-muted-foreground text-sm">
									{sortedBeans.length === 0
										? "No beans yet."
										: "No beans match your search."}
								</p>
								{sortedBeans.length === 0 && (
									<Link
										to="/log/bean"
										className="mt-3 inline-block px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
									>
										Add your first bean
									</Link>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3 my-3 mx-auto">
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
								<p className="text-muted-foreground text-sm">
									{sortedMachines.length === 0
										? "No equipment yet."
										: "No machines match your search."}
								</p>
								{sortedMachines.length === 0 && (
									<Link
										to="/log/machine"
										className="mt-3 inline-block px-4 py-2 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
									>
										Add your first machine
									</Link>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3 my-3 mx-auto">
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
			</div>
		</div>
	);
}
