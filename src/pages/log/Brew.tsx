import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useMemo, useState } from "react";
import FieldLabel from "@/components/log/FieldLabel";
import MultiChips from "@/components/log/MultiChoiceChips";
import OptionChips from "@/components/log/OptionChips";
import QuickCard from "@/components/log/QuickCard";
import SectionTitle from "@/components/log/SectionTitle";
import { addBrew } from "@/db/crud/add";
import { db } from "@/db/db";
import { buildBrewSuggestions } from "@/lib/brewSuggestions";
import { validateRequiredFields } from "@/lib/formValidation";
import type { BeanCardProps } from "@/types/BeanTypes";
import type { BrewForm } from "@/types/BrewTypes";

const INITIAL: BrewForm = {
	bean: undefined,
	date: new Date(),
	overallRating: "",
	grindSize: "",
	acidity: "",
	adjustementNeeded: "",
	aftertaste: "",
	bitterness: "",
	mouthfeel: "",
	strength: "",
	machine: undefined,
	tasteProfiles: [],
};

const SAVE_MESSAGES = [
	"Logged! ☕ Your palate thanks you.",
	"Bean immortalized. The coffee gods are pleased.",
	"Saved to the sacred bean archive.",
	"Another one for the collection. Legend.",
	"Catalogued with love. Next cup awaits.",
	"Noted. Your future self will thank you.",
	"A fine addition to the archive.",
	"Delicious. Documented. Done.",
	"Saved! May your next cup be even better.",
];

const REQUIRED_FIELDS: Partial<Record<keyof BrewForm, string>> = {
	overallRating: "Give feedback.",
};

