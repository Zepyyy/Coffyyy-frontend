import { useState } from "react";
import { getRandomBean, getRandomMachine } from "@/db/crud/add";
import { db } from "@/db/db";
import { cn } from "@/lib/utils";
import type { Brews } from "@/types/BrewTypes";

const colorSwatch: Partial<
	Record<
		Brews["overallRating"],
		{
			bgColor: string;
			textColor: string;
			secondaryTextColor: string;
		}
	>
> = {
	Horrible: {
		bgColor: "bg-tag-teal-900",
		textColor: "text-tag-teal-100",
		secondaryTextColor: "text-tag-teal-100/75",
	},
	"Burnt🔥": {
		bgColor: "bg-tag-red-900",
		textColor: "text-tag-red-100",
		secondaryTextColor: "text-tag-red-100/75",
	},
	Good: {
		bgColor: "bg-tag-blue-900",
		textColor: "text-tag-blue-100",
		secondaryTextColor: "text-tag-blue-100/75",
	},
	Excellent: {
		bgColor: "bg-tag-green-900",
		textColor: "text-tag-green-100",
		secondaryTextColor: "text-tag-green-100/75",
	},
	Mid: {
		bgColor: "bg-tag-yellow-900",
		textColor: "text-tag-yellow-100",
		secondaryTextColor: "text-tag-yellow-100/75",
	},
};

const RATING_COLORS: Record<string, string> = {
	Excellent:
		"bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
	Good: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
	Mid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
	Horrible: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
	Burnt:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

type EditForm = Omit<Brews, "id">;

async function toEditForm(brew: Brews): Promise<EditForm> {
	const randomBean = await getRandomBean();
	const randomMachine = await getRandomMachine();
	return {
		bean: brew.bean ?? randomBean,
		overallRating: brew.overallRating ?? "default",
		grindSize: brew.grindSize ?? "",
		date: brew.date ?? new Date(),
		acidity: brew.acidity ?? "default",
		adjustementNeeded: brew.adjustementNeeded ?? "default",
		aftertaste: brew.aftertaste ?? "default",
		bitterness: brew.bitterness ?? "default",
		mouthfeel: brew.mouthfeel ?? "default",
		strength: brew.strength ?? "default",
		machine: brew.machine ?? randomMachine,
		tasteProfiles: brew.tasteProfiles ?? [],
	};
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
export function BrewCard({
	brew,
	onDelete,
}: {
	brew: Brews;
	onDelete: (id: number) => Promise<void>;
}) {
	const [editing, setEditing] = useState(false);
	const [editForm, setEditForm] = useState<EditForm | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const ratingClass = brew.overallRating
		? (RATING_COLORS[brew.overallRating] ?? "bg-muted text-muted-foreground")
		: null;

	async function beginEdit() {
		const form = await toEditForm(brew);
		setEditForm(form);
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
		<article className="border border-primary/15 bg-background overflow-hidden relative">
			{/* Header row */}
			<div
				className={cn(
					"flex items-center gap-3 p-6",
					colorSwatch[brew.overallRating]?.bgColor,
				)}
			>
				<div className="flex-1 min-w-0">
					<p className="font-semibold truncate text-2xl">
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
			{!editing && (
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
			{editing && editForm && (
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
