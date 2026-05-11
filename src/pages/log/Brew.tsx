import { type ChangeEvent, useState } from "react";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import Dial from "@/components/log/Dial";
import FieldLabel from "@/components/log/FieldLabel";
import OptionChips from "@/components/log/OptionChips";
import QuickMachineCard from "@/components/log/QuickMachineCard";
import SectionTitle from "@/components/log/SectionTitle";
import { addBrew } from "@/db/crud/add";
import { useBrewSuggestions } from "@/hooks/api/useBrews";
import {
	DEFAULT_FLOW,
	DIAL_DEFAULT_BEAN_WEIGHT,
	DIAL_DEFAULT_ESPRESSO_WEIGHT,
	MAX_BEAN_WEIGHT,
	MAX_ESPRESSO_WEIGHT,
	MIN_BEAN_WEIGHT,
	MIN_ESPRESSO_WEIGHT,
} from "@/lib/defaults";
import { clampWeight, cn, parseWeight, STEPS } from "@/lib/utils";
import type { BrewForm } from "@/types/BrewTypes";

const INITIAL: BrewForm = {
	beanId: undefined,
	machineId: undefined,
	date: new Date(),
	grindSize: 12,
	beanWeight: 18,
	espressoWeight: 36,
	flow: "",
	extractionTime: "",
};

const GRIND_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export default function BrewLog() {
	const [form, setForm] = useState<BrewForm>(INITIAL);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	const [step, setStep] = useState(1);

	const suggestions = useBrewSuggestions();

	function setField<K extends keyof BrewForm>(field: K, value: BrewForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	async function handleSubmit(e: ChangeEvent) {
		e.preventDefault();
		setError("");
		setStatus("");

		setIsSaving(true);
		try {
			const result = await addBrew({
				beanId: form.beanId,
				machineId: form.machineId,
				date: form.date,
				beanWeight: form.beanWeight,
				grindSize: form.grindSize,
				espressoWeight: form.espressoWeight,
				flow: form.flow,
				extractionTime: form.extractionTime,
			});
			setError(result instanceof Error ? result.message : String(result));
			setForm(INITIAL);
			setStatus("Done.");
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

	const [show, setShow] = useState(false);
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
								Log parameters, rate later.
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
						{error && <p className="text-sm text-foreground py-1">{error}</p>}
					</div>
				</aside>
				<section className="space-y-5 border border-border bg-background p-6 mx-12">
					<form onSubmit={handleSubmit} className="space-y-10">
						{/* Step indicator */}
						<div className="text-sm text-muted-foreground">
							Step {step}/{STEPS.length}
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
								<section className="space-y-10">
									<div className="space-y-2">
										<FieldLabel required>Grind Size</FieldLabel>
										<div className="flex flex-col gap-4">
											<button
												type="button"
												className={
													"flex w-fit items-center gap-1.5 border px-3 py-1.5 font-Recursive text-sm transition-colors border-border bg-primary-200/15 text-foreground hover:text-foreground hover:bg-primary-200/50 disabled:text-muted-foreground disabled:hover:bg-primary-200/15 disabled:border-border/50"
												}
												onClick={() => setShow(!show)}
											>
												{show ? "Hide" : "Custom Grind Size"}
											</button>

											{show && (
												<input
													type="number"
													className="flex-1 w-fit border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none appearance-none"
													step="0.01"
													placeholder="e.g. 18"
													value={form.grindSize}
													onChange={(e) =>
														setField("grindSize", Number(e.target.value))
													}
												/>
											)}
											<div className="flex flex-wrap gap-1.5">
												{GRIND_SIZES.map((lvl) => (
													<button
														key={lvl}
														type="button"
														onClick={() =>
															setField(
																"grindSize",
																form.grindSize === lvl ? 12 : lvl,
															)
														}
														className={cn(
															"flex-1 py-2.5 font-Mono text-xs font-semibold transition-all border-b-2",
															form.grindSize === lvl
																? "border-primary text-primary-800 dark:text-primary-200 bg-primary/10"
																: "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30",
														)}
													>
														{lvl}
													</button>
												))}
											</div>
										</div>

										<div
											className="h-1 w-full"
											style={{
												background:
													"linear-gradient(to right, var(--primary-100), var(--primary))",
											}}
										/>
										<div className="w-full flex items-center justify-around gap-4 font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
											<span>Finer</span>
											<span>Fine</span>
											<span>Medium</span>
											<span>Coarse</span>
											<span>Coarser</span>
										</div>
									</div>
									<div className="flex flex-row items-center justify-start mx-auto gap-15">
										<div className="flex flex-col items-center">
											<FieldLabel required>Bean Weight</FieldLabel>
											<Dial
												value={beanWeightValue}
												onChange={setBeanWeight}
												min={MIN_BEAN_WEIGHT}
												max={MAX_BEAN_WEIGHT}
											/>
										</div>

										<div className="flex flex-col items-center">
											<FieldLabel required>Espresso Weight</FieldLabel>
											<Dial
												value={espressoWeightValue}
												onChange={setEspressoWeight}
												min={MIN_ESPRESSO_WEIGHT}
												max={MAX_ESPRESSO_WEIGHT}
											/>
										</div>
										{espressoRatio && (
											<div className="text-7xl min-w-fit text-center font-Lora font-bold text-primary-700/90 relative border border-border border-dashed px-6 py-3.5">
												1:{espressoRatio}
												<span className="absolute -bottom-5 left-2 text-xs font-Mono font-medium tracking-widest uppercase select-none">
													ratio
												</span>
											</div>
										)}
									</div>
									<div className="space-y-2">
										<FieldLabel required>Extraction Time</FieldLabel>
										<input
											type="number"
											className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
											step="0.01"
											placeholder="e.g. 28"
											value={form.extractionTime}
											onChange={(e) =>
												setField("extractionTime", e.target.value)
											}
										/>

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
													<span className="absolute top-2 left-5 text-xl text-primary font-bold font-Alan underline decoration-2 decoration-dotted mb-1">
														{key}
													</span>
													<span className="font-mono text-foreground">
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
