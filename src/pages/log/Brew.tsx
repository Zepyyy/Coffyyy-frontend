import { ArrowRight, Plus, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import SteamCup from "@/components/ui/SteamCup";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import Dial from "@/components/log/Dial";
import GrindHistoryStrip from "@/components/log/GrindHistoryStrip";
import QuickMachineCard from "@/components/log/QuickMachineCard";
import BrewFeedback from "@/components/feedback/BrewFeedback";
import { addBrew } from "@/lib/data";
import {
	useBrewFormStart,
	useBrewSuggestions,
	useLastBrewForBean,
	useGrindSettingsForBean,
} from "@/hooks/api/useBrews";
import { useRecipesForMethod } from "@/hooks/api/useRecipes";
import { useRepeatSource } from "@/hooks/api/useRepeatSource";
import { DEFAULT_FLOW } from "@/lib/defaults";
import { recipeLine } from "@/lib/brewFormat";
import { formatRatio, methodConfig } from "@/lib/brewMethods";
import {
	type BrewLogForm,
	brewWeightForRatio,
	dialsFromBrew,
	dialsFromRecipe,
	methodDefaults,
	type RepeatStart,
	recipeFitsBean,
	repeatNotices,
	repeatStart,
	toNewBrew,
} from "@/components/log/brewForm";
import {
	clampWeight,
	cn,
	formatExtractionTime,
	formatRelativeDay,
	parseExtractionTime,
} from "@/lib/utils";
import type { Brews } from "@/types/BrewTypes";
import type { Recipes } from "@/types/RecipeTypes";

// Before a Brewer is picked the dials show espresso's defaults.
const INITIAL: BrewLogForm = {
	beanId: undefined,
	machineId: undefined,
	recipeId: undefined,
	...methodDefaults("espresso"),
};

const chipClass = (active: boolean) =>
	cn(
		"opt-frame min-h-11 border px-3 py-1.5 font-data text-xs transition-colors",
		active
			? "border-primary bg-primary/10 text-primary-800 dark:text-primary-200"
			: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
	);

const inputClass =
	"rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60";

/** A positive integer search param, else undefined. */
function idParam(raw: string | null): number | undefined {
	const id = Number(raw);
	return raw != null && Number.isInteger(id) && id > 0 ? id : undefined;
}

const capitalize = (text: string) =>
	text.charAt(0).toUpperCase() + text.slice(1);

function StepHeading({
	index,
	title,
	hint,
	tag,
}: {
	index: string;
	title: string;
	hint: string;
	tag?: string;
}) {
	return (
		<div className="flex items-baseline gap-3">
			<span className="font-data text-[10px] tracking-[0.2em] text-crema-deep">
				{index}
			</span>
			<h2 className="font-display text-2xl italic tracking-tight text-foreground/90">
				{title}
			</h2>
			{tag && (
				<span className="font-data text-[10px] uppercase tracking-[0.14em] text-crema-deep dark:text-crema">
					{tag}
				</span>
			)}
			<span className="hidden font-sans text-xs text-muted-foreground sm:inline">
				{hint}
			</span>
		</div>
	);
}

function RecipeSegment({
	label,
	value,
	muted,
}: {
	label: string;
	value: string;
	muted?: boolean;
}) {
	return (
		<span className="inline-flex items-baseline gap-1.5">
			<span className="font-data text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</span>
			<span
				className={cn(
					"font-data text-sm font-semibold",
					muted ? "text-muted-foreground/50" : "text-foreground",
				)}
			>
				{value}
			</span>
		</span>
	);
}

/**
 * A next step after saving, spoken in the ledger's voice: a hairline row
 * with the action in italic serif and the promise in mono. Hover draws the
 * crema underline (the nav's stroke) and slides the arrow.
 */
function NextStepRow({
	label,
	hint,
	onClick,
}: {
	label: string;
	hint: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="group relative flex w-full items-center justify-between gap-3 border-t border-line py-3.5 text-left"
		>
			<span className="font-display text-lg italic tracking-tight text-ink-soft transition-colors group-hover:text-foreground">
				{label}
			</span>
			<span className="flex items-center gap-2 font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint transition-colors group-hover:text-foreground">
				{hint}
				<ArrowRight
					className="size-3.5 transition-transform duration-300 ease-soft group-hover:translate-x-1"
					aria-hidden
				/>
			</span>
			<span
				aria-hidden
				className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-crema transition-transform duration-300 ease-soft group-hover:scale-x-100"
			/>
		</button>
	);
}

export default function BrewLog() {
	const [form, setForm] = useState<BrewLogForm>(INITIAL);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	const [savedBrew, setSavedBrew] = useState<Brews | null>(null);
	const [feedbackOpen, setFeedbackOpen] = useState(false);
	const [feedbackSaved, setFeedbackSaved] = useState(false);
	const [beanSearch, setBeanSearch] = useState("");
	const [notesOpen, setNotesOpen] = useState(false);
	const [brewerOpen, setBrewerOpen] = useState(false);
	const [beanOpen, setBeanOpen] = useState(false);
	const brewerToggle = useRef<HTMLButtonElement>(null);
	const beanToggle = useRef<HTMLButtonElement>(null);
	const [prefill, setPrefill] = useState<{
		date: Date;
		flow?: string | null;
		overallRating?: number | null;
	} | null>(null);
	// The exact brew being repeated (?fromBrew=). Unapplied while it waits for
	// a Brewer of its method.
	const [repeat, setRepeat] = useState<{
		start: RepeatStart;
		brew: Brews;
		applied: boolean;
	} | null>(null);
	const [notices, setNotices] = useState<string[]>([]);

	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const suggestions = useBrewSuggestions();
	const machine = suggestions.machine.find((m) => m.id === form.machineId);
	// The picked Brewer decides the method, and with it every dial below.
	const method = machine?.method;
	const config = methodConfig(method);
	// Espresso speaks in shots; every other method in brews.
	const noun = config.method === "espresso" ? "shot" : "brew";

	const lastBrewForBean = useLastBrewForBean(form.beanId, method);
	const grindSettings = useGrindSettingsForBean(form.beanId, method);
	const recipes = useRecipesForMethod(
		config.hasRecipes ? method : undefined,
		form.beanId,
	);
	const linkedRecipe = recipes.find((r) => r.id === form.recipeId);

	// Deep links: /log/brew?bean=12 selects the bean, ?recipe=3 follows a
	// recipe on a Brewer of its method, ?fromBrew=5 repeats that exact brew
	// (and overrides the other two). Without them the last-used Brewer is
	// picked up front.
	const beanParam = idParam(searchParams.get("bean"));
	const recipeParam = idParam(searchParams.get("recipe"));
	const rawFromBrew = searchParams.get("fromBrew");
	const fromBrewParam = idParam(rawFromBrew);
	const start = useBrewFormStart(beanParam, recipeParam);
	const source = useRepeatSource(fromBrewParam);
	const sourceLoading = fromBrewParam != null && source === undefined;
	const appliedStart = useRef<string | null>(null);
	useEffect(() => {
		const key = `${beanParam}|${recipeParam}|${rawFromBrew}`;
		if (sourceLoading || (!source && !start) || appliedStart.current === key) {
			return;
		}
		appliedStart.current = key;
		appliedPrefill.current = null;
		setPrefill(null);
		if (source) {
			const rs = repeatStart(source);
			const applied = rs.machineId != null;
			setRepeat({ start: rs, brew: source.brew, applied });
			setNotices(repeatNotices(rs));
			setForm((f) => ({
				...f,
				beanId: rs.beanId,
				machineId: rs.machineId,
				recipeId: undefined,
				...(applied && {
					recipeId: rs.recipe?.id,
					...rs.dials,
				}),
			}));
			return;
		}
		setRepeat(null);
		setNotices(
			rawFromBrew == null
				? []
				: [
						fromBrewParam == null
							? "That repeat link isn't a valid brew."
							: "That brew no longer exists.",
					],
		);
		if (!start) return;
		setForm((f) => {
			const next: BrewLogForm = {
				...f,
				machineId: start.machineId ?? f.machineId,
				beanId: start.beanId ?? f.beanId,
				recipeId: undefined,
				...(start.method && methodDefaults(start.method)),
			};
			if (!start.recipe || !start.method) return next;
			return {
				...next,
				recipeId: start.recipe.id,
				...dialsFromRecipe(start.recipe, next, start.method),
			};
		});
	}, [
		start,
		source,
		sourceLoading,
		beanParam,
		recipeParam,
		rawFromBrew,
		fromBrewParam,
	]);

	// Picking a bean (or a Brewer of another method) picks up the last brew
	// of that bean and method as the starting point, unless a recipe or a
	// repeated brew leads.
	const prefillKey = `${form.beanId}:${method}`;
	const appliedPrefill = useRef<string | null>(null);
	useEffect(() => {
		if (!form.beanId || !method || lastBrewForBean?.key !== prefillKey) return;
		if (appliedPrefill.current === prefillKey) return;
		appliedPrefill.current = prefillKey;
		if (form.recipeId != null || repeat) return;
		const brew = lastBrewForBean.brew;
		if (!brew) {
			setPrefill(null);
			return;
		}
		setForm((f) => ({ ...f, ...dialsFromBrew(brew, method), notes: f.notes }));
		setPrefill({
			date: new Date(brew.date),
			flow: config.flow ? brew.flow : null,
			overallRating: brew.overallRating,
		});
	}, [
		lastBrewForBean,
		prefillKey,
		form.beanId,
		form.recipeId,
		repeat,
		method,
		config.flow,
	]);

	const [selectedBeanId, setSelectedBeanId] = useState<number | null>(null);
	useEffect(() => {
		setSelectedBeanId(form.beanId ?? null);
	}, [form.beanId]);

	function setField<K extends keyof BrewLogForm>(
		field: K,
		value: BrewLogForm[K],
	) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function selectBrewer(machineId: number) {
		const next = suggestions.machine.find((m) => m.id === machineId);
		if (!next) return;
		if (repeat && !repeat.applied && next.method === repeat.start.method) {
			// The compatible Brewer the repeat was waiting for.
			const { recipe, dials } = repeat.start;
			setForm((f) => ({
				...f,
				machineId,
				recipeId: recipeFitsBean(recipe, f.beanId) ? recipe?.id : undefined,
				...dials,
			}));
			setRepeat({ ...repeat, applied: true });
			setNotices((n) => n.filter((text) => !text.includes("brewer")));
			setPrefill(null);
			return;
		}
		if (next.method === method) {
			setField("machineId", machineId);
			return;
		}
		// Another method: its recipes and dials don't carry over, nor does
		// the repeat.
		setRepeat(null);
		setNotices([]);
		setForm((f) => ({
			...f,
			machineId,
			recipeId: undefined,
			...methodDefaults(next.method),
			notes: f.notes,
		}));
		setPrefill(null);
	}

	function selectBean(beanId: number) {
		setNotices((items) =>
			items.filter((text) => !text.includes("bean is gone")),
		);
		setForm((f) => {
			// A recipe tied to another bean no longer applies.
			const recipe = recipes.find((r) => r.id === f.recipeId);
			const keep = recipe?.beanId == null || recipe.beanId === beanId;
			return { ...f, beanId, recipeId: keep ? f.recipeId : undefined };
		});
	}

	function pickRecipe(recipe: Recipes | null) {
		if (!recipe || !method) {
			setField("recipeId", undefined);
			return;
		}
		setForm((f) => ({
			...f,
			recipeId: recipe.id,
			...dialsFromRecipe(recipe, f, method),
		}));
		setPrefill(null);
	}

	function startFresh() {
		setRepeat(null);
		setNotices([]);
		setForm((f) => ({
			...f,
			recipeId: undefined,
			...methodDefaults(config.method),
		}));
		setPrefill(null);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.beanId || !form.machineId || !method || isSaving) return;
		setSaveError("");

		setIsSaving(true);
		try {
			const brew = toNewBrew(
				{ ...form, machineId: form.machineId },
				method,
				new Date(),
			);
			const result = await addBrew(brew);
			if (result instanceof Error) {
				setSaveError(result.message);
			} else {
				setSavedBrew({ ...brew, id: result, method });
				setFeedbackOpen(false);
				setFeedbackSaved(false);
			}
		} finally {
			setIsSaving(false);
		}
	}

	function logAnother() {
		setSavedBrew(null);
		setFeedbackOpen(false);
		setFeedbackSaved(false);
		setRepeat(null);
		setNotices([]);
		setForm((f) => ({
			...f,
			flow: "",
			extractionTime: "",
			notes: linkedRecipe?.notes ?? "",
		}));
		setPrefill(null);
	}

	const setBeanWeight = (value: number) => {
		const next = clampWeight({
			value,
			min: config.dose.min,
			max: config.dose.max,
		});
		setField("beanWeight", Number(next.toFixed(1)));
	};
	const setBrewWeight = (value: number) => {
		const next = clampWeight({
			value,
			min: config.brewWeight.min,
			max: config.brewWeight.max,
		});
		setField("brewWeight", Number(next.toFixed(1)));
	};
	// Wide ranges (pour-over water, moka output) step in whole grams.
	const brewWeightStep =
		config.brewWeight.max - config.brewWeight.min > 100 ? 1 : 0.1;

	const ratio = formatRatio(form.beanWeight, form.brewWeight);
	const ratioValue = ratio?.slice(2) ?? null;
	const timeSeconds = parseExtractionTime(form.extractionTime);
	const timeExample = formatExtractionTime(
		config.time.presets[1] ?? config.time.presets[0],
	);

	const filteredBeans = useMemo(() => {
		const q = beanSearch.trim().toLowerCase();
		if (!q) return suggestions.bean;
		return suggestions.bean.filter((b) =>
			[b.name, b.origin?.join(" ")]
				.filter(Boolean)
				.join(" ")
				.toLowerCase()
				.includes(q),
		);
	}, [beanSearch, suggestions.bean]);

	const selectedBean = suggestions.bean.find((b) => b.id === form.beanId);
	const isEmpty = suggestions.bean.length === 0;
	const noBrewers = suggestions.machine.length === 0;
	const showNotes = notesOpen || form.notes.length > 0;

	const repeatNote = repeat?.applied && (
		<p className="font-sans text-xs text-muted-foreground">
			Repeating your {noun} of {formatRelativeDay(repeat.brew.date)} ·{" "}
			{recipeLine(repeat.brew)}
			{repeat.brew.overallRating != null
				? ` · ${repeat.brew.overallRating}★`
				: ""}
		</p>
	);
	const prefillNote = prefill && (
		<p className="font-sans text-xs text-muted-foreground">
			Started from your last {noun} of this bean ·{" "}
			{formatRelativeDay(prefill.date)}
			{prefill.flow ? ` · ${prefill.flow.toLowerCase()}` : ""}
			{prefill.overallRating != null ? ` · ${prefill.overallRating}★` : ""}
		</p>
	);

	const startNote = repeatNote || prefillNote;

	// Success: the brew is logged. Taste notes come later, when there is
	// something in the cup to judge.
	if (savedBrew != null) {
		return (
			<div className="mx-auto w-full max-w-3xl">
				<div className="rise space-y-5 rounded-xl border border-line bg-paper-raised p-4 shadow-card sm:p-8">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="eyebrow">{capitalize(noun)} logged</p>
							<p className="mt-1 font-display text-3xl italic tracking-tight text-foreground/90">
								{selectedBean?.name ?? "Brew"} in the book.
							</p>
							<p className="mt-2 font-sans text-sm text-muted-foreground">
								Taste it first. The notes can wait until you know what you
								think.
							</p>
						</div>
						{/* The cup is still fresh: the censer's steaming cup, quietly
						    looping while the entry sits in the ledger. */}
						<SteamCup className="size-14 shrink-0 text-crema" />
					</div>

					{feedbackOpen && (
						<BrewFeedback
							brew={savedBrew}
							bean={
								form.beanId
									? {
											id: form.beanId,
											name: selectedBean?.name,
											status: selectedBean?.status,
										}
									: null
							}
							onSaved={() => setFeedbackSaved(true)}
							onDismiss={() => setFeedbackOpen(false)}
						/>
					)}

					<div className="space-y-5 pt-1">
						<Button
							variant="ink"
							onClick={() => navigate("/home")}
							className="group h-12 w-full gap-3 sm:w-auto sm:min-w-56"
						>
							Done
							<ArrowRight className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-1" />
						</Button>

						<div className="border-b border-line">
							{!feedbackOpen && (
								<NextStepRow
									label={feedbackSaved ? "Edit taste notes" : "Add taste notes"}
									hint={feedbackSaved ? "saved" : "after tasting"}
									onClick={() => setFeedbackOpen(true)}
								/>
							)}
							<NextStepRow
								label={`Log another ${noun}`}
								hint="same bean"
								onClick={logAnother}
							/>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full">
			<div className="sm:mx-6 grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
				<aside className="lg:sticky lg:top-20 lg:self-start space-y-6 lg:block hidden">
					<div className="border-l-4 border-crema pl-5">
						<h1 className="text-4xl font-display italic tracking-tight text-foreground/90">
							Log a brew
						</h1>
						<p className="mt-1 font-sans text-xs uppercase tracking-[0.2em] text-muted-foreground">
							Twenty seconds, then pour.
						</p>
					</div>

					{/* Live recipe line — fills in as the brew is dialed */}
					<div className="rounded-xl border border-line bg-paper-raised p-4 space-y-2 shadow-card">
						<p className="font-data text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
							{linkedRecipe ? `Following ${linkedRecipe.name}` : "The recipe"}
						</p>
						<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
							<RecipeSegment label="grind" value={String(form.grindSize)} />
							<RecipeSegment label="dose" value={`${form.beanWeight}g`} />
							<RecipeSegment
								label={config.brewWeight.label.toLowerCase()}
								value={`${form.brewWeight}g`}
							/>
							<RecipeSegment
								label="ratio"
								value={ratio ?? "—"}
								muted={!ratio}
							/>
							<RecipeSegment
								label={config.time.label.toLowerCase()}
								value={
									timeSeconds != null
										? (formatExtractionTime(timeSeconds) ?? "—")
										: "—"
								}
								muted={timeSeconds == null}
							/>
							{config.waterTemp && (
								<RecipeSegment
									label="temp"
									value={form.waterTemp != null ? `${form.waterTemp}°C` : "—"}
									muted={form.waterTemp == null}
								/>
							)}
							{config.heat && (
								<RecipeSegment label="heat" value={form.heat ?? "—"} />
							)}
						</div>
					</div>

					{startNote && (
						<div className="space-y-1.5">
							{startNote}
							<button
								type="button"
								onClick={startFresh}
								className="inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								<RotateCcw className="size-3" />
								Start fresh
							</button>
						</div>
					)}
					{saveError && (
						<p className="font-sans text-xs text-destructive">{saveError}</p>
					)}
				</aside>

				<section className="min-w-0 mb-8 sm:border sm:border-line sm:bg-paper-raised sm:p-6 lg:p-8">
					<h1 className="mb-5 font-display text-3xl italic tracking-tight lg:hidden">
						Log a {noun}
					</h1>
					{/* Mobile: the aside is hidden, so the prefill note travels with the form */}
					{startNote && (
						<div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
							{startNote}
							<button
								type="button"
								onClick={startFresh}
								className="inline-flex shrink-0 items-center gap-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								<RotateCcw className="size-3" />
								Start fresh
							</button>
						</div>
					)}
					{notices.length > 0 && (
						<div
							role="status"
							className="mb-6 space-y-1 border-l-2 border-crema pl-3"
						>
							{notices.map((text) => (
								<p key={text} className="font-sans text-sm text-foreground">
									{text}
								</p>
							))}
						</div>
					)}
					<form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
						{/* 01 — The brewer: it picks the method */}
						<section className="space-y-4">
							{machine ? (
								<h2>
									<button
										ref={brewerToggle}
										type="button"
										aria-label={`Change brewer, ${machine.name}, ${config.label}`}
										aria-expanded={brewerOpen}
										aria-controls="brewer-picker"
										onClick={() => setBrewerOpen(!brewerOpen)}
										className="group flex min-h-14 w-full items-center justify-between gap-4 border-b border-line py-3 text-left"
									>
										<span className="min-w-0">
											<span className="eyebrow block">
												Brewer · {config.label}
											</span>
											<span className="block break-words font-display text-xl italic">
												{machine.name}
											</span>
										</span>
										<span className="key-line shrink-0 py-2 font-sans text-sm text-ink-soft">
											{brewerOpen ? "Close" : "Change"}
										</span>
									</button>
								</h2>
							) : (
								<StepHeading
									index="01"
									title="The brewer"
									hint="What are you brewing with?"
								/>
							)}
							{(!machine || brewerOpen) && (
								<div id="brewer-picker">
									{noBrewers ? (
										<div className="rounded-xl border border-dashed border-line-strong bg-paper-sunken/40 p-10 text-center space-y-3">
											<p className="font-display text-2xl text-foreground/60">
												No brewers yet
											</p>
											<p className="font-sans text-sm text-muted-foreground">
												Add the brewer you use — espresso machine, dripper or
												moka pot.
											</p>
											<Button asChild variant="ink">
												<Link to="/log/machine">Add a brewer</Link>
											</Button>
										</div>
									) : (
										<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
											{suggestions.machine.map((machineInfo) => (
												<QuickMachineCard
													key={machineInfo.id}
													selected={form.machineId === machineInfo.id}
													machine={{
														id: machineInfo.id,
														name: machineInfo.name,
														method: machineInfo.method,
													}}
													onClick={() => {
														selectBrewer(machineInfo.id);
														setBrewerOpen(false);
														requestAnimationFrame(() =>
															brewerToggle.current?.focus(),
														);
													}}
												/>
											))}
										</div>
									)}
								</div>
							)}
						</section>

						{/* 02 — The bean */}
						<section className="space-y-4">
							{selectedBean ? (
								<h2>
									<button
										ref={beanToggle}
										type="button"
										aria-label={`Change bean, ${selectedBean.name}`}
										aria-expanded={beanOpen}
										aria-controls="bean-picker"
										onClick={() => setBeanOpen(!beanOpen)}
										className="group flex min-h-14 w-full items-center justify-between gap-4 border-b border-line py-3 text-left"
									>
										<span className="min-w-0">
											<span className="eyebrow block">Bean</span>
											<span className="block break-words font-display text-xl italic">
												{selectedBean.name}
											</span>
										</span>
										<span className="key-line shrink-0 py-2 font-sans text-sm text-ink-soft">
											{beanOpen ? "Close" : "Change"}
										</span>
									</button>
								</h2>
							) : (
								<StepHeading
									index="02"
									title="The bean"
									hint="Which bag is open?"
								/>
							)}
							{(!selectedBean || beanOpen) && (
								<div id="bean-picker">
									{isEmpty ? (
										<div className="rounded-xl border border-dashed border-line-strong bg-paper-sunken/40 p-10 text-center space-y-3">
											<p className="font-display text-2xl text-foreground/60">
												No beans yet
											</p>
											<p className="font-sans text-sm text-muted-foreground">
												Add a bean first — it takes a minute.
											</p>
											<Button asChild variant="ink">
												<Link to="/log/bean">Add a bean</Link>
											</Button>
										</div>
									) : (
										<>
											{suggestions.bean.length > 8 && (
												<label className="relative block max-w-xs">
													<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
													<input
														className="h-9 w-full rounded-lg border border-line-strong bg-paper-raised pl-9 pr-3 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60"
														placeholder="Search your beans…"
														value={beanSearch}
														onChange={(e) => setBeanSearch(e.target.value)}
														aria-label="Search beans"
													/>
												</label>
											)}
											<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
												{filteredBeans.map((beanInfo) => (
													<BeanSelectorCard
														key={beanInfo.id}
														bean={{
															id: beanInfo.id,
															name: beanInfo.name,
															origin: beanInfo.origin,
															dominantNote: beanInfo.dominantNote,
															process: beanInfo.process,
															roastLevel: beanInfo.roastLevel,
															variety: beanInfo.variety,
														}}
														selected={selectedBeanId === beanInfo.id}
														onClick={() => {
															selectBean(beanInfo.id);
															setBeanOpen(false);
															requestAnimationFrame(() =>
																beanToggle.current?.focus(),
															);
														}}
													/>
												))}
											</div>
											{!isEmpty && filteredBeans.length === 0 && (
												<p className="font-sans text-sm text-muted-foreground">
													No bean matches “{beanSearch}”.
												</p>
											)}
										</>
									)}
								</div>
							)}
						</section>

						{/* 03 — The recipe */}
						<section className="space-y-6">
							<StepHeading
								index="03"
								title="The recipe"
								hint="Dial it in — the dials start from last time."
							/>
							{machine && config.hasRecipes && (
								<div className="space-y-2">
									<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
										Follow a recipe
									</p>
									<div className="flex flex-wrap gap-1.5">
										<button
											type="button"
											onClick={() => pickRecipe(null)}
											className={chipClass(form.recipeId == null)}
											data-active={form.recipeId == null}
											aria-pressed={form.recipeId == null}
										>
											None
										</button>
										{recipes.map((recipe) => {
											const active = form.recipeId === recipe.id;
											return (
												<button
													key={recipe.id}
													type="button"
													onClick={() => pickRecipe(active ? null : recipe)}
													className={chipClass(active)}
													data-active={active}
													aria-pressed={active}
												>
													{recipe.name}
													<span className="ml-1.5 text-ink-faint">
														{formatRatio(recipe.beanWeight, recipe.brewWeight)}
													</span>
												</button>
											);
										})}
									</div>
									<p className="font-sans text-xs text-muted-foreground">
										{recipes.length === 0
											? `No ${config.label.toLowerCase()} recipes yet.`
											: linkedRecipe
												? "Its targets are on the dials. Change anything — the brew stays linked."
												: "Pick one to start from its targets."}
									</p>
								</div>
							)}
							{form.beanId && (
								<GrindHistoryStrip
									settings={grindSettings}
									selectedGrind={form.grindSize}
									onPick={(grindSize) => setField("grindSize", grindSize)}
								/>
							)}
							<div className="space-y-2">
								<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
									Grind size
								</p>
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
													? "text-primary-800 dark:text-primary-200 bg-primary/10"
													: "text-muted-foreground hover:text-foreground",
											)}
											data-active={form.grindSize === lvl}
											aria-pressed={form.grindSize === lvl}
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
								<div className="relative h-px w-full bg-line-strong">
									{Array.from({ length: 25 }, (_, i) => (
										<span
											key={i}
											className="absolute top-0 h-1 w-px bg-line-strong"
											style={{ left: `${(i / 24) * 100}%` }}
										/>
									))}
								</div>
								<div className="w-full flex items-center justify-between font-data text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
									<span>Finer</span>
									<span className="hidden sm:inline">Fine</span>
									<span>Medium</span>
									<span className="hidden sm:inline">Coarse</span>
									<span>Coarser</span>
								</div>
							</div>

							<div className="grid grid-cols-[104px_minmax(0,1fr)_104px] items-start gap-x-1 border-y border-line py-5 sm:gap-x-8 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
								<div className="flex flex-col items-center">
									<p className="font-sans text-sm text-foreground">Dose · g</p>
									<Dial
										compact
										helpers={false}
										value={form.beanWeight}
										onChange={setBeanWeight}
										min={config.dose.min}
										max={config.dose.max}
										label="Dose (ground coffee) dial"
									/>
								</div>
								{ratioValue && (
									<div className="flex min-w-0 select-none flex-col items-center self-center gap-2">
										<div
											className="flex flex-col items-center gap-2"
											aria-live="polite"
											aria-label={`Ratio 1 to ${ratioValue}`}
										>
											<span className="font-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
												ratio
											</span>
											<span className="font-display text-xl min-[360px]:text-3xl sm:text-5xl italic font-normal leading-none text-primary-700/90 dark:text-primary-200/90">
												1<span className="mx-1 text-primary/40">:</span>
												{ratioValue}
											</span>
											<div
												key={ratioValue}
												aria-hidden="true"
												className="measure-relation h-px w-12 bg-crema/60"
											/>
										</div>
									</div>
								)}
								<div className="flex flex-col items-center">
									<p className="font-sans text-sm text-foreground">
										{config.brewWeight.label} · g
									</p>
									<Dial
										compact
										helpers={false}
										value={form.brewWeight}
										onChange={setBrewWeight}
										min={config.brewWeight.min}
										max={config.brewWeight.max}
										step={brewWeightStep}
										label={`${config.brewWeight.label} dial`}
									/>
								</div>
							</div>

							{config.ratioPresets.length > 0 && (
								<div className="flex flex-wrap justify-center gap-1">
									{config.ratioPresets.map((preset) => {
										const active = ratioValue === String(preset);
										return (
											<button
												key={preset}
												type="button"
												onClick={() =>
													setField(
														"brewWeight",
														brewWeightForRatio(
															form.beanWeight,
															preset,
															config.method,
														),
													)
												}
												className={cn(
													chipClass(active),
													"min-h-11 min-w-14 px-3 py-1 text-xs",
												)}
												data-active={active}
												aria-pressed={active}
												aria-label={`Set ratio 1 to ${preset}`}
											>
												1:{preset}
											</button>
										);
									})}
								</div>
							)}
							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
										{config.time.label}
									</p>
									<div className="flex flex-wrap items-center gap-1.5">
										{config.time.presets.map((t) => {
											const active = timeSeconds === t;
											return (
												<button
													key={t}
													type="button"
													onClick={() => setField("extractionTime", String(t))}
													className={chipClass(active)}
													data-active={active}
													aria-pressed={active}
												>
													{formatExtractionTime(t)}
												</button>
											);
										})}
										<input
											type="text"
											inputMode="decimal"
											className={cn(inputClass, "w-24")}
											placeholder={timeExample ? `e.g. ${timeExample}` : ""}
											value={form.extractionTime}
											onChange={(e) =>
												setField("extractionTime", e.target.value)
											}
											aria-label={`${config.time.label} in seconds`}
										/>
									</div>
									<p className="font-sans text-xs text-muted-foreground">
										Seconds, or 1:02 — whatever your scale shows.
									</p>
								</div>
								{config.flow && (
									<div className="space-y-2">
										<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
											How did it flow?
										</p>
										<div className="flex flex-wrap gap-1.5">
											{DEFAULT_FLOW.map((f) => (
												<button
													key={f}
													type="button"
													onClick={() =>
														setField("flow", form.flow === f ? "" : f)
													}
													className={chipClass(form.flow === f)}
													data-active={form.flow === f}
													aria-pressed={form.flow === f}
												>
													{f}
												</button>
											))}
										</div>
										<p className="font-sans text-xs text-muted-foreground">
											First read on the shot, before you taste it.
										</p>
									</div>
								)}
								{config.waterTemp && (
									<div className="space-y-2">
										<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
											Water temp
										</p>
										<div className="flex items-center gap-2">
											<input
												type="number"
												inputMode="decimal"
												min={config.waterTemp.min}
												max={config.waterTemp.max}
												step="1"
												className={cn(inputClass, "w-24")}
												value={form.waterTemp ?? ""}
												onChange={(e) =>
													setField(
														"waterTemp",
														e.target.value === ""
															? undefined
															: Number(e.target.value),
													)
												}
												onBlur={() => {
													const range = config.waterTemp;
													if (!range || form.waterTemp == null) return;
													setField(
														"waterTemp",
														clampWeight({
															value: form.waterTemp,
															min: range.min,
															max: range.max,
														}),
													);
												}}
												aria-label="Water temperature in °C"
											/>
											<span className="font-data text-xs text-muted-foreground">
												°C
											</span>
										</div>
										<p className="font-sans text-xs text-muted-foreground">
											{config.waterTemp.min}–{config.waterTemp.max} °C, off the
											kettle.
										</p>
									</div>
								)}
								{config.heat && (
									<div className="space-y-2">
										<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
											Heat
										</p>
										<div className="flex flex-wrap gap-1.5">
											{config.heat.options.map((heat) => (
												<button
													key={heat}
													type="button"
													onClick={() => setField("heat", heat)}
													className={chipClass(form.heat === heat)}
													data-active={form.heat === heat}
													aria-pressed={form.heat === heat}
												>
													{capitalize(heat)}
												</button>
											))}
										</div>
										<p className="font-sans text-xs text-muted-foreground">
											The flame or plate under the pot.
										</p>
									</div>
								)}
							</div>

							{/* Notes: optional, folded away until asked for */}
							{showNotes ? (
								<div className="space-y-2">
									<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
										Notes
									</p>
									<textarea
										className={cn(inputClass, "min-h-20 w-full resize-y")}
										placeholder="Pours, prep, anything worth remembering."
										value={form.notes}
										onChange={(e) => setField("notes", e.target.value)}
										aria-label="Notes"
									/>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setNotesOpen(true)}
									className="inline-flex items-center gap-1.5 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
								>
									<Plus className="size-3" />
									Add notes
								</button>
							)}
						</section>

						{saveError && (
							<p
								role="alert"
								className="font-sans text-sm text-destructive lg:hidden"
							>
								{saveError}
							</p>
						)}
						<div className="flex flex-col items-stretch justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
							<p className="font-sans text-xs text-muted-foreground">
								{!form.machineId
									? "Pick a brewer to start."
									: !form.beanId
										? "Pick a bean to start."
										: "Ready when you are."}
							</p>
							<button
								type="submit"
								disabled={!form.beanId || !form.machineId || isSaving}
								className="key-frame key-frame-light hover-line h-12 flex-1 rounded-xl bg-ink px-8 font-display text-lg italic text-paper shadow-card transition-colors hover:bg-ink/85 disabled:opacity-40 sm:flex-none"
							>
								{isSaving ? "Saving…" : `Save the ${noun}`}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
