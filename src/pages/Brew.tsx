import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { db } from "@/db/db";
import { buildBeanSuggestions } from "@/lib/beanSuggestions";

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

type SingleSuggestionField = "name" | "brand" | "dominantNote";
type MultiSuggestionField = "origin" | "variety" | "flavors" | "tastingNotes";

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

const STEPS = [
	{
		title: "Bean",
		description: "Give this brew a name so you can find it quickly later.",
	},
	{
		title: "Origin & Roast",
		description: "Pick roaster, origin, variety and roast profile.",
	},
	{
		title: "Flavor Profile",
		description: "Capture what stood out in the cup.",
	},
	{
		title: "Review",
		description: "Check everything before saving.",
	},
] as const;

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

	return parseList(input)
		.map((item) => suggestionByKey.get(item.toLocaleLowerCase()))
		.filter((item): item is string => Boolean(item));
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

export default function Brew() {
	const [form, setForm] = useState<BrewForm>(INITIAL_FORM);
	const [status, setStatus] = useState<string>("");
	const [isSaving, setIsSaving] = useState(false);
	const [step, setStep] = useState<number>(0);

	const beans = useLiveQuery(async () => db.Beans.toArray(), []);
	const suggestions = useMemo(() => buildBeanSuggestions(beans ?? []), [beans]);

	const selectedBrand =
		findSuggestionMatch(form.brand, suggestions.brands) ?? "";

	const selectedName = findSuggestionMatch(form.name, suggestions.names) ?? "";

	const selectedOrigins = selectedFromListInput(
		form.origin,
		suggestions.origins,
	);
	const selectedVarieties = selectedFromListInput(
		form.variety,
		suggestions.varieties,
	);
	const selectedDominantNote =
		findSuggestionMatch(form.dominantNote, suggestions.dominantNotes) ?? "";
	const selectedFlavors = selectedFromListInput(
		form.flavors,
		suggestions.flavors,
	);
	const selectedTastingNotes = selectedFromListInput(
		form.tastingNotes,
		suggestions.tastingNotes,
	);

	const progress = ((step + 1) / STEPS.length) * 100;
	const canGoNext =
		step === 0 ? form.name.trim().length > 0 : step < STEPS.length - 1;

	const setField =
		(field: keyof BrewForm) => (event: ChangeEvent<HTMLInputElement>) => {
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

	function setListFromToggle(
		field: MultiSuggestionField,
		suggestionsForField: Array<string>,
		values: Array<string>,
	) {
		setForm((current) => ({
			...current,
			[field]: [
				...parseList(current[field]).filter(
					(item) => !findSuggestionMatch(item, suggestionsForField),
				),
				...values,
			].join(", "),
		}));
	}

	function clearField(field: MultiSuggestionField) {
		setForm((current) => ({ ...current, [field]: "" }));
	}

	async function saveBrew(event: ChangeEvent<HTMLFormElement>) {
		event.preventDefault();
		if (step !== 3) return;

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

	function goNext() {
		if (step < STEPS.length - 1 && canGoNext) setStep((current) => current + 1);
	}

	return (
		<section className="mx-auto flex h-full w-full max-w-4xl flex-col rounded-2xl border border-border bg-card">
			<div className="border-b border-border/70 p-5 md:p-6">
				<div className="flex flex-col gap-3">
					<h1 className="text-2xl font-semibold md:text-3xl">Brew Log</h1>
					<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
					<div className="grid grid-cols-2 gap-2 md:grid-cols-4">
						{STEPS.map((item, index) => (
							<StepPill
								key={item.title}
								index={index}
								active={index === step}
								title={item.title}
							/>
						))}
					</div>
				</div>
			</div>

			<form className="flex min-h-0 flex-1 flex-col" onSubmit={saveBrew}>
				<div className="flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
					<div className="space-y-1">
						<p className="text-lg font-semibold">{STEPS[step].title}</p>
						<p className="text-sm text-muted-foreground">
							{STEPS[step].description}
						</p>
					</div>

					{step === 0 && (
						<div className="space-y-2">
							<FieldLabel title="Bean name" hint="Required" />
							<input
								className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
								placeholder="Ex: Ethiopian Natural - Morning Brew"
								value={form.name}
								onChange={setField("name")}
								required
							/>
							{suggestions.names.length > 0 && (
								<ToggleGroup
									type="single"
									size="lg"
									spacing={2}
									value={selectedName}
									onValueChange={(value) =>
										setSingleFromToggle("name", suggestions.names, value)
									}
								>
									{suggestions.names.map((name) => (
										<ToggleGroupItem
											key={name}
											value={name}
											color="purpleColored"
										>
											{name}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							)}
						</div>
					)}

					{step === 1 && (
						<div className="space-y-5">
							<div className="space-y-2">
								<FieldLabel title="Roaster" hint="Single select available" />
								<input
									className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
									placeholder="Roaster"
									value={form.brand}
									onChange={setField("brand")}
								/>
								{suggestions.brands.length > 0 && (
									<ToggleGroup
										type="single"
										size="lg"
										spacing={2}
										value={selectedBrand}
										onValueChange={(value) =>
											setSingleFromToggle("brand", suggestions.brands, value)
										}
									>
										{suggestions.brands.map((brand) => (
											<ToggleGroupItem
												key={brand}
												value={brand}
												color="redColored"
											>
												{brand}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								)}
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<FieldLabel title="Origin" hint="Multi select available" />
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => clearField("origin")}
									>
										Clear
									</Button>
								</div>
								<input
									className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
									placeholder="Origin (comma separated)"
									value={form.origin}
									onChange={setField("origin")}
								/>
								{suggestions.origins.length > 0 && (
									<ToggleGroup
										type="multiple"
										size="lg"
										spacing={2}
										value={selectedOrigins}
										onValueChange={(values) =>
											setListFromToggle("origin", suggestions.origins, values)
										}
									>
										{suggestions.origins.map((origin) => (
											<ToggleGroupItem
												key={origin}
												value={origin}
												color="yellowColored"
											>
												{origin}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								)}
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<FieldLabel title="Variety" hint="Multi select available" />
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => clearField("variety")}
									>
										Clear
									</Button>
								</div>
								<input
									className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
									placeholder="Variety (comma separated)"
									value={form.variety}
									onChange={setField("variety")}
								/>
								{suggestions.varieties.length > 0 && (
									<ToggleGroup
										type="multiple"
										size="lg"
										spacing={2}
										value={selectedVarieties}
										onValueChange={(values) =>
											setListFromToggle(
												"variety",
												suggestions.varieties,
												values,
											)
										}
									>
										{suggestions.varieties.map((variety) => (
											<ToggleGroupItem
												key={variety}
												value={variety}
												color="greenColored"
											>
												{variety}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								)}
							</div>

							<div className="space-y-2">
								<FieldLabel title="Roast level" hint="1 to 10" />
								<input
									type="number"
									min={1}
									max={10}
									className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
									placeholder="Roast level"
									value={form.roastLevel}
									onChange={setField("roastLevel")}
								/>
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-5">
							<div className="space-y-2">
								<FieldLabel
									title="Dominant note"
									hint="Single select available"
								/>
								<input
									className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
									placeholder="Dominant note"
									value={form.dominantNote}
									onChange={setField("dominantNote")}
								/>
								{suggestions.dominantNotes.length > 0 && (
									<ToggleGroup
										type="single"
										size="lg"
										spacing={2}
										value={selectedDominantNote}
										onValueChange={(value) =>
											setSingleFromToggle(
												"dominantNote",
												suggestions.dominantNotes,
												value,
											)
										}
									>
										{suggestions.dominantNotes.map((note) => (
											<ToggleGroupItem
												key={note}
												value={note}
												color="blueColored"
											>
												{note}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								)}
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<FieldLabel title="Flavors" hint="Multi select available" />
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => clearField("flavors")}
									>
										Clear
									</Button>
								</div>
								<input
									className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
									placeholder="Flavors (comma separated)"
									value={form.flavors}
									onChange={setField("flavors")}
								/>
								{suggestions.flavors.length > 0 && (
									<ToggleGroup
										type="multiple"
										size="lg"
										spacing={2}
										value={selectedFlavors}
										onValueChange={(values) =>
											setListFromToggle("flavors", suggestions.flavors, values)
										}
									>
										{suggestions.flavors.map((flavor) => (
											<ToggleGroupItem
												key={flavor}
												value={flavor}
												color="purpleColored"
											>
												{flavor}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								)}
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<FieldLabel
										title="Tasting notes"
										hint="Multi select available"
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => clearField("tastingNotes")}
									>
										Clear
									</Button>
								</div>
								<input
									className="h-12 w-full rounded-lg border border-border bg-background px-4 text-sm"
									placeholder="Tasting notes (comma separated)"
									value={form.tastingNotes}
									onChange={setField("tastingNotes")}
								/>
								{suggestions.tastingNotes.length > 0 && (
									<ToggleGroup
										type="multiple"
										size="lg"
										spacing={2}
										value={selectedTastingNotes}
										onValueChange={(values) =>
											setListFromToggle(
												"tastingNotes",
												suggestions.tastingNotes,
												values,
											)
										}
									>
										{suggestions.tastingNotes.map((note) => (
											<ToggleGroupItem
												key={note}
												value={note}
												color="blueColored"
											>
												{note}
											</ToggleGroupItem>
										))}
									</ToggleGroup>
								)}
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<SummaryRow label="Bean" value={form.name} />
								<SummaryRow label="Roaster" value={form.brand} />
								<SummaryRow label="Origin" value={form.origin} />
								<SummaryRow label="Variety" value={form.variety} />
								<SummaryRow label="Roast" value={form.roastLevel} />
								<SummaryRow label="Dominant note" value={form.dominantNote} />
								<SummaryRow label="Flavors" value={form.flavors} />
								<SummaryRow label="Tasting notes" value={form.tastingNotes} />
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
								Next step
							</Button>
						) : (
							<Button
								type="submit"
								size="lg"
								disabled={isSaving}
								className="min-h-12 flex-2"
							>
								{isSaving ? "Saving..." : "Save brew"}
							</Button>
						)}
					</div>
				</div>
			</form>
		</section>
	);
}
