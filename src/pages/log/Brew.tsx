import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useMemo, useState } from "react";
import Dial from "@/components/log/Dial";
import FieldLabel from "@/components/log/FieldLabel";
import OptionChips from "@/components/log/OptionChips";
import QuickCard from "@/components/log/QuickCard";
import SectionDescription from "@/components/log/SectionDescription";
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
	machine: undefined,
	beanWeight: 18,
	espressoWeight: 36,
	flow: "",
	extractionTime: "",
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

type Step = {
	step: number;
	title: string;
	information: string[];
	description: string;
};

const STEPS: Step[] = [
	{
		step: 1,
		title: "Settings",
		information: [
			"Bean",
			"GrindSize",
			"ExtractionTime",
			"Flow",
			"beanWeight",
			"EspressoWeight",
		],
		description:
			"Extraction time; flow; bean weight; espresso weight; what bean; grind size;",
	},
	{
		step: 2,
		title: "Feedback",
		information: ["Overall Rating", "Recommendations"],
		description:
			"Immediate feddback; Recommendations (Grind finer/Coarser; Longer/shorter extraction time; less/more ratio)",
	},
	{
		step: 3,
		title: "Notes",
		information: ["Notes"],
		description: "Any additional notes or observations.",
	},
];

const REQUIRED_FIELDS: Partial<Record<keyof BrewForm, string>> = {
	overallRating: "Give feedback.",
};

const MIN_BEAN_WEIGHT = 12;
const MIN_ESPRESSO_WEIGHT = 12;
const MAX_BEAN_WEIGHT = 24;
const MAX_ESPRESSO_WEIGHT = 48;
const DIAL_DEFAULT_BEAN_WEIGHT = 18;
const DIAL_DEFAULT_ESPRESSO_WEIGHT = 24;

function parseWeight({
	value,
	default_weight,
	min,
	max,
}: {
	value: number;
	default_weight: number;
	min: number;
	max: number;
}): number {
	if (Number.isNaN(value)) return default_weight;
	return Math.min(max, Math.max(min, value));
}
function clampWeight({
	value,
	min,
	max,
}: {
	value: number;
	min: number;
	max: number;
}) {
	return Math.min(max, Math.max(min, value));
}

