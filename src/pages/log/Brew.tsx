import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useState } from "react";
import { Link } from "react-router";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import Dial from "@/components/log/Dial";
import FieldLabel from "@/components/log/FieldLabel";
import OptionChips from "@/components/log/OptionChips";
import QuickMachineCard from "@/components/log/QuickMachineCard";
import SectionTitle from "@/components/log/SectionTitle";
import { addBrew } from "@/db/crud/add";
import { useBrewSuggestions } from "@/hooks/api/useBrews";
import { getLastUsedBrew } from "@/lib/api/brews";
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
import { BREW_METHODS, type BrewForm, HEAT_LEVELS } from "@/types/BrewTypes";

const INITIAL: BrewForm = {
	beanId: undefined,
	brewerId: undefined,
	machineId: undefined,
	method: undefined,
	date: new Date(),
	grindSize: undefined,
	beanWeight: undefined,
	espressoWeight: undefined,
	yieldWeight: undefined,
	waterAmount: undefined,
	heatLevel: undefined,
	brewTime: "",
	flow: "",
	extractionTime: "",
};

const GRIND_SIZES = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function SummaryRow({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="flex items-center justify-between px-4 py-2.5">
			<span className="font-Mono text-xs uppercase tracking-widest text-muted-foreground">
				{label}
			</span>
			<span className="font-Recursive text-sm text-foreground">{value}</span>
		</div>
	);
}

