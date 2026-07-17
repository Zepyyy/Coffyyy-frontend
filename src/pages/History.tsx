import { Coffee, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { BrewHistoryRow } from "@/components/history/BrewHistoryRow";
import {
	useBrewSuggestions,
	useHistoryBrews,
	useHistoryStats,
} from "@/hooks/api/useBrews";
import type { HistorySortMode } from "@/lib/api/brews";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: Array<{ value: HistorySortMode; label: string }> = [
	{ value: "newest", label: "Newest first" },
	{ value: "oldest", label: "Oldest first" },
	{ value: "bean-asc", label: "Bean A→Z" },
	{ value: "bean-desc", label: "Bean Z→A" },
	{ value: "rating-desc", label: "Highest rated" },
	{ value: "rating-asc", label: "Lowest rated" },
];

const RATING_FILTER_OPTIONS: Array<{ value: "all" | number; label: string }> = [
	{ value: "all", label: "All ratings" },
	{ value: 5, label: "5★ or above" },
	{ value: 4, label: "4★ or above" },
	{ value: 3, label: "3★ or above" },
	{ value: 2, label: "2★ or above" },
	{ value: 1, label: "1★ or above" },
];

function HistoryListSkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2, 3, 4, 5].map((i) => (
				<div
					key={i}
					className="h-36 animate-pulse border border-border bg-muted/40"
				/>
			))}
		</div>
	);
}

