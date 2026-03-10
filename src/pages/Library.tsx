import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { deleteBean, deleteMachine } from "@/db/crud/delete";
import { db } from "@/db/db";
import { cn } from "@/lib/utils";
import type { Beans, Machines } from "@/types/default";

type Tab = "beans" | "machines";

const ROAST_COLORS: Record<number, string> = {
	1: "bg-tag-yellow-900 text-tag-yellow-100 dark:bg-tag-yellow-900 dark:text-tag-yellow-100 dark:border-tag-yellow-100 dark:border",
	2: "bg-tag-yellow-900 text-tag-yellow-100 dark:bg-tag-yellow-900 dark:text-tag-yellow-100 dark:border-tag-yellow-100 dark:border",
	3: "bg-tag-red-900 text-tag-red-100 dark:bg-tag-red-900 dark:text-tag-red-100 dark:border-tag-red-100 dark:border",
	4: "bg-tag-red-900 text-tag-red-100 dark:bg-tag-red-900 dark:text-tag-red-100 dark:border-tag-red-100 dark:border",
	5: "bg-tag-blue-900 text-tag-blue-100 dark:bg-tag-blue-900 dark:text-tag-blue-100 dark:border-tag-blue-100 dark:border",
	6: "bg-tag-blue-900 text-tag-blue-100 dark:bg-tag-blue-900 dark:text-tag-blue-100 dark:border-tag-blue-100 dark:border",
	7: "bg-tag-green-900 text-tag-green-100 dark:bg-tag-green-900 dark:text-tag-green-100 dark:border-tag-green-100 dark:border",
	8: "bg-tag-green-900 text-tag-green-100 dark:bg-tag-green-900 dark:text-tag-green-100 dark:border-tag-green-100 dark:border",
	9: "bg-tag-purple-900 text-tag-purple-100 dark:bg-tag-purple-900 dark:text-tag-purple-100 dark:border-tag-purple-100 dark:border",
	10: "bg-tag-purple-900 text-tag-purple-100 dark:bg-tag-purple-900 dark:text-tag-purple-100 dark:border-tag-purple-100 dark:border",
};

function BeanCard({ bean }: { bean: Beans }) {
	const [confirmDelete, setConfirmDelete] = useState(false);

	const roastClass =
		typeof bean.roastLevel === "number" && bean.roastLevel > 0
			? (ROAST_COLORS[Math.min(Math.max(bean.roastLevel, 1), 10)] ??
				ROAST_COLORS[5])
			: null;

	return (
		<article className="rounded-xl border border-border bg-card p-4 space-y-3">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<p className="font-semibold truncate">
						{bean.name || "Unnamed bean"}
					</p>
					{bean.brand && (
						<p className="text-xs text-muted-foreground mt-0.5">{bean.brand}</p>
					)}
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{roastClass && (
						<span
							className={cn(
								"px-2 py-0.5 rounded-full text-xs font-medium",
								roastClass,
							)}
						>
							Roast {bean.roastLevel}
						</span>
					)}
					{bean.process && bean.process !== "?" && (
						<span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
							{bean.process}
						</span>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
				{(bean.origin?.length ?? 0) > 0 && (
					<span>
						<span className="text-foreground/50 mr-1">from</span>
						{bean.origin.join(", ")}
					</span>
				)}
				{bean.botanic && bean.botanic !== "?" && <span>{bean.botanic}</span>}
				{bean.designation && bean.designation !== "?" && (
					<span>{bean.designation}</span>
				)}
			</div>

			{(bean.flavors?.length ?? 0) > 0 && (
				<div className="flex flex-wrap gap-1">
					{bean.flavors.slice(0, 6).map((f) => (
						<span
							key={f}
							className="px-2 py-0.5 rounded-full bg-primary/8 text-primary text-xs"
						>
							{f}
						</span>
					))}
					{(bean.flavors?.length ?? 0) > 6 && (
						<span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
							+{bean.flavors.length - 6}
						</span>
					)}
				</div>
			)}

			{(bean.tastingNotes?.length ?? 0) > 0 && (
				<p className="text-xs text-muted-foreground italic">
					"{bean.tastingNotes.slice(0, 3).join(", ")}"
				</p>
			)}

			<div className="flex justify-end pt-1">
				{confirmDelete ? (
					<div className="flex items-center gap-2 text-sm">
						<span className="text-xs text-muted-foreground">Sure?</span>
						<button
							type="button"
							onClick={() => deleteBean(bean.id)}
							className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setConfirmDelete(true)}
						className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive transition-colors"
					>
						Delete
					</button>
				)}
			</div>
		</article>
	);
}

function MachineCard({ machine }: { machine: Machines }) {
	const [confirmDelete, setConfirmDelete] = useState(false);

	return (
		<article className="rounded-xl border border-border bg-card p-4 space-y-3">
			<div className="flex items-start justify-between gap-2">
				<div>
					<p className="font-semibold">{machine.name || "Unnamed machine"}</p>
					{machine.brand && (
						<p className="text-xs text-muted-foreground mt-0.5">
							{machine.brand}
							{machine.model ? ` · ${machine.model}` : ""}
						</p>
					)}
				</div>
				{machine.type && (
					<span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium shrink-0">
						{machine.type}
					</span>
				)}
			</div>

			<div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
				{machine.grindRange && (
					<p>
						<span className="text-foreground/50">Grind </span>
						{machine.grindRange}
					</p>
				)}
				{machine.capacity && (
					<p>
						<span className="text-foreground/50">Capacity </span>
						{machine.capacity}
					</p>
				)}
				{machine.purchaseDate && (
					<p>
						<span className="text-foreground/50">Bought </span>
						{machine.purchaseDate}
					</p>
				)}
				{typeof machine.induction === "boolean" && (
					<p>
						<span className="text-foreground/50">Induction </span>
						{machine.induction ? "Yes" : "No"}
					</p>
				)}
			</div>

			<div className="flex justify-end pt-1">
				{confirmDelete ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Sure?</span>
						<button
							type="button"
							onClick={() => {
								if (typeof machine.id === "number") deleteMachine(machine.id);
							}}
							className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setConfirmDelete(true)}
						className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive transition-colors"
					>
						Delete
					</button>
				)}
			</div>
		</article>
	);
}

export default function Library() {
	const [tab, setTab] = useState<Tab>("beans");
	const [search, setSearch] = useState("");

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

	const filteredBeans = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return sortedBeans;
		return sortedBeans.filter((b) =>
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
				.includes(q),
		);
	}, [sortedBeans, search]);

	const filteredMachines = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return sortedMachines;
		return sortedMachines.filter((m) =>
			[m.name, m.brand, m.model, m.type]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(q),
		);
	}, [sortedMachines, search]);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Library</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Your beans and equipment
					</p>
				</div>
				<Link
					to="/log"
					className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
				>
					+ Add new
				</Link>
			</div>

			{/* Tabs */}
			<div className="flex items-center gap-1 rounded-xl bg-muted p-1 w-fit">
				{(["beans", "machines"] as Tab[]).map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTab(t)}
						className={cn(
							"px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
							tab === t
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{t === "beans"
							? `Beans${sortedBeans.length > 0 ? ` (${sortedBeans.length})` : ""}`
							: `Machines${sortedMachines.length > 0 ? ` (${sortedMachines.length})` : ""}`}
					</button>
				))}
			</div>

			{/* Search */}
			<input
				className="h-10 w-full max-w-sm rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
				placeholder={`Search ${tab}…`}
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

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
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
	);
}
