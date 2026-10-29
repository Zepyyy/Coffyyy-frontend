import { X } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import Dial from "@/components/log/Dial";
import QuickBeanCard from "@/components/log/QuickBeanCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useAllBeans } from "@/hooks/api/useBeans";
import {
	type NumberRange,
	RECIPE_METHODS,
	formatRatio,
	methodConfig,
} from "@/lib/brewMethods";
import {
	type RecipeFormState,
	recipeSummaryLine,
	switchRecipeMethod,
} from "@/lib/recipeForm";
import { clampWeight, cn, parseExtractionTime } from "@/lib/utils";
import type { RecipeMethod } from "@/types/RecipeTypes";

export type RecipeFormMode = "new" | "edit" | "promote";

const COPY: Record<RecipeFormMode, { title: string; tagline: string }> = {
	new: { title: "New recipe", tagline: "A target worth repeating." },
	edit: { title: "Edit recipe", tagline: "Linked brews keep their actuals." },
	promote: {
		title: "Save as recipe",
		tagline: "Turn a good brew into a target.",
	},
};

const inputClass =
	"w-full rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60";

function StepHeading({
	index,
	title,
	hint,
}: {
	index: string;
	title: string;
	hint: string;
}) {
	return (
		<div className="flex items-baseline gap-3">
			<span className="font-data text-[10px] tracking-[0.2em] text-crema-deep">
				{index}
			</span>
			<h2 className="font-display text-2xl italic tracking-tight text-foreground/90">
				{title}
			</h2>
			<span className="hidden font-sans text-xs text-muted-foreground sm:inline">
				{hint}
			</span>
		</div>
	);
}

function MonoLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
			{children}
		</p>
	);
}

/** Wide ranges (pour-over water) nudge in whole grams, narrow ones in tenths. */
const dialStep = (range: NumberRange) =>
	range.max - range.min > 100 ? 1 : 0.1;

const clampTo = (range: NumberRange, value: number, step: number) => {
	const next = clampWeight({ value, min: range.min, max: range.max });
	return step >= 1 ? Math.round(next) : Number(next.toFixed(1));
};

/**
 * The recipe form shared by new / edit / promote. The caller resolves the
 * starting values and handles persistence; this owns the editing state.
 */
