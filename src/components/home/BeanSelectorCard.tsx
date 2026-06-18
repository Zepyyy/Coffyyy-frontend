import {
	Apple,
	Cake,
	Citrus,
	Cookie,
	FileQuestion,
	FireExtinguisher,
	Flower,
	Leaf,
	type LucideIcon,
	Salad,
} from "lucide-react";
import { colorSwatch } from "@/lib/utils";
import type { BeanCardProps, Beans } from "@/types/BeanTypes";
import RoastDots from "./RoastDots";

const noteIcon: Partial<Record<Beans["dominantNote"], LucideIcon>> = {
	Fruity: Apple,
	Nutty: Cookie,
	Floral: Flower,
	Green: Leaf,
	Roasted: FireExtinguisher,
	Sour: Citrus,
	Spices: Salad,
	Sweet: Cake,
};

export default function BeanSelectorCard({
	bean,
	selected,
	onClick,
}: {
	bean: BeanCardProps;
	selected: boolean;
	onClick: () => void;
}) {
	const swatch = colorSwatch[bean.dominantNote] ?? colorSwatch.default;
	const NoteIcon = noteIcon[bean.dominantNote] ?? FileQuestion;

	return (
		<button
			type="button"
			onClick={onClick}
			className={`relative overflow-hidden border text-start transition-all cursor-pointer ${
				selected
					? `${swatch.bg} ${swatch.border}`
					: "border-border bg-background hover:border-primary/30"
			}`}
		>
			<div className={`h-1 w-full absolute top-0 mb-1 ${swatch.stripe}`} />
			<div className="p-3 space-y-2">
				<div className="flex items-start justify-between gap-2">
					<p
						className={`font-Lora text-lg font-semibold leading-snug line-clamp-2 ${selected ? swatch.text : "text-foreground/90"}`}
					>
						{bean.name}
					</p>
					<NoteIcon
						className={`size-5 shrink-0 mt-0.5 ${selected ? swatch.text : "text-muted-foreground/40"}`}
						strokeWidth={1.5}
					/>
				</div>
				<p
					className={`font-Mono text-[9px] uppercase tracking-widest ${selected ? swatch.secondaryText : "text-muted-foreground"}`}
				>
					{bean.variety?.join(", ")}
				</p>
				{/* Roast level bar */}
				<div
					className={`${selected ? swatch.text : "text-muted-foreground/50"}`}
				>
					<RoastDots level={bean.roastLevel} />
				</div>
			</div>
		</button>
	);
}
