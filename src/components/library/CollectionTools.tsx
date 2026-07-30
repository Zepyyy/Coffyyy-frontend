import { Filter, Search, X } from "lucide-react";

export type CollectionFilter = {
	key: string;
	label: string;
	options: Array<{ label: string; count: number }>;
	selected: string[];
	onToggle: (value: string) => void;
};

export default function CollectionTools({
	search,
	setSearch,
	count,
	filters,
	setFiltersOpen,
	filtersOpen,
}: {
	search: string;
	setSearch: (value: string) => void;
	count: number;
	filters: CollectionFilter[];
	setFiltersOpen: (open: boolean) => void;
	filtersOpen: boolean;
}) {
	const activeFilters = filters.flatMap((filter) =>
		filter.selected.map((value) => ({ ...filter, value })),
	);

	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<label className="relative min-w-0 flex-1">
					<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<span className="sr-only">Search collection</span>
					<input
						className="h-10 w-full border border-border/70 bg-background px-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
						placeholder="Search this collection…"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</label>
				<button
					type="button"
					onClick={() => setFiltersOpen(!filtersOpen)}
					className="inline-flex h-10 items-center justify-center gap-2 border border-border/70 px-4 font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
				>
					<Filter className="size-3.5" />
					Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
				</button>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<span className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
					{count} result{count === 1 ? "" : "s"}
				</span>
				{activeFilters.map(({ key, value, onToggle }) => (
					<button
						key={`${key}-${value}`}
						type="button"
						onClick={() => onToggle(value)}
						className="inline-flex items-center gap-1 border border-primary/30 bg-primary/5 px-2 py-1 font-Mono text-[10px] uppercase tracking-[0.1em]"
					>
						{value}
						<X className="size-3" />
					</button>
				))}
			</div>

			{filtersOpen && (
				<div className="flex flex-wrap gap-x-8 gap-y-4 border-y border-foreground/10 py-4">
					{filters.map((filter) => (
						<div key={filter.key} className="space-y-2">
							<p className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
								{filter.label}
							</p>
							<div className="flex flex-wrap gap-2">
								{filter.options.map((option) => {
									const active = filter.selected.includes(option.label);
									return (
										<button
											key={option.label}
											type="button"
											onClick={() => filter.onToggle(option.label)}
											className={`border px-2.5 py-1 font-Recursive text-xs transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-foreground/15 hover:border-foreground"}`}
										>
											{option.label} ({option.count})
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
