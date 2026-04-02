import { type ChangeEvent, useState } from "react";
import FieldLabel from "@/components/log/FieldLabel";
import MultiChips from "@/components/log/MultiChoiceChips";
import OptionChips from "@/components/log/OptionChips";
import SectionTitle from "@/components/log/SectionTitle";
import SingleChoiceChips from "@/components/log/SingleChoiceChips";
import { addBean } from "@/db/crud/add";
import { useGetBeanSuggestions } from "@/hooks/api/useBeans";
import {
	DEFAULT_BOTANICS,
	DEFAULT_DESIGNATIONS,
	DEFAULT_DOMINANT_NOTES,
} from "@/lib/defaults";
import { validateRequiredFields } from "@/lib/formValidation";
import { cn } from "@/lib/utils";
import type { BeanForm } from "@/types/BeanTypes";

const INITIAL: BeanForm = {
	name: "",
	brand: "",
	roastLevel: "",
	process: [],
	botanic: "",
	designation: "",
	origin: [],
	variety: [],
	dominantNote: "",
	flavors: [],
	tastingNotes: [],
};

const SAVE_MESSAGES = [
	"Bean immortalized. The coffee gods are pleased.",
	"Saved to the sacred bean archive.",
	"Another one for the collection. Legend.",
	"Catalogued with love. Next cup awaits.",
	"A fine addition to the archive.",
	"Delicious. Documented. Done.",
	"Saved! May your next cup be even better.",
];

const ROAST_LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const REQUIRED_FIELDS: Partial<Record<keyof BeanForm, string>> = {
	name: "Bean name is required.",
	flavors: "Pick one flavor.",
	process: "Pick at least one process.",
	origin: "Origin is required.",
};

