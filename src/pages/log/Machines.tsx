import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import FieldLabel from "@/components/log/FieldLabel";
import SectionTitle from "@/components/log/SectionTitle";
import SingleChoiceChips from "@/components/log/SingleChoiceChips";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { BREW_METHODS, methodConfig } from "@/lib/brewMethods";
import { addMachine, updateMachineById } from "@/lib/data";
import {
	useMachine,
	useMachineBrewCount,
	useMachineSuggestions,
} from "@/hooks/api/useMachines";
import { validateRequiredFields } from "@/lib/formValidation";
import type { BrewMethod } from "@/types/BrewTypes";
import type { MachineForm, Machines } from "@/types/MachineTypes";

const INITIAL: MachineForm = {
	name: "",
	brand: "",
	model: "",
	method: "espresso",
	grindRange: "",
	capacity: "",
	purchaseDate: "",
};

const SAVE_MESSAGES = [
	"Brewer logged. Ready to brew.",
	"Saved. Your setup just got sharper.",
	"Catalogued. Dial-in time.",
	"Brewer added to the arsenal.",
	"Saved! Future brew sessions thank you.",
];

const REQUIRED_FIELDS: Partial<Record<keyof MachineForm, string>> = {
	brand: "Enter a brand for this brewer.",
};

const METHOD_OPTIONS = BREW_METHODS.map((method) => ({
	value: method,
	label: methodConfig(method).label,
}));

function normalizeOptional(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function formFromMachine(machine: Machines): MachineForm {
	return {
		name: machine.name,
		brand: machine.brand,
		model: machine.model,
		method: machine.method,
		grindRange: machine.grindRange,
		capacity: machine.capacity,
		purchaseDate: machine.purchaseDate,
	};
}

/** A positive integer search param, else undefined. */
function idParam(raw: string | null): number | undefined {
	const id = Number(raw);
	return raw != null && Number.isInteger(id) && id > 0 ? id : undefined;
}

/**
 * `/log/machine` adds a Brewer; `?id=4` edits that one. Keyed on the id so
 * switching between them (e.g. `?id=4` -> `/log/machine`) starts a fresh form.
 */
export default function MachinesLog() {
	const [searchParams] = useSearchParams();
	const editId = idParam(searchParams.get("id"));
	return <MachineLogForm key={editId ?? "new"} editId={editId} />;
}

function MachineLogForm({ editId }: { editId: number | undefined }) {
	const [form, setForm] = useState<MachineForm>(INITIAL);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const suggestions = useMachineSuggestions();

	// Editing a Brewer: its method locks once it has brews.
	const editing = useMachine(editId);
	const brewCount = useMachineBrewCount(editId) ?? 0;
	const methodLocked = editId != null && brewCount > 0;
	const loadedId = useRef<number | null>(null);
	useEffect(() => {
		if (!editing || loadedId.current === editing.id) return;
		loadedId.current = editing.id;
		setForm(formFromMachine(editing));
	}, [editing]);

	const [customBrand, setCustomBrand] = useState("");
	const [customModel, setCustomModel] = useState("");
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
			const machine = {
				name: normalizeOptional(form.name) ?? "",
				brand: normalizeOptional(form.brand) ?? "",
				model: normalizeOptional(form.model) ?? "",
				method: form.method,
				grindRange: normalizeOptional(form.grindRange) ?? "",
				capacity: normalizeOptional(form.capacity) ?? "",
				purchaseDate: normalizeOptional(form.purchaseDate) ?? "",
			};
			if (editing) {
				const { method, ...rest } = machine;
				await updateMachineById(
					methodLocked ? rest : { ...rest, method },
					editing.id,
				);
				setStatus("Brewer updated.");
				return;
			}
			const result = await addMachine(machine);
			setError(result instanceof Error ? result.message : String(result));
			setForm(INITIAL);
			setStatus(
				SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)],
			);
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Save failed.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="mx-auto w-full max-w-4/5">
			<div className="grid gap-6 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-8">
				<aside className="lg:sticky lg:top-20 lg:self-start max-w-fit lg:block hidden">
					<div className="space-y-5 p-2 backdrop-blur-xs lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
						<div className="border-l-4 border-crema pl-5">
							<h1 className="text-4xl font-display italic tracking-tight text-foreground/90">
								{editing ? "Edit brewer" : "Add a brewer"}
							</h1>
							<p className="mt-1 font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">
								{editing ? editing.name : "Register a new brewer."}
							</p>
						</div>
						{import.meta.env.DEV && (
							<div className="rounded-lg border border-line bg-paper-sunken/50 p-2">
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
									className="w-full flex-1 rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60"
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
									className="w-full flex-1 rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60"
									placeholder="e.g. 1–40 clicks"
									value={form.grindRange}
									onChange={(e) => setField("grindRange", e.target.value)}
								/>
							</div>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="space-y-2.5">
									<FieldLabel required>Method</FieldLabel>
									<SegmentedControl<BrewMethod>
										options={METHOD_OPTIONS}
										value={form.method}
										onChange={(method) => setField("method", method)}
										ariaLabel="Brew method"
										disabled={methodLocked}
									/>
									{methodLocked && (
										<p className="font-sans text-xs text-muted-foreground">
											Locked: this brewer has brews
										</p>
									)}
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
									className="w-full flex-1 rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 font-sans text-sm text-ink-soft focus:outline-none focus:ring-1 focus:ring-crema/60"
									value={form.purchaseDate}
									onChange={(e) => setField("purchaseDate", e.target.value)}
								/>
							</div>
						</section>

						{/* Save */}
						<div className="space-y-3 border-t border-line pt-4">
							{status && (
								<p className="text-sm text-muted-foreground">{status}</p>
							)}
							<button
								type="submit"
								disabled={!form.name.trim() || isSaving}
								className="key-frame key-frame-light h-12 w-full rounded-xl bg-ink font-semibold text-sm text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
							>
								{isSaving ? "Saving…" : "Save brewer"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
