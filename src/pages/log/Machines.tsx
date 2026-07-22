import { type ChangeEvent, useState } from "react";
import FieldLabel from "@/components/log/FieldLabel";
import SectionTitle from "@/components/log/SectionTitle";
import SingleChoiceChips from "@/components/log/SingleChoiceChips";
import { addMachine } from "@/lib/data";
import { useMachineSuggestions } from "@/hooks/api/useMachines";
import { validateRequiredFields } from "@/lib/formValidation";
import type { MachineForm } from "@/types/MachineTypes";

const INITIAL: MachineForm = {
	name: "",
	brand: "",
	model: "",
	type: "",
	grindRange: "",
	capacity: "",
	purchaseDate: "",
};

const SAVE_MESSAGES = [
	"Machine logged. Ready to brew.",
	"Saved. Your setup just got sharper.",
	"Catalogued. Dial-in time.",
	"Machine added to the arsenal.",
	"Saved! Future brew sessions thank you.",
];

const REQUIRED_FIELDS: Partial<Record<keyof MachineForm, string>> = {
	brand: "Enter a brand for this machine.",
	type: "Enter a type for this machine.",
};

function normalizeOptional(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export default function MachinesLog() {
	const [form, setForm] = useState<MachineForm>(INITIAL);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const suggestions = useMachineSuggestions();

	const [customBrand, setCustomBrand] = useState("");
	const [customModel, setCustomModel] = useState("");
	const [customType, setCustomType] = useState("");
	const [customCapacity, setCustomCapacity] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof MachineForm, string>>
	>({});

	function setField<K extends keyof MachineForm>(
		field: K,
		value: MachineForm[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function selectCustom(field: keyof MachineForm, value: string) {
		setField(field, value.trim());
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
			const result = await addMachine({
				name: normalizeOptional(form.name) ?? "",
				brand: normalizeOptional(form.brand) ?? "",
				model: normalizeOptional(form.model) ?? "",
				type: form.type,
				grindRange: normalizeOptional(form.grindRange) ?? "",
				capacity: normalizeOptional(form.capacity) ?? "",
				purchaseDate: normalizeOptional(form.purchaseDate) ?? "",
			});
			setError(result instanceof Error ? result.message : String(result));
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
						{import.meta.env.DEV && (
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
						)}
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
				<section>
					<form onSubmit={handleSubmit} className="space-y-10">
						{/* Identity */}
						<section className="space-y-4">
							<SectionTitle>Identity</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel required>Name</FieldLabel>
								<input
									className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
									placeholder="e.g. Daily Driver, The Beast"
									value={form.name}
									onChange={(e) => setField("name", e.target.value)}
									required
								/>
							</div>

							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<FieldLabel required>Brand</FieldLabel>
									<SingleChoiceChips
										options={suggestions.brands}
										selected={form.brand}
										onChange={(v) => setField("brand", v)}
										placeholder="e.g. Onyx Coffee Lab"
										customInput={customBrand}
										onCustomChange={setCustomBrand}
										onCustomAdd={() => selectCustom("brand", customBrand)}
										requiredField={fieldErrors.brand}
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Model</FieldLabel>
									<SingleChoiceChips
										options={suggestions.models}
										selected={form.model}
										onChange={(v) => setField("model", v)}
										placeholder="e.g. Onyx Coffee Lab"
										customInput={customModel}
										onCustomChange={setCustomModel}
										onCustomAdd={() => selectCustom("model", customModel)}
									/>
								</div>
							</div>
						</section>

						{/* Specs */}
						<section className="space-y-4">
							<SectionTitle>Specs</SectionTitle>

							<div className="space-y-1.5">
								<FieldLabel>Grind range</FieldLabel>
								<input
									className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
									placeholder="e.g. 1–40 clicks"
									value={form.grindRange}
									onChange={(e) => setField("grindRange", e.target.value)}
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-1.5">
									<FieldLabel required>Type</FieldLabel>
									<SingleChoiceChips
										options={suggestions.types}
										selected={form.type}
										onChange={(v) => setField("type", v)}
										placeholder="E.g. Espresso"
										customInput={customType}
										onCustomChange={setCustomType}
										onCustomAdd={() => selectCustom("type", customType)}
										requiredField={fieldErrors.type}
									/>
								</div>
								<div className="space-y-1.5">
									<FieldLabel>Capacity</FieldLabel>
									<SingleChoiceChips
										options={suggestions.capacities}
										selected={form.capacity}
										onChange={(v) => setField("capacity", v)}
										placeholder="e.g. 2 cups / 300ml"
										customInput={customCapacity}
										onCustomChange={setCustomCapacity}
										onCustomAdd={() => selectCustom("capacity", customCapacity)}
										requiredField={fieldErrors.capacity}
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
									className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
									value={form.purchaseDate}
									onChange={(e) => setField("purchaseDate", e.target.value)}
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
