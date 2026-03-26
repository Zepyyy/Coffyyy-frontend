import { cn, colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";

export default function OptionChips({
	options,
	value,
	onChange,
	unknown,
	withDot,
}: {
	options: string[];
	value: string;
	onChange: (v: string) => void;
	unknown?: string;
	withDot?: boolean;
}) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(value === opt ? "" : opt)}
					className={cn(
						"flex items-center gap-1.5 border px-3 py-1.5 font-Recursive text-sm transition-all",
						opt === unknown
							? value === opt
								? "border-primary bg-primary/5 text-primary-900 dark:text-primary-200 border-dashed"
								: "border-primary/30 bg-background text-muted-foreground hover:border-primary hover:text-foreground border-dashed"
							: value === opt
								? "border-primary/30 bg-primary/15 text-primary-900 dark:text-primary-200"
								: "border-border bg-background text-muted-foreground hover:border-primary/60 hover:dark:border-primary/40 hover:text-foreground",
					)}
				>
					{withDot && (
						<span
							className={`w-2 h-2 rounded-full ${colorSwatch[opt as Beans["dominantNote"]]?.secondaryBgColor}`}
						/>
					)}
					{opt}
				</button>
			))}
		</div>
	);
}
