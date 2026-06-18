import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "../ui/chart";

export default function BeanBarChart({
	chartConfig,
	chartData,
}: {
	chartConfig: ChartConfig;
	chartData: {
		grindSize: number;
		avgRating: string;
		brewCount: number;
	}[];
}) {
	const n = chartData.length;

	return (
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
	);
}
