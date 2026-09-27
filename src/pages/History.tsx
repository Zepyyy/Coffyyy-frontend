import { Coffee, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { BeanChapter } from "@/components/history/BeanChapter";
import { BrewLedgerRow } from "@/components/history/BrewLedgerRow";
import { recipeLine } from "@/lib/brewFormat";
import { useBrewSuggestions, useHistoryBrews } from "@/hooks/api/useBrews";
import { cn, formatRelativeDay } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";

type ViewMode = "bean" | "timeline";

const RATING_FILTER_OPTIONS: Array<{ value: "all" | number; label: string }> = [
	{ value: "all", label: "All ratings" },
	{ value: 4, label: "4★ and up" },
	{ value: 3, label: "3★ and up" },
	{ value: 2, label: "2★ and up" },
];

function HistorySkeleton() {
	return (
		<div className="space-y-3">
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className="h-24 animate-pulse border border-border bg-muted/40"
				/>
			))}
		</div>
	);
}

/** Inline stats sentence + the single best shot so far. */
function StoryStrip({
	brews,
	beanNames,
}: {
	brews: Brews[] | undefined;
	beanNames: Map<number | undefined, string>;
}) {
	if (brews === undefined) return null;
	const rated = brews.filter((b) => b.overallRating != null);
	const avg =
		rated.length > 0
			? rated.reduce((s, b) => s + (Number(b.overallRating) || 0), 0) /
				rated.length
			: null;
	const best = rated.length
		? rated.reduce((a, b) =>
				(Number(b.overallRating) || 0) > (Number(a.overallRating) || 0) ? b : a,
			)
		: null;
	const beansTried = new Set(brews.map((b) => b.beanId)).size;

	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
			<p className="flex-1 font-Recursive text-sm leading-relaxed text-muted-foreground sm:self-center">
				{brews.length} shot{brews.length === 1 ? "" : "s"} across {beansTried}{" "}
				bean{beansTried === 1 ? "" : "s"}
				{avg != null ? `, averaging ${avg.toFixed(1)}★` : ""}
				{best && (Number(best.overallRating) || 0) > 0
					? ". The one to remember: "
					: "."}
				{best && (Number(best.overallRating) || 0) > 0 && (
					<span className="text-foreground">
						{beanNames.get(best.beanId ?? -1) ?? "a brew"} at{" "}
						{best.overallRating}★ — {recipeLine(best)}
					</span>
				)}
			</p>
			<Link
				to="/log/brew"
				className="group inline-flex shrink-0 items-center justify-between gap-3 border border-primary/20 bg-primary-700/10 px-4 py-3 transition-colors hover:bg-primary-700/15 sm:w-56"
			>
				<span>
					<span className="block font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
						Next shot
					</span>
					<span className="block font-News text-xl italic tracking-tight text-foreground/90">
						Log a brew
					</span>
				</span>
				<Coffee className="size-5 text-primary/30 transition-colors group-hover:text-primary/50" />
			</Link>
		</div>
	);
}

