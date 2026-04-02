import { Button } from "@/components/ui/button";
import { addRandomBrew } from "@/db/crud/add";

// const PAGE_SIZE = 10;

export default function History() {
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
								{ label: "qsdqsd", value: "1" },
								// { label: "Total brews", value: String(totalBrews) },
								// { label: "Unique beans", value: String(uniqueBeans) },
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
				</section>
			</div>
		</div>
	);
}
