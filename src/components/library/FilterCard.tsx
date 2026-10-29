import { cn } from "@/lib/utils";

type FilterOption = {
	label: string;
	count: number;
	active: boolean;
};

export default function FilterCard({
	title,
	options,
	onToggle,
}: {
	title: string;
	options: FilterOption[];
	onToggle: (label: string) => void;
}) {
	return (
		<div className="rounded-xl border border-line bg-paper-raised shadow-card">
			<section className="p-4 pb-3">
				<p className="font-display text-xl italic tracking-tight text-foreground/90">
					{title}
				</p>
			</section>
			<div className="squiggly-line opacity-25 scale-y-50" />
			<section className="p-3">
				<ul className="grid grid-cols-1 space-y-1">
					{options.map((option) => (
						<li key={option.label}>
							<button
								type="button"
								aria-pressed={option.active}
								className={cn(
									"group flex min-h-11 w-full items-center justify-between gap-4 px-2 py-1.5 text-left transition-colors active:translate-y-px",
									option.active
										? "bg-crema-tint text-foreground"
										: "text-ink-soft hover:bg-paper-sunken hover:text-foreground",
								)}
								onClick={() => onToggle(option.label)}
							>
								<span className="font-data text-xs uppercase tracking-[0.08em]">
									{option.label}
								</span>
								<span
									className={cn(
										"px-2 py-0.5 font-data text-[10px]",
										option.active
											? "bg-crema text-paper"
											: "bg-paper-sunken text-ink-faint",
									)}
								>
									{option.count}
								</span>
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
