import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useMemo, useState } from "react";
import FieldLabel from "@/components/log/FieldLabel";
import OptionChips from "@/components/log/OptionChips";
import SectionTitle from "@/components/log/SectionTitle";
import { addMachine } from "@/db/crud/add";
import { db } from "@/db/db";
import { buildMachineSuggestions } from "@/lib/machineSuggestions";
import { cn } from "@/lib/utils";
import type { MachineForm } from "@/types/MachineTypes";

const INITIAL: MachineForm = {
	name: "",
	brand: "",
	model: "",
	type: "",
	grindRange: "",
	capacity: "",
	purchaseDate: "",
	induction: "",
};

const SAVE_MESSAGES = [
	"Machine logged. Ready to brew.",
	"Saved. Your setup just got sharper.",
	"Catalogued. Dial-in time.",
	"Machine added to the arsenal.",
	"Saved! Future brew sessions thank you.",
];

function SuggestionChips({
	options,
	value,
	onChange,
}: {
	options: string[];
	value: string;
	onChange: (v: string) => void;
}) {
	if (options.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-1.5 mb-1.5">
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

function normalizeOptional(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export default function MachinesLog() {
	const [form, setForm] = useState<MachineForm>(INITIAL);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const machines = useLiveQuery(() => db.Machines.toArray(), []);
	const suggestions = useMemo(
		() => buildMachineSuggestions(machines ?? []),
		[machines],
	);

	function setField<K extends keyof MachineForm>(
		field: K,
		value: MachineForm[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	async function handleSubmit(e: ChangeEvent) {
		e.preventDefault();
		setIsSaving(true);
		setStatus("");
		try {
			await addMachine({
				name: normalizeOptional(form.name),
				brand: normalizeOptional(form.brand),
				model: normalizeOptional(form.model),
				type: form.type,
				grindRange: normalizeOptional(form.grindRange),
				capacity: normalizeOptional(form.capacity),
				purchaseDate: normalizeOptional(form.purchaseDate),
				induction: form.induction === "" ? undefined : form.induction === "yes",
			});
			setForm(INITIAL);
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
								Add equipment
							</h1>
							<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Register a new machine.
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
					</div>
				</aside>
				<section>
					<form onSubmit={handleSubmit} className="space-y-10">
						{/* Identity */}
						<section className="space-y-4">
							<SectionTitle>Identity</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel required>Name</FieldLabel>
								<input
									className="h-12 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									placeholder="e.g. Daily Driver, The Beast"
									value={form.name}
									onChange={(e) => setField("name", e.target.value)}
									required
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<FieldLabel>Brand</FieldLabel>
									<SuggestionChips
										options={suggestions.brands}
										value={form.brand}
										onChange={(v) => setField("brand", v)}
									/>
									<input
										className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
										placeholder="e.g. Baratza, Breville"
										value={form.brand}
										onChange={(e) => setField("brand", e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Model</FieldLabel>
									<SuggestionChips
										options={suggestions.models}
										value={form.model}
										onChange={(v) => setField("model", v)}
									/>
									<input
										className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
										placeholder="e.g. Encore ESP"
										value={form.model}
										onChange={(e) => setField("model", e.target.value)}
									/>
								</div>
							</div>
						</section>

						{/* Specs */}
						<section className="space-y-4">
							<SectionTitle>Specs</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel>Type</FieldLabel>
								<SuggestionChips
									options={suggestions.types}
									value={form.type}
									onChange={(v) =>
										setField("type", v as "Espresso" | "Moka Pot")
									}
								/>
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									placeholder="e.g. Drip"
									value={form.type}
									onChange={(e) => setField("type", e.target.value)}
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<FieldLabel>Grind range</FieldLabel>
									<SuggestionChips
										options={suggestions.grindRanges}
										value={form.grindRange}
										onChange={(v) => setField("grindRange", v)}
									/>
									<input
										className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
										placeholder="e.g. 1–40 clicks"
										value={form.grindRange}
										onChange={(e) => setField("grindRange", e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Capacity</FieldLabel>
									<SuggestionChips
										options={suggestions.capacities}
										value={form.capacity}
										onChange={(v) => setField("capacity", v)}
									/>
									<input
										className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
										placeholder="e.g. 2 cups / 300ml"
										value={form.capacity}
										onChange={(e) => setField("capacity", e.target.value)}
									/>
								</div>
							</div>
						</section>

						{/* Ownership */}
						<section className="space-y-4">
							<SectionTitle>Ownership</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel>Purchase date</FieldLabel>
								<input
									type="date"
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm text-muted-foreground focus:text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
									value={form.purchaseDate}
									onChange={(e) => setField("purchaseDate", e.target.value)}
								/>
							</div>

							<div className="space-y-1.5">
								<FieldLabel>Induction compatible?</FieldLabel>
								<OptionChips
									options={["yes", "no", "unknown"]}
									value={form.induction}
									onChange={(v) =>
										setField("induction", v as "yes" | "no" | "")
									}
									unknown="unknown"
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
								disabled={!form.name.trim() || isSaving}
								className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
							>
								{isSaving ? "Saving…" : "Save Equipment"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
