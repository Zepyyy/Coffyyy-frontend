import { useLiveQuery } from "dexie-react-hooks";
import { Check, CircleSmall } from "lucide-react";
import { type ChangeEvent, type MouseEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { addBrew } from "@/db/crud/add";
import { db } from "@/db/db";
import { buildBrewSuggestions } from "@/lib/brewSuggestions";

type BrewForm = {
	bean: string;
	date: Date;
	acidity: string;
	overallRating: string;
	grindSize: string;
	adjustementNeeded: string;
	aftertaste: string;
	bitterness: string;
	mouthfeel: string;
	strength: string;
	machine: string;
	tasteProfiles: string;
};

const INITIAL_FORM: BrewForm = {
	bean: "",
	date: new Date(),
	acidity: "",
	overallRating: "",
	grindSize: "",
	adjustementNeeded: "",
	aftertaste: "",
	bitterness: "",
	mouthfeel: "",
	strength: "",
	machine: "",
	tasteProfiles: "",
};
type SingleSuggestionField =
	| "bean"
	| "overallRating"
	| "grindSize"
	| "adjustementNeeded"
	| "aftertaste"
	| "acidity"
	| "bitterness"
	| "mouthfeel"
	| "strength"
	| "machine";

type MultiSuggestionField = "tasteProfiles";

const STEPS = [
	{
		title: "Quick infos",
		description: "Bean, overall, grind size",
	},
	{
		title: "taste Feedback",
		description: "acidity, adjustement needed, aftertaste",
	},
	{
		title: "Mouthfeel",
		description: "bitterness, strength, mouthfeel",
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
	const brews = useLiveQuery(async () => db.Brews.toArray(), []);
	const beanNames = useLiveQuery(async () => db.Beans.toArray(), []) ?? [];
	const machineNames =
		useLiveQuery(async () => db.Machines.toArray(), []) ?? [];

	const suggestions = useMemo(
		() =>
			buildBrewSuggestions(
				brews ?? [],
				beanNames.map((b) => b.name ?? ""),
				machineNames.map((m) => m.name ?? ""),
			),
		[brews, beanNames, machineNames],
	);

	const selectedBean = findSuggestionMatch(form.bean, suggestions.bean);

	const selectedOverallRating = findSuggestionMatch(
		form.overallRating,
		suggestions.overallRating,
	);

	const selectedGrindSize = findSuggestionMatch(
		form.grindSize,
		suggestions.grindSize,
	);

	const selectedAdjustementNeeded = findSuggestionMatch(
		form.adjustementNeeded,
		suggestions.adjustementNeeded,
	);

	const selectedAftertaste = findSuggestionMatch(
		form.aftertaste,
		suggestions.aftertaste,
	);
	const selectedAcidity = findSuggestionMatch(
		form.acidity,
		suggestions.acidity,
	);

	const selectedBitterness = findSuggestionMatch(
		form.bitterness,
		suggestions.bitterness,
	);

	const selectedMouthfeel = findSuggestionMatch(
		form.mouthfeel,
		suggestions.mouthfeel,
	);

	const selectedStrength = findSuggestionMatch(
		form.strength,
		suggestions.strength,
	);

	const selectedType = findSuggestionMatch(form.machine, suggestions.machine);

	const selectedTasteProfiles = selectedFromListInput(
		form.tasteProfiles,
		suggestions.tasteProfiles,
	);

	const progress = ((step + 1) / STEPS.length) * 100;
	const canGoNext =
		step === 0 ? form.bean.trim().length > 0 : step < STEPS.length - 1;

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

	async function saveBrew(event: ChangeEvent<HTMLFormElement>) {
		event.preventDefault();
		if (step !== 3) return;

		setIsSaving(true);
		setStatus("");
		try {
			await addBrew({
				bean: form.bean,
				date: form.date,
				overallRating: form.overallRating,
				grindSize: form.grindSize,
				adjustementNeeded: form.adjustementNeeded,
				acidity: form.acidity,
				aftertaste: form.aftertaste,
				bitterness: form.bitterness,
				mouthfeel: form.mouthfeel,
				strength: form.strength,
				machine: form.machine,
				tasteProfiles: parseList(form.tasteProfiles),
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
					<h1 className="text-2xl font-semibold md:text-3xl">Brew Log</h1>
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
							{suggestions.bean.length > 0 && (
								<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
									<ToggleGroup
										type="single"
										size="lg"
										spacing={2}
										className="w-full flex-wrap justify-center"
										value={selectedBean}
										onValueChange={(value) =>
											setSingleFromToggle("bean", suggestions.bean, value)
										}
									>
										{suggestions.bean.map((name) => (
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
								className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
								placeholder="Ex: Ethiopian Natural - Morning Brew"
								value={form.bean}
								onChange={setField("bean")}
								required
							/>
						</div>
					)}
					{step === 1 && (
						<div className="space-y-5">
							<div className="space-y-2">
								<FieldLabel title="Rating" hint="Single select available" />
								{suggestions.overallRating.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedOverallRating}
											defaultValue={form.overallRating}
											onValueChange={(value) =>
												setSingleFromToggle(
													"overallRating",
													suggestions.overallRating,
													value,
												)
											}
										>
											{suggestions.overallRating.map((rating) => (
												<ToggleGroupItem
													key={
														rating + suggestions.overallRating.indexOf(rating)
													}
													value={rating}
													color="redColored"
													className="px-4"
												>
													{rating}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Overall Rating"
									value={form.overallRating}
									onChange={setField("overallRating")}
								/>
							</div>

							<div className="space-y-2">
								{suggestions.grindSize.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedGrindSize}
											onValueChange={(value) =>
												setSingleFromToggle(
													"grindSize",
													suggestions.grindSize,
													value,
												)
											}
										>
											{suggestions.grindSize.map((grindSize) => (
												<ToggleGroupItem
													key={grindSize}
													value={grindSize}
													color="yellowColored"
													className="px-4"
												>
													{grindSize}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Grind Size (comma separated)"
									value={form.grindSize}
									onChange={setField("grindSize")}
								/>
							</div>

							<div className="space-y-2">
								{suggestions.adjustementNeeded.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedAdjustementNeeded}
											onValueChange={(value) =>
												setSingleFromToggle(
													"adjustementNeeded",
													suggestions.adjustementNeeded,
													value,
												)
											}
										>
											{suggestions.adjustementNeeded.map(
												(adjustementNeeded) => (
													<ToggleGroupItem
														key={adjustementNeeded}
														value={adjustementNeeded}
														color="greenColored"
														className="px-4"
													>
														{adjustementNeeded}
													</ToggleGroupItem>
												),
											)}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Adjustment Needed (comma separated)"
									value={form.adjustementNeeded}
									onChange={setField("adjustementNeeded")}
								/>
							</div>
						</div>
					)}

					{step === 2 && (
						<div className="space-y-5">
							<div className="space-y-2">
								<FieldLabel title="AfterTaste" hint="Single select available" />
								{suggestions.aftertaste.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedAftertaste}
											onValueChange={(value) =>
												setSingleFromToggle(
													"aftertaste",
													suggestions.aftertaste,
													value,
												)
											}
										>
											{suggestions.aftertaste.map((aftertaste) => (
												<ToggleGroupItem
													key={aftertaste}
													value={aftertaste}
													color="blueColored"
													className="px-4"
												>
													{aftertaste}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Aftertaste"
									value={form.aftertaste}
									onChange={setField("aftertaste")}
								/>
							</div>
							<div className="space-y-2">
								<FieldLabel title="Acidity" hint="Single select available" />
								{suggestions.acidity.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedAcidity}
											onValueChange={(value) =>
												setSingleFromToggle(
													"acidity",
													suggestions.acidity,
													value,
												)
											}
										>
											{suggestions.acidity.map((acidity) => (
												<ToggleGroupItem
													key={acidity}
													value={acidity}
													color="blueColored"
													className="px-4"
												>
													{acidity}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Acidity"
									value={form.acidity}
									onChange={setField("acidity")}
								/>
							</div>
							<div className="space-y-2">
								<FieldLabel
									title="Tasteprofiles"
									hint="Single select available"
								/>
								{suggestions.tasteProfiles.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="multiple"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedTasteProfiles}
											onValueChange={(values) =>
												setListFromToggle(
													"tasteProfiles",
													suggestions.tasteProfiles,
													values,
												)
											}
										>
											{suggestions.tasteProfiles.map((tasteProfile) => (
												<ToggleGroupItem
													key={tasteProfile}
													value={tasteProfile}
													color="blueColored"
													className="px-4"
												>
													{tasteProfile}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="TasteProfile"
									value={form.tasteProfiles}
									onChange={setField("tasteProfiles")}
								/>
							</div>
							<div className="space-y-2">
								<FieldLabel title="machine" hint="Single select available" />
								{suggestions.machine.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedType}
											onValueChange={(value) =>
												setSingleFromToggle(
													"machine",
													suggestions.machine,
													value,
												)
											}
										>
											{suggestions.machine.map((machine) => (
												<ToggleGroupItem
													key={machine}
													value={machine}
													color="blueColored"
													className="px-4"
												>
													{machine}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="machine"
									value={form.machine}
									onChange={setField("machine")}
								/>
							</div>
							<div className="space-y-2">
								<FieldLabel title="AfterTaste" hint="Single select available" />
								{suggestions.strength.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedStrength}
											onValueChange={(value) =>
												setSingleFromToggle(
													"strength",
													suggestions.strength,
													value,
												)
											}
										>
											{suggestions.strength.map((strength) => (
												<ToggleGroupItem
													key={strength}
													value={strength}
													color="blueColored"
													className="px-4"
												>
													{strength}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Strength"
									value={form.strength}
									onChange={setField("strength")}
								/>
							</div>

							<div className="space-y-2">
								{suggestions.bitterness.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedBitterness}
											onValueChange={(value) =>
												setSingleFromToggle(
													"bitterness",
													suggestions.bitterness,
													value,
												)
											}
										>
											{suggestions.bitterness.map((bitterness) => (
												<ToggleGroupItem
													key={bitterness}
													value={bitterness}
													color="purpleColored"
													className="px-4"
												>
													{bitterness}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Bitterness (comma separated)"
									value={form.bitterness}
									onChange={setField("bitterness")}
								/>
							</div>

							<div className="space-y-2">
								{suggestions.mouthfeel.length > 0 && (
									<div className="rounded-lg border border-border/70 bg-muted/40 p-4">
										<ToggleGroup
											type="single"
											size="lg"
											spacing={2}
											className="w-full flex-wrap justify-center"
											value={selectedMouthfeel}
											onValueChange={(value) =>
												setSingleFromToggle(
													"mouthfeel",
													suggestions.mouthfeel,
													value,
												)
											}
										>
											{suggestions.mouthfeel.map((feel) => (
												<ToggleGroupItem
													key={feel}
													value={feel}
													color="blueColored"
													className="px-4"
												>
													{feel}
												</ToggleGroupItem>
											))}
										</ToggleGroup>
									</div>
								)}
								<input
									className="h-11 w-full rounded-lg border border-border/70 bg-background px-4 text-sm text-muted-foreground focus:text-foreground"
									placeholder="Mouth feel (comma separated)"
									value={form.mouthfeel}
									onChange={setField("mouthfeel")}
								/>
							</div>
						</div>
					)}

					{step === 3 && (
						<div className="space-y-4">
							<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
								<SummaryRow label="Bean" value={form.bean} />
								<SummaryRow label="Grind Size" value={form.grindSize} />
								<SummaryRow label="Rating" value={form.overallRating} />
								<SummaryRow
									label="Adjustement Needed"
									value={form.adjustementNeeded}
								/>
								<SummaryRow label="Aftertaste" value={form.aftertaste} />
								<SummaryRow label="Acidity" value={form.acidity} />
								<SummaryRow label="Date" value={form.date.toDateString()} />
								<SummaryRow label="Bitterness" value={form.bitterness} />
								<SummaryRow label="Mouthfeel" value={form.mouthfeel} />
								<SummaryRow label="Machine" value={form.machine} />
								<SummaryRow label="Strength" value={form.strength} />
								<SummaryRow label="Taste Profiles" value={form.tasteProfiles} />
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
								{isSaving ? "Saving..." : "Save brew"}
							</Button>
						)}
					</div>
				</div>
			</form>
		</section>
	);
}
