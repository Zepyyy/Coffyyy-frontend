import { Coffee, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import Dial from "@/components/log/Dial";
import QuickMachineCard from "@/components/log/QuickMachineCard";
import TasteRatingPrompt from "@/components/home/TasteRatingPrompt";
import { addBrew } from "@/lib/data";
import { useBrewSuggestions, useLastBrewForBean } from "@/hooks/api/useBrews";
import {
	DEFAULT_FLOW,
	MAX_BEAN_WEIGHT,
	MAX_ESPRESSO_WEIGHT,
	MIN_BEAN_WEIGHT,
	MIN_ESPRESSO_WEIGHT,
} from "@/lib/defaults";
import {
	clampWeight,
	cn,
	formatExtractionTime,
	formatRelativeDay,
	parseExtractionTime,
} from "@/lib/utils";
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
const TIME_PRESETS = ["25", "28", "30", "32", "36"];

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
			<span className="font-Mono text-[10px] tracking-[0.2em] text-primary/70">
				{index}
			</span>
			<h2 className="font-News text-2xl italic tracking-tight text-foreground/90">
				{title}
			</h2>
			<span className="hidden font-Recursive text-xs text-muted-foreground sm:inline">
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
			<span className="font-Mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</span>
			<span
				className={cn(
					"font-Mono text-sm font-semibold",
					muted ? "text-muted-foreground/50" : "text-foreground",
				)}
			>
				{value}
			</span>
		</span>
	);
}

