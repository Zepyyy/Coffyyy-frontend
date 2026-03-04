import { Button } from "@/components/ui/button";
import { db } from "@/db/db";
import { type ChangeEvent, type FormEvent, useState } from "react";

type BrewForm = {
	name: string;
	brand: string;
	origin: string;
	variety: string;
	roastLevel: string;
	dominantNote: string;
	flavors: string;
	tastingNotes: string;
};

const INITIAL_FORM: BrewForm = {
	name: "",
	brand: "",
	origin: "",
	variety: "",
	roastLevel: "",
	dominantNote: "",
	flavors: "",
	tastingNotes: "",
};

const QUICK_FLAVORS = ["Citrus", "Chocolate", "Floral", "Nutty", "Berry", "Caramel"];

function parseList(value: string) {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

export default function Brew() {
	const [form, setForm] = useState<BrewForm>(INITIAL_FORM);
	const [status, setStatus] = useState<string>("");
	const [isSaving, setIsSaving] = useState(false);

	const setField =
		(field: keyof BrewForm) => (event: ChangeEvent<HTMLInputElement>) => {
			setForm((current) => ({ ...current, [field]: event.target.value }));
		};

	function addFlavorTag(tag: string) {
		setForm((current) => {
			const currentTags = parseList(current.flavors);
			if (currentTags.includes(tag)) return current;
			return {
				...current,
				flavors: [...currentTags, tag].join(", "),
			};
		});
	}

	async function saveBrew(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSaving(true);
		setStatus("");

		try {
			const roast = Number(form.roastLevel);
			await db.Beans.add({
				name: form.name || undefined,
				brand: form.brand || undefined,
				origin: parseList(form.origin),
				variety: parseList(form.variety),
				roastLevel: Number.isFinite(roast) ? roast : undefined,
				dominantNote: form.dominantNote || undefined,
				flavors: parseList(form.flavors),
				tastingNotes: parseList(form.tastingNotes),
				finished: true,
			});
			setForm(INITIAL_FORM);
			setStatus("Saved.");
		} catch {
			setStatus("Save failed.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<section className="w-full h-full rounded-2xl border border-border bg-card p-5 md:p-8 flex flex-col gap-4">
			<h1 className="text-2xl md:text-3xl font-semibold">Brew Log</h1>

			<div className="flex flex-wrap gap-2">
				{QUICK_FLAVORS.map((tag) => (
					<Button
						key={tag}
						type="button"
						size="sm"
						variant="outline"
						onClick={() => addFlavorTag(tag)}
					>
						{tag}
					</Button>
				))}
			</div>

			<form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={saveBrew}>
				<input
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Bean"
					value={form.name}
					onChange={setField("name")}
					required
				/>
				<input
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Roaster"
					value={form.brand}
					onChange={setField("brand")}
				/>
				<input
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Origin"
					value={form.origin}
					onChange={setField("origin")}
				/>
				<input
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Variety"
					value={form.variety}
					onChange={setField("variety")}
				/>
				<input
					type="number"
					min={1}
					max={10}
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Roast 1-10"
					value={form.roastLevel}
					onChange={setField("roastLevel")}
				/>
				<input
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Dominant note"
					value={form.dominantNote}
					onChange={setField("dominantNote")}
				/>
				<input
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Flavors (comma separated)"
					value={form.flavors}
					onChange={setField("flavors")}
				/>
				<input
					className="h-11 rounded-md border border-border bg-background px-3 text-sm"
					placeholder="Tasting notes"
					value={form.tastingNotes}
					onChange={setField("tastingNotes")}
				/>
				<div className="md:col-span-2 flex items-center justify-between gap-2 pt-1">
					<p className="text-sm text-muted-foreground">{status}</p>
					<Button type="submit" disabled={isSaving}>
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</div>
			</form>
		</section>
	);
}
