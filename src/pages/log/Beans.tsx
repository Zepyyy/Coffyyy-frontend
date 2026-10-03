import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import BeanLivePreview from "@/components/log/BeanLivePreview";
import MultiChips from "@/components/log/MultiChoiceChips";
import OptionChips from "@/components/log/OptionChips";
import SingleChoiceChips from "@/components/log/SingleChoiceChips";
import {
	beanBotanicValues,
	beanDesignationValues,
	beanDominantNoteValues,
} from "@/lib/api/schema.gen";
import { addBean } from "@/lib/data";
import { useBeanSuggestions } from "@/hooks/api/useBeans";
import {
	DEFAULT_BOTANICS,
	DEFAULT_DESIGNATIONS,
	DEFAULT_DOMINANT_NOTES,
} from "@/lib/defaults";
import { validateRequiredFields } from "@/lib/formValidation";
import { cn, oneOf } from "@/lib/utils";
import type { BeanForm } from "@/types/BeanTypes";

const INITIAL: BeanForm = {
	name: "",
	brand: "",
	roastLevel: "",
	process: [],
	botanic: "",
	designation: "",
	origin: [],
	variety: [],
	dominantNote: "",
	flavors: [],
};

const ROAST_LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const REQUIRED_FIELDS: Partial<Record<keyof BeanForm, string>> = {
	name: "Bean name is required.",
	flavors: "Pick at least one flavor.",
	process: "Pick at least one process.",
	origin: "Origin is required.",
};

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
			<span className="font-data text-[10px] tracking-[0.2em] text-primary/70">
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

