import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";

export default function BestBrewPanel({
	brew,
	brewCount,
	bean,
}: {
	brew: Brews;
	brewCount: number;
	bean: Beans;
}) {
	const swatch = colorSwatch[bean.dominantNote] ?? colorSwatch.default;
	const ratio =
		brew.beanWeight && brew.espressoWeight
			? `1 : ${(brew.espressoWeight / brew.beanWeight).toFixed(1)}`
			: "—";

	const metrics = [
		{ label: "Grind Size", value: brew.grindSize || "—", accent: true },
		{
			label: "Bean In",
			value: brew.beanWeight ? `${brew.beanWeight}g` : "—",
			accent: true,
		},
		{
			label: "Espresso Out",
			value: brew.espressoWeight ? `${brew.espressoWeight}g` : "—",
			accent: true,
		},
		{ label: "Ratio", value: ratio, accent: true },
		{ label: "Extraction", value: brew.extractionTime || "—", accent: false },
		{ label: "Flow", value: brew.flow || "—", accent: false },
		{
			label: "Best Rating",
			value: brew.overallRating ? `${brew.overallRating} / 5` : "—",
			accent: false,
		},
		{
			label: "Total Brews",
			value: String(brewCount),
			sub: "with this bean",
			accent: false,
		},
	];

	return (
		<div className="border border-border overflow-hidden">
			<div
				className={`px-4 py-3 ${swatch.secondaryBg} backdrop-blur-xs flex items-center justify-between`}
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
				<p
					className={`font-Mono text-[9px] uppercase tracking-[0.16em] ${swatch.secondaryText}`}
				>
					Recommended settings
				</p>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-4">
				{metrics.map((m, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: static list
						key={i}
						className={`backdrop-blur-xs space-y-1 p-4 border-border ${i < 4 ? "border-b" : ""} ${i % 4 !== 3 ? "border-r" : ""}`}
					>
						<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
							{m.label}
						</p>
						<p
							className={`font-News text-2xl leading-none ${m.accent ? "text-primary-700 dark:text-primary-200" : "text-foreground/90"}`}
						>
							{m.value}
						</p>
						{m.sub && (
							<p className="font-Mono text-[9px] text-muted-foreground">
								{m.sub}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
