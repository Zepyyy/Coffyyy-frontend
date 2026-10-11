import { cn, formatExtractionTime, formatRelativeDay } from "@/lib/utils";
import { flowClass } from "@/lib/brewFormat";
import type { GrindSettingSummary } from "@/lib/data";

/**
 * Past grind settings for the selected bean, newest use first. Equal ratings
 * stay distinguishable because each row carries the extraction behavior that
 * produced it. Tapping a row sets the grind.
 */
export default function GrindHistoryStrip({
	settings,
	selectedGrind,
	onPick,
}: {
	settings: GrindSettingSummary[];
	selectedGrind?: number;
	onPick: (grindSize: number) => void;
}) {
	if (settings.length === 0) return null;

	return (
		<div className="space-y-2 rounded-xl border border-line bg-paper-sunken/50 p-3.5">
			<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
				Your settings for this bean
			</p>
			<div className="flex flex-wrap gap-1.5">
				{settings.map(({ grindSize, lastBrew, shotCount }) => {
					const active = grindSize === selectedGrind;
					const flow = lastBrew.flow;
					const time = formatExtractionTime(lastBrew.extractionTime);
					return (
						<button
							key={grindSize}
							type="button"
							onClick={() => onPick(grindSize)}
							aria-pressed={active}
							className={cn(
								"flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-start transition-colors",
								active
									? "border-crema bg-crema-tint ring-1 ring-crema/40"
									: "border-line bg-paper-raised hover:border-line-strong",
							)}
						>
							<span className="font-data text-base font-bold leading-none text-foreground">
								{grindSize}
							</span>
							<span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-data text-[10px] uppercase tracking-[0.08em]">
								{flow ? (
									<span className={flowClass(flow)}>{flow.toLowerCase()}</span>
								) : null}
								{time ? <span className="text-ink-soft">{time}</span> : null}
								{lastBrew.overallRating != null ? (
									<span className="text-ink-soft">
										{lastBrew.overallRating}★
									</span>
								) : (
									<span className="text-ink-faint">unrated</span>
								)}
							</span>
							<span className="font-data text-[9px] uppercase tracking-[0.08em] text-ink-faint">
								{shotCount > 1 ? `${shotCount}×` : ""}{" "}
								{formatRelativeDay(lastBrew.date).toLowerCase()}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