export default function BeansLog() {
	const [form, setForm] = useState<BeanForm>(INITIAL);
	const [customOrigin, setCustomOrigin] = useState("");
	const [customVariety, setCustomVariety] = useState("");
	const [customFlavor, setCustomFlavor] = useState("");
	const [customNote, setCustomNote] = useState("");
	const [customProcess, setCustomProcess] = useState("");
	const [customBrand, setCustomBrand] = useState("");
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof BeanForm, string>>
	>({});

	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const suggestions = useGetBeanSuggestions();

	function clearFieldError(field: keyof BeanForm) {
		setFieldErrors((prev) => {
			if (!prev[field]) return prev;
			const next = { ...prev };
			delete next[field];
			return next;
		});
	}

	function setField<K extends keyof BeanForm>(field: K, value: BeanForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
		clearFieldError(field);
	}

	function toggleItem(
		field: "process" | "origin" | "variety" | "flavors" | "tastingNotes",
		value: string,
	) {
		setForm((f) => {
			const list = f[field] as string[];
			return {
				...f,
				[field]: list.includes(value)
					? list.filter((v) => v !== value)
					: [...list, value],
			};
		});
		clearFieldError(field);
	}

	function selectCustom(field: keyof BeanForm, value: string) {
		setField(field, value.trim());
	}

	function addCustom(
		field: "process" | "origin" | "variety" | "flavors" | "tastingNotes",
		value: string,
		clearFn: () => void,
	) {
		const val = value.trim();
		if (!val) return;
		const current = form[field] as string[];
		if (!current.includes(val)) {
			setForm((f) => ({ ...f, [field]: [...(f[field] as string[]), val] }));
		}
		clearFieldError(field);
		clearFn();
	}

	async function handleSubmit(e: ChangeEvent) {
		e.preventDefault();
		setError("");
		setStatus("");
		const nextErrors = validateRequiredFields(form, REQUIRED_FIELDS);
		if (Object.keys(nextErrors).length > 0) {
			setFieldErrors(nextErrors);
			setStatus("Please complete required fields.");
			return;
		}

		setIsSaving(true);
		try {
			const roast = Number(form.roastLevel);
			const result = await addBean({
				name: form.name,
				brand: form.brand,
				rating: 0,
				status: "New",
				process: form.process,
				botanic: (form.botanic as "Arabica" | "Robusta" | "") || "",
				designation: (form.designation || "?") as "Pure Origin" | "Blend" | "",
				origin: form.origin,
				variety: form.variety,
				roastLevel: Number.isFinite(roast) && roast > 0 ? roast : -1,
				dominantNote: (form.dominantNote || "?") as
					| "Fruity"
					| "Sweet"
					| "Nutty"
					| "Floral"
					| "Sour"
					| "Spices"
					| "Roasted"
					| "Green",
				flavors: form.flavors,
				tastingNotes: form.tastingNotes,
				finished: false,
			});
			setError(result instanceof Error ? result.message : String(result));
			setForm(INITIAL);
			setFieldErrors({});
			setStatus(
				SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)],
			);
		} catch {
			setStatus("Save failed.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="mx-auto w-full max-w-4/5">
			<div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-8">
				<aside className="lg:sticky lg:top-20 lg:self-start max-w-fit lg:block hidden">
					<div className="space-y-5 p-2 backdrop-blur-xs lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
						<div className="border-l-5 border-primary-200 pl-5">
							<h1 className="text-4xl font-News italic tracking-tight text-foreground/90">
								Add a Bean
							</h1>
							<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Catalog a new bean in your library.
							</p>
						</div>
						<div className="bg-background p-2 border border-primary/20">
							<p className="text-sm text-foreground py-1">Status: {status}</p>
							{Object.entries(form).map(([key, value]) => (
								<div key={key}>
									<p className="text-sm text-muted-foreground space-x-4">
										<span>{key}: </span>
										<span className="font-mono text-foreground">
											{Array.isArray(value) ? value.join(", ") : value}
										</span>
									</p>
								</div>
							))}
						</div>
						<div>
							{fieldErrors &&
								Object.entries(fieldErrors).map(([key, value]) => (
									<p key={key} className="text-xs text-destructive">
										{value}
									</p>
								))}
						</div>
						{error && <p className="text-sm text-foreground py-1">{error}</p>}
					</div>
				</aside>
				<section className="min-w-0 max-w-4/5">
					<form onSubmit={handleSubmit} className="space-y-10">
						{/* Identity */}
						<section className="space-y-8">
							<SectionTitle>Identity</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel required>Bean name</FieldLabel>
								<input
									className={cn(
										"w-full not-last-of-type:flex-1 border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 rounded-none",
										fieldErrors.name
											? "border-destructive focus:ring-destructive/40"
											: "border-border focus:ring-primary/40",
									)}
									placeholder="e.g. El Paraiso — Red Berries"
									value={form.name}
									onChange={(e) => setField("name", e.target.value)}
									required
								/>
								{fieldErrors.name && (
									<p className="text-xs text-destructive">{fieldErrors.name}</p>
								)}
							</div>

							<div className="space-y-1.5">
								<FieldLabel>Brand / Roaster</FieldLabel>
								<SingleChoiceChips
									options={suggestions.brands}
									selected={form.brand}
									onChange={(v) => setField("brand", v)}
									placeholder="e.g. Onyx Coffee Lab"
									customInput={customBrand}
									onCustomChange={setCustomBrand}
									onCustomAdd={() => selectCustom("brand", customBrand)}
								/>
							</div>
						</section>

						{/* Origin & Processing */}
						<section className="space-y-8">
							<SectionTitle>Origin & Processing</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel required>Origin</FieldLabel>
								<MultiChips
									suggestions={suggestions.origins}
									selected={form.origin}
									onToggle={(v) => toggleItem("origin", v)}
									customInput={customOrigin}
									onCustomChange={setCustomOrigin}
									onCustomAdd={() =>
										addCustom("origin", customOrigin, () => setCustomOrigin(""))
									}
									placeholder="Type a country or region…"
									requiredField={fieldErrors.origin}
								/>
							</div>

							<div className="space-y-1.5">
								<FieldLabel>Roast level</FieldLabel>
								<div className="flex flex-wrap gap-1.5">
									{ROAST_LEVELS.map((lvl) => (
										<button
											key={lvl}
											type="button"
											onClick={() =>
												setField(
													"roastLevel",
													form.roastLevel === lvl ? "" : lvl,
												)
											}
											className={cn(
												"flex-1 py-2.5 font-Mono text-xs font-semibold transition-all border-b-2",
												form.roastLevel === lvl
													? "border-primary text-primary-800 dark:text-primary-200 bg-primary/10"
													: "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30",
											)}
										>
											{lvl}
										</button>
									))}
								</div>
								<div
									className="h-1 w-full"
									style={{
										background:
											"linear-gradient(to right, oklch(0.916 0.033 221), oklch(0.949 0.032 76), oklch(0.857 0.05 54), oklch(0.425 0.137 25))",
									}}
								/>
								<div className="flex justify-between">
									<span className="font-Mono text-xs text-muted-foreground uppercase">
										Light
									</span>
									<span className="font-Mono text-xs text-muted-foreground uppercase">
										Dark
									</span>
								</div>
							</div>

							<div className="space-y-1.5">
								<FieldLabel required>Process</FieldLabel>
								<MultiChips
									suggestions={suggestions.processes}
									selected={form.process}
									onToggle={(v) => toggleItem("process", v)}
									customInput={customProcess}
									onCustomChange={setCustomProcess}
									onCustomAdd={() =>
										addCustom("process", customProcess, () =>
											setCustomProcess(""),
										)
									}
									placeholder="e.g. Honey, Washed…"
									requiredField={fieldErrors.process}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<FieldLabel>Botanic</FieldLabel>
									<OptionChips
										options={DEFAULT_BOTANICS}
										value={form.botanic}
										onChange={(v) => setField("botanic", v)}
										unknown="?"
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Designation</FieldLabel>
									<OptionChips
										options={DEFAULT_DESIGNATIONS}
										value={form.designation}
										onChange={(v) => setField("designation", v)}
										unknown="?"
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<FieldLabel>Variety</FieldLabel>
								<MultiChips
									suggestions={suggestions.varieties}
									selected={form.variety}
									onToggle={(v) => toggleItem("variety", v)}
									customInput={customVariety}
									onCustomChange={setCustomVariety}
									onCustomAdd={() =>
										addCustom("variety", customVariety, () =>
											setCustomVariety(""),
										)
									}
									placeholder="e.g. Gesha, Bourbon…"
								/>
							</div>
						</section>

						{/* Flavor Profile */}
						<section className="space-y-8">
							<SectionTitle>Flavor Profile</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel required>Dominant note</FieldLabel>
								<OptionChips
									options={DEFAULT_DOMINANT_NOTES}
									value={form.dominantNote}
									onChange={(v) => setField("dominantNote", v)}
									withDot
								/>
							</div>

							<div className="space-y-1.5">
								<FieldLabel required>Flavors</FieldLabel>
								<MultiChips
									suggestions={suggestions.flavors}
									selected={form.flavors}
									onToggle={(v) => toggleItem("flavors", v)}
									customInput={customFlavor}
									onCustomChange={setCustomFlavor}
									onCustomAdd={() =>
										addCustom("flavors", customFlavor, () =>
											setCustomFlavor(""),
										)
									}
									placeholder="e.g. Blueberry, Dark chocolate…"
									requiredField={fieldErrors.flavors}
								/>
							</div>

							<div className="space-y-1.5">
								<FieldLabel>Tasting notes</FieldLabel>
								<MultiChips
									suggestions={suggestions.tastingNotes}
									selected={form.tastingNotes}
									onToggle={(v) => toggleItem("tastingNotes", v)}
									customInput={customNote}
									onCustomChange={setCustomNote}
									onCustomAdd={() =>
										addCustom("tastingNotes", customNote, () =>
											setCustomNote(""),
										)
									}
									placeholder="More descriptive impressions…"
								/>
							</div>
						</section>

						{/* Save */}
						<div className="space-y-3 border-t border-border pt-4">
							{status && (
								<p className="text-sm text-muted-foreground">{status}</p>
							)}
							<button
								type="submit"
								disabled={isSaving}
								className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
							>
								{isSaving ? "Saving…" : "Save Bean"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