export default function History() {
	const [search, setSearch] = useState("");
	const [sortMode, setSortMode] = useState<HistorySortMode>("newest");
	const [ratingFilter, setRatingFilter] = useState<"all" | number>("all");

	const minRating = ratingFilter === "all" ? null : ratingFilter;
	const brews = useHistoryBrews(sortMode, search, minRating);
	const stats = useHistoryStats();
	const suggestions = useBrewSuggestions();

	const beanNameMap = useMemo(
		() => new Map(suggestions.bean.map((bean) => [bean.id, bean.name])),
		[suggestions.bean],
	);
	const machineNameMap = useMemo(
		() =>
			new Map(suggestions.machine.map((machine) => [machine.id, machine.name])),
		[suggestions.machine],
	);

	const hasActiveFilters = search.trim().length > 0 || ratingFilter !== "all";
	const shownCount = brews?.length ?? 0;
	const topMachineName =
		stats?.topMachine != null
			? (machineNameMap.get(stats.topMachine) ?? `Machine #${stats.topMachine}`)
			: "—";

	function clearFilters() {
		setSearch("");
		setRatingFilter("all");
	}

	return (
		<div className="mx-auto w-full max-w-5xl px-2 sm:px-6">
			<div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8">
				<aside className="max-w-full space-y-5 lg:sticky lg:top-20 lg:max-w-fit lg:self-start">
					<div className="space-y-5 p-2 backdrop-blur-xs lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
						<div className="border-l-5 border-primary-200 pl-5">
							<h1 className="font-News text-4xl italic tracking-tight text-foreground/90">
								History
							</h1>
							<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Brews, ratings, and dial-in notes
							</p>
						</div>
						<Link
							to="/log/brew"
							className="group relative flex items-center justify-between overflow-hidden border border-primary/20 bg-primary-700/10 px-4 py-4 transition-all hover:border-primary/30 hover:bg-primary-700/15"
						>
							<div>
								<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
									Next shot
								</p>
								<p className="mt-0.5 font-News text-2xl tracking-tight text-foreground/90">
									Log a Brew
								</p>
							</div>
							<Coffee className="size-7 text-primary/20 transition-colors group-hover:text-primary/30" />
						</Link>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-1">
							{[
								{
									label: "Brews",
									value: stats != null ? String(stats.total) : "…",
								},
								{
									label: "Beans used",
									value: stats != null ? String(stats.uniqueBeans) : "…",
								},
								{
									label: "Average",
									value:
										stats != null && stats.avgRating != null
											? stats.avgRating.toFixed(1)
											: stats != null
												? "—"
												: "…",
								},
								{
									label: "This week",
									value: stats != null ? String(stats.last7Days) : "…",
								},
								{
									label: "Top machine",
									value: stats != null ? topMachineName : "…",
									className: "col-span-2 sm:col-span-4 lg:col-span-1",
								},
							].map(({ label, value, className }) => (
								<div
									key={label}
									className={cn(
										"relative space-y-1 border border-border bg-background p-3 font-Lora transition-colors hover:border-primary/30",
										className,
									)}
								>
									<p className="text-xs uppercase tracking-wide text-muted-foreground font-Mono">
										{label}
									</p>
									<p className="mt-1 truncate text-lg font-semibold">{value}</p>
								</div>
							))}
						</div>
					</div>
				</aside>

				<section className="min-w-0 space-y-4">
					<div className="border border-border bg-background">
						<div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
									Timeline
								</p>
								<h2 className="mt-0.5 font-News text-2xl text-foreground/90">
									{brews === undefined
										? "Loading brews"
										: `${shownCount} brew${shownCount === 1 ? "" : "s"}`}
								</h2>
							</div>
							{hasActiveFilters && (
								<button
									type="button"
									onClick={clearFilters}
									className="w-fit border border-border bg-muted/50 px-3 py-1.5 font-Recursive text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
								>
									Clear filters
								</button>
							)}
						</div>
						<div className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_12rem_12rem]">
							<label className="relative block">
								<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
								<input
									className="h-10 w-full min-w-0 rounded-sm border border-border/70 bg-background pl-9 pr-3 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									placeholder="Search beans or machines"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									aria-label="Search brews by bean or machine"
								/>
							</label>
							<label className="relative block">
								<SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
								<select
									className="h-10 w-full appearance-none rounded-sm border border-border/70 bg-background pl-9 pr-3 font-Recursive text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									value={ratingFilter === "all" ? "all" : String(ratingFilter)}
									onChange={(e) => {
										const v = e.target.value;
										setRatingFilter(v === "all" ? "all" : Number(v));
									}}
									aria-label="Minimum rating filter"
								>
									{RATING_FILTER_OPTIONS.map((o) => (
										<option
											key={o.label}
											value={o.value === "all" ? "all" : String(o.value)}
										>
											{o.label}
										</option>
									))}
								</select>
							</label>
							<label className="relative block">
								<SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
								<select
									className="h-10 w-full appearance-none rounded-sm border border-border/70 bg-background pl-9 pr-3 font-Recursive text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									value={sortMode}
									onChange={(e) =>
										setSortMode(e.target.value as HistorySortMode)
									}
									aria-label="Sort brews"
								>
									{SORT_OPTIONS.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</label>
						</div>
					</div>

					{brews === undefined && <HistoryListSkeleton />}

					{brews !== undefined && brews.length === 0 && (
						<div className="space-y-3 border border-dashed border-border p-10 text-center">
							<p className="font-News text-2xl text-foreground/60">
								{hasActiveFilters
									? "No brews match your filters"
									: "No brews yet"}
							</p>
							<p className="font-Recursive text-sm text-muted-foreground">
								{hasActiveFilters
									? "Try clearing search or rating filters."
									: "Log your first brew to build your history."}
							</p>
							{hasActiveFilters ? (
								<button
									type="button"
									onClick={clearFilters}
									className="mt-2 inline-block border border-border bg-muted/50 px-4 py-2 font-Recursive text-sm text-foreground transition-colors hover:bg-muted"
								>
									Clear filters
								</button>
							) : (
								<Link
									to="/log/brew"
									className="mt-2 inline-block border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm text-foreground transition-colors hover:bg-primary-200/25"
								>
									Log a brew
								</Link>
							)}
						</div>
					)}

					{brews !== undefined && brews.length > 0 && (
						<div className="space-y-3">
							{brews.map((brew) => (
								<BrewHistoryRow
									key={brew.id}
									brew={brew}
									beanName={
										brew.beanId != null
											? (beanNameMap.get(brew.beanId) ?? `Bean #${brew.beanId}`)
											: "Unknown bean"
									}
									machineName={
										brew.machineId != null
											? (machineNameMap.get(brew.machineId) ??
												`Machine #${brew.machineId}`)
											: "No machine saved"
									}
								/>
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
