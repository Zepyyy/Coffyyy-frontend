import { useLiveQuery } from "dexie-react-hooks";
import { Check, CircleSmall } from "lucide-react";
import { type ChangeEvent, type MouseEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addMachine } from "@/db/crud/add";
import { db } from "@/db/db";
import { buildMachineSuggestions } from "@/lib/machineSuggestions";

type MachineForm = {
	name: string;
	brand: string;
	model: string;
	type: string;
	grindRange: string;
	capacity: string;
	purchaseDate: string;
	induction: "" | "yes" | "no";
};

type SingleSuggestionField =
	| "name"
	| "brand"
	| "model"
	| "type"
	| "grindRange"
	| "capacity";

const INITIAL_FORM: MachineForm = {
	name: "",
	brand: "",
	model: "",
	type: "",
	grindRange: "",
	capacity: "",
	purchaseDate: "",
	induction: "",
};

const STEPS = [
	{
		title: "Machine identity",
		description: "Name, brand and model basics.",
	},
	{
		title: "Brew specs",
		description: "Type, grind range and capacity.",
	},
	{
		title: "Ownership",
		description: "Purchase date and induction compatibility.",
	},
	{
		title: "Review",
		description: "Check everything before saving.",
	},
] as const;

const SAVE_MESSAGES = [
	"Machine logged. Ready to brew.",
	"Saved. Your setup just got sharper.",
	"Catalogued. Dial-in time.",
	"Machine added to the arsenal.",
	"Saved! Future brew sessions thank you.",
];

function findSuggestionMatch(value: string, suggestions: Array<string>) {
	return suggestions.find(
		(suggestion) =>
			suggestion.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
	);
}

function normalizeOptional(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function StepPill({
	index,
	active,
	title,
}: {
	index: number;
	active: boolean;
	title: string;
}) {
	return (
		<div
			className={[
				"rounded-xl border px-3 py-2 text-xs md:text-sm transition-colors",
				active
					? "border-primary/40 bg-primary/10 text-foreground"
					: "border-border/70 bg-background text-muted-foreground",
			].join(" ")}
		>
			<p className="font-semibold">
				{index + 1}. {title}
			</p>
		</div>
	);
}

function FieldLabel({ title, hint }: { title: string; hint?: string }) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<p className="text-sm font-semibold">{title}</p>
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

function SummaryRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border/70 bg-background p-3">
			<p className="text-xs uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-sm font-medium">{value || "-"}</p>
		</div>
	);
}

