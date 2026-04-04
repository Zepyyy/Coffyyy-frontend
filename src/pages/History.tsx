import { useMemo, useState } from "react";
import { Link } from "react-router";
import { BrewHistoryRow } from "@/components/history/BrewHistoryRow";
import { Button } from "@/components/ui/button";
import { addRandomBrew } from "@/db/crud/add";
import { useGetBeanDisplays } from "@/hooks/api/useBeans";
import { useHistoryBrews, useHistoryStats } from "@/hooks/api/useBrews";
import type { HistorySortMode } from "@/lib/api/brews";
import { cn, colorSwatch } from "@/lib/utils";

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
		<div className="space-y-2">
			{[1, 2, 3, 4, 5].map((i) => (
				<div
					key={i}
					className="h-[4.25rem] animate-pulse rounded border border-border bg-muted/40"
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
	const beanDisplays = useGetBeanDisplays();

	const beanMap = useMemo(
		() => new Map(beanDisplays.map((b) => [b.name, b])),
		[beanDisplays],
	);

	const hasActiveFilters =
		search.trim().length > 0 || ratingFilter !== "all";

	function clearFilters() {
		setSearch("");
		setRatingFilter("all");
	}

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="flex flex-col gap-6 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8">
				<aside className="max-w-full space-y-5 lg:sticky lg:top-20 lg:max-w-fit lg:self-start">
					<div className="space-y-5 p-2 backdrop-blur-xs lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
						<div className="border-l-5 border-primary-200 pl-5">
							<h1 className="font-News text-4xl italic tracking-tight text-foreground/90">
								History
							</h1>
							<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Past brews and their details
							</p>
						</div>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-1">
							{[
								{
									label: "Total brews",
									value:
										stats != null ? String(stats.total) : "…",
								},
								{
									label: "Unique beans",
									value:
										stats != null
											? String(stats.uniqueBeans)
											: "…",
								},
								{
									label: "Avg rating",
									value:
										stats != null && stats.avgRating != null
											? stats.avgRating.toFixed(1)
											: stats != null
												? "—"
												: "…",
								},
								{
									label: "Last 7 days",
									value:
										stats != null
											? String(stats.last7Days)
											: "…",
								},
								{
									label: "Top machine",
									value:
										stats != null
											? (stats.topMachine ?? "—")
											: "…",
									className: "col-span-2 lg:col-span-1",
								},
							].map(({ label, value, className }) => (
								<div
									key={label}
									className={cn(
										"rounded-xl border border-border bg-card p-4",
										className,
									)}
								>
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										{label}
									</p>
									<p className="mt-1 truncate text-lg font-semibold">{value}</p>
								</div>
							))}
						</div>
					</div>
					{import.meta.env.DEV && (
						<Button
							variant="add"
							className="mt-2 w-full lg:w-auto"
							type="button"
							onClick={() => addRandomBrew()}
						>
							Add a random brew
						</Button>
					)}
				</aside>

				<section className="min-w-0 space-y-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
						<input
							className="h-10 min-w-0 flex-1 rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							placeholder="Search bean or machine…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							aria-label="Search brews by bean or machine"
						/>
						<select
							className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
						<select
							className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
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
						{hasActiveFilters && (
							<button
								type="button"
								onClick={clearFilters}
								className="h-10 rounded-lg bg-muted px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
							>
								Clear
							</button>
						)}
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
						<div className="space-y-2">
							{brews.map((brew) => {
								const bean = brew.bean ? beanMap.get(brew.bean) : undefined;
								const swatch = bean?.dominantNote
									? colorSwatch[bean.dominantNote]
									: null;
								const dotBg = swatch?.bg ?? "bg-muted";
								return (
									<BrewHistoryRow
										key={brew.id}
										brew={brew}
										dotBgClass={dotBg}
									/>
								);
							})}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
