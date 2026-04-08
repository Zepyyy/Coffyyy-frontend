import { type ChangeEvent, useState } from "react";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import Dial from "@/components/log/Dial";
import FieldLabel from "@/components/log/FieldLabel";
import OptionChips from "@/components/log/OptionChips";
import QuickMachineCard from "@/components/log/QuickMachineCard";
import SectionDescription from "@/components/log/SectionDescription";
import SectionTitle from "@/components/log/SectionTitle";
import { addBrew } from "@/db/crud/add";
import { useBrewSuggestions } from "@/hooks/api/useBrews";
import { DEFAULT_FLOW, DEFAULT_OVERALL_RATING } from "@/lib/defaults";
import { validateRequiredFields } from "@/lib/formValidation";
import { cn } from "@/lib/utils";
import type { BrewForm } from "@/types/BrewTypes";

const INITIAL: BrewForm = {
	beanId: undefined,
	machineId: undefined,
	date: new Date(),
	overallRating: "",
	grindSize: "",
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
	{
		step: 4,
		title: "Summary",
		information: [],
		description: "Summary of the brew.",
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

	const [step, setStep] = useState(1);

	const suggestions = useBrewSuggestions();

	function setField<K extends keyof BrewForm>(field: K, value: BrewForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	const overallRatingToNumber = (overallRating: BrewForm["overallRating"]) => {
		const ratingMap: Record<BrewForm["overallRating"], number> = {
			Excellent: 5,
			Good: 4,
			Mid: 3,
			Horrible: 2,
			Burnt: 1,
			"": 0,
		};
		return ratingMap[overallRating];
	};

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
				beanId: form.beanId,
				machineId: form.machineId,
				date: form.date,
				beanWeight: form.beanWeight,
				overallRating: overallRatingToNumber(form.overallRating),
				grindSize: form.grindSize,
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

	const [selectedBeanId, setSelectedBeanId] = useState<number | null>(null);
	const [selectedMachineId, setSelectedMachineId] = useState<number | null>(
		null,
	);
	return (
		<div className="mx-auto w-full">
			<div className="grid lg:grid-cols-[16rem_minmax(0,1fr)] mx-6">
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
				<section className="space-y-5 border border-border bg-background p-6 mx-12">
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
									<div className="space-y-12">
										<div className="space-y-12">
											<FieldLabel required>The bean</FieldLabel>
											<div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
												{suggestions.bean.map((beanInfo) => (
													<BeanSelectorCard
														key={beanInfo.name}
														bean={{
															id: beanInfo.id,
															name: beanInfo.name,
															origin: beanInfo.origin,
															dominantNote: beanInfo.dominantNote,
															process: beanInfo.process,
															roastLevel: beanInfo.roastLevel,
														}}
														selected={selectedBeanId === beanInfo.id}
														onClick={() => {
															setField("beanId", beanInfo.id);
															setSelectedBeanId(beanInfo.id);
														}}
													/>
												))}
											</div>
										</div>
									</div>
								</section>
							)}
						</div>
						<div
							className={`transition-opacity duration-300 space-y-4 ${step === 2 ? "opacity-100" : "opacity-0"}`}
						>
							{step === 2 && (
								<section className="space-y-4">
									<div className="flex flex-col items-center justify-center">
										<div className="flex flex-row items-center justify-around gap-x-32">
											<div className="flex flex-col items-center">
												<FieldLabel required>Bean Weight</FieldLabel>
												<Dial
													value={beanWeightValue}
													onChange={setBeanWeight}
													min={MIN_BEAN_WEIGHT}
													max={MAX_BEAN_WEIGHT}
												/>
											</div>
											{espressoRatio && (
												<div className="text-7xl w-36 text-center font-Lora font-bold px-6 py-3.5 rounded border border-primary-200/75 bg-primary-200/15 relative">
													{espressoRatio}
													<span className="absolute -bottom-5 left-2 text-xs font-Mono font-medium text-muted-foreground/70 tracking-widest uppercase select-none">
														ratio
													</span>
												</div>
											)}
											<div className="flex flex-col items-center">
												<FieldLabel required>Espresso Weight</FieldLabel>
												<Dial
													value={espressoWeightValue}
													onChange={setEspressoWeight}
													min={MIN_ESPRESSO_WEIGHT}
													max={MAX_ESPRESSO_WEIGHT}
												/>
											</div>
										</div>
									</div>
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
												options={DEFAULT_FLOW}
												value={form.flow}
												onChange={(v) => setField("flow", v)}
											/>
										</div>
									</div>
								</section>
							)}
						</div>
						<div
							className={`transition-opacity duration-500 space-y-4 ${step === 3 ? "opacity-100" : "opacity-0"}`}
						>
							{step === 3 && (
								<section className="space-y-4">
									<SectionTitle>{STEPS[step - 1].title}</SectionTitle>
									<div className="space-y-1.5">
										<FieldLabel required>Overall rating</FieldLabel>
										<OptionChips
											options={DEFAULT_OVERALL_RATING}
											value={form.overallRating}
											onChange={(v) =>
												setField(
													"overallRating",
													v as BrewForm["overallRating"],
												)
											}
											requiredField={fieldErrors.overallRating}
										/>
									</div>
									<div className="space-y-1.5">
										<FieldLabel required>Machine</FieldLabel>
										<div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
											{suggestions.machine.map((machineInfo) => (
												<QuickMachineCard
													key={machineInfo.id}
													selected={selectedMachineId === machineInfo.id}
													machine={{
														id: machineInfo.id,
														name: machineInfo.name,
														type: machineInfo.type,
													}}
													onClick={() => {
														setField("machineId", machineInfo.id);
														setSelectedMachineId(machineInfo.id);
													}}
												/>
											))}
										</div>
									</div>
								</section>
							)}
						</div>
						<div
							className={`transition-opacity duration-200 space-y-4 ${step === 4 ? "opacity-100" : "opacity-0"}`}
						>
							{step === 4 && (
								<>
									<SectionTitle>Summary</SectionTitle>
									<div className="flex justify-center">
										<div className="grid grid-cols-3 gap-4 max-w-1/2">
											{Object.entries(form).map(([key, value]) => (
												<div
													className={
														"flex bg-primary-200/15 rounded min-w-fit p-4 items-center justify-center text-2xl aspect-square hover:bg-primary-200/30 relative"
													}
													key={key}
												>
													{/* Title */}
													<span
														className={cn(
															"absolute top-2 left-5 text-xl text-primary font-bold font-Alan underline decoration-2 decoration-dotted mb-1",
															key === "espressoWeight" ? "" : "",
														)}
													>
														{key}
													</span>

													{/* Value */}
													<span
														className={cn(
															"font-mono text-foreground",
															key === "bean" ? "" : "",
															key === "" ? "" : "",
														)}
													>
														{Array.isArray(value)
															? value.join(", ")
															: value?.toLocaleString()}
													</span>
												</div>
											))}
										</div>
									</div>

									<div className="border-t border-border pt-4">
										{status && (
											<p className="text-sm text-muted-foreground">{status}</p>
										)}
										<button
											type="submit"
											disabled={!form.beanId || isSaving}
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
