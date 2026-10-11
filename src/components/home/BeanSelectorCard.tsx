import { getColorSwatch } from "@/lib/utils";
import { verdictOption } from "@/lib/verdict";
import type { BeanCardProps } from "@/types/BeanTypes";
import RoastDots from "./RoastDots";

/** Compact bag-label card: origin eyebrow, display name, roast spectrum. */
export default function BeanSelectorCard({
	bean,
	selected,
	onClick,
}: {
	bean: BeanCardProps;
	selected: boolean;
	onClick: () => void;
}) {
	const swatch = getColorSwatch(bean.dominantNote);
	const verdict = verdictOption(bean.status);

	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={selected}
			className={`hover-line group relative cursor-pointer rounded-xl border p-3.5 text-start shadow-card ${
				selected
					? "border-crema bg-crema-tint ring-1 ring-crema/40"
					: "border-line bg-paper-raised hover:border-line-strong"
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="eyebrow">{bean.origin?.[0] ?? "Blend"}</p>
					<p className="mt-1 line-clamp-2 font-display text-[17px] font-semibold leading-snug tracking-tight text-foreground">
						{bean.name}
					</p>
				</div>
				<div className="mt-1 flex shrink-0 flex-col items-center gap-1.5">
					<span
						className={`size-2 ${swatch.stripe}`}
						title={bean.dominantNote ?? undefined}
						aria-label={bean.dominantNote ?? undefined}
					/>
					{verdict && (
						<span
							className={`size-2 rounded-full ${verdict.dot}`}
							title={verdict.label}
							aria-label={verdict.label}
						/>
					)}
				</div>
			</div>
			<p className="mt-1.5 truncate font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
				{verdict ? verdict.label : (bean.variety?.join(", ") ?? "")}
			</p>
			<div className="mt-3 text-ink-faint">
				<RoastDots level={bean.roastLevel} />
			</div>
		</button>
	);
}
