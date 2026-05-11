import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	XAxis,
	YAxis,
} from "recharts";
import TasteStrengthChart from "@/components/home/TasteStrengthChart";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { BeanBrewInsights } from "@/types/BrewTypes";

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
}: {
	insights: BeanBrewInsights;
	brewCount: number;
	bean: Beans;
}) {
	const swatch = colorSwatch[bean.dominantNote] ?? colorSwatch.default;
	const chartData = buildGrindAverageChartData(insights.recentBrewScores);
	const n = chartData.length;
	const chartConfig = {
		avgRating: {
			label: "Avg Rating",
			color: `${swatch.var}`,
		},
	} satisfies ChartConfig;

	return (
		<div className="border border-border backdrop-blur-sm">
			{/* Header */}
			<div
				className={`px-5 py-4 ${swatch.secondaryBg} flex items-center justify-between gap-4`}
			>
				<div>
					<p className={`font-Lora font-semibold text-xl ${swatch.text}`}>
						{bean.name}
					</p>
					<p
						className={`font-Mono text-xs uppercase tracking-[0.16em] ${swatch.secondaryText} mt-0.5`}
					>
						{[
							bean.origin.join(", "),
							bean.dominantNote,
							bean.process?.join(", "),
						]
							.filter(Boolean)
							.join(" · ")}
					</p>
				</div>
				<div className="text-right shrink-0">
					<p
						className={`font-Mono text-xs uppercase tracking-[0.12em] ${swatch.secondaryText}`}
					>
						{brewCount} brew{brewCount !== 1 ? "s" : ""}
					</p>
					<p
						className={`font-Mono text-xs uppercase tracking-widest ${swatch.secondaryText} opacity-70 mt-0.5`}
					>
						{insights.target.usesTopRatedBrews
							? "top-rated avg"
							: "all brews avg"}
					</p>
				</div>
			</div>

			{/* Chart + past data */}
			<div className="grid sm:grid-cols-[220px_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">
				<div className="p-5">
					<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground mb-4">
						Extraction profile
					</p>
					<TasteStrengthChart points={insights.recentBrewScores} />
				</div>
				<div className="p-5">
					<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
						Average rating by grind size
					</p>
					{n === 0 ? (
						<p className="font-Mono text-xs text-muted-foreground mt-4">
							No brew data yet
						</p>
					) : (
						<div className={`relative`}>
							<ChartContainer
								config={chartConfig}
								className="min-h-20 w-full max-h-54 pt-4"
							>
								<BarChart
									data={chartData}
									accessibilityLayer
									margin={{ top: 20 }}
									maxBarSize={54}
								>
									<CartesianGrid strokeDasharray="2 4" />
									<XAxis
										dataKey="grindSize"
										domain={[0, 20]}
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 12 }}
										tickMargin={8}
										interval={0}
									/>
									<YAxis
										dataKey="avgRating"
										domain={[0, 5]}
										tickLine={false}
										axisLine={false}
										tick={{ fontSize: 12 }}
										tickMargin={4}
										allowDecimals={false}
										interval={0}
										hide
									/>
									<ChartTooltip
										content={<ChartTooltipContent indicator="dot" hideLabel />}
									/>
									{/*<Bar
										dataKey="brewCount"
										fill="var(--color-brewCount)"
										opacity={0.8}
										radius={[2, 2, 0, 0]}
									>
										<LabelList
											position={"top"}
											offset={12}
											fontSize={12}
											className="fill-foreground"
											dataKey={"brewCount"}
										/>
									</Bar>*/}

									<Bar
										dataKey="avgRating"
										fill="var(--color-avgRating)"
										radius={[2, 2, 0, 0]}
									>
										<LabelList
											position={"top"}
											offset={12}
											fontSize={12}
											className="fill-foreground"
											dataKey={"avgRating"}
										/>
									</Bar>
									<ChartLegend content={<ChartLegendContent />} />
								</BarChart>
							</ChartContainer>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
