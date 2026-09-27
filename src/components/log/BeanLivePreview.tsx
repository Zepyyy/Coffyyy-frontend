import {
	Apple,
	Cake,
	Citrus,
	Cookie,
	FileQuestion,
	Flower,
	FireExtinguisher,
	type LucideIcon,
	Leaf,
	Salad,
} from "lucide-react";
import { getColorSwatch } from "@/lib/utils";
import RoastDots from "@/components/home/RoastDots";
import type { BeanForm } from "@/types/BeanTypes";

const noteIcon: Partial<Record<string, LucideIcon>> = {
	Fruity: Apple,
	Nutty: Cookie,
	Floral: Flower,
	Green: Leaf,
	Roasted: FireExtinguisher,
	Sour: Citrus,
	Spices: Salad,
	Sweet: Cake,
};

/**
 * The library card the bean will become, rendered live next to the form.
 */
export default function BeanLivePreview({ form }: { form: BeanForm }) {
	const swatch = getColorSwatch(form.dominantNote);
	const NoteIcon = noteIcon[form.dominantNote] ?? FileQuestion;
	const roast = Number(form.roastLevel);
	const meta = [form.origin[0], form.brand].filter(Boolean).join(" · ");

	return (
		<div className="border border-border bg-background">
			<div className={`relative overflow-hidden p-4 ${swatch.secondaryBg}`}>
				<div className={`absolute inset-x-0 top-0 h-1 ${swatch.stripe}`} />
				<div className="flex items-start justify-between gap-2">
					<p
						className={`font-Lora text-lg font-semibold leading-snug line-clamp-2 ${form.name ? swatch.text : "text-muted-foreground/60"}`}
					>
						{form.name || "Bean name"}
					</p>
					<NoteIcon
						className={`size-5 shrink-0 mt-0.5 ${form.dominantNote ? swatch.text : "text-muted-foreground/40"}`}
						strokeWidth={1.5}
					/>
				</div>
				<p
					className={`mt-0.5 truncate font-Mono text-[9px] uppercase tracking-widest ${meta ? swatch.secondaryText : "text-muted-foreground/50"}`}
				>
					{meta || "Origin · roaster"}
				</p>
			</div>
			<div className="space-y-2.5 p-4">
				<div
					className={form.roastLevel ? swatch.text : "text-muted-foreground/40"}
				>
					<RoastDots level={Number.isFinite(roast) && roast > 0 ? roast : 0} />
				</div>
				<div className="flex flex-wrap gap-1">
					{form.flavors.slice(0, 4).map((flavor) => (
						<span
							key={flavor}
							className="border border-border/70 bg-muted/40 px-1.5 py-0.5 font-Mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground"
						>
							{flavor}
						</span>
					))}
					{form.flavors.length === 0 && (
						<span className="font-Recursive text-xs text-muted-foreground/50">
							Flavors will appear here.
						</span>
					)}
				</div>
				{form.variety.length > 0 && (
					<p className="font-Recursive text-xs text-muted-foreground">
						{form.variety.join(", ")}
					</p>
				)}
			</div>
		</div>
	);
}