export default function RecipeForm({
	mode,
	initial,
	onSave,
	onDelete,
	sourceNote,
}: {
	mode: RecipeFormMode;
	initial: RecipeFormState;
	/** Resolves with an error message, or nothing on success. */
	onSave: (form: RecipeFormState) => Promise<string | undefined>;
	onDelete?: () => Promise<void>;
	/** Promote: where the values came from. */
	sourceNote?: string;
}) {
	const [form, setForm] = useState<RecipeFormState>(initial);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState("");
	const [confirmDelete, setConfirmDelete] = useState(false);

	const allBeans = useAllBeans();
	const config = methodConfig(form.method);
	const methodLocked = mode !== "new";
	const doseStep = dialStep(config.dose);
	const brewWeightStep = dialStep(config.brewWeight);
	const waterTemp = config.waterTemp;

	// Open bags first; a finished bean stays listed while it is the tie.
	const beans = useMemo(
		() => allBeans.filter((bean) => !bean.finished || bean.id === form.beanId),
		[allBeans, form.beanId],
	);
	const selectedBean = allBeans.find((bean) => bean.id === form.beanId);

	function setField<K extends keyof RecipeFormState>(
		field: K,
		value: RecipeFormState[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	const ratio = formatRatio(form.beanWeight, form.brewWeight);
	const timeSeconds = parseExtractionTime(form.extractionTime);
	const summary = recipeSummaryLine({
		method: form.method,
		beanWeight: form.beanWeight,
		brewWeight: form.brewWeight,
		extractionTime: form.extractionTime,
		waterTemp: form.waterTemp,
	});

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!form.name.trim() || isSaving) return;
		setError("");
		setIsSaving(true);
		try {
			const message = await onSave(form);
			if (message) setError(message);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Save failed — try again.");
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDelete() {
		if (!onDelete) return;
		try {
			await onDelete();
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Delete failed — try again.",
			);
		}
	}

	const copy = COPY[mode];

	return (
		<div className="mx-auto w-full">
			<div className="sm:mx-6 grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
				<aside className="hidden space-y-6 lg:sticky lg:top-20 lg:block lg:self-start">
					<div className="border-l-4 border-crema pl-5">
						<h1 className="font-display text-4xl italic tracking-tight text-foreground/90">
							{copy.title}
						</h1>
						<p className="mt-1 font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">
							{copy.tagline}
						</p>
					</div>

					{/* Live card: the recipe as it will read in the library */}
					<div className="space-y-2 rounded-xl border border-line bg-paper-raised p-4 shadow-card">
						<p className="font-data text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
							{config.label}
							{selectedBean ? ` · ${selectedBean.name}` : " · any bean"}
						</p>
						<p className="font-display text-xl font-semibold leading-tight tracking-tight text-foreground">
							{form.name.trim() || "Unnamed recipe"}
						</p>
						<p className="font-data text-xs text-foreground/85">
							grind {form.grindSize} · {summary}
						</p>
					</div>

					{sourceNote && (
						<p className="font-sans text-xs text-muted-foreground">
							{sourceNote}
						</p>
					)}
					{error && (
						<p className="font-sans text-xs text-destructive">{error}</p>
					)}
				</aside>

				<section className="mb-8 rounded-xl border border-line bg-paper-raised p-4 shadow-card sm:p-6 lg:p-8">
					{/* Mobile: the aside is hidden, so the title travels with the form */}
					<div className="mb-8 border-l-4 border-crema pl-5 lg:hidden">
						<h1 className="font-display text-3xl italic tracking-tight text-foreground/90">
							{copy.title}
						</h1>
						{sourceNote && (
							<p className="mt-1 font-sans text-xs text-muted-foreground">
								{sourceNote}
							</p>
						)}
					</div>

					<form onSubmit={handleSubmit} className="space-y-12">
						{/* 01 — Identity */}
						<section className="space-y-6">
							<StepHeading
								index="01"
								title="The recipe"
								hint="Name it so you'll recognise it at 7am."
							/>
							<div className="space-y-1.5">
								<label
									htmlFor="recipe-name"
									className="font-sans text-sm text-foreground"
								>
									Name
								</label>
								<input
									id="recipe-name"
									className={inputClass}
									placeholder="e.g. Ethiopia bright, Morning V60"
									value={form.name}
									onChange={(e) => setField("name", e.target.value)}
									required
								/>
							</div>
							<div className="space-y-2">
								<MonoLabel>Method</MonoLabel>
								{methodLocked ? (
									<p className="font-sans text-sm text-foreground">
										{config.label}
										<span className="ml-2 font-sans text-xs text-muted-foreground">
											{mode === "edit"
												? "A recipe's method is fixed once saved."
												: "Taken from the brew."}
										</span>
									</p>
								) : (
									<SegmentedControl
										ariaLabel="Recipe method"
										options={RECIPE_METHODS.map((method) => ({
											value: method,
											label: methodConfig(method).label,
										}))}
										value={form.method}
										onChange={(method: RecipeMethod) =>
											setForm((f) => switchRecipeMethod(f, method))
										}
									/>
								)}
							</div>
						</section>

						{/* 02 — Bean tie */}
						<section className="space-y-4">
							<StepHeading
								index="02"
								title="The bean"
								hint="Optional. Leave it open to use with any bag."
							/>
							{selectedBean && (
								<button
									type="button"
									onClick={() => setField("beanId", undefined)}
									className="inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
								>
									<X className="size-3" />
									Remove the tie to {selectedBean.name}
								</button>
							)}
							{beans.length === 0 ? (
								<p className="font-sans text-sm text-muted-foreground">
									No beans yet — this recipe works with any bag.
								</p>
							) : (
								<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
									{beans.map((bean) => (
										<QuickBeanCard
											key={bean.id}
											bean={{
												id: bean.id,
												name: bean.name,
												origin: bean.origin ?? [],
												dominantNote: bean.dominantNote,
											}}
											selected={form.beanId === bean.id}
											onClick={() =>
												setField(
													"beanId",
													form.beanId === bean.id ? undefined : bean.id,
												)
											}
										/>
									))}
								</div>
							)}
						</section>

						{/* 03 — Targets */}
						<section className="space-y-6">
							<StepHeading
								index="03"
								title="The targets"
								hint="What a good brew of this looks like."
							/>

							<div className="space-y-2">
								<MonoLabel>Grind size</MonoLabel>
								<div className="flex flex-wrap gap-1.5">
									{config.grind.presets.map((lvl) => (
										<button
											key={lvl}
											type="button"
											onClick={() =>
												setField(
													"grindSize",
													form.grindSize === lvl ? config.grind.default : lvl,
												)
											}
											className={cn(
												"opt-key min-w-10 flex-1 py-2.5 font-data text-xs font-semibold transition-colors",
												form.grindSize === lvl
													? "bg-primary/10 text-primary-800 dark:text-primary-200"
													: "text-muted-foreground hover:text-foreground",
											)}
											data-active={form.grindSize === lvl}
										>
											{lvl}
										</button>
									))}
									<input
										type="number"
										step="0.01"
										className="h-10 w-24 shrink-0 rounded-lg border border-line-strong bg-paper-raised px-3 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60"
										placeholder="Other"
										value={
											config.grind.presets.includes(form.grindSize)
												? ""
												: form.grindSize
										}
										onChange={(e) =>
											setField("grindSize", Number(e.target.value))
										}
										aria-label="Custom grind size"
									/>
								</div>
							</div>

							<div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-start lg:gap-14">
								<div className="flex flex-col items-center">
									<p className="font-sans text-sm text-foreground">Dose</p>
									<Dial
										value={form.beanWeight}
										onChange={(v) =>
											setField("beanWeight", clampTo(config.dose, v, doseStep))
										}
										min={config.dose.min}
										max={config.dose.max}
										step={doseStep}
										label="Dose dial"
									/>
								</div>
								{ratio && (
									<div
										className="flex select-none flex-col items-center gap-2"
										aria-live="polite"
									>
										<span className="font-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
											ratio
										</span>
										<span className="font-display text-5xl font-bold leading-none text-primary-700/90 dark:text-primary-200/90">
											{ratio}
										</span>
										<div className="squiggly-line w-[100px] opacity-60" />
									</div>
								)}
								<div className="flex flex-col items-center">
									<p className="font-sans text-sm text-foreground">
										{config.brewWeight.label}
									</p>
									<Dial
										value={form.brewWeight}
										onChange={(v) =>
											setField(
												"brewWeight",
												clampTo(config.brewWeight, v, brewWeightStep),
											)
										}
										min={config.brewWeight.min}
										max={config.brewWeight.max}
										step={brewWeightStep}
										label={`${config.brewWeight.label} dial`}
									/>
								</div>
							</div>

							{config.ratioPresets.length > 0 && (
								<div className="space-y-2">
									<MonoLabel>Ratio presets</MonoLabel>
									<div className="flex flex-wrap gap-1.5">
										{config.ratioPresets.map((x) => {
											const target = clampTo(
												config.brewWeight,
												form.beanWeight * x,
												brewWeightStep,
											);
											const active = target === form.brewWeight;
											return (
												<button
													key={x}
													type="button"
													onClick={() => setField("brewWeight", target)}
													className={cn(
														"opt-frame border px-3 py-1.5 font-data text-xs transition-colors",
														active
															? "border-primary bg-primary/10 text-primary-800 dark:text-primary-200"
															: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
													)}
													data-active={active}
												>
													1:{x}
												</button>
											);
										})}
									</div>
								</div>
							)}

							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<MonoLabel>{config.time.label}</MonoLabel>
									<div className="flex flex-wrap items-center gap-1.5">
										{config.time.presets.map((t) => (
											<button
												key={t}
												type="button"
												onClick={() =>
													setField(
														"extractionTime",
														timeSeconds === t ? "" : String(t),
													)
												}
												className={cn(
													"opt-frame border px-3 py-1.5 font-data text-xs transition-colors",
													timeSeconds === t
														? "border-primary bg-primary/10 text-primary-800 dark:text-primary-200"
														: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
												)}
												data-active={timeSeconds === t}
											>
												{t}s
											</button>
										))}
										<input
											type="text"
											inputMode="decimal"
											className="w-24 rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60"
											placeholder={`e.g. ${config.time.presets[0] ?? ""}`}
											value={form.extractionTime}
											onChange={(e) =>
												setField("extractionTime", e.target.value)
											}
											aria-label={`${config.time.label} in seconds`}
										/>
									</div>
									<p className="font-sans text-xs text-muted-foreground">
										Optional. Seconds, or 3:00.
									</p>
								</div>

								{waterTemp && (
									<div className="space-y-2">
										<MonoLabel>Water temperature</MonoLabel>
										<Dial
											value={form.waterTemp}
											onChange={(v) =>
												setField("waterTemp", clampTo(waterTemp, v, 1))
											}
											min={waterTemp.min}
											max={waterTemp.max}
											step={1}
											decimals={0}
											helpers={false}
											label="Water temperature dial"
										/>
										<p className="text-center font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
											{waterTemp.min}–{waterTemp.max}°C
										</p>
									</div>
								)}
							</div>
						</section>

						{/* 04 — Notes */}
						<section className="space-y-4">
							<StepHeading
								index="04"
								title="Notes"
								hint={
									form.method === "pour-over"
										? "Bloom, pours, swirl — whatever you repeat."
										: "Prep, puck, anything worth repeating."
								}
							/>
							<textarea
								className={cn(inputClass, "min-h-24 resize-y")}
								placeholder="Optional"
								value={form.notes}
								onChange={(e) => setField("notes", e.target.value)}
								aria-label="Notes"
							/>
						</section>

						{error && (
							<p className="font-sans text-xs text-destructive lg:hidden">
								{error}
							</p>
						)}

						<div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
							{onDelete ? (
								confirmDelete ? (
									<div className="flex items-center gap-2">
										<span className="text-xs text-ink-soft">
											Sure? Linked brews stay, unlinked.
										</span>
										<button
											type="button"
											onClick={() => setConfirmDelete(false)}
											className="rounded-lg bg-paper-sunken px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:text-foreground"
										>
											Cancel
										</button>
										<button
											type="button"
											onClick={() => void handleDelete()}
											className="rounded-lg bg-destructive px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
										>
											Delete
										</button>
									</div>
								) : (
									<button
										type="button"
										onClick={() => setConfirmDelete(true)}
										className="rounded-lg px-3 py-1 text-xs text-ink-faint transition-colors hover:text-destructive"
									>
										Delete recipe
									</button>
								)
							) : (
								<p className="hidden font-sans text-xs text-muted-foreground sm:block">
									{form.name.trim()
										? "Ready when you are."
										: "Give it a name to save."}
								</p>
							)}
							<button
								type="submit"
								disabled={!form.name.trim() || isSaving}
								className="key-frame key-frame-light hover-line h-12 flex-1 rounded-xl bg-ink px-8 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-paper shadow-card transition-colors hover:bg-ink/85 disabled:opacity-40 sm:flex-none"
							>
								{isSaving ? "Saving…" : "Save the recipe"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
