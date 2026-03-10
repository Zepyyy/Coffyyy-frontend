import { useLiveQuery } from "dexie-react-hooks";
import { CircleSmall } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addMachine } from "@/db/crud/add";
import { db } from "@/db/db";
import { buildMachineSuggestions } from "@/lib/machineSuggestions";

type MachineForm = {
	name: string;
	brand: string;
	type: string;
	model: string;
	purchaseDate: string;
	induction: boolean;
	grindRange: string;
	capacity: string;
};

type SingleSuggestionField = "name" | "brand" | "type" | "model";

const INITIAL_FORM: MachineForm = {
	name: "",
	brand: "",
	type: "",
	model: "",
	purchaseDate: "",
	induction: false,
	grindRange: "",
	capacity: "",
};

const STEPS = [
	{
		title: "Basic Info",
		description: "Enter machine name, brand, type, and model.",
	},
	{
		title: "Specifications",
		description: "Enter purchase date, induction, grind range, and capacity.",
	},
	{
		title: "Review",
		description: "Check everything before saving.",
	},
];

function parseList(value: string) {
	return value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function findSuggestionMatch(value: string, suggestions: Array<string>) {
	return suggestions.find(
		(suggestion) =>
			suggestion.toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
	);
}

function selectedFromListInput(input: string, suggestions: Array<string>) {
	const suggestionByKey = new Map(
		suggestions.map((suggestion) => [
			suggestion.toLocaleLowerCase(),
			suggestion,
		]),
	);
	const selected = parseList(input).map(
		(value) => suggestionByKey.get(value.toLocaleLowerCase()) ?? value,
	);
	return selected.join(", ");
}

function StepPill({ step, current }: { step: number; current: number }) {
	return (
		<div
			className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
				step === current
					? "border-primary bg-primary text-primary-foreground"
					: "border-muted bg-muted text-muted-foreground"
			}`}
		>
			{step === current ? <CircleSmall className="h-4 w-4" /> : step}
		</div>
	);
}

function FieldLabel({ label, htmlFor }: { label: string; htmlFor: string }) {
	return (
		<label
			htmlFor={htmlFor}
			className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			{label}
		</label>
	);
}

function SummaryRow({
	label,
	value,
}: {
	label: string;
	value: string | number | boolean;
}) {
	return (
		<div className="flex justify-between py-2">
			<div className="text-muted-foreground">{label}</div>
			<div className="font-medium">{value?.toString()}</div>
		</div>
	);
}

export function MachinesDB() {
	const [form, setForm] = useState<MachineForm>(INITIAL_FORM);
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
	const [isSaving, setIsSaving] = useState(false);
	const [step, setStep] = useState(0);
	const machines = useLiveQuery(() => db.Machines.toArray());
	const suggestions = useMemo(
		() => buildMachineSuggestions(machines ?? []),
		[machines],
	);

	const selectedName = selectedFromListInput(form.name, suggestions.names);
	const selectedBrand = selectedFromListInput(form.brand, suggestions.brands);
	const selectedType = selectedFromListInput(form.type, suggestions.types);
	const selectedModel = selectedFromListInput(form.model, suggestions.models);

	const progress = (step / (STEPS.length - 1)) * 100;
	const canGoNext = step < STEPS.length - 1;

	const setField = (field: keyof MachineForm, value: string | boolean) => {
		setForm({ ...form, [field]: value });
	};

	function setSingleFromToggle(field: SingleSuggestionField, value: string) {
		const currentMatch = findSuggestionMatch(
			form[field],
			suggestions[
				field === "name"
					? "names"
					: field === "brand"
						? "brands"
						: field === "type"
							? "types"
							: "models"
			],
		);
		if (currentMatch === value) {
			setField(field, "");
			return;
		}
		setField(field, value);
	}

	async function saveMachine() {
		setIsSaving(true);
		try {
			const machine = {
				name: form.name,
				brand: form.brand,
				type: form.type,
				model: form.model,
				purchaseDate: form.purchaseDate,
				induction: form.induction,
				grindRange: form.grindRange,
				capacity: form.capacity,
			};

			await addMachine(machine);
			setStatus("success");
			setTimeout(() => {
				setStatus("idle");
				setForm(INITIAL_FORM);
				setStep(0);
			}, 2000);
		} catch (error) {
			console.error(error);
			setStatus("error");
		} finally {
			setIsSaving(false);
		}
	}

	function goBack() {
		if (step > 0) {
			setStep(step - 1);
		}
	}

	function goNext() {
		if (canGoNext) {
			setStep(step + 1);
		}
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex flex-col items-center justify-center">
				<div className="w-full max-w-md">
					<div className="flex items-center justify-between">
						<h1 className="text-2xl font-bold">Add Machine</h1>
						<div className="flex items-center gap-2">
							{STEPS.map((_, index) => (
								<StepPill key={_.title} step={index} current={step} />
							))}
						</div>
					</div>
					<div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full w-full origin-left-right bg-primary transition-all"
							style={{ transform: `scaleX(${progress / 100})` }}
						/>
					</div>
					<div className="mt-6 space-y-6">
						{step === 0 && (
							<>
								<div className="space-y-4">
									<div className="space-y-2">
										<FieldLabel htmlFor="name" label="Name" />
										<input
											id="name"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											value={form.name}
											onChange={(e) => setField("name", e.target.value)}
											placeholder="Enter machine name"
										/>
										{form.name && !selectedName && (
											<div className="mt-2 flex flex-wrap gap-2">
												{suggestions.names.map((suggestion) => (
													<button
														key={suggestion}
														type="button"
														className="rounded-md bg-muted px-2 py-1 text-xs"
														onClick={() =>
															setSingleFromToggle("name", suggestion)
														}
													>
														{suggestion}
													</button>
												))}
											</div>
										)}
									</div>
									<div className="space-y-2">
										<FieldLabel htmlFor="brand" label="Brand" />
										<input
											id="brand"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											value={form.brand}
											onChange={(e) => setField("brand", e.target.value)}
											placeholder="Enter brand"
										/>
										{form.brand && !selectedBrand && (
											<div className="mt-2 flex flex-wrap gap-2">
												{suggestions.brands.map((suggestion) => (
													<button
														key={suggestion}
														type="button"
														className="rounded-md bg-muted px-2 py-1 text-xs"
														onClick={() =>
															setSingleFromToggle("brand", suggestion)
														}
													>
														{suggestion}
													</button>
												))}
											</div>
										)}
									</div>
									<div className="space-y-2">
										<FieldLabel htmlFor="type" label="Type" />
										<input
											id="type"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											value={form.type}
											onChange={(e) => setField("type", e.target.value)}
											placeholder="Enter type"
										/>
										{form.type && !selectedType && (
											<div className="mt-2 flex flex-wrap gap-2">
												{suggestions.types.map((suggestion) => (
													<button
														key={suggestion}
														type="button"
														className="rounded-md bg-muted px-2 py-1 text-xs"
														onClick={() =>
															setSingleFromToggle("type", suggestion)
														}
													>
														{suggestion}
													</button>
												))}
											</div>
										)}
									</div>
									<div className="space-y-2">
										<FieldLabel htmlFor="model" label="Model" />
										<input
											id="model"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											value={form.model}
											onChange={(e) => setField("model", e.target.value)}
											placeholder="Enter model"
										/>
										{form.model && !selectedModel && (
											<div className="mt-2 flex flex-wrap gap-2">
												{suggestions.models.map((suggestion) => (
													<button
														key={suggestion}
														type="button"
														className="rounded-md bg-muted px-2 py-1 text-xs"
														onClick={() =>
															setSingleFromToggle("model", suggestion)
														}
													>
														{suggestion}
													</button>
												))}
											</div>
										)}
									</div>
								</div>
								<div className="flex justify-between">
									<Button
										variant="outline"
										onClick={goBack}
										disabled={step <= 0}
									>
										Back
									</Button>
									<Button onClick={goNext} disabled={!canGoNext}>
										Next
									</Button>
								</div>
							</>
						)}
						{step === 1 && (
							<>
								<div className="space-y-4">
									<div className="space-y-2">
										<FieldLabel htmlFor="purchaseDate" label="Purchase Date" />
										<input
											id="purchaseDate"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											value={form.purchaseDate}
											onChange={(e) => setField("purchaseDate", e.target.value)}
											placeholder="Enter purchase date"
										/>
									</div>
									<div className="space-y-2">
										<FieldLabel htmlFor="induction" label="Induction" />
										<ToggleGroup
											type="single"
											value={form.induction ? "true" : "false"}
											onValueChange={(value) =>
												setField("induction", value === "true")
											}
										>
											<ToggleGroupItem value="true" aria-label="Toggle true">
												Yes
											</ToggleGroupItem>
											<ToggleGroupItem value="false" aria-label="Toggle false">
												No
											</ToggleGroupItem>
										</ToggleGroup>
									</div>
									<div className="space-y-2">
										<FieldLabel htmlFor="grindRange" label="Grind Range" />
										<input
											id="grindRange"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											value={form.grindRange}
											onChange={(e) => setField("grindRange", e.target.value)}
											placeholder="Enter grind range"
										/>
									</div>
									<div className="space-y-2">
										<FieldLabel htmlFor="capacity" label="Capacity" />
										<input
											id="capacity"
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											value={form.capacity}
											onChange={(e) => setField("capacity", e.target.value)}
											placeholder="Enter capacity"
										/>
									</div>
								</div>
								<div className="flex justify-between">
									<Button
										variant="outline"
										onClick={goBack}
										disabled={step <= 0}
									>
										Back
									</Button>
									<Button onClick={goNext} disabled={!canGoNext}>
										Next
									</Button>
								</div>
							</>
						)}
						{step === 2 && (
							<>
								<div className="space-y-4">
									<h2 className="text-xl font-bold">Review</h2>
									<SummaryRow label="Name" value={form.name} />
									<SummaryRow label="Brand" value={form.brand} />
									<SummaryRow label="Type" value={form.type} />
									<SummaryRow label="Model" value={form.model} />
									<SummaryRow label="Purchase Date" value={form.purchaseDate} />
									<SummaryRow label="Induction" value={form.induction} />
									<SummaryRow label="Grind Range" value={form.grindRange} />
									<SummaryRow label="Capacity" value={form.capacity} />
								</div>
								<div className="flex justify-between">
									<Button
										variant="outline"
										onClick={goBack}
										disabled={step <= 0}
									>
										Back
									</Button>
									<Button onClick={saveMachine} disabled={isSaving}>
										{isSaving ? "Saving..." : "Save"}
									</Button>
								</div>
							</>
						)}
						{status === "success" && (
							<div className="mt-4 rounded-md bg-green-500/20 p-4 text-center text-green-500">
								Machine saved successfully!
							</div>
						)}
						{status === "error" && (
							<div className="mt-4 rounded-md bg-red-500/20 p-4 text-center text-red-500">
								Error saving machine
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