export default function BrewLog() {
	const [form, setForm] = useState<BrewForm>(INITIAL);
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState("");
	const [savedBrewId, setSavedBrewId] = useState<number | null>(null);
	const [rated, setRated] = useState(false);
	const [beanSearch, setBeanSearch] = useState("");

	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const suggestions = useBrewSuggestions();
	const lastBrewForBean = useLastBrewForBean(form.beanId);

	// Deep link: /log/brew?bean=12 selects the bean up front.
	useEffect(() => {
		const beanParam = searchParams.get("bean");
		if (beanParam == null) return;
		const beanId = Number(beanParam);
		if (Number.isFinite(beanId) && beanId > 0) {
			setForm((f) => ({ ...f, beanId }));
		}
	}, [searchParams]);

	// Selecting a bean picks up that bean's latest recipe as the starting point.
	const [prefill, setPrefill] = useState<{
		from: string;
		date: Date;
	} | null>(null);
	const prefillSourceId = useMemo(
		() => (lastBrewForBean?.beanId === form.beanId ? form.beanId : undefined),
		[lastBrewForBean, form.beanId],
	);
	useEffect(() => {
		if (!lastBrewForBean || prefillSourceId !== form.beanId) return;
		const seconds = parseExtractionTime(lastBrewForBean.extractionTime);
		setForm((f) => ({
			...f,
			grindSize: lastBrewForBean.grindSize ?? f.grindSize,
			beanWeight: lastBrewForBean.beanWeight ?? f.beanWeight,
			espressoWeight: lastBrewForBean.espressoWeight ?? f.espressoWeight,
			extractionTime: seconds != null ? String(seconds) : f.extractionTime,
			flow: lastBrewForBean.flow ?? f.flow,
			machineId: lastBrewForBean.machineId ?? f.machineId,
		}));
		setPrefill({
			from: `your last shot of this bean`,
			date: new Date(lastBrewForBean.date),
		});
	}, [lastBrewForBean, prefillSourceId, form.beanId]);

	const [selectedBeanId, setSelectedBeanId] = useState<number | null>(null);
	useEffect(() => {
		setSelectedBeanId(form.beanId ?? null);
	}, [form.beanId]);

	function setField<K extends keyof BrewForm>(field: K, value: BrewForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function selectBean(beanId: number) {
		setField("beanId", beanId);
	}

	function startFresh() {
		setForm((f) => ({ ...INITIAL, beanId: f.beanId }));
		setPrefill(null);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!form.beanId || isSaving) return;
		setSaveError("");

		setIsSaving(true);
		try {
			const result = await addBrew({
				beanId: form.beanId,
				machineId: form.machineId,
				date: new Date(),
				beanWeight: form.beanWeight,
				grindSize: form.grindSize,
				espressoWeight: form.espressoWeight,
				flow: form.flow,
				extractionTime: form.extractionTime,
			});
			if (result instanceof Error) {
				setSaveError(result.message);
			} else {
				setSavedBrewId(result);
				setRated(false);
			}
		} finally {
			setIsSaving(false);
		}
	}

	function logAnother() {
		setSavedBrewId(null);
		setForm((f) => ({
			...f,
			date: new Date(),
			flow: "",
			extractionTime: "",
		}));
		setPrefill(null);
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

	const espressoRatio =
		form.beanWeight && form.espressoWeight
			? (form.espressoWeight / form.beanWeight).toFixed(1)
			: null;
	const timeSeconds = parseExtractionTime(form.extractionTime);

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

	// Success: the shot is logged, rate it now or move on.
	if (savedBrewId != null) {
		return (
			<div className="mx-auto w-full max-w-3xl px-4 lg:px-0">
				<div className="space-y-6 border border-border bg-background p-6 sm:p-8">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="font-Mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
								Shot logged
							</p>
							<p className="mt-1 font-News text-3xl italic tracking-tight text-foreground/90">
								{selectedBean?.name ?? "Brew"} in the book.
							</p>
						</div>
						<Coffee className="size-8 text-primary/30" strokeWidth={1.5} />
					</div>

					{!rated && savedBrewId != null && (
						<TasteRatingPrompt
							brew={{
								id: savedBrewId,
								date: new Date(),
								grindSize: form.grindSize,
								beanWeight: form.beanWeight,
								espressoWeight: form.espressoWeight,
								beanId: form.beanId,
								machineId: form.machineId,
								flow: form.flow,
								extractionTime: form.extractionTime,
							}}
							beanName={selectedBean?.name ?? "the brew"}
							onDismiss={() => setRated(true)}
						/>
					)}

					<div className="flex flex-wrap gap-3 pt-1">
						<button
							type="button"
							onClick={logAnother}
							className="border border-border bg-primary-200/15 px-5 py-2.5 font-Recursive text-sm text-foreground transition-colors hover:bg-primary-200/50"
						>
							Log another shot
						</button>
						<button
							type="button"
							onClick={() => navigate("/home")}
							className="border border-border px-5 py-2.5 font-Recursive text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							Back to dashboard
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full">
			<div className="mx-6 grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
				<aside className="lg:sticky lg:top-20 lg:self-start space-y-6 lg:block hidden">
					<div className="border-l-5 border-primary-200 pl-5">
						<h1 className="text-4xl font-News italic tracking-tight text-foreground/90">
							Log a brew
						</h1>
						<p className="mt-1 font-Recursive text-xs uppercase tracking-[0.2em] text-muted-foreground">
							Twenty seconds, then pour.
						</p>
					</div>

					{/* Live recipe line — fills in as the shot is dialed */}
					<div className="border border-border bg-background p-4 space-y-2">
						<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
							The recipe
						</p>
						<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
							<RecipeSegment label="grind" value={String(form.grindSize)} />
							<RecipeSegment label="in" value={`${form.beanWeight}g`} />
							<RecipeSegment label="out" value={`${form.espressoWeight}g`} />
							<RecipeSegment
								label="ratio"
								value={espressoRatio ? `1:${espressoRatio}` : "—"}
								muted={!espressoRatio}
							/>
							<RecipeSegment
								label="time"
								value={
									timeSeconds != null
										? (formatExtractionTime(timeSeconds) ?? "—")
										: "—"
								}
								muted={timeSeconds == null}
							/>
						</div>
					</div>

					{prefill && (
						<div className="space-y-1.5">
							<p className="font-Recursive text-xs text-muted-foreground">
								Started from {prefill.from} · {formatRelativeDay(prefill.date)}
							</p>
							<button
								type="button"
								onClick={startFresh}
								className="inline-flex items-center gap-1.5 font-Recursive text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								<RotateCcw className="size-3" />
								Start fresh
							</button>
						</div>
					)}
					{saveError && (
						<p className="font-Recursive text-xs text-destructive">
							{saveError}
						</p>
					)}
				</aside>

				<section className="border border-border bg-background p-6 lg:p-8 mb-8">
					{/* Mobile: the aside is hidden, so the prefill note travels with the form */}
					{prefill && (
						<div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
							<p className="font-Recursive text-xs text-muted-foreground">
								Started from {prefill.from} · {formatRelativeDay(prefill.date)}
							</p>
							<button
								type="button"
								onClick={startFresh}
								className="inline-flex shrink-0 items-center gap-1.5 font-Recursive text-xs text-muted-foreground transition-colors hover:text-foreground"
							>
								<RotateCcw className="size-3" />
								Start fresh
							</button>
						</div>
					)}
					<form onSubmit={handleSubmit} className="space-y-12">
						{/* 01 — The bean */}
						<section className="space-y-4">
							<StepHeading
								index="01"
								title="The bean"
								hint="Which bag is open?"
							/>
							{isEmpty ? (
								<div className="border border-dashed border-border p-10 text-center space-y-3">
									<p className="font-News text-2xl text-foreground/60">
										No beans yet
									</p>
									<p className="font-Recursive text-sm text-muted-foreground">
										Add a bean first — it takes a minute.
									</p>
									<Link
										to="/log/bean"
										className="inline-block border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm text-foreground transition-colors hover:bg-primary-200/25"
									>
										Add a bean
									</Link>
								</div>
							) : (
								<>
									{suggestions.bean.length > 8 && (
										<label className="relative block max-w-xs">
											<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
											<input
												className="h-9 w-full border border-border/70 bg-background pl-9 pr-3 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
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
												onClick={() => selectBean(beanInfo.id)}
											/>
										))}
									</div>
									{!isEmpty && filteredBeans.length === 0 && (
										<p className="font-Recursive text-sm text-muted-foreground">
											No bean matches “{beanSearch}”.
										</p>
									)}
								</>
							)}
						</section>

						{/* 02 — The recipe */}
						<section className="space-y-6">
							<StepHeading
								index="02"
								title="The recipe"
								hint="Dial it in — the dials start from last time."
							/>
							<div className="space-y-2">
								<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
									Grind size
								</p>
								<div className="flex flex-wrap gap-1.5">
									{GRIND_SIZES.map((lvl) => (
										<button
											key={lvl}
											type="button"
											onClick={() =>
												setField("grindSize", form.grindSize === lvl ? 12 : lvl)
											}
											className={cn(
												"min-w-10 flex-1 py-2.5 font-Mono text-xs font-semibold transition-all border-b-2",
												form.grindSize === lvl
													? "border-primary text-primary-800 dark:text-primary-200 bg-primary/10"
													: "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30",
											)}
										>
											{lvl}
										</button>
									))}
									<input
										type="number"
										step="0.01"
										className="w-24 shrink-0 border border-border bg-background px-3 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
										placeholder="Other"
										value={
											GRIND_SIZES.includes(form.grindSize) ? "" : form.grindSize
										}
										onChange={(e) =>
											setField("grindSize", Number(e.target.value))
										}
										aria-label="Custom grind size"
									/>
								</div>
								<div
									className="h-1 w-full"
									style={{
										background:
											"linear-gradient(to right, var(--primary-100), var(--primary))",
									}}
								/>
								<div className="w-full flex items-center justify-between font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
									<span>Finer</span>
									<span className="hidden sm:inline">Fine</span>
									<span>Medium</span>
									<span className="hidden sm:inline">Coarse</span>
									<span>Coarser</span>
								</div>
							</div>

							<div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-start lg:gap-14">
								<div className="flex flex-col items-center">
									<p className="font-Recursive text-sm text-foreground">
										In — ground coffee
									</p>
									<Dial
										value={form.beanWeight}
										onChange={setBeanWeight}
										min={MIN_BEAN_WEIGHT}
										max={MAX_BEAN_WEIGHT}
										label="Dose (ground coffee) dial"
									/>
								</div>
								{espressoRatio && (
									<div
										className="flex select-none flex-col items-center gap-2"
										aria-live="polite"
										aria-label={`Ratio 1 to ${espressoRatio}`}
									>
										<span className="font-Mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
											ratio
										</span>
										<span className="font-Lora text-5xl font-bold leading-none text-primary-700/90 dark:text-primary-200/90">
											1<span className="mx-1 text-primary/40">:</span>
											{espressoRatio}
										</span>
										<div className="squiggly-line w-[100px] opacity-60" />
									</div>
								)}
								<div className="flex flex-col items-center">
									<p className="font-Recursive text-sm text-foreground">
										Out — espresso in the cup
									</p>
									<Dial
										value={form.espressoWeight}
										onChange={setEspressoWeight}
										min={MIN_ESPRESSO_WEIGHT}
										max={MAX_ESPRESSO_WEIGHT}
										label="Yield (espresso weight) dial"
									/>
								</div>
							</div>

							<div className="grid gap-6 md:grid-cols-2">
								<div className="space-y-2">
									<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
										Extraction time
									</p>
									<div className="flex flex-wrap items-center gap-1.5">
										{TIME_PRESETS.map((t) => (
											<button
												key={t}
												type="button"
												onClick={() => setField("extractionTime", t)}
												className={cn(
													"border px-3 py-1.5 font-Mono text-xs transition-colors",
													parseExtractionTime(form.extractionTime) === Number(t)
														? "border-primary bg-primary/10 text-primary-800 dark:text-primary-200"
														: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
												)}
											>
												{t}s
											</button>
										))}
										<input
											type="text"
											inputMode="decimal"
											className="w-24 border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
											placeholder="e.g. 28"
											value={form.extractionTime}
											onChange={(e) =>
												setField("extractionTime", e.target.value)
											}
											aria-label="Extraction time in seconds"
										/>
									</div>
									<p className="font-Recursive text-xs text-muted-foreground">
										Seconds, or 1:02 — whatever your scale shows.
									</p>
								</div>
								<div className="space-y-2">
									<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
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
												className={cn(
													"border px-3 py-1.5 font-Recursive text-xs transition-colors",
													form.flow === f
														? "border-primary bg-primary/10 text-primary-800 dark:text-primary-200"
														: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
												)}
											>
												{f}
											</button>
										))}
									</div>
									<p className="font-Recursive text-xs text-muted-foreground">
										First read on the shot, before you taste it.
									</p>
								</div>
							</div>
						</section>

						{/* 03 — The setup */}
						<section className="space-y-4">
							<StepHeading
								index="03"
								title="The setup"
								hint="Which machine pulled it?"
							/>
							<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
								{suggestions.machine.map((machineInfo) => (
									<QuickMachineCard
										key={machineInfo.id}
										selected={form.machineId === machineInfo.id}
										machine={{
											id: machineInfo.id,
											name: machineInfo.name,
											type: machineInfo.type,
										}}
										onClick={() => {
											setField(
												"machineId",
												form.machineId === machineInfo.id
													? undefined
													: machineInfo.id,
											);
										}}
									/>
								))}
							</div>
						</section>

						<div className="flex items-center justify-between gap-4 border-t border-border pt-5">
							<p className="hidden font-Recursive text-xs text-muted-foreground sm:block">
								{form.beanId ? "Ready when you are." : "Pick a bean to start."}
							</p>
							<button
								type="submit"
								disabled={!form.beanId || isSaving}
								className="h-12 flex-1 bg-foreground px-8 font-News text-base italic text-background transition-opacity hover:tracking-wide hover:opacity-90 disabled:opacity-40 sm:flex-none"
							>
								{isSaving ? "Saving…" : "Save the shot"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
