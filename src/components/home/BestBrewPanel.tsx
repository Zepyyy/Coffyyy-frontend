import TasteStrengthChart from "@/components/home/TasteStrengthChart";
import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { BeanBrewInsights } from "@/types/BrewTypes";

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

	const doseYield =
		insights.target.beanWeight != null && insights.target.espressoWeight != null
			? `${Number(insights.target.beanWeight.toFixed(1))}g → ${Number(insights.target.espressoWeight.toFixed(1))}g`
			: insights.target.beanWeight != null
				? `${Number(insights.target.beanWeight.toFixed(1))}g`
				: "—";

	const hasChartData = insights.recentBrewScores.some(
		(s) => s.taste != null && s.strength != null,
	);

	const adjustmentsBlock = (
		<div className="space-y-3">
			<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
				Next adjustment
			</p>
			{insights.adjustments.length > 0 ? (
				insights.adjustments.map((adj) => (
					<p
						key={adj.title}
						className="font-Recursive text-base font-medium text-foreground/90"
					>
						→ {adj.title}
					</p>
				))
			) : (
				<p className="font-Recursive text-sm text-muted-foreground">
					Rate the latest brew to get a recommendation.
				</p>
			)}
		</div>
	);

	return (
		<div className="border border-border overflow-hidden backdrop-blur-sm">
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

			{/* Key metrics */}
			<div className="grid grid-cols-3 border-b border-border">
				<div className="p-5 border-r border-border">
					<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
						Grind
					</p>
					<p className="font-News text-5xl leading-none mt-2">
						{insights.target.grindSize}
					</p>
				</div>
				<div className="p-5 border-r border-border">
					<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
						Dose → Yield
					</p>
					<p className="font-News text-2xl leading-none mt-2 text-foreground/90">
						{doseYield}
					</p>
					{insights.target.ratio != null && (
						<p className="font-Mono text-[10px] text-muted-foreground mt-1.5">
							1 : {insights.target.ratio.toFixed(1)}
						</p>
					)}
				</div>
				<div className="p-5">
					<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
						Time
					</p>
					<p className="font-News text-2xl leading-none mt-2 text-foreground/90">
						{insights.target.extractionTime ?? "—"}
					</p>
				</div>
			</div>

			{/* Chart + adjustments */}
			{hasChartData ? (
				<div className="grid sm:grid-cols-[220px_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border">
					<div className={`p-5 ${swatch.text}`}>
						<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground mb-4">
							Extraction profile
						</p>
						<TasteStrengthChart points={insights.recentBrewScores} />
					</div>
					<div className="p-5">{adjustmentsBlock}</div>
				</div>
			) : (
				<div className="p-5">{adjustmentsBlock}</div>
			)}
		</div>
	);
}
