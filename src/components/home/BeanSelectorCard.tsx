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

function RoastDots({ level }: { level: number | undefined }) {
	const levelToShow = level ?? 0;
	return (
		<div className="flex gap-0.5">
			{Array.from({ length: 10 }).map((_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static list
					key={i}
					className={`h-1.5 w-1.5 rounded-full ${i < levelToShow ? "bg-current opacity-70" : "bg-current opacity-15"}`}
				/>
			))}
		</div>
	);
}
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
			<div className={`h-1 w-full ${swatch.stripe}`} />
			<div className="p-3 space-y-2">
				<div className="flex items-start justify-between gap-2">
					<p
						className={`font-Lora text-base font-semibold leading-snug line-clamp-2 ${selected ? swatch.text : "text-foreground/90"}`}
					>
						{bean.name}
					</p>
					<NoteIcon
						className={`size-4 shrink-0 mt-0.5 ${selected ? swatch.text : "text-muted-foreground/40"}`}
						strokeWidth={1.5}
					/>
				</div>
				<p
					className={`font-Mono text-[9px] uppercase tracking-widest ${selected ? swatch.secondaryText : "text-muted-foreground"}`}
				>
					{bean.origin.slice(0, 2).join(", ")}
				</p>
				<div
					className={`${selected ? swatch.text : "text-muted-foreground/50"}`}
				>
					<RoastDots level={bean.roastLevel} />
				</div>
			</div>
		</button>
	);
}
