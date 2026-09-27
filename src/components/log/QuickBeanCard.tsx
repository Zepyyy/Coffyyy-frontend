import { Check } from "lucide-react";
import { getColorSwatch } from "@/lib/utils";
import type { BeanCardProps } from "@/types/BeanTypes";

export default function QuickBeanCard({
	bean,
	selected,
	onClick,
}: {
	bean: BeanCardProps;
	selected?: boolean;
	onClick?: () => void;
}) {
	const swatch = getColorSwatch(bean.dominantNote);
	return (
		<button
			type="button"
			data-slot="toggle"
			className={`hover-line relative h-fit cursor-pointer rounded-xl border text-start shadow-card transition-colors ${
				selected
					? "border-crema bg-crema-tint ring-1 ring-crema/40"
					: "border-line bg-paper-raised hover:border-line-strong"
			}`}
			onClick={() => onClick?.()}
		>
			<div className={`h-1.5 w-full ${swatch.stripe}`} />
			<div className="px-2.5 py-2">
				<p className="line-clamp-1 font-display text-base font-semibold leading-snug tracking-tight text-foreground">
					{bean.name}
				</p>
				<p className="mt-0.5 font-data text-[10px] uppercase tracking-[0.14em] text-ink-faint">
					{bean.origin.join(", ")}
				</p>
			</div>
			{selected && (
				<div className="absolute right-1.5 top-2.5 flex size-4 items-center justify-center bg-ink">
					<Check className="size-2.5 text-paper" />
				</div>
			)}
		</button>
	);
}
