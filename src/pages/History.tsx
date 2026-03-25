import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { BrewCard } from "@/components/history/BrewCard";
import { Button } from "@/components/ui/button";
import { addRandomBrew } from "@/db/crud/add";
import { db } from "@/db/db";

const PAGE_SIZE = 10;

function getTopValue(values: Array<string | undefined>): string {
	if (values.length === 0) return "—";
	const counts = new Map<string, number>();
	for (const value of values) {
		const key = value?.trim();
		if (!key) continue;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const [winner] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
	return winner ?? "—";
}

export default function History() {
	const brews = useLiveQuery(() => db.Brews.toArray(), []);
	const [page, setPage] = useState(1);

	const sourceBrews = useMemo(() => brews ?? [], [brews]);
	const totalBrews = sourceBrews.length;
	const uniqueBeans = new Set(
		sourceBrews.map((b) => b.bean?.toLowerCase()),
		// .filter((v): v is string => Boolean(v)),
	).size;
	const topRating = getTopValue(sourceBrews.map((b) => b.overallRating));
	const topProfile = getTopValue(
		sourceBrews.flatMap((b) => b.tasteProfiles ?? []),
	);

	const pageCount = Math.max(1, Math.ceil(sourceBrews.length / PAGE_SIZE));

	// useEffect(() => {
	// 	if (page > pageCount) setPage(pageCount);
	// }, [page, pageCount]);

	const pageStart = (page - 1) * PAGE_SIZE;
	const pageItems = sourceBrews.slice(pageStart, pageStart + PAGE_SIZE);

	async function deleteBrew(id: number) {
		await db.Brews.delete(id);
	}

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8">
				<aside className="lg:sticky lg:top-20 lg:self-start max-w-fit lg:block hidden">
					<div className="space-y-5 p-2 backdrop-blur-xs lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
						<div className="border-l-5 border-primary-200 pl-5">
							<h1 className="text-4xl font-News italic tracking-tight text-foreground/90">
								History
							</h1>
							<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Past brews and their details
							</p>
							{/*</div>*/}
						</div>
						{/* Stats summary */}
						<div className="space-y-4">
							{[
								{ label: "Total brews", value: String(totalBrews) },
								{ label: "Unique beans", value: String(uniqueBeans) },
								{ label: "Top rating", value: topRating },
								{ label: "Top profile", value: topProfile },
							].map(({ label, value }) => (
								<div
									key={label}
									className="rounded-xl border border-border bg-card p-4"
								>
									<p className="text-xs text-muted-foreground uppercase tracking-wide">
										{label}
									</p>
									<p className="mt-1 text-lg font-semibold truncate">{value}</p>
								</div>
							))}
						</div>
					</div>
					<Button
						variant="add"
						className="mt-4"
						onClick={() => addRandomBrew()}
					>
						Add a Random brew
					</Button>
				</aside>
				<section>
					{/* Controls */}
					<div className="flex flex-wrap gap-2">
						{/*<input
							className="h-10 flex-1 min-w-40 rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							placeholder="Search bean, rating, profile…"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPage(1);
							}}
						/>*/}
						{/*<select
							className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							value={ratingFilter}
							onChange={(e) => {
								setRatingFilter(e.target.value);
								setPage(1);
							}}
						>
							<option value="all">All ratings</option>
							{ratingOptions.map((r) => (
								<option key={r} value={r}>
									{r}
								</option>
							))}
						</select>
						<select
							className="h-10 rounded-lg border border-border/70 bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							value={sortMode}
							onChange={(e) => {
								setSortMode(e.target.value as SortMode);
								setPage(1);
							}}
						>
							<option value="newest">Newest first</option>
							<option value="oldest">Oldest first</option>
							<option value="bean-asc">Bean A→Z</option>
							<option value="bean-desc">Bean Z→A</option>
						</select>
						{(search || ratingFilter !== "all") && (
							<button
								type="button"
								onClick={() => {
									setSearch("");
									setRatingFilter("all");
									setPage(1);
								}}
								className="h-10 px-3 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
							>
								Clear
							</button>
						)}*/}
					</div>

					{/* List */}
					{pageItems.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border p-8 text-center">
							<p className="text-muted-foreground text-sm">
								{totalBrews === 0
									? "☕ Nothing logged yet. Go brew something!"
									: "No brews match your filters."}
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{pageItems.map((brew) => (
								<BrewCard key={brew.id} brew={brew} onDelete={deleteBrew} />
							))}
						</div>
					)}

					{/* Pagination */}
					{pageCount > 1 && (
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs text-muted-foreground">
								{sourceBrews.length} result{sourceBrews.length !== 1 ? "s" : ""}{" "}
								· page {page} of {pageCount}
							</p>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page <= 1}
									className="px-3 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
								>
									← Prev
								</button>
								<button
									type="button"
									onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
									disabled={page >= pageCount}
									className="px-3 py-1.5 rounded-lg bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
								>
									Next →
								</button>
							</div>
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
