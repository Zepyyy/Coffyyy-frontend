import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/db/db";
import { cn } from "@/lib/utils";
import type { Brews as BrewType } from "@/types/default";

type SortMode = "newest" | "oldest" | "bean-asc" | "bean-desc";
type RatingFilter = "all" | string;

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

function formatDate(date: Date | string | undefined): string {
	if (!date) return "—";
	try {
		return new Date(date).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return String(date);
	}
}

function searchHaystack(brew: BrewType): string {
	return [
		brew.bean,
		brew.overallRating,
		brew.grindSize,
		brew.machine,
		brew.acidity,
		brew.adjustementNeeded,
		brew.aftertaste,
		brew.bitterness,
		brew.mouthfeel,
		brew.strength,
		(brew.tasteProfiles ?? []).join(" "),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

const RATING_COLORS: Record<string, string> = {
	Excellent:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	Good: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	Mid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
	Horrible: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	Burnt:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

type EditForm = Omit<BrewType, "id">;

function toEditForm(brew: BrewType): EditForm {
	return {
		bean: brew.bean ?? "",
		overallRating: brew.overallRating ?? "",
		grindSize: brew.grindSize ?? "",
		date: brew.date ?? new Date(),
		acidity: brew.acidity ?? "",
		adjustementNeeded: brew.adjustementNeeded ?? "",
		aftertaste: brew.aftertaste ?? "",
		bitterness: brew.bitterness ?? "",
		mouthfeel: brew.mouthfeel ?? "",
		strength: brew.strength ?? "",
		machine: brew.machine ?? "",
		tasteProfiles: brew.tasteProfiles ?? [],
	};
}

function BrewCard({
	brew,
	onDelete,
}: {
	brew: BrewType;
	onDelete: (id: number) => Promise<void>;
}) {
	const [expanded, setExpanded] = useState(false);
	const [editing, setEditing] = useState(false);
	const [editForm, setEditForm] = useState<EditForm | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const ratingClass = brew.overallRating
		? (RATING_COLORS[brew.overallRating] ?? "bg-muted text-muted-foreground")
		: null;

	function beginEdit() {
		setEditForm(toEditForm(brew));
		setEditing(true);
	}

	function cancelEdit() {
		setEditing(false);
		setEditForm(null);
	}

	async function saveEdit() {
		if (!editForm || typeof brew.id !== "number") return;
		setIsSaving(true);
		try {
			await db.Brews.update(brew.id, {
				bean: editForm.bean || undefined,
				overallRating: editForm.overallRating || undefined,
				grindSize: editForm.grindSize || undefined,
				date: editForm.date || undefined,
				acidity: editForm.acidity || undefined,
				adjustementNeeded: editForm.adjustementNeeded || undefined,
				aftertaste: editForm.aftertaste || undefined,
				bitterness: editForm.bitterness || undefined,
				mouthfeel: editForm.mouthfeel || undefined,
				strength: editForm.strength || undefined,
				machine: editForm.machine || undefined,
				tasteProfiles: editForm.tasteProfiles || undefined,
			});
			cancelEdit();
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete() {
		if (typeof brew.id !== "number") return;
		setIsDeleting(true);
		try {
			await onDelete(brew.id);
		} finally {
			setIsDeleting(false);
			setConfirmDelete(false);
		}
	}

	return (
		<article className="rounded-xl border border-border bg-card overflow-hidden">
			{/* Header row */}
			<div className="flex items-center gap-3 p-4">
				<div className="flex-1 min-w-0">
					<p className="font-semibold truncate">
						{brew.bean ?? "Unnamed brew"}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						{formatDate(brew.date)}
						{brew.machine ? ` · ${brew.machine}` : ""}
					</p>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{ratingClass && (
						<span
							className={cn(
								"px-2 py-0.5 rounded-full text-xs font-medium",
								ratingClass,
							)}
						>
							{brew.overallRating}
						</span>
					)}
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						className="px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
					>
						{expanded ? "↑" : "↓"}
					</button>
				</div>
			</div>

			{/* Taste chips */}
			{(brew.tasteProfiles?.length ?? 0) > 0 && (
				<div className="flex flex-wrap gap-1 px-4 pb-3">
					{brew.tasteProfiles.map((p) => (
						<span
							key={p}
							className="px-2 py-0.5 rounded-full bg-primary/8 text-primary text-xs"
						>
							{p}
						</span>
					))}
				</div>
			)}

			{/* Expanded detail */}
			{expanded && !editing && (
				<div className="border-t border-border/70 p-4 space-y-3">
					<div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
						{[
							["Grind", brew.grindSize],
							["Acidity", brew.acidity],
							["Aftertaste", brew.aftertaste],
							["Bitterness", brew.bitterness],
							["Mouthfeel", brew.mouthfeel],
							["Strength", brew.strength],
							["Adjustment", brew.adjustementNeeded],
						]
							.filter(([, v]) => v)
							.map(([label, value]) => (
								<div key={label}>
									<span className="text-muted-foreground text-xs">{label}</span>
									<p className="text-xs mt-0.5">{value}</p>
								</div>
							))}
					</div>

					<div className="flex items-center justify-end gap-2 pt-1">
						<button
							type="button"
							onClick={beginEdit}
							className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
						>
							Edit
						</button>
						{confirmDelete ? (
							<div className="flex items-center gap-2">
								<span className="text-xs text-muted-foreground">Sure?</span>
								<button
									type="button"
									onClick={handleDelete}
									disabled={isDeleting}
									className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
								>
									{isDeleting ? "…" : "Delete"}
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(false)}
									className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
								>
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmDelete(true)}
								className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-destructive transition-colors"
							>
								Delete
							</button>
						)}
					</div>
				</div>
			)}

			{/* Edit form */}
			{expanded && editing && editForm && (
				<div className="border-t border-border/70 p-4 space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{(
							[
								["bean", "Bean name"],
								["overallRating", "Rating"],
								["grindSize", "Grind size"],
								["machine", "Machine"],
								["acidity", "Acidity"],
								["adjustementNeeded", "Adjustment"],
								["aftertaste", "Aftertaste"],
								["bitterness", "Bitterness"],
								["mouthfeel", "Mouthfeel"],
								["strength", "Strength"],
							] as const
						).map(([field, label]) => (
							<div key={field} className="space-y-1">
								<label
									className="text-xs text-muted-foreground"
									htmlFor={field}
								>
									{label}
								</label>
								<input
									className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									value={editForm[field] as string}
									onChange={(e) =>
										setEditForm((f) =>
											f ? { ...f, [field]: e.target.value } : f,
										)
									}
								/>
							</div>
						))}
						<div className="space-y-1">
							<label className="text-xs text-muted-foreground" htmlFor="date">
								Date
							</label>
							<input
								type="date"
								className="h-9 w-full rounded-lg border border-border/70 bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
								value={
									editForm.date instanceof Date
										? editForm.date.toISOString().split("T")[0]
										: ""
								}
								onChange={(e) =>
									setEditForm((f) =>
										f ? { ...f, date: new Date(e.target.value) } : f,
									)
								}
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<button
							type="button"
							onClick={cancelEdit}
							className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={saveEdit}
							disabled={isSaving}
							className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
						>
							{isSaving ? "Saving…" : "Save"}
						</button>
					</div>
				</div>
			)}
		</article>
	);
}

export default function Brews() {
	const brews = useLiveQuery(() => db.Brews.toArray(), []);
	const [search, setSearch] = useState("");
	const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
	const [sortMode, setSortMode] = useState<SortMode>("newest");
	const [page, setPage] = useState(1);

	const sourceBrews = brews ?? [];
	const totalBrews = sourceBrews.length;
	const uniqueBeans = new Set(
		sourceBrews
			.map((b) => b.bean?.trim().toLowerCase())
			.filter((v): v is string => Boolean(v)),
	).size;
	const topRating = getTopValue(sourceBrews.map((b) => b.overallRating));
	const topProfile = getTopValue(
		sourceBrews.flatMap((b) => b.tasteProfiles ?? []),
	);

	const ratingOptions = [
		...new Set(sourceBrews.map((b) => b.overallRating)),
	].filter((v): v is string => Boolean(v?.trim()));

	const filteredBrews = useMemo(() => {
		const q = search.trim().toLowerCase();
		return sourceBrews.filter((brew) => {
			if (
				ratingFilter !== "all" &&
				(brew.overallRating ?? "").toLowerCase() !== ratingFilter.toLowerCase()
			)
				return false;
			if (!q) return true;
			return searchHaystack(brew).includes(q);
		});
	}, [sourceBrews, search, ratingFilter]);

	const sortedBrews = useMemo(() => {
		const next = [...filteredBrews];
		next.sort((a, b) => {
			if (sortMode === "oldest") return (a.id ?? 0) - (b.id ?? 0);
			if (sortMode === "bean-asc")
				return (a.bean ?? "").localeCompare(b.bean ?? "", undefined, {
					sensitivity: "base",
				});
			if (sortMode === "bean-desc")
				return (b.bean ?? "").localeCompare(a.bean ?? "", undefined, {
					sensitivity: "base",
				});
			return (b.id ?? 0) - (a.id ?? 0);
		});
		return next;
	}, [filteredBrews, sortMode]);

	const pageCount = Math.max(1, Math.ceil(sortedBrews.length / PAGE_SIZE));

	useEffect(() => {
		if (page > pageCount) setPage(pageCount);
	}, [page, pageCount]);

	const pageStart = (page - 1) * PAGE_SIZE;
	const pageItems = sortedBrews.slice(pageStart, pageStart + PAGE_SIZE);

	async function deleteBrew(id: number) {
		await db.Brews.delete(id);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Brews</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Your complete brew log
				</p>
			</div>

			{/* Stats summary */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

			{/* Controls */}
			<div className="flex flex-wrap gap-2">
				<input
					className="h-10 flex-1 min-w-40 rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					placeholder="Search bean, rating, profile…"
					value={search}
					onChange={(e) => {
						setSearch(e.target.value);
						setPage(1);
					}}
				/>
				<select
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
				)}
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
						{sortedBrews.length} result{sortedBrews.length !== 1 ? "s" : ""} ·
						page {page} of {pageCount}
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
		</div>
	);
}