export default function BeansLog() {
	const [form, setForm] = useState<BeanForm>(INITIAL);
	const [customOrigin, setCustomOrigin] = useState("");
	const [customVariety, setCustomVariety] = useState("");
	const [customFlavor, setCustomFlavor] = useState("");
	const [customProcess, setCustomProcess] = useState("");
	const [customBrand, setCustomBrand] = useState("");
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof BeanForm, string>>
	>({});
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [savedBeanId, setSavedBeanId] = useState<number | null>(null);
	const [moreOpen, setMoreOpen] = useState(false);

	const suggestions = useBeanSuggestions();

	function clearFieldError(field: keyof BeanForm) {
		setFieldErrors((prev) => {
			if (!prev[field]) return prev;
			const next = { ...prev };
			delete next[field];
			return next;
		});
	}

	function setField<K extends keyof BeanForm>(field: K, value: BeanForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
		clearFieldError(field);
	}

	function toggleItem(
		field: "process" | "origin" | "variety" | "flavors",
		value: string,
	) {
		setForm((f) => {
			const list = f[field] as string[];
			return {
				...f,
				[field]: list.includes(value)
					? list.filter((v) => v !== value)
					: [...list, value],
			};
		});
		clearFieldError(field);
	}

	function selectCustom(field: keyof BeanForm, value: string) {
		setField(field, value.trim());
	}

	function addCustom(
		field: "process" | "origin" | "variety" | "flavors",
		value: string,
		clearFn: () => void,
	) {
		const val = value.trim();
		if (!val) return;
		const current = form[field] as string[];
		if (!current.includes(val)) {
			setForm((f) => ({ ...f, [field]: [...(f[field] as string[]), val] }));
		}
		clearFieldError(field);
		clearFn();
	}

	const moreFilled = [
		form.roastLevel,
		form.botanic,
		form.designation,
		form.variety.length > 0 ? "x" : "",
	].filter(Boolean).length;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setStatus("");
		const nextErrors = validateRequiredFields(form, REQUIRED_FIELDS);
		if (Object.keys(nextErrors).length > 0) {
			setFieldErrors(nextErrors);
			setStatus("A couple of fields still need you.");
			return;
		}

		setIsSaving(true);
		try {
			const roast = Number(form.roastLevel);
			const result = await addBean({
				name: form.name,
				brand: form.brand,
				rating: 0,
				status: "New",
				process: form.process,
				botanic: oneOf(beanBotanicValues, form.botanic, ""),
				designation: oneOf(beanDesignationValues, form.designation, ""),
				origin: form.origin,
				variety: form.variety,
				roastLevel: Number.isFinite(roast) && roast > 0 ? roast : -1,
				dominantNote: oneOf(beanDominantNoteValues, form.dominantNote, ""),
				flavors: form.flavors,
				finished: false,
			});
			if (result instanceof Error) {
				setStatus(result.message);
			} else {
				setSavedBeanId(result);
			}
		} catch {
			setStatus("Save failed — try again.");
		} finally {
			setIsSaving(false);
		}
	}

	// Success: offer the natural next step.
	if (savedBeanId != null) {
		return (
			<div className="mx-auto w-full max-w-3xl px-4 lg:px-0">
				<div className="rise space-y-6 rounded-xl border border-line bg-paper-raised p-6 shadow-card sm:p-8">
					<div>
						<p className="font-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
							Bean saved
						</p>
						<p className="mt-1 font-display text-3xl italic tracking-tight text-foreground/90">
							{form.name} is in the library.
						</p>
						<p className="mt-2 font-sans text-sm text-muted-foreground">
							You can fill in the rest any time. The fun part is pulling the
							first shot.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Button asChild variant="ink">
							<Link to={`/log/brew?bean=${savedBeanId}`}>
								Pull the first shot
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/library">Back to library</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full">
			<div className="mx-6 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)]">
				<aside className="space-y-6 lg:sticky lg:top-20 lg:self-start lg:block hidden">
					<div className="border-l-4 border-crema pl-5">
						<h1 className="text-4xl font-display italic tracking-tight text-foreground/90">
							Add a bean
						</h1>
						<p className="mt-1 font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">
							Name, origin, process, one flavor.
						</p>
					</div>
					<BeanLivePreview form={form} />
					<p className="font-sans text-xs text-muted-foreground">
						This is the library card you're filling in. The details can wait.
					</p>
					{Object.keys(fieldErrors).length > 0 && (
						<div className="space-y-1">
							{Object.entries(fieldErrors).map(([key, value]) => (
								<p key={key} className="font-sans text-xs text-destructive">
									{value}
								</p>
							))}
						</div>
					)}
					{status && (
						<p className="font-sans text-xs text-muted-foreground">{status}</p>
					)}
				</aside>

				<section className="mb-8 rounded-xl border border-line bg-paper-raised p-6 shadow-card lg:p-8">
					<form onSubmit={handleSubmit} className="space-y-12">
						{/* 01 — Identity */}
						<section className="space-y-6">
							<StepHeading
								index="01"
								title="Identity"
								hint="What's in the bag?"
							/>
							<div className="space-y-1.5">
								<label
									htmlFor="bean-name"
									className="font-sans text-sm text-foreground"
								>
									Bean name
								</label>
								<input
									id="bean-name"
									className={cn(
										"w-full border bg-background px-3 py-2 font-sans text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 rounded-none",
										fieldErrors.name
											? "border-destructive focus:ring-destructive/40"
											: "border-border focus:ring-primary/40",
									)}
									placeholder="e.g. El Paraiso — Red Berries"
									value={form.name}
									onChange={(e) => setField("name", e.target.value)}
								/>
								{fieldErrors.name && (
									<p className="text-xs text-destructive">{fieldErrors.name}</p>
								)}
							</div>

							<div className="space-y-1.5">
								<p className="font-sans text-sm text-foreground">
									Brand / roaster
								</p>
								<SingleChoiceChips
									options={suggestions.brands}
									selected={form.brand}
									onChange={(v) => setField("brand", v)}
									placeholder="e.g. Onyx Coffee Lab"
									customInput={customBrand}
									onCustomChange={setCustomBrand}
									onCustomAdd={() => selectCustom("brand", customBrand)}
								/>
							</div>
						</section>

						{/* 02 — Origin & process */}
						<section className="space-y-6">
							<StepHeading
								index="02"
								title="Origin & process"
								hint="Where it grew, how it was handled."
							/>
							<div className="space-y-1.5">
								<p className="font-sans text-sm text-foreground">Origin</p>
								<MultiChips
									suggestions={suggestions.origins}
									selected={form.origin}
									onToggle={(v) => toggleItem("origin", v)}
									customInput={customOrigin}
									onCustomChange={setCustomOrigin}
									onCustomAdd={() =>
										addCustom("origin", customOrigin, () => setCustomOrigin(""))
									}
									placeholder="Type a country or region…"
									requiredField={fieldErrors.origin}
								/>
							</div>

							<div className="space-y-1.5">
								<p className="font-sans text-sm text-foreground">Process</p>
								<MultiChips
									suggestions={suggestions.processes}
									selected={form.process}
									onToggle={(v) => toggleItem("process", v)}
									customInput={customProcess}
									onCustomChange={setCustomProcess}
									onCustomAdd={() =>
										addCustom("process", customProcess, () =>
											setCustomProcess(""),
										)
									}
									placeholder="e.g. Honey, Washed…"
									requiredField={fieldErrors.process}
								/>
							</div>
						</section>

						{/* 03 — Flavor */}
						<section className="space-y-6">
							<StepHeading
								index="03"
								title="Flavor"
								hint="What the bag promises."
							/>
							<div className="space-y-1.5">
								<p className="font-sans text-sm text-foreground">
									Dominant note
								</p>
								<OptionChips
									options={DEFAULT_DOMINANT_NOTES}
									value={form.dominantNote}
									onChange={(v) => setField("dominantNote", v)}
									withDot
								/>
							</div>

							<div className="space-y-1.5">
								<p className="font-sans text-sm text-foreground">Flavors</p>
								<MultiChips
									suggestions={suggestions.flavors}
									selected={form.flavors}
									onToggle={(v) => toggleItem("flavors", v)}
									customInput={customFlavor}
									onCustomChange={setCustomFlavor}
									onCustomAdd={() =>
										addCustom("flavors", customFlavor, () =>
											setCustomFlavor(""),
										)
									}
									placeholder="e.g. Blueberry, Dark chocolate…"
									requiredField={fieldErrors.flavors}
								/>
							</div>
						</section>

						{/* More details — optional, collapsed */}
						<section className="border-t border-line pt-6">
							<button
								type="button"
								onClick={() => setMoreOpen((o) => !o)}
								className="flex w-full items-center justify-between gap-3 text-left"
								aria-expanded={moreOpen}
							>
								<span className="flex items-baseline gap-3">
									<span className="font-data text-[10px] tracking-[0.2em] text-primary/70">
										04
									</span>
									<span className="font-display text-2xl italic tracking-tight text-foreground/90">
										More details
									</span>
									<span className="font-sans text-xs text-muted-foreground">
										Roast, variety, botanic —{" "}
										{moreFilled > 0 ? `${moreFilled} filled` : "all optional"}
									</span>
								</span>
								<ChevronDown
									className={cn(
										"size-4 shrink-0 text-muted-foreground transition-transform",
										moreOpen && "rotate-180",
									)}
									aria-hidden
								/>
							</button>

							{moreOpen && (
								<div className="mt-8 space-y-6">
									<div className="space-y-1.5">
										<p className="font-sans text-sm text-foreground">
											Roast level
										</p>
										<div className="flex flex-wrap gap-1.5">
											{ROAST_LEVELS.map((lvl) => (
												<button
													key={lvl}
													type="button"
													onClick={() =>
														setField(
															"roastLevel",
															form.roastLevel === lvl ? "" : lvl,
														)
													}
													className={cn(
														"opt-key min-w-10 flex-1 py-2.5 font-data text-xs font-semibold transition-colors",
														form.roastLevel === lvl
															? "text-primary-800 dark:text-primary-200 bg-primary/10"
															: "text-muted-foreground hover:text-foreground",
													)}
													data-active={form.roastLevel === lvl}
												>
													{lvl}
												</button>
											))}
										</div>
										<div
											className="h-1 w-full border border-line"
											style={{
												background:
													"linear-gradient(to right, var(--paper-raised), var(--ink))",
											}}
										/>
										<div className="flex justify-between">
											<span className="font-data text-xs uppercase text-muted-foreground">
												Light
											</span>
											<span className="font-data text-xs uppercase text-muted-foreground">
												Dark
											</span>
										</div>
									</div>

									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div className="space-y-1.5">
											<p className="font-sans text-sm text-foreground">
												Botanic
											</p>
											<OptionChips
												options={DEFAULT_BOTANICS}
												value={form.botanic}
												onChange={(v) => setField("botanic", v)}
												unknown="?"
											/>
										</div>
										<div className="space-y-1.5">
											<p className="font-sans text-sm text-foreground">
												Designation
											</p>
											<OptionChips
												options={DEFAULT_DESIGNATIONS}
												value={form.designation}
												onChange={(v) => setField("designation", v)}
												unknown="?"
											/>
										</div>
									</div>

									<div className="space-y-1.5">
										<p className="font-sans text-sm text-foreground">Variety</p>
										<MultiChips
											suggestions={suggestions.varieties}
											selected={form.variety}
											onToggle={(v) => toggleItem("variety", v)}
											customInput={customVariety}
											onCustomChange={setCustomVariety}
											onCustomAdd={() =>
												addCustom("variety", customVariety, () =>
													setCustomVariety(""),
												)
											}
											placeholder="e.g. Gesha, Bourbon…"
										/>
									</div>
								</div>
							)}
						</section>

						<div className="flex items-center justify-between gap-4 border-t border-line pt-5">
							<p className="hidden font-sans text-xs text-muted-foreground sm:block">
								Name, origin, process and one flavor are enough.
							</p>
							<button
								type="submit"
								disabled={isSaving}
								className="key-frame key-frame-light hover-line h-12 flex-1 rounded-xl bg-ink px-8 font-sans text-sm font-semibold uppercase tracking-[0.08em] text-paper shadow-card transition-colors hover:bg-ink/85 disabled:opacity-40 sm:flex-none"
							>
								{isSaving ? "Saving…" : "Save the bean"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
