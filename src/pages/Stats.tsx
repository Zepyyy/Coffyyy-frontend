import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import type { Brews } from "@/types/default";

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

function getTopValue(values: Array<string | undefined>): string {
	if (values.length === 0) return "No data";
	const counts = new Map<string, number>();

	for (const value of values) {
		const key = value?.trim();
		if (!key) continue;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	const [winner] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
	return winner ?? "No data";
}

type EditForm = {
	bean: string;
	overallRating: string;
	grindSize: string;
	date: Date;
	acidity: string;
	adjustementNeeded: string;
	aftertaste: string;
	bitterness: string;
	mouthfeel: string;
	strength: string;
	type: string;
	tasteProfiles: string;
};

type SortMode = "newest" | "oldest" | "bean-asc" | "bean-desc" | "rating-asc";
type RatingFilter = "all" | string;

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

function toEditForm(brew: Brews): EditForm {
	return {
		bean: brew.bean ?? "",
		overallRating: brew.overallRating ?? "",
		grindSize: brew.grindSize ?? "",
		date: brew.date ?? "",
		acidity: brew.acidity ?? "",
		adjustementNeeded: brew.adjustementNeeded ?? "",
		aftertaste: brew.aftertaste ?? "",
		bitterness: brew.bitterness ?? "",
		mouthfeel: brew.mouthfeel ?? "",
		strength: brew.strength ?? "",
		type: brew.type ?? "",
		tasteProfiles: joinList(brew.tasteProfiles),
	};
}

function searchHaystack(brew: Brews) {
	return [
		brew.bean,
		brew.overallRating,
		brew.grindSize,
		brew.date,
		brew.acidity,
		brew.adjustementNeeded,
		brew.aftertaste,
		brew.bitterness,
		brew.mouthfeel,
		brew.strength,
		brew.type,
		joinList(brew.tasteProfiles),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();
}

export default function Stats() {
	const brews = useLiveQuery(async () => db.Brews.toArray(), []);
	const [editId, setEditId] = useState<number | null>(null);
	const [editForm, setEditForm] = useState<EditForm | null>(null);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
	const [search, setSearch] = useState("");
	const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
	const [sortMode, setSortMode] = useState<SortMode>("newest");
	const [page, setPage] = useState(1);

	const sourceBrews = brews ?? [];
	const totalBrews = sourceBrews.length;
	const uniqueBeans = new Set(
		sourceBrews
			.map((brew) => brew.bean?.trim().toLowerCase())
			.filter((value): value is string => Boolean(value)),
	).size;
	const topRating = getTopValue(sourceBrews.map((brew) => brew.overallRating));
	const topTasteProfile = getTopValue(
		sourceBrews.flatMap((brew) => brew.tasteProfiles ?? []),
	);
	const ratingOptions = [
		...new Set(sourceBrews.map((brew) => brew.overallRating)),
	]
		.filter((value): value is string => Boolean(value?.trim()))
		.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

	const filteredBrews = useMemo(() => {
		const query = search.trim().toLowerCase();

		return sourceBrews.filter((brew) => {
			if (
				ratingFilter !== "all" &&
				(brew.overallRating ?? "").toLowerCase() !== ratingFilter
			) {
				return false;
			}
			if (!query) return true;
			return searchHaystack(brew).includes(query);
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
			if (sortMode === "rating-asc")
				return (a.overallRating ?? "").localeCompare(
					b.overallRating ?? "",
					undefined,
					{
						sensitivity: "base",
					},
				);
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

	function beginEdit(brew: Brews) {
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
			await db.Brews.update(editId, {
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
				type: editForm.type || undefined,
				tasteProfiles: parseList(editForm.tasteProfiles),
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
			await db.Brews.delete(id);
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
		setRatingFilter("all");
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
					{ label: "Unique beans", value: String(uniqueBeans) },
					{ label: "Top rating", value: topRating },
					{ label: "Top taste profile", value: topTasteProfile },
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
						placeholder="Search bean, rating, profile, method..."
						value={search}
						onChange={(event) => {
							setSearch(event.target.value);
							setPage(1);
						}}
					/>
					<select
						className="h-10 rounded-md border border-border bg-card px-3 text-sm"
						value={ratingFilter}
						onChange={(event) => {
							setRatingFilter(event.target.value as RatingFilter);
							setPage(1);
						}}
					>
						<option value="all">All ratings</option>
						{ratingOptions.map((rating) => (
							<option key={rating} value={rating.toLowerCase()}>
								{rating}
							</option>
						))}
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
						<option value="bean-asc">Sort: bean A-Z</option>
						<option value="bean-desc">Sort: bean Z-A</option>
						<option value="rating-asc">Sort: rating A-Z</option>
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
												{brew.bean ?? "Unnamed brew"}
											</span>
											<span className="text-muted-foreground">
												{brew.overallRating ?? "No rating"}
											</span>
											<span className="text-muted-foreground">
												{brew.type ?? "No method"}
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
												value={editForm.bean}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, bean: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Overall rating"
												value={editForm.overallRating}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? {
																	...current,
																	overallRating: event.target.value,
																}
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Grind size"
												value={editForm.grindSize}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, grindSize: event.target.value }
															: current,
													)
												}
											/>
											<input
												type="date"
												className="h-10 rounded-md border border-border bg-card px-3"
												value={editForm.date.toDateString()}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? {
																	...current,
																	date: new Date(event.target.value),
																}
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Acidity"
												value={editForm.acidity}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, acidity: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Adjustement needed"
												value={editForm.adjustementNeeded}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? {
																	...current,
																	adjustementNeeded: event.target.value,
																}
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Aftertaste"
												value={editForm.aftertaste}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, aftertaste: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Bitterness"
												value={editForm.bitterness}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, bitterness: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Mouthfeel"
												value={editForm.mouthfeel}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, mouthfeel: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Strength"
												value={editForm.strength}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, strength: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Brew method"
												value={editForm.type}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? { ...current, type: event.target.value }
															: current,
													)
												}
											/>
											<input
												className="h-10 rounded-md border border-border bg-card px-3"
												placeholder="Taste profiles (comma separated)"
												value={editForm.tasteProfiles}
												onChange={(event) =>
													setEditForm((current) =>
														current
															? {
																	...current,
																	tasteProfiles: event.target.value,
																}
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
