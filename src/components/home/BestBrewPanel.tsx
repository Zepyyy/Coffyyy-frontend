import { formatStrengthLabel, formatTasteLabel } from "@/lib/api/stats";
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
	const metrics = [
		{ label: "Grind Size", value: insights.target.grindSize, accent: true },
		{
			label: "Bean In",
			value:
				insights.target.beanWeight != null
					? `${Number(insights.target.beanWeight.toFixed(1))}g`
					: "—",
			accent: true,
		},
		{
			label: "Espresso Out",
			value:
				insights.target.espressoWeight != null
					? `${Number(insights.target.espressoWeight.toFixed(1))}g`
					: "—",
			accent: true,
		},
		{
			label: "Ratio",
			value:
				insights.target.ratio != null
					? `1 : ${insights.target.ratio.toFixed(1)}`
					: "—",
			accent: true,
		},
		{
			label: "Extraction",
			value: insights.target.extractionTime || "—",
			accent: false,
		},
		{ label: "Flow", value: insights.target.flow || "—", accent: false },
		{
			label: "Taste Axis",
			value: formatTasteLabel(insights.target.tasteScore),
			accent: false,
		},
		{
			label: "Strength Axis",
			value: formatStrengthLabel(insights.target.strengthScore),
			accent: false,
		},
	];

	return (
		<div className="border border-border overflow-hidden backdrop-blur-sm">
			<div
				className={`px-4 py-3 ${swatch.secondaryBg} backdrop-blur-xs flex items-center justify-between gap-4`}
			>
				<div>
					<p className={`font-Lora font-semibold text-lg ${swatch.text}`}>
						{bean.name}
					</p>
					<p
						className={`font-Mono text-[9px] uppercase tracking-[0.16em] ${swatch.secondaryText}`}
					>
						{[
							bean.origin.join(", "),
							bean.process?.join(", "),
							bean.dominantNote,
						]
							.filter(Boolean)
							.join(" · ")}
					</p>
				</div>
				<div className="text-right">
					<p
						className={`font-Mono text-[9px] uppercase tracking-[0.16em] ${swatch.secondaryText}`}
					>
						Recommended settings
					</p>
					<p
						className={`font-Mono text-[9px] uppercase tracking-[0.12em] ${swatch.secondaryText}`}
					>
						{insights.target.usesTopRatedBrews
							? "Top-rated brew average"
							: "All brew average"}{" "}
						· {insights.target.basedOnCount} sample
						{insights.target.basedOnCount > 1 ? "s" : ""}
					</p>
				</div>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4">
				{metrics.map((metric, index) => (
					<div
						key={metric.label}
						className={`space-y-1 p-4 border-border ${index < 4 ? "border-b" : ""} ${index % 4 !== 3 ? "border-r" : ""}`}
					>
						<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
							{metric.label}
						</p>
						<p
							className={`font-News text-2xl leading-none ${metric.accent ? "text-primary-700 dark:text-primary-200" : "text-foreground/90"}`}
						>
							{metric.value}
						</p>
					</div>
				))}
			</div>
			<div className="border-t border-border bg-background/60 px-4 py-3 space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
						Next adjustment
					</p>
					<p className="font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
						{brewCount} brew{brewCount > 1 ? "s" : ""} with this bean
					</p>
				</div>
				{insights.adjustments.length > 0 ? (
					<div className="grid gap-2 sm:grid-cols-2">
						{insights.adjustments.map((adjustment) => (
							<div
								key={adjustment.title}
								className="border border-border/70 px-3 py-2 space-y-1"
							>
								<p className="font-Recursive text-sm font-semibold text-foreground/90">
									{adjustment.title}
								</p>
								<p className="font-Recursive text-xs text-muted-foreground">
									{adjustment.detail}
								</p>
							</div>
						))}
					</div>
				) : (
					<p className="font-Recursive text-sm text-muted-foreground">
						Rate the latest brew to get a sour/bitter and weak/strong
						adjustment.
					</p>
				)}
			</div>
		</div>
	);
}
