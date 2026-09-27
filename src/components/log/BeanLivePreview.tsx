import { getColorSwatch } from "@/lib/utils";
import RoastDots from "@/components/home/RoastDots";
import type { BeanForm } from "@/types/BeanTypes";

/**
 * The library card the bean will become, rendered live next to the form.
 */
export default function BeanLivePreview({ form }: { form: BeanForm }) {
	const swatch = getColorSwatch(form.dominantNote);
	const roast = Number(form.roastLevel);
	const meta = [form.origin[0], form.brand].filter(Boolean).join(" · ");

	return (
		<div className="rounded-xl border border-line bg-paper-raised shadow-card">
			<div className="relative overflow-hidden border-b border-line/60 bg-paper-sunken/40 p-4">
				<div className="flex items-start justify-between gap-2">
					<p className="line-clamp-2 font-display text-lg font-semibold leading-snug tracking-tight text-foreground/90">
						{form.name || "Bean name"}
					</p>
					<span
						className={`mt-1.5 size-2 shrink-0 ${form.dominantNote ? swatch.stripe : "bg-line-strong"}`}
						aria-hidden
					/>
				</div>
				<p
					className={`mt-0.5 truncate font-data text-[9px] uppercase tracking-widest ${meta ? swatch.secondaryText : "text-muted-foreground/50"}`}
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
							className="rounded-md border border-line bg-paper-sunken px-1.5 py-0.5 font-data text-[9px] uppercase tracking-[0.1em] text-ink-faint"
						>
							{flavor}
						</span>
					))}
					{form.flavors.length === 0 && (
						<span className="font-sans text-xs text-muted-foreground/50">
							Flavors will appear here.
						</span>
					)}
				</div>
				{form.variety.length > 0 && (
					<p className="font-sans text-xs text-muted-foreground">
						{form.variety.join(", ")}
					</p>
				)}
			</div>
		</div>
	);
}