export default function BrewLog() {
	const [form, setForm] = useState<BrewForm>(INITIAL);
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");

	const [step, setStep] = useState(1);

	const suggestions = useBrewSuggestions();
	const lastUsed = useLiveQuery(
		() => getLastUsedBrew(form.beanId, form.method, form.brewerId),
		[form.beanId, form.method, form.brewerId],
	);

	function setField<K extends keyof BrewForm>(field: K, value: BrewForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function selectMethod(method: BrewForm["method"]) {
		setForm((current) => ({
			...current,
			method,
			// A method change must never carry fields from the previous method
			// into the new record. Shared fields remain available to both methods.
			...(method === "Moka Pot"
				? { extractionTime: "", flow: "" }
				: { waterAmount: undefined, heatLevel: undefined, brewTime: "" }),
		}));
	}

	async function handleSubmit(e: ChangeEvent) {
		e.preventDefault();
		setError("");
		setStatus("");
		if (!form.beanId || !form.method) {
			setError("Select a bean and brew method before saving.");
			return;
		}
		if (
			form.method === "Moka Pot" &&
			form.brewTime &&
			!/^\d+:([0-5]\d)$/.test(form.brewTime)
		) {
			setError("Total brew time must use minutes and seconds (mm:ss).");
			return;
		}

		setIsSaving(true);
		try {
			const result = await addBrew({
				beanId: form.beanId,
				brewerId: form.brewerId,
				method: form.method,
				date: form.date,
				beanWeight: form.beanWeight,
				grindSize: form.grindSize,
				espressoWeight: form.espressoWeight,
				yieldWeight: form.method === "Moka Pot" ? form.yieldWeight : undefined,
				flow: form.flow,
				extractionTime: form.extractionTime,
				waterAmount: form.method === "Moka Pot" ? form.waterAmount : undefined,
				heatLevel: form.method === "Moka Pot" ? form.heatLevel : undefined,
				brewTime: form.method === "Moka Pot" ? form.brewTime : undefined,
			});
			if (result instanceof Error) {
				setError(result.message);
				return;
			}
			setForm(INITIAL);
			setSelectedBeanId(null);
			setSelectedMachineId(null);
			setStatus("Brew saved.");
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
		value: form.beanWeight ?? Number.NaN,
		default_weight: DIAL_DEFAULT_BEAN_WEIGHT,
		min: MIN_BEAN_WEIGHT,
		max: MAX_BEAN_WEIGHT,
	});
	const espressoWeightValue = parseWeight({
		value: form.espressoWeight ?? Number.NaN,
		default_weight: DIAL_DEFAULT_ESPRESSO_WEIGHT,
		min: MIN_ESPRESSO_WEIGHT,
		max: MAX_ESPRESSO_WEIGHT,
	});
	const espressoRatio =
		form.beanWeight && form.espressoWeight
			? (form.espressoWeight / form.beanWeight).toFixed(1)
			: null;

	const [selectedBeanId, setSelectedBeanId] = useState<number | null>(null);
	const [selectedMachineId, setSelectedMachineId] = useState<number | null>(
		null,
	);

	const [show, setShow] = useState(false);
	const isEmpty = suggestions.bean.length === 0;

	const selectedBean = suggestions.bean.find((b) => b.id === form.beanId);
	const selectedMachine = suggestions.brewer.find(
		(m) => m.id === form.brewerId,
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
								Log parameters, rate later.
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
												{Array.isArray(value)
													? value.join(", ")
													: value?.toLocaleString()}
											</span>
										</p>
									</div>
								))}
							</div>
						)}
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
											{isEmpty && (
												<div className="border border-dashed border-border p-12 text-center space-y-3 w-full">
													<p className="font-News text-2xl text-foreground/60">
														No beans
													</p>
													<p className="font-Recursive text-sm text-muted-foreground">
														Add your first bean to get started.
													</p>
													<Link
														to="/log/bean"
														className="inline-block mt-2 border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm text-foreground hover:bg-primary-200/25 transition-colors"
													>
														Log a Bean
													</Link>
												</div>
											)}
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
										<FieldLabel required>Brew method</FieldLabel>
										<div className="flex flex-wrap gap-2">
											{BREW_METHODS.map((method) => (
												<button
													key={method}
													type="button"
													onClick={() => selectMethod(method)}
													className={cn(
														"border px-4 py-2 font-Recursive text-sm",
														form.method === method
															? "border-primary bg-primary/10"
															: "border-border text-muted-foreground",
													)}
												>
													{method}
												</button>
											))}
										</div>
										{lastUsed && (
											<button
												type="button"
												className="text-xs text-muted-foreground underline"
												onClick={() => {
													setField(
														"grindSize",
														lastUsed.grindSize ?? form.grindSize,
													);
													setField(
														"beanWeight",
														lastUsed.beanWeight ?? form.beanWeight,
													);
													setField(
														form.method === "Moka Pot"
															? "yieldWeight"
															: "espressoWeight",
														form.method === "Moka Pot"
															? (lastUsed.yieldWeight ??
																	lastUsed.espressoWeight ??
																	form.yieldWeight)
															: (lastUsed.espressoWeight ??
																	form.espressoWeight),
													);
													setField("waterAmount", lastUsed.waterAmount);
													setField("heatLevel", lastUsed.heatLevel);
													setField("brewTime", lastUsed.brewTime ?? "");
													setField(
														"extractionTime",
														lastUsed.extractionTime ?? "",
													);
													setField("flow", lastUsed.flow ?? "");
												}}
											>
												Last used: apply previous setup
											</button>
										)}
									</div>
									{form.method && (
										<>
											<div className="space-y-2">
												<FieldLabel>Grind size</FieldLabel>
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
													{form.grindSize != null && (
														<button
															type="button"
															className="w-fit border border-border px-3 py-1.5 font-Recursive text-sm text-muted-foreground"
															onClick={() => setField("grindSize", undefined)}
														>
															No grind size
														</button>
													)}

													{show && (
														<input
															type="number"
															className="flex-1 w-fit border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none appearance-none"
															step="0.01"
															placeholder="e.g. 18"
															value={form.grindSize ?? ""}
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
																		form.grindSize === lvl ? undefined : lvl,
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
											{form.method !== "Moka Pot" && (
												<>
													<div className="flex flex-row items-center justify-start mx-auto gap-15">
														<div className="flex flex-col items-center">
															<FieldLabel>Coffee dose (g)</FieldLabel>
															<Dial
																value={beanWeightValue}
																onChange={setBeanWeight}
																min={MIN_BEAN_WEIGHT}
																max={MAX_BEAN_WEIGHT}
															/>
														</div>

														<div className="flex flex-col items-center">
															<FieldLabel>Espresso yield (g)</FieldLabel>
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
												</>
											)}
											{form.method === "Moka Pot" && (
												<div className="grid gap-4 sm:grid-cols-2">
													<div>
														<FieldLabel>Coffee dose (g)</FieldLabel>
														<input
															type="number"
															min="0"
															className="w-full border border-border bg-background px-3 py-1.5"
															value={form.beanWeight ?? ""}
															onChange={(e) =>
																setField(
																	"beanWeight",
																	e.target.value === ""
																		? undefined
																		: Number(e.target.value),
																)
															}
														/>
													</div>
													<div>
														<FieldLabel>Yield (g)</FieldLabel>
														<input
															type="number"
															min="0"
															className="w-full border border-border bg-background px-3 py-1.5"
															value={form.yieldWeight ?? ""}
															onChange={(e) =>
																setField(
																	"yieldWeight",
																	e.target.value === ""
																		? undefined
																		: Number(e.target.value),
																)
															}
														/>
													</div>
													<div>
														<FieldLabel>Water amount (ml)</FieldLabel>
														<input
															type="number"
															min="0"
															className="w-full border border-border bg-background px-3 py-1.5"
															value={form.waterAmount ?? ""}
															onChange={(e) =>
																setField(
																	"waterAmount",
																	e.target.value === ""
																		? undefined
																		: Number(e.target.value),
																)
															}
														/>
													</div>
													<div>
														<FieldLabel>Total brew time (mm:ss)</FieldLabel>
														<input
															className="w-full border border-border bg-background px-3 py-1.5"
															placeholder="e.g. 04:30"
															value={form.brewTime}
															onChange={(e) =>
																setField("brewTime", e.target.value)
															}
														/>
													</div>
													<div>
														<FieldLabel>Heat level</FieldLabel>
														<OptionChips
															options={[...HEAT_LEVELS]}
															value={form.heatLevel ?? ""}
															onChange={(v) =>
																setField(
																	"heatLevel",
																	v as typeof form.heatLevel,
																)
															}
														/>
													</div>
												</div>
											)}
											{form.method !== "Moka Pot" && (
												<div className="space-y-2">
													<FieldLabel>Extraction time (mm:ss)</FieldLabel>
													<input
														type="text"
														className="flex-1 w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
														step="0.01"
														placeholder="e.g. 28"
														value={form.extractionTime}
														onChange={(e) =>
															setField("extractionTime", e.target.value)
														}
													/>

													<div className="space-y-2">
														<FieldLabel>Flow</FieldLabel>
														<OptionChips
															options={DEFAULT_FLOW}
															value={form.flow}
															onChange={(v) => setField("flow", v)}
														/>
													</div>
												</div>
											)}
										</>
									)}
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
										<FieldLabel>Brewer</FieldLabel>
										<div className="flex flex-wrap gap-2">
											<button
												type="button"
												onClick={() => {
													setField("brewerId", undefined);
													setSelectedMachineId(null);
												}}
												className={cn(
													"border px-3 py-2 font-Recursive text-sm",
													form.brewerId == null
														? "border-primary bg-primary/10"
														: "border-border text-muted-foreground",
												)}
											>
												No brewer
											</button>
											{suggestions.brewer.map((machineInfo) => (
												<QuickMachineCard
													key={machineInfo.id}
													selected={selectedMachineId === machineInfo.id}
													machine={{
														id: machineInfo.id,
														name: machineInfo.name,
														type: machineInfo.type,
													}}
													onClick={() => {
														setField("brewerId", machineInfo.id);
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
								<section className="space-y-4">
									<SectionTitle>Summary</SectionTitle>
									<div className="divide-y divide-border border border-border">
										<SummaryRow
											label="Bean"
											value={selectedBean?.name ?? "—"}
										/>
										<SummaryRow
											label="Brewer"
											value={selectedMachine?.name ?? "—"}
										/>
										<SummaryRow label="Method" value={form.method ?? "—"} />
										<SummaryRow
											label="Grind size"
											value={form.grindSize ?? "—"}
										/>
										{form.method === "Moka Pot" ? (
											<>
												<SummaryRow
													label="Coffee dose"
													value={
														form.beanWeight != null
															? `${form.beanWeight} g`
															: "—"
													}
												/>
												<SummaryRow
													label="Yield"
													value={
														form.yieldWeight != null
															? `${form.yieldWeight} g`
															: "—"
													}
												/>
												<SummaryRow
													label="Water amount"
													value={
														form.waterAmount != null
															? `${form.waterAmount} ml`
															: "—"
													}
												/>
												<SummaryRow
													label="Heat level"
													value={form.heatLevel ?? "—"}
												/>
												<SummaryRow
													label="Total brew time"
													value={form.brewTime || "—"}
												/>
											</>
										) : (
											<>
												<SummaryRow
													label="Coffee dose"
													value={
														form.beanWeight != null
															? `${form.beanWeight} g`
															: "—"
													}
												/>
												<SummaryRow
													label="Espresso yield"
													value={
														form.espressoWeight != null
															? `${form.espressoWeight} g`
															: "—"
													}
												/>
												{espressoRatio && (
													<SummaryRow
														label="Ratio"
														value={`1:${espressoRatio}`}
													/>
												)}
												<SummaryRow
													label="Extraction time"
													value={form.extractionTime || "—"}
												/>
												<SummaryRow label="Flow" value={form.flow || "—"} />
											</>
										)}
									</div>

									<div className="border-t border-border pt-4 space-y-2">
										{status && (
											<p className="text-sm text-muted-foreground">{status}</p>
										)}
										<button
											type="submit"
											disabled={!form.beanId || !form.method || isSaving}
											className="w-full border border-border bg-primary-200/15 py-2.5 font-Recursive text-sm text-foreground transition-colors hover:bg-primary-200/50 disabled:text-muted-foreground disabled:hover:bg-primary-200/15 disabled:border-border/50"
										>
											{isSaving ? "Saving…" : "Save Brew"}
										</button>
									</div>
								</section>
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
