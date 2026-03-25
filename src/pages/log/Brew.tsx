import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useMemo, useState } from "react";
import { addBrew } from "@/db/crud/add";
import { db } from "@/db/db";
import { buildBrewSuggestions } from "@/lib/brewSuggestions";
import { cn } from "@/lib/utils";

export type BrewForm = {
	bean: string | undefined;
	overallRating: string;
	grindSize: string;
	date: Date;
	acidity: string;
	adjustementNeeded: string;
	aftertaste: string;
	bitterness: string;
	mouthfeel: string;
	strength: string;
	machine: string | undefined;
	tasteProfiles: Array<string>;
};

const INITIAL: BrewForm = {
	bean: undefined,
	date: new Date(),
	overallRating: "default",
	grindSize: "",
	acidity: "default",
	adjustementNeeded: "default",
	aftertaste: "default",
	bitterness: "default",
	mouthfeel: "default",
	strength: "default",
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

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
			{children}
		</p>
	);
}

function FieldLabel({
	children,
	required,
}: {
	children: React.ReactNode;
	required?: boolean;
}) {
	return (
		<label className="text-sm font-medium" htmlFor={children as string}>
			{children}
			{required && (
				<span className="ml-1 text-xs text-muted-foreground font-normal">
					required
				</span>
			)}
		</label>
	);
}

function OptionChips({
	options,
	value,
	onChange,
}: {
	options: string[];
	value: string | undefined;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{options === undefined && <p>There's nothing here...</p>}
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(value === opt ? "" : opt)}
					className={cn(
						"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
						value === opt
							? "bg-foreground text-background"
							: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
					)}
				>
					{opt}
				</button>
			))}
		</div>
	);
}

function MultiChips({
	suggestions,
	selected,
	onToggle,
	customInput,
	onCustomChange,
	onCustomAdd,
	placeholder,
}: {
	suggestions: string[];
	selected: string[];
	onToggle: (v: string) => void;
	customInput: string;
	onCustomChange: (v: string) => void;
	onCustomAdd: () => void;
	placeholder: string;
}) {
	return (
		<div className="space-y-2">
			{suggestions.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{suggestions.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onToggle(s)}
							className={cn(
								"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
								selected.includes(s)
									? "bg-foreground text-background"
									: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
							)}
						>
							{s}
						</button>
					))}
				</div>
			)}
			<div className="flex gap-2">
				<input
					className="h-10 flex-1 rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					placeholder={placeholder}
					value={customInput}
					onChange={(e) => onCustomChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							onCustomAdd();
						}
					}}
				/>
				{customInput.trim() && (
					<button
						type="button"
						onClick={onCustomAdd}
						className="px-3 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
					>
						Add
					</button>
				)}
			</div>
			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selected.map((s) => (
						<span
							key={s}
							className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
						>
							{s}
							<button
								type="button"
								onClick={() => onToggle(s)}
								className="opacity-60 hover:opacity-100 leading-none"
							>
								×
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export default function Brew() {
	const [form, setForm] = useState<BrewForm>(INITIAL);
	const [customProfile, setCustomProfile] = useState("");
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const brews = useLiveQuery(() => db.Brews.toArray(), []);
	const beanRecords = useLiveQuery(() => db.Beans.toArray(), []) ?? [];
	const machineRecords = useLiveQuery(() => db.Machines.toArray(), []) ?? [];

	const suggestions = useMemo(
		() =>
			buildBrewSuggestions(
				brews ?? [],
				beanRecords.map((b) => b.name ?? ""),
				machineRecords.map((m) => m.name ?? ""),
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
		setIsSaving(true);
		setStatus("");
		try {
			await addBrew({
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
			setForm(INITIAL);
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
		<div className="mx-auto max-w-2xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Log a Brew</h1>
				<p className="mt-1 text-sm text-muted-foreground">How was that cup?</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-10">
				{/* Bean */}
				<section className="space-y-3">
					<SectionTitle>Bean</SectionTitle>
					<div className="space-y-2">
						<div className="space-y-1.5">
							<FieldLabel required>The bean</FieldLabel>
							<OptionChips
								options={suggestions.bean.map((b) => b)}
								value={form.bean}
								onChange={(v) => setField("bean", v)}
							/>
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
								className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
								placeholder="e.g. 14 clicks, 800 µm"
								value={form.grindSize}
								onChange={(e) => setField("grindSize", e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<FieldLabel>Machine / method</FieldLabel>
							<div className="space-y-1.5">
								<FieldLabel>Process</FieldLabel>
								<OptionChips
									options={suggestions.machine.map((m) => m)}
									value={form.machine}
									onChange={(v) => setField("machine", v)}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-1.5">
						<FieldLabel>Overall rating</FieldLabel>
						<OptionChips
							options={suggestions.overallRating}
							value={form.overallRating}
							onChange={(v) => setField("overallRating", v)}
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
					{status && <p className="text-sm text-muted-foreground">{status}</p>}
					<button
						type="submit"
						disabled={!form.bean || isSaving}
						className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
					>
						{isSaving ? "Saving…" : "Save Brew"}
					</button>
				</div>
			</form>
		</div>
	);
}
