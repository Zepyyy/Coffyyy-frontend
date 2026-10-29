import { Link } from "react-router";
import { type ChartConfig } from "@/components/ui/chart";
import { methodExtras, recipeLine } from "@/lib/brewFormat";
import { methodConfig } from "@/lib/brewMethods";
import { getColorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type {
	BeanBrewInsights,
	BeanBrewParameterSummary,
	BrewMethod,
} from "@/types/BrewTypes";
import BeanBarChart from "./BeanBarChart";
import BeanGraph from "./BeanGraph";
import BeanHeader from "./BeanHeader";
import MethodSwitch from "./MethodSwitch";

/** The derived target as one line: "grind 12.3 · 18g → 36g · 1:2 · 28s · even". */
function targetLine(summary: BeanBrewParameterSummary): string {
	const grams = (value: number | null) =>
		value == null ? null : `${Number(value.toFixed(1))}g`;
	const dose = grams(summary.beanWeight);
	return [
		summary.grindSize !== "—" ? `grind ${summary.grindSize}` : null,
		dose ? `${dose} → ${grams(summary.brewWeight) ?? "?"}` : null,
		summary.ratio != null ? `1:${Number(summary.ratio.toFixed(1))}` : null,
		summary.extractionTime,
		...methodExtras({
			method: summary.method,
			flow: summary._flow === "—" ? undefined : (summary._flow ?? undefined),
			waterTemp:
				summary.waterTemp == null
					? undefined
					: Number(summary.waterTemp.toFixed(0)),
			heat: summary.heat ?? undefined,
		}),
	]
		.filter(Boolean)
		.join(" · ");
}

function buildGrindAverageChartData(
	points: BeanBrewInsights["recentBrewScores"],
) {
	const groupedByGrind = new Map<
		number,
		{ totalRating: number; brewCount: number }
	>();

	for (const point of points) {
		if (point.grindSize == null || point.rating == null) continue;

		const current = groupedByGrind.get(point.grindSize) ?? {
			totalRating: 0,
			brewCount: 0,
		};

		current.totalRating += point.rating;
		current.brewCount += 1;

		groupedByGrind.set(point.grindSize, current);
	}

	return Array.from(groupedByGrind.entries())
		.map(([grindSize, { totalRating, brewCount }]) => ({
			grindSize,
			avgRating: (totalRating / brewCount).toPrecision(2),
			brewCount,
		}))
		.sort((a, b) => a.grindSize - b.grindSize);
}

export default function BestBrewPanel({
	insights,
	brewCount,
	bean,
	withHeader,
	withBarChart,
	withGraph,
	withLastBrew,
	onMethodChange,
}: {
	insights: BeanBrewInsights;
	brewCount: number;
	bean: Beans;
	withHeader?: boolean;
	withBarChart?: boolean;
	withGraph?: boolean;
	/** Show the last brew and the derived target for this method. */
	withLastBrew?: boolean;
	/** Shows the method switch (only when the bean has brews in >1 method). */
	onMethodChange?: (method: BrewMethod) => void;
}) {
	const config = methodConfig(insights.method);
	const lastBrew = insights._lastBrew;
	const showSwitch = onMethodChange && insights.methods.length > 1;
	const swatch = getColorSwatch(bean.dominantNote);
	const chartData = buildGrindAverageChartData(insights.recentBrewScores);
	const chartConfig = {
		avgRating: {
			label: "Avg Rating",
			color: `${swatch.var}`,
		},
	} satisfies ChartConfig;

	return (
		<div className="rounded-xl border border-line bg-paper-raised shadow-card">
			{/* Header */}
			{withHeader && (
				<BeanHeader bean={bean} brewCount={brewCount} insights={insights} />
			)}

			{showSwitch && (
				<div className="flex items-center justify-between gap-4 border-b border-line/60 px-5 pt-3 pb-1.5">
					<MethodSwitch
						methods={insights.methods}
						value={insights.method}
						onChange={onMethodChange}
					/>
					<span className="font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
						{insights._dialIn.totalBrews} {config.label.toLowerCase()}
					</span>
				</div>
			)}

			{withLastBrew && lastBrew && (
				<div className="grid gap-x-6 gap-y-2 border-b border-line/60 px-5 py-3 sm:grid-cols-2">
					<div className="min-w-0">
						<p className="eyebrow">
							Last {showSwitch ? config.label.toLowerCase() : "brew"}
						</p>
						<p className="mt-1 truncate font-data text-xs text-foreground/90">
							{recipeLine(lastBrew)}
						</p>
					</div>
					<div className="flex min-w-0 items-end justify-between gap-3">
						<div className="min-w-0">
							<p className="eyebrow">
								{insights.best ? "Aim for" : "Your average"}
							</p>
							<p className="mt-1 truncate font-data text-xs font-semibold text-foreground">
								{targetLine(insights.target)}
							</p>
						</div>
						<Link
							to={`/log/brew?bean=${bean.id}`}
							className="shrink-0 font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-foreground"
						>
							<span className="word-link">Brew →</span>
						</Link>
					</div>
				</div>
			)}

			{/* Chart + past data */}
			<div className="grid min-w-0 grid-cols-[minmax(0,1fr)] divide-line divide-y sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:divide-y-0 sm:divide-x">
				{withGraph && <BeanGraph ChartData={insights.recentBrewScores} />}

				{withBarChart && (
					<BeanBarChart chartConfig={chartConfig} chartData={chartData} />
				)}
			</div>
		</div>
	);
}
