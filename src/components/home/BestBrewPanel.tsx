import { type ChartConfig } from "@/components/ui/chart";
import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { BeanBrewInsights } from "@/types/BrewTypes";
import BeanBarChart from "./BeanBarChart";
import BeanGraph from "./BeanGraph";
import BeanHeader from "./BeanHeader";

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
}: {
	insights: BeanBrewInsights;
	brewCount: number;
	bean: Beans;
	withHeader?: boolean;
	withBarChart?: boolean;
	withGraph?: boolean;
}) {
	const swatch = colorSwatch[bean.dominantNote] ?? colorSwatch.default;
	const chartData = buildGrindAverageChartData(insights.recentBrewScores);
	const chartConfig = {
		avgRating: {
			label: "Avg Rating",
			color: `${swatch.var}`,
		},
	} satisfies ChartConfig;

	return (
		<div className="border border-border backdrop-blur-sm">
			{/* Header */}
			{withHeader && (
				<BeanHeader
					bean={bean}
					brewCount={brewCount}
					insights={insights}
					swatch={swatch}
				/>
			)}

			{/* Chart + past data */}
			<div className="grid sm:grid-cols-[220px_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">
				{withGraph && <BeanGraph ChartData={insights.recentBrewScores} />}

				{withBarChart && (
					<BeanBarChart chartConfig={chartConfig} chartData={chartData} />
				)}
			</div>
		</div>
	);
}
