import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import type { Beans } from "@/types/default";

function MetricShape() {
	return (
		<svg
			viewBox="0 0 160 90"
			className="absolute right-0 top-0 h-full w-2/3 opacity-35"
			aria-hidden
		>
			<title>Metric shape</title>
			<circle
				cx="120"
				cy="18"
				r="14"
				fill="currentColor"
				className="text-primary/70"
			/>
			<rect
				x="36"
				y="38"
				width="20"
				height="32"
				rx="6"
				fill="currentColor"
				className="text-primary/40"
			/>
			<rect
				x="62"
				y="30"
				width="20"
				height="40"
				rx="6"
				fill="currentColor"
				className="text-primary/55"
			/>
			<rect
				x="88"
				y="22"
				width="20"
				height="48"
				rx="6"
				fill="currentColor"
				className="text-primary/70"
			/>
		</svg>
	);
}

function getTopFlavor(
	flavors: Array<Array<string> | undefined> | undefined,
): string {
	if (!flavors?.length) return "No data";
	const counts = new Map<string, number>();

	for (const list of flavors) {
		for (const flavor of list ?? []) {
			const key = flavor.trim();
			if (!key) continue;
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}

	const [winner] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
	return winner ?? "No data";
}

type EditForm = {
	name: string;
	brand: string;
	origin: string;
	variety: string;
	roastLevel: string;
	dominantNote: string;
	flavors: string;
	tastingNotes: string;
};

type SortMode = "newest" | "oldest" | "name-asc" | "name-desc" | "roast-desc";
type FinishedFilter = "all" | "finished" | "unfinished";

const PAGE_SIZE = 8;

function joinList(values?: Array<string>) {
	return (values ?? []).join(", ");
}

function parseList(value: string) {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function toEditForm(brew: Beans): EditForm {
	return {
		name: brew.name ?? "",
		brand: brew.brand ?? "",
		origin: joinList(brew.origin),
		variety: joinList(brew.variety),
		roastLevel: brew.roastLevel?.toString() ?? "",
		dominantNote: brew.dominantNote ?? "",
		flavors: joinList(brew.flavors),
		tastingNotes: joinList(brew.tastingNotes),
	};
}

function searchHaystack(brew: Beans) {
	return [
		brew.name,
		brew.brand,
		brew.dominantNote,
		joinList(brew.flavors),
		joinList(brew.tastingNotes),
		joinList(brew.origin),
		joinList(brew.variety),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

export default function Stats() {
	const brews = useLiveQuery(async () => db.Beans.toArray(), []);
	const [editId, setEditId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<EditForm | null>(null);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
	const [search, setSearch] = useState("");
	const [finishedFilter, setFinishedFilter] = useState<FinishedFilter>("all");
	const [sortMode, setSortMode] = useState<SortMode>("newest");
	const [page, setPage] = useState(1);

	const sourceBrews = brews ?? [];
	const totalBrews = sourceBrews.length;
	const roastValues = sourceBrews
		.map((brew) => brew.roastLevel)
		.filter((value): value is number => typeof value === "number");
	const avgRoast =
		roastValues.length > 0
			? (
					roastValues.reduce((sum, value) => sum + value, 0) /
					roastValues.length
				).toFixed(1)
			: "No data";
	const finishedBrews = sourceBrews.filter((brew) => brew.finished).length;
	const topFlavor = getTopFlavor(sourceBrews.map((brew) => brew.flavors));

	const filteredBrews = useMemo(() => {
		const query = search.trim().toLowerCase();

		return sourceBrews.filter((brew) => {
			if (finishedFilter === "finished" && !brew.finished) return false;
			if (finishedFilter === "unfinished" && brew.finished) return false;
			if (!query) return true;
			return searchHaystack(brew).includes(query);
		});
	}, [sourceBrews, search, finishedFilter]);

	const sortedBrews = useMemo(() => {
		const next = [...filteredBrews];

		next.sort((a, b) => {
			if (sortMode === "oldest") return (a.id ?? 0) - (b.id ?? 0);
			if (sortMode === "name-asc")
				return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
					sensitivity: "base",
				});
			if (sortMode === "name-desc")
				return (b.name ?? "").localeCompare(a.name ?? "", undefined, {
					sensitivity: "base",
				});
			if (sortMode === "roast-desc")
				return (b.roastLevel ?? -1) - (a.roastLevel ?? -1);
			return (b.id ?? 0) - (a.id ?? 0);
		});

		return next;
	}, [filteredBrews, sortMode]);

	const pageCount = Math.max(1, Math.ceil(sortedBrews.length / PAGE_SIZE));

	useEffect(() => {
		if (page > pageCount) setPage(pageCount);
	}, [page, pageCount]);

	const pageStart = (page - 1) * PAGE_SIZE;
	const paginatedBrews = sortedBrews.slice(pageStart, pageStart + PAGE_SIZE);

	function beginEdit(brew: Beans) {
		if (typeof brew.id !== "number") return;
		setEditId(brew.id);
		setEditForm(toEditForm(brew));
		setStatus("");
	}

	function cancelEdit() {
		setEditId(null);
		setEditForm(null);
		setStatus("");
	}

	async function saveEdit() {
		if (editId === null || !editForm) return;
		setIsSaving(true);
		setStatus("");
		try {
			const roast = Number(editForm.roastLevel);
			await db.Beans.update(editId, {
				name: editForm.name || undefined,
				brand: editForm.brand || undefined,
				origin: parseList(editForm.origin),
				variety: parseList(editForm.variety),
				roastLevel: Number.isFinite(roast) ? roast : undefined,
				dominantNote: editForm.dominantNote || undefined,
				flavors: parseList(editForm.flavors),
				tastingNotes: parseList(editForm.tastingNotes),
			});
			setStatus("Brew updated.");
			cancelEdit();
		} catch {
			setStatus("Could not update brew.");
		} finally {
			setIsSaving(false);
		}
	}

	async function deleteBrew(id: number) {
		setStatus("");
		const confirmed = window.confirm("Delete this brew entry?");
		if (!confirmed) return;
		setIsDeletingId(id);
		try {
			await db.Beans.delete(id);
			if (editId === id) cancelEdit();
			setStatus("Brew deleted.");
		} catch {
			setStatus("Could not delete brew.");
		} finally {
			setIsDeletingId(null);
		}
	}

	function resetControls() {
		setSearch("");
		setFinishedFilter("all");
		setSortMode("newest");
		setPage(1);
	}

	return (
		<section className="w-full h-full rounded-2xl border border-border bg-card p-5 md:p-8 flex flex-col gap-6">
			<header className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="text-2xl md:text-3xl font-semibold">Statistics</h1>
			</header>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				{[
					{ label: "Total brews", value: String(totalBrews) },
					{ label: "Finished brews", value: String(finishedBrews) },
					{
						label: "Avg roast",
						value: avgRoast === "No data" ? avgRoast : `${avgRoast} / 10`,
					},
					{ label: "Top flavor", value: topFlavor },
				].map((block) => (
					<div
						key={block.label}
						className="relative overflow-hidden rounded-xl border border-border bg-background p-4"
					>
						<MetricShape />
						<p className="relative z-10 text-xs uppercase tracking-wide text-muted-foreground">
							{block.label}
						</p>
						<p className="relative z-10 text-xl font-semibold mt-1">
							{block.value}
						</p>
					</div>
				))}
			</div>

			<div className="rounded-xl border border-border p-4 bg-background space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm font-medium">Admin: manage brews</p>
					<p className="text-xs text-muted-foreground">
						{sortedBrews.length} record(s) match filters
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-2">
					<input
						className="md:col-span-2 h-10 rounded-md border border-border bg-card px-3 text-sm"
						placeholder="Search bean, brand, flavors, notes..."
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							setPage(1);
						}}
					/>
					<select
						className="h-10 rounded-md border border-border bg-card px-3 text-sm"
						value={finishedFilter}
						onChange={(event) => {
							setFinishedFilter(event.target.value as FinishedFilter);
							setPage(1);
						}}
					>
						<option value="all">All statuses</option>
						<option value="finished">Finished only</option>
						<option value="unfinished">Unfinished only</option>
					</select>
					<select
						className="h-10 rounded-md border border-border bg-card px-3 text-sm"
						value={sortMode}
						onChange={(event) => {
							setSortMode(event.target.value as SortMode);
							setPage(1);
						}}
					>
						<option value="newest">Sort: newest</option>
						<option value="oldest">Sort: oldest</option>
						<option value="name-asc">Sort: name A-Z</option>
						<option value="name-desc">Sort: name Z-A</option>
						<option value="roast-desc">Sort: roast high-low</option>
					</select>
				</div>

				<div className="flex justify-end">
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={resetControls}
					>
						Reset filters
					</Button>
				</div>

				{paginatedBrews.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{totalBrews === 0
							? "☕ Nothing logged yet. Go brew something!"
							: "No records match your current filters."}
					</p>
				) : (
					<div className="space-y-2">
						{paginatedBrews.map((brew) => {
							const id = brew.id;
							const isEditing = typeof id === "number" && id === editId;

							return (
								<div
									key={id}
									className="rounded-md border border-border px-3 py-3 text-sm space-y-3"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex flex-wrap items-center gap-3">
											<span className="font-medium">
												{brew.name ?? "Unnamed bean"}
											</span>
											<span className="text-muted-foreground">
												{brew.brand ?? "Unknown roaster"}
											</span>
											<span className="text-muted-foreground">
												{brew.dominantNote ?? "No dominant note"}
											</span>
										</div>
										{typeof id === "number" && (
											<div className="flex items-center gap-2">
												<Button
													size="sm"
													variant="outline"
													onClick={() => beginEdit(brew)}
												>
													Edit
												</Button>
												<Button
													size="sm"
													variant="destructive"
													onClick={() => deleteBrew(id)}
													disabled={isDeletingId === id}
												>
													{isDeletingId === id ? "Deleting..." : "Delete"}
												</Button>
											</div>
										)}
									</div>

									{isEditing && editForm && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Bean name"
												value={editForm.name}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, name: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Brand / roaster"
												value={editForm.brand}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, brand: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Origin (comma separated)"
												value={editForm.origin}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, origin: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Variety (comma separated)"
												value={editForm.variety}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, variety: event.target.value }
															: current,
													)
												}
											/>
											<input
												type="number"
												min={1}
												max={10}
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Roast level 1-10"
												value={editForm.roastLevel}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, roastLevel: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Dominant note"
												value={editForm.dominantNote}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, dominantNote: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Flavors (comma separated)"
												value={editForm.flavors}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, flavors: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Tasting notes (comma separated)"
												value={editForm.tastingNotes}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, tastingNotes: event.target.value }
															: current,
													)
												}
											/>
											<div className="md:col-span-2 flex justify-end gap-2">
												<Button
													type="button"
													size="sm"
													variant="outline"
													onClick={cancelEdit}
												>
													Cancel
												</Button>
												<Button
													type="button"
													size="sm"
													onClick={saveEdit}
													disabled={isSaving}
												>
													{isSaving ? "Saving..." : "Save"}
												</Button>
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				<div className="flex items-center justify-between gap-2 pt-2">
					<p className="text-xs text-muted-foreground">
						Page {page} / {pageCount}
					</p>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => setPage((current) => Math.max(1, current - 1))}
							disabled={page <= 1}
						>
							Previous
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() =>
								setPage((current) => Math.min(pageCount, current + 1))
							}
							disabled={page >= pageCount}
						>
							Next
						</Button>
					</div>
				</div>

				{status && <p className="text-sm text-muted-foreground">{status}</p>}
			</div>
		</section>
	);
}