export default function BrewLog() {
	const [form, setForm] = useState<BrewForm>(INITIAL);
	const [customProfile, setCustomProfile] = useState("");
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof BrewForm, string>>
	>({});

	const brews = useLiveQuery(() => db.Brews.toArray(), []);
	const beanRecords = useLiveQuery(() => db.Beans.toArray(), []);
	const machineRecords = useLiveQuery(() => db.Machines.toArray(), []);

	const suggestions = useMemo(
		() =>
			buildBrewSuggestions(
				brews ?? [],
				beanRecords?.map(
					(b) =>
						({
							name: b.name ?? "",
							origin: b.origin ?? [],
							dominantNote: b.dominantNote ?? "",
							selected: false,
						}) as BeanCardProps,
				) ?? [],
				machineRecords?.map((m) => m.name ?? "") ?? [],
			),
		[brews, beanRecords, machineRecords],
	);

	function setField<K extends keyof BrewForm>(field: K, value: BrewForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function toggleProfile(value: string) {
		setForm((f) => ({
			...f,
			tasteProfiles: f.tasteProfiles.includes(value)
				? f.tasteProfiles.filter((p) => p !== value)
				: [...f.tasteProfiles, value],
		}));
	}

	function addCustomProfile() {
		const val = customProfile.trim();
		if (!val || form.tasteProfiles.includes(val)) return;
		setForm((f) => ({ ...f, tasteProfiles: [...f.tasteProfiles, val] }));
		setCustomProfile("");
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
			const result = await addBrew({
				bean: form.bean,
				date: form.date,
				overallRating: form.overallRating as
					| "Excellent"
					| "Good"
					| "Mid"
					| "Horrible"
					| "Burnt🔥"
					| "default",
				grindSize: form.grindSize,
				acidity: form.acidity as
					| "⚡ Too sharp/sour"
					| "🍋 Bright/Lively"
					| "😊 Balanced"
					| "😴 Flat/Dull"
					| "default",
				adjustementNeeded: form.adjustementNeeded as
					| "Keep this setting 👍"
					| "Grind finer next time ⬇️"
					| "Grind coarser next time ⬆️"
					| "Try different machine 🔄"
					| "Fuck this bean ‼️"
					| "default",
				aftertaste: form.aftertaste as
					| "✨ Amazing - lingering sweetness"
					| "👍 Pleasant"
					| "😐 Neutral"
					| "👎 Unpleasant/harsh"
					| "default",
				bitterness: form.bitterness as
					| "👍 Barely noticeable"
					| "🍫 Pleasant bitter"
					| "😐 None"
					| "😖 Too bitter"
					| "default",
				mouthfeel: form.mouthfeel as
					| "💧 Thin/Watery"
					| "😊 Balanced"
					| "😐 Neutral"
					| "😖 Too watery"
					| "🔥 Fluffy/airy"
					| "default",
				strength: form.strength as
					| "‼️ Too strong"
					| "🍃 Just right"
					| "💧Too weak"
					| "default",
				machine: form.machine,
				tasteProfiles: form.tasteProfiles,
			});
			setError(result instanceof Error ? result.message : String(result));
			setForm(INITIAL);
			setFieldErrors({});
			setCustomProfile("");
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
								Log a Brew
							</h1>
							<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
								How was that cup?
							</p>
						</div>
						<div className="bg-background p-2 border border-primary/20">
							<p className="text-sm text-foreground py-1">Status: {status}</p>
							{Object.entries(form).map(([key, value]) => (
								<div key={key}>
									<p className="text-sm text-muted-foreground space-x-4">
										<span>{key}: </span>
										<span className="font-mono text-foreground">
											{Array.isArray(value)
												? value.join(", ")
												: value?.toLocaleString()}
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
				<section className="">
					<form onSubmit={handleSubmit} className="space-y-10">
						{/* Bean */}
						<section className="space-y-3">
							<SectionTitle>Bean</SectionTitle>
							<div className="space-y-2">
								<div className="space-y-1.5">
									<FieldLabel required>The bean</FieldLabel>
									<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
										{suggestions.bean.map((beanInfo) => (
											<QuickCard
												key={beanInfo.name}
												bean={{
													name: beanInfo.name,
													origin: beanInfo.origin,
													dominantNote: beanInfo.dominantNote,
													selected: beanInfo.name === form.bean,
												}}
												onClick={() => setField("bean", beanInfo.name)}
											/>
										))}
									</div>
								</div>
							</div>
						</section>

						{/* Brew details */}
						<section className="space-y-4">
							<SectionTitle>The Brew</SectionTitle>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<FieldLabel>Grind size</FieldLabel>
									<input
										className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
										placeholder="e.g. 14 clicks, 800 µm"
										value={form.grindSize}
										onChange={(e) => setField("grindSize", e.target.value)}
									/>
								</div>

								<div className="space-y-1.5">
									<FieldLabel>Machine</FieldLabel>
									<OptionChips
										options={suggestions.machine.map((m) => m)}
										value={form.machine ?? ""}
										onChange={(v) => setField("machine", v)}
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<FieldLabel required>Overall rating</FieldLabel>
								<OptionChips
									options={suggestions.overallRating}
									value={form.overallRating}
									onChange={(v) => setField("overallRating", v)}
									requiredField={fieldErrors.overallRating}
								/>
							</div>
						</section>

						{/* Taste */}
						<section className="space-y-4">
							<SectionTitle>Taste</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel>Taste profiles</FieldLabel>
								<MultiChips
									suggestions={suggestions.tasteProfiles}
									selected={form.tasteProfiles}
									onToggle={toggleProfile}
									customInput={customProfile}
									onCustomChange={setCustomProfile}
									onCustomAdd={addCustomProfile}
									placeholder="Type a profile and press Enter…"
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<FieldLabel>Acidity</FieldLabel>
									<OptionChips
										options={suggestions.acidity}
										value={form.acidity}
										onChange={(v) => setField("acidity", v)}
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Aftertaste</FieldLabel>
									<OptionChips
										options={suggestions.aftertaste}
										value={form.aftertaste}
										onChange={(v) => setField("aftertaste", v)}
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Bitterness</FieldLabel>
									<OptionChips
										options={suggestions.bitterness}
										value={form.bitterness}
										onChange={(v) => setField("bitterness", v)}
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Mouthfeel</FieldLabel>
									<OptionChips
										options={suggestions.mouthfeel}
										value={form.mouthfeel}
										onChange={(v) => setField("mouthfeel", v)}
									/>
								</div>
								<div className="space-y-1.5 sm:col-span-2">
									<FieldLabel>Strength</FieldLabel>
									<OptionChips
										options={suggestions.strength}
										value={form.strength}
										onChange={(v) => setField("strength", v)}
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<FieldLabel>Adjustment for next time</FieldLabel>
								<OptionChips
									options={suggestions.adjustementNeeded}
									value={form.adjustementNeeded}
									onChange={(v) => setField("adjustementNeeded", v)}
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
								disabled={!form.bean || isSaving}
								className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
							>
								{isSaving ? "Saving…" : "Save Brew"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
