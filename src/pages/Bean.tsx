import { ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";
import BeanVerdictPicker from "@/components/feedback/BeanVerdictPicker";
import { BrewLedgerRow } from "@/components/history/BrewLedgerRow";
import { Button } from "@/components/ui/button";
import BestBrewPanel from "@/components/home/BestBrewPanel";
import RoastDots from "@/components/home/RoastDots";
import { useAllMachines } from "@/hooks/api/useMachines";
import { useBean } from "@/hooks/api/useBeans";
import { useBrewsForBeanId } from "@/hooks/api/useBrews";
import { useRecipes } from "@/hooks/api/useRecipes";
import {
	useBeanBrewInsights,
	useBrewCountForBeanId,
} from "@/hooks/api/useStats";
import { isBrewMethod, methodConfig } from "@/lib/brewMethods";
import { getColorSwatch } from "@/lib/utils";
import type { BeanBrewParameterSummary, BrewMethod } from "@/types/BrewTypes";

function formatWeight(value: number | null) {
	return value == null ? "—" : `${value.toFixed(1)} g`;
}

function formatRatio(value: number | null) {
	return value == null ? "—" : `1:${Number(value.toFixed(1))}`;
}

function formatTemp(value: number | null) {
	return value == null ? "—" : `${Number(value.toFixed(1))}°C`;
}

function formatRating(value: number | null) {
	return value == null ? "—" : `${value.toFixed(1)}/5`;
}

function buildStatRows(
	method: BrewMethod,
	average: BeanBrewParameterSummary,
	best: BeanBrewParameterSummary | null,
) {
	const config = methodConfig(method);
	const extras: Array<[string, string, string]> = [];
	if (config.flow) {
		extras.push(["Flow", average._flow ?? "—", best?._flow ?? "—"]);
	}
	if (config.waterTemp) {
		extras.push([
			"Water temp",
			formatTemp(average.waterTemp),
			formatTemp(best?.waterTemp ?? null),
		]);
	}
	if (config.heat) {
		extras.push(["Heat", average.heat ?? "—", best?.heat ?? "—"]);
	}
	return [
		["Grind", average.grindSize, best?.grindSize ?? "—"],
		[
			"Dose",
			formatWeight(average.beanWeight),
			formatWeight(best?.beanWeight ?? null),
		],
		[
			config.brewWeight.label,
			formatWeight(average.brewWeight),
			formatWeight(best?.brewWeight ?? null),
		],
		[
			config.time.label,
			average.extractionTime ?? "—",
			best?.extractionTime ?? "—",
		],
		["Ratio", formatRatio(average.ratio), formatRatio(best?.ratio ?? null)],
		...extras,
		[
			"Rating",
			formatRating(average._rating),
			formatRating(best?._rating ?? null),
		],
	] as Array<[string, string, string]>;
}

export default function Bean() {
	const { BeanId } = useParams();
	const beanId = Number(BeanId);
	const [searchParams, setSearchParams] = useSearchParams();
	// Unset = the bean's most recent method (resolved by the insights query).
	const methodParam = searchParams.get("method");
	const selectedMethod = isBrewMethod(methodParam) ? methodParam : undefined;

	const allMachines = useAllMachines();
	const allRecipes = useRecipes();
	const bean = useBean(beanId);
	const brewCount = useBrewCountForBeanId(beanId);
	const insights = useBeanBrewInsights(beanId, selectedMethod);
	const allBrews = useBrewsForBeanId(beanId);

	const machineNameById = new Map(allMachines.map((m) => [m.id, m.name]));
	const recipeById = new Map(allRecipes.map((r) => [r.id, r]));
	const multiMethod = (insights?.methods.length ?? 0) > 1;
	const method = insights?.method;
	const methodLabel = method ? methodConfig(method).label.toLowerCase() : "";
	// With more than one method, the ledger follows the switch too.
	const brews =
		multiMethod && method
			? allBrews?.filter((brew) => methodConfig(brew.method).method === method)
			: allBrews;
	const shownCount = brews?.length ?? brewCount;

	function selectMethod(next: BrewMethod) {
		setSearchParams(
			(prev) => {
				prev.set("method", next);
				return prev;
			},
			{ replace: true },
		);
	}

	if (!bean) {
		return (
			<div className="flex h-64 items-center justify-center">
				<p className="font-sans text-muted-foreground">Loading…</p>
			</div>
		);
	}

	const swatch = getColorSwatch(bean.dominantNote);

	const beanMeta = [
		bean.origin?.join(", "),
		bean.dominantNote,
		bean.process?.join(", "),
	]
		.filter(Boolean)
		.join(" · ");

	const detailChips = [
		bean.botanic,
		bean.designation,
		...(bean.variety ?? []),
	].filter(Boolean);
	const statRows = insights
		? buildStatRows(insights.method, insights.average, insights.best)
		: [];

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6">
			<Link
				to={`/home?bean=${beanId}`}
				className="inline-flex items-center gap-1.5 font-data text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft size={13} />
				All beans
			</Link>

			{/* Bean header */}
			<div
				className={`${swatch.bg} border border-foreground/15 shadow-sm shadow-foreground/5 ring-1 ring-inset ring-background/50 dark:border-border dark:shadow-none dark:ring-0`}
			>
				<div className="px-6 py-5">
					<p className={`font-display text-3xl font-semibold ${swatch.text}`}>
						{bean.name}
					</p>
					{bean.brand && (
						<p
							className={`mt-0.5 font-data text-xs uppercase tracking-[0.16em] ${swatch.secondaryText}`}
						>
							{bean.brand}
						</p>
					)}
					<p
						className={`mt-2 font-data text-xs uppercase tracking-[0.12em] ${swatch.secondaryText}`}
					>
						{beanMeta}
					</p>
					<div className={`mt-3 ${swatch.secondaryText}`}>
						<RoastDots level={bean.roastLevel} />
					</div>
				</div>

				{detailChips.length > 0 && (
					<div
						className={`${swatch.secondaryBg} flex flex-wrap gap-x-4 gap-y-1 border-t border-foreground/15 px-6 py-3 dark:border-border/20`}
					>
						{detailChips.map((chip) => (
							<span
								key={chip}
								className={`font-data text-[10px] uppercase tracking-widest ${swatch.secondaryText}`}
							>
								{chip}
							</span>
						))}
					</div>
				)}

				{bean.flavors?.length > 0 && (
					<div className="flex flex-wrap gap-2 border-t border-foreground/15 bg-background/20 px-6 py-3 backdrop-blur-sm dark:border-border/20 dark:bg-transparent dark:backdrop-blur-none">
						{bean.flavors.map((f) => (
							<span
								key={f}
								className={`border ${swatch.borderColor} px-2.5 py-0.5 font-data text-[10px] uppercase tracking-widest ${swatch.text}`}
							>
								{f}
							</span>
						))}
					</div>
				)}
			</div>

			{/* Verdict + next shot */}
			<div className="flex flex-col gap-4 rounded-xl border border-line bg-paper-raised p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-2">
					<p className="eyebrow">Your verdict on this bean</p>
					<BeanVerdictPicker beanId={bean.id} status={bean.status} />
				</div>
				<Button asChild variant="ink" className="shrink-0">
					<Link to={`/log/brew?bean=${beanId}`}>Log a brew with this bean</Link>
				</Button>
			</div>

			{/* Charts */}
			{insights && (
				<BestBrewPanel
					insights={insights}
					brewCount={brewCount}
					bean={bean}
					withHeader={false}
					withGraph={true}
					withBarChart={true}
					onMethodChange={selectMethod}
				/>
			)}

			{/* Target parameters */}
			{insights && (
				<div className="space-y-4 rounded-xl border border-line bg-paper-raised p-5 shadow-card">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="font-data text-xs uppercase tracking-[0.16em] text-muted-foreground">
								{multiMethod
									? `${methodConfig(insights.method).label} settings`
									: "Brew settings"}
							</p>
							<p className="mt-1 font-sans text-xs text-muted-foreground">
								Average vs best from{" "}
								{insights.best
									? `${insights.best._basedOnCount} ${
											insights.best.usesTopRatedBrews
												? "top-rated"
												: "highest-rated"
										} brew${insights.best._basedOnCount !== 1 ? "s" : ""}`
									: "rated brews"}
							</p>
						</div>
						{insights._dialIn.isDialedIn && (
							<span className="inline-flex items-center gap-1.5 font-data text-[10px] uppercase tracking-widest text-primary">
								<CheckCircle size={12} />
								Dialed in
							</span>
						)}
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{statRows.map(([label, averageValue, bestValue]) => (
							<div
								key={label}
								className="rounded-lg border border-line bg-paper-raised p-3 shadow-card"
							>
								<p className="font-data text-[10px] uppercase tracking-widest text-muted-foreground">
									{label}
								</p>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<div className="min-w-0 rounded-md border border-line bg-paper-sunken px-2 py-1.5">
										<p className="font-data text-[9px] uppercase tracking-widest text-muted-foreground">
											Avg
										</p>
										<p className="truncate font-sans text-sm font-medium">
											{averageValue}
										</p>
									</div>
									<div className="min-w-0 rounded-md border border-line bg-paper-sunken/60 px-2 py-1.5">
										<div className="flex items-center gap-1.5">
											<span
												className={`h-1.5 w-1.5 shrink-0 ${swatch.stripe}`}
											/>
											<p className="font-data text-[9px] uppercase tracking-widest text-muted-foreground">
												Best
											</p>
										</div>
										<p className="truncate font-sans text-sm font-semibold">
											{bestValue}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Brew history */}
			<div className="space-y-3">
				<p className="font-data text-xs uppercase tracking-[0.16em] text-muted-foreground">
					{shownCount} {multiMethod ? `${methodLabel} ` : ""}brew
					{shownCount !== 1 ? "s" : ""}
					{multiMethod ? ` · ${brewCount} in all` : ""}
				</p>

				{brews === undefined && (
					<div className="space-y-2">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-17 animate-pulse rounded border border-line bg-paper-sunken"
							/>
						))}
					</div>
				)}

				{brews?.length === 0 && (
					<div className="space-y-3 rounded-xl border border-dashed border-line-strong bg-paper-raised/50 p-10 text-center">
						<p className="font-display text-2xl text-foreground/60">
							No brews yet
						</p>
						<p className="font-sans text-sm text-muted-foreground">
							Log your first brew with this bean.
						</p>
						<Button asChild variant="ink" className="mt-2">
							<Link to={`/log/brew?bean=${beanId}`}>Log a brew</Link>
						</Button>
					</div>
				)}

				{brews && brews.length > 0 && (
					<div className="rounded-xl border border-line bg-paper-raised shadow-card">
						{brews.map((brew) => (
							<BrewLedgerRow
								key={brew.id}
								brew={brew}
								machineName={
									brew.machineId
										? machineNameById.get(brew.machineId)
										: undefined
								}
								bean={bean}
								recipe={
									brew.recipeId != null
										? recipeById.get(brew.recipeId)
										: undefined
								}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