export default function Machines() {
	const [form, setForm] = useState<MachineForm>(INITIAL_FORM);
	const [status, setStatus] = useState<string>("");
	const [isSaving, setIsSaving] = useState(false);
	const [step, setStep] = useState<number>(0);
	const machines = useLiveQuery(async () => db.Machines.toArray(), []);

	const suggestions = useMemo(
		() => buildMachineSuggestions(machines ?? []),
		[machines],
	);

	const selectedName = findSuggestionMatch(form.name, suggestions.names) ?? "";
	const selectedBrand =
		findSuggestionMatch(form.brand, suggestions.brands) ?? "";
	const selectedModel =
		findSuggestionMatch(form.model, suggestions.models) ?? "";
	const selectedType = findSuggestionMatch(form.type, suggestions.types) ?? "";
	const selectedGrindRange =
		findSuggestionMatch(form.grindRange, suggestions.grindRanges) ?? "";
	const selectedCapacity =
		findSuggestionMatch(form.capacity, suggestions.capacities) ?? "";

	const progress = ((step + 1) / STEPS.length) * 100;
	const canGoNext =
		step === 0 ? form.name.trim().length > 0 : step < STEPS.length - 1;

	const setField =
		(field: keyof MachineForm) => (event: ChangeEvent<HTMLInputElement>) => {
			setForm((current) => ({ ...current, [field]: event.target.value }));
		};

	function setSingleFromToggle(
		field: SingleSuggestionField,
		suggestionsForField: Array<string>,
		value: string,
	) {
		setForm((current) => {
			if (value) return { ...current, [field]: value };
			const currentMatch = findSuggestionMatch(
				current[field],
				suggestionsForField,
			);
			if (!currentMatch) return current;
			return { ...current, [field]: "" };
		});
	}

	async function saveMachine(event: ChangeEvent<HTMLFormElement>) {
		event.preventDefault();
		if (step !== 3) return;

		setIsSaving(true);
		setStatus("");
		try {
			await addMachine({
				name: normalizeOptional(form.name),
				brand: normalizeOptional(form.brand),
				model: normalizeOptional(form.model),
				type: normalizeOptional(form.type),
				grindRange: normalizeOptional(form.grindRange),
				capacity: normalizeOptional(form.capacity),
				purchaseDate: normalizeOptional(form.purchaseDate),
				induction: form.induction === "" ? undefined : form.induction === "yes",
			});
			setForm(INITIAL_FORM);
			setStep(0);
			const msg =
				SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)];
			setStatus(msg);
		} catch {
			setStatus("Save failed.");
		} finally {
			setIsSaving(false);
		}
	}

	function goBack() {
		if (step > 0) setStep((current) => current - 1);
	}

	function goNext(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault();
		if (step < STEPS.length - 1 && canGoNext) setStep((current) => current + 1);
	}

	return (
		<section className="mx-auto flex h-full w-full max-w-4xl flex-col rounded-2xl border border-border bg-card">
			<div className="border-b border-border/70 p-5 md:p-6">
				<div className="flex flex-col gap-3">
					<h1 className="text-2xl font-semibold md:text-3xl">Machines</h1>
					{progress} %
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
						{STEPS.map((item, index) => (
							<div key={item.title} className="relative">
								<StepPill
									key={item.title}
									index={index}
									active={index === step}
									title={item.title}
								/>
								{index < step ? (
									<span className="text-primary-foreground absolute right-2 top-1/2 -translate-y-1/2 bg-primary/80 rounded-full px-1 py-px">
										<Check className="w-4 h-4" />
									</span>
								) : (
									<span className="text-primary absolute right-2 top-1/2 -translate-y-1/2 bg-primary/15 rounded-full px-1 py-px">
										<CircleSmall className="w-4 h-4" />
									</span>
								)}
							</div>
						))}
					</div>
				</div>
			</div>

			<form className="flex min-h-0 flex-1 flex-col" onSubmit={saveMachine}>
				<div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
					<div className="space-y-1">
						<p className="text-lg font-semibold">{STEPS[step].title}</p>
						<p className="text-sm text-muted-foreground">
							{STEPS[step].description}
						</p>
					</div>

					{step === 0 && (
						<div className="space-y-5">
							<div className="space-y-2">
								<FieldLabel title="Machine name" hint="Required" />
								{suggestions.names.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedName}
											onValueChange={(value) =>
												setSingleFromToggle("name", suggestions.names, value)
											}
										>
											{suggestions.names.map((name) => (
												<ToggleGroupItem
													key={name}
													value={name}
													color="blueColored"
													className="px-4"
												>
													{name}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-12 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Ex: Daily Driver"
									value={form.name}
									onChange={setField("name")}
									required
								/>
							</div>

							<div className="space-y-2">
								<FieldLabel title="Brand" hint="Single select available" />
								{suggestions.brands.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedBrand}
											onValueChange={(value) =>
												setSingleFromToggle("brand", suggestions.brands, value)
											}
										>
											{suggestions.brands.map((brand) => (
												<ToggleGroupItem
													key={brand}
													value={brand}
													color="yellowColored"
													className="px-4"
												>
													{brand}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Brand"
									value={form.brand}
									onChange={setField("brand")}
								/>
							</div>

							<div className="space-y-2">
								<FieldLabel title="Model" hint="Single select available" />
								{suggestions.models.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedModel}
											onValueChange={(value) =>
												setSingleFromToggle("model", suggestions.models, value)
											}
										>
											{suggestions.models.map((model) => (
												<ToggleGroupItem
													key={model}
													value={model}
													color="greenColored"
													className="px-4"
												>
													{model}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Model"
									value={form.model}
									onChange={setField("model")}
								/>
							</div>
						</div>
					)}

					{step === 1 && (
						<div className="space-y-5">
							<div className="space-y-2">
								<FieldLabel title="Type" hint="Single select available" />
								{suggestions.types.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedType}
											onValueChange={(value) =>
												setSingleFromToggle("type", suggestions.types, value)
											}
										>
											{suggestions.types.map((type) => (
												<ToggleGroupItem
													key={type}
													value={type}
													color="blueColored"
													className="px-4"
												>
													{type}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Ex: Espresso, Filter, Grinder"
									value={form.type}
									onChange={setField("type")}
								/>
							</div>

							<div className="space-y-2">
								<FieldLabel
									title="Grind range"
									hint="Single select available"
								/>
								{suggestions.grindRanges.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedGrindRange}
											onValueChange={(value) =>
												setSingleFromToggle(
													"grindRange",
													suggestions.grindRanges,
													value,
												)
											}
										>
											{suggestions.grindRanges.map((range) => (
												<ToggleGroupItem
													key={range}
													value={range}
													color="purpleColored"
													className="px-4"
												>
													{range}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Ex: 1-40 clicks"
									value={form.grindRange}
									onChange={setField("grindRange")}
								/>
							</div>

							<div className="space-y-2">
								<FieldLabel title="Capacity" hint="Single select available" />
								{suggestions.capacities.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedCapacity}
											onValueChange={(value) =>
												setSingleFromToggle(
													"capacity",
													suggestions.capacities,
													value,
												)
											}
										>
											{suggestions.capacities.map((capacity) => (
												<ToggleGroupItem
													key={capacity}
													value={capacity}
													color="redColored"
													className="px-4"
												>
													{capacity}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Ex: 2 cups / 300ml"
									value={form.capacity}
									onChange={setField("capacity")}
								/>
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-5">
							<div className="space-y-2">
								<FieldLabel title="Purchase date" />
								<input
									type="date"
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									value={form.purchaseDate}
									onChange={setField("purchaseDate")}
								/>
							</div>

							<div className="space-y-2">
								<FieldLabel title="Induction compatible" />
								<ToggleGroup
									type="single"
									size="lg"
									spacing={2}
									className="w-full flex-wrap justify-center"
									value={form.induction}
									onValueChange={(value) =>
										setForm((current) => ({
											...current,
											induction: value as MachineForm["induction"],
										}))
									}
								>
									<ToggleGroupItem
										value="yes"
										color="greenColored"
										className="px-6"
									>
										Yes
									</ToggleGroupItem>
									<ToggleGroupItem
										value="no"
										color="redColored"
										className="px-6"
									>
										No
									</ToggleGroupItem>
								</ToggleGroup>
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<SummaryRow label="Name" value={form.name} />
								<SummaryRow label="Brand" value={form.brand} />
								<SummaryRow label="Model" value={form.model} />
								<SummaryRow label="Type" value={form.type} />
								<SummaryRow label="Grind range" value={form.grindRange} />
								<SummaryRow label="Capacity" value={form.capacity} />
								<SummaryRow label="Purchase date" value={form.purchaseDate} />
								<SummaryRow
									label="Induction"
									value={
										form.induction === ""
											? "-"
											: form.induction === "yes"
												? "Yes"
												: "No"
									}
								/>
							</div>
							{status && (
								<p
									key={status}
									className="text-sm text-muted-foreground animate-fade-slide-up"
								>
									{status}
								</p>
							)}
						</div>
					)}
				</div>

				<div className="sticky bottom-0 border-t border-border/70 bg-card/95 p-4 backdrop-blur md:p-5">
					<div className="mx-auto flex w-full max-w-4xl gap-3">
						<Button
							type="button"
							size="lg"
							variant="outline"
							onClick={goBack}
							disabled={step === 0 || isSaving}
							className="min-h-12 flex-1"
						>
							Back
						</Button>
						{step < 3 ? (
							<Button
								type="button"
								size="lg"
								onClick={goNext}
								disabled={!canGoNext || isSaving}
								className="min-h-12 flex-2"
							>
								Next
							</Button>
						) : (
							<Button
								type="submit"
								size="lg"
								disabled={isSaving}
								className="min-h-12 flex-2"
							>
								{isSaving ? "Saving..." : "Save machine"}
							</Button>
						)}
					</div>
				</div>
			</form>
		</section>
	);
}