export default function History() {
	const [search, setSearch] = useState("");
	const [ratingFilter, setRatingFilter] = useState<"all" | number>("all");
	const [view, setView] = useState<ViewMode>("bean");

	const minRating = ratingFilter === "all" ? null : ratingFilter;
	const brews = useHistoryBrews(search, minRating);
	const suggestions = useBrewSuggestions();

	const beanNameMap = useMemo(
		() => new Map(suggestions.bean.map((bean) => [bean.id, bean.name])),
		[suggestions.bean],
	);
	const beanMap = useMemo(
		() =>
			new Map<number | undefined, Beans>(
				suggestions.bean.map((bean) => [bean.id, bean as Beans]),
			),
		[suggestions.bean],
	);
	const machineNameMap = useMemo(
		() =>
			new Map(suggestions.machine.map((machine) => [machine.id, machine.name])),
		[suggestions.machine],
	);

	const hasActiveFilters = search.trim().length > 0 || ratingFilter !== "all";

	/** beanId → brews, chapters ordered by most recent activity. */
	const chapters = useMemo(() => {
		if (!brews) return [];
		const groups = new Map<number | undefined, Brews[]>();
		for (const brew of brews) {
			const list = groups.get(brew.beanId) ?? [];
			list.push(brew);
			groups.set(brew.beanId, list);
		}
		return [...groups.entries()].sort(
			(a, b) => +new Date(b[1][0].date) - +new Date(a[1][0].date),
		);
	}, [brews]);

	/** date-day → brews, for the flat timeline view. */
	const timeline = useMemo(() => {
		if (!brews) return [];
		const groups = new Map<string, Brews[]>();
		for (const brew of brews) {
			const day = formatRelativeDay(brew.date);
			const list = groups.get(day) ?? [];
			list.push(brew);
			groups.set(day, list);
		}
		return [...groups.entries()];
	}, [brews]);

	const shownCount = brews?.length ?? 0;

	function clearFilters() {
		setSearch("");
		setRatingFilter("all");
	}

	return (
		<div className="mx-auto w-full max-w-5xl px-2 sm:px-6">
			<div className="space-y-6">
				<div className="border-l-5 border-primary-200 pl-5">
					<h1 className="font-News text-4xl italic tracking-tight text-foreground/90">
						History
					</h1>
					<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
						What worked, and how to repeat it
					</p>
				</div>

				<StoryStrip brews={brews} beanNames={beanNameMap} />

				{/* Controls */}
				<div className="flex flex-col gap-3 border border-border bg-background p-3 sm:flex-row sm:items-center">
					<div className="flex w-fit items-center border border-border/70 p-0.5">
						{(
							[
								["bean", "By bean"],
								["timeline", "Timeline"],
							] as Array<[ViewMode, string]>
						).map(([mode, label]) => (
							<button
								key={mode}
								type="button"
								onClick={() => setView(mode)}
								className={cn(
									"px-3 py-1.5 font-Recursive text-xs transition-colors",
									view === mode
										? "bg-primary/10 text-primary-800 dark:text-primary-200"
										: "text-muted-foreground hover:text-foreground",
								)}
								aria-pressed={view === mode}
							>
								{label}
							</button>
						))}
					</div>
					<label className="relative block min-w-0 flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
						<input
							className="h-9 w-full min-w-0 border border-border/70 bg-background pl-9 pr-3 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
							placeholder="Search beans or machines"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							aria-label="Search brews by bean or machine"
						/>
					</label>
					<label className="relative block">
						<select
							className="h-9 w-full appearance-none border border-border/70 bg-background px-3 font-Recursive text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
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
					{hasActiveFilters && (
						<button
							type="button"
							onClick={clearFilters}
							className="w-fit px-2 font-Recursive text-xs text-muted-foreground transition-colors hover:text-foreground"
						>
							Clear
						</button>
					)}
				</div>

				{brews === undefined && <HistorySkeleton />}

				{brews !== undefined && brews.length === 0 && (
					<div className="space-y-3 border border-dashed border-border p-10 text-center">
						<p className="font-News text-2xl text-foreground/60">
							{hasActiveFilters ? "Nothing matches" : "No brews yet"}
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							{hasActiveFilters
								? "Try clearing the search or rating filter."
								: "Log your first shot and the story starts here."}
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
					<div className="space-y-4">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
							{shownCount} brew{shownCount === 1 ? "" : "s"}
							{view === "bean"
								? ` in ${chapters.length} bean chapter${chapters.length === 1 ? "" : "s"}`
								: ""}
						</p>

						{view === "bean" &&
							chapters.map(([beanId, beanBrews]) => (
								<BeanChapter
									key={beanId ?? "unknown"}
									bean={beanMap.get(beanId)}
									brews={beanBrews}
									machineNames={machineNameMap}
								/>
							))}

						{view === "timeline" &&
							timeline.map(([day, dayBrews]) => (
								<section
									key={day}
									className="border border-border bg-background"
								>
									<header className="flex items-baseline justify-between border-b border-border/60 px-4 py-2.5">
										<h2 className="font-News text-xl italic tracking-tight text-foreground/90">
											{day}
										</h2>
										<span className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
											{dayBrews.length} shot{dayBrews.length === 1 ? "" : "s"}
										</span>
									</header>
									<div>
										{dayBrews.map((brew) => (
											<BrewLedgerRow
												key={brew.id}
												brew={brew}
												machineName={
													brew.machineId != null
														? machineNameMap.get(brew.machineId)
														: undefined
												}
											/>
										))}
									</div>
								</section>
							))}
					</div>
				)}
			</div>
		</div>
	);
}