export default function BrewLog() {
	const [form, setForm] = useState<BrewForm>(INITIAL);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof BrewForm, string>>
	>({});

	const beanRecords = useLiveQuery(() => db.Beans.toArray(), []);
	const machineRecords = useLiveQuery(() => db.Machines.toArray(), []);
	const [step, setStep] = useState(1);

	const suggestions = useMemo(
		() =>
			buildBrewSuggestions(
				beanRecords?.map(
					(b) =>
						({
							name: b.name ?? "",
							origin: b.origin ?? [],
							dominantNote: b.dominantNote ?? "",
							selected: false,
							process: b.process ?? [],
							roastLevel: b.roastLevel ?? 0,
						}) as BeanCardProps,
				) ?? [],
				machineRecords?.map((m) => m.name ?? "") ?? [],
			),
		[beanRecords, machineRecords],
	);

	function setField<K extends keyof BrewForm>(field: K, value: BrewForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
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
				beanWeight: form.beanWeight,
				overallRating: form.overallRating as
					| "Excellent"
					| "Good"
					| "Mid"
					| "Horrible"
					| "Burnt🔥"
					| "default",
				grindSize: form.grindSize,
				machine: form.machine,
				espressoWeight: form.espressoWeight,
				flow: form.flow,
				extractionTime: form.extractionTime,
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

	const setBeanWeight = (value: number) => {
		const next = clampWeight({
			value,
			min: MIN_BEAN_WEIGHT,
			max: MAX_BEAN_WEIGHT,
		});
		setField("beanWeight", Number(next.toFixed(1)));
	};
	const setEspressoWeight = (value: number) => {
		const next = clampWeight({
			value,
			min: MIN_ESPRESSO_WEIGHT,
			max: MAX_ESPRESSO_WEIGHT,
		});
		setField("espressoWeight", Number(next.toFixed(1)));
	};

	const beanWeightValue = parseWeight({
		value: form.beanWeight,
		default_weight: DIAL_DEFAULT_BEAN_WEIGHT,
		min: MIN_BEAN_WEIGHT,
		max: MAX_BEAN_WEIGHT,
	});
	const espressoWeightValue = parseWeight({
		value: form.espressoWeight,
		default_weight: DIAL_DEFAULT_ESPRESSO_WEIGHT,
		min: MIN_ESPRESSO_WEIGHT,
		max: MAX_ESPRESSO_WEIGHT,
	});
	const espressoRatio = form.beanWeight
		? (form.espressoWeight / form.beanWeight).toFixed(1)
		: null;

	return (
		<div className="mx-auto w-full">
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
				<section className="space-y-5 border border-border bg-background p-6">
					<form onSubmit={handleSubmit} className="space-y-10">
						{/* Bean */}
						{/* Step indicator */}
						<div className="text-sm text-muted-foreground">
							Step {step}/{STEPS.length}
							<SectionDescription>
								{STEPS[step - 1].description}
							</SectionDescription>
						</div>
						<div
							className={`transition-opacity duration-300 space-y-4 ${step === 1 ? "opacity-100" : "opacity-0"}`}
						>
							{step === 1 && (
								<section className="space-y-3">
									<SectionTitle>{STEPS[step - 1].title}</SectionTitle>
									<div className="space-y-4">
										<div className="space-y-2">
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
										<div className="grid grid-cols-1 sm:grid-cols-2 max-w-1/2 space-y-4">
											<div className="space-y-4">
												<FieldLabel required>Bean Weight</FieldLabel>
												<Dial
													value={beanWeightValue}
													onChange={setBeanWeight}
													min={MIN_BEAN_WEIGHT}
													max={MAX_BEAN_WEIGHT}
												/>
											</div>
											<div className="space-y-4">
												<FieldLabel required>Espresso Weight</FieldLabel>
												<Dial
													value={espressoWeightValue}
													onChange={setEspressoWeight}
													min={MIN_ESPRESSO_WEIGHT}
													max={MAX_ESPRESSO_WEIGHT}
												/>
											</div>
										</div>
										{espressoRatio && (
											<p className="text-sm text-muted-foreground">
												Ratio: {espressoRatio}
											</p>
										)}
										<div className="space-y-2">
											<FieldLabel required>Extraction Time</FieldLabel>
											<input
												type="number"
												className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
												step="0.01"
												placeholder="e.g. 18"
												value={form.extractionTime}
												onChange={(e) =>
													setField("extractionTime", e.target.value)
												}
											/>
										</div>
										<div className="space-y-2">
											<FieldLabel required>Grind Size</FieldLabel>
											<input
												type="number"
												className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
												step="0.01"
												placeholder="e.g. 18"
												value={form.grindSize}
												onChange={(e) => setField("grindSize", e.target.value)}
											/>
										</div>
										<div className="space-y-2">
											<FieldLabel required>Flow</FieldLabel>
											<OptionChips
												options={suggestions.flow.map((f) => f)}
												value={form.flow}
												onChange={(v) => setField("flow", v)}
											/>
										</div>
									</div>
								</section>
							)}
						</div>
						<div
							className={`transition-opacity duration-500 space-y-4 ${step === 2 ? "opacity-100" : "opacity-0"}`}
						>
							{step === 2 && (
								<section className="space-y-4">
									<SectionTitle>{STEPS[step - 1].title}</SectionTitle>
									<div className="space-y-1.5">
										<FieldLabel>Machine</FieldLabel>
										<OptionChips
											options={suggestions.machine.map((m) => m)}
											value={form.machine ?? ""}
											onChange={(v) => setField("machine", v)}
										/>
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
							)}
						</div>
						<div
							className={`transition-opacity duration-200 space-y-4 ${step === 3 ? "opacity-100" : "opacity-0"}`}
						>
							{step === 3 && (
								<>
									<div>qsdqsd</div>
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
								</>
							)}
						</div>
					</form>
					<div className="flex gap-5">
						<button
							className="flex items-center gap-1.5 border px-3 py-1.5 font-Recursive text-sm transition-colors border-border bg-primary-200/15 text-foreground hover:text-foreground hover:bg-primary-200/50 disabled:text-muted-foreground disabled:hover:bg-primary-200/15 disabled:border-border/50"
							type="button"
							disabled={step === 1}
							onClick={() => setStep(step - 1)}
						>
							Previous
						</button>
						<button
							className="flex items-center gap-1.5 border px-3 py-1.5 font-Recursive text-sm transition-colors border-border bg-primary-200/15 text-foreground hover:text-foreground hover:bg-primary-200/50 disabled:text-muted-foreground disabled:hover:bg-primary-200/15 disabled:border-border/50"
							type="button"
							disabled={step === STEPS.length}
							onClick={() => setStep(step + 1)}
						>
							Next
						</button>
					</div>
				</section>
			</div>
		</div>
	);
}
