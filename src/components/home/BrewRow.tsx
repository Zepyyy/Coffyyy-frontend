import type { Brews } from "@/types/BrewTypes";

export default function BrewRow({
	brew,
	beanName,
}: {
	brew: Brews;
	beanName: string;
}) {
	const ratio =
		brew.beanWeight && brew.espressoWeight
			? `1:${(brew.espressoWeight / brew.beanWeight).toFixed(1)}`
			: null;
	const date = new Date(brew.date).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});

	return (
		<div className="flex items-center justify-between border border-border bg-background px-4 py-3 hover:border-foreground/20 transition-colors">
			<div className="flex items-center gap-4 min-w-0">
				<span className="font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground shrink-0 w-12">
					{date}
				</span>
				<div className="min-w-0">
					<p className="font-News text-base leading-snug text-foreground/90 truncate">
						{beanName}
					</p>
					<p className="font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
						{[brew.grindSize, ratio, brew.extractionTime]
							.filter(Boolean)
							.join(" · ")}
					</p>
				</div>
			</div>
			{brew.tasteScore != null ? (
				<div className="flex items-center shrink-0 ml-4">
					<span
						className={`font-News text-base ${
							brew.tasteScore < 0
								? "text-tag-teal-100"
								: brew.tasteScore > 0
									? "text-tag-orange-500"
									: "text-primary-700 dark:text-primary-200"
						}`}
					>
						{brew.tasteScore === 0
							? "Balanced"
							: brew.tasteScore < 0
								? `Sour ${brew.tasteScore}`
								: `Bitter +${brew.tasteScore}`}
					</span>
				</div>
			) : (
				<div className="shrink-0 ml-4">
					<span className="font-Mono text-[9px] uppercase tracking-widest text-muted-foreground/50">
						unrated
					</span>
				</div>
			)}
		</div>
	);
}
