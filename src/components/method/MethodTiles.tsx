import { methodConfig } from "@/lib/brewMethods";
import { methodInkClass } from "@/lib/methodIdentity";
import { cn } from "@/lib/utils";
import type { RecipeMethod } from "@/types/RecipeTypes";
import { MethodStamp } from "./MethodMarks";

const GIST: Record<RecipeMethod, string> = {
	espresso: "Short, dense, under pressure",
	"pour-over": "Long, clear, poured by hand",
};

/**
 * Method choice as two stamped tiles; the chosen one takes its ink. When
 * `locked`, only the chosen method shows.
 */
export default function MethodTiles({
	methods,
	value,
	onChange,
	locked,
	lockedNote = "Fixed once saved",
	className,
}: {
	methods: readonly RecipeMethod[];
	value: RecipeMethod;
	onChange: (method: RecipeMethod) => void;
	locked?: boolean;
	lockedNote?: string;
	className?: string;
}) {
	const shown = locked ? methods.filter((m) => m === value) : methods;
	return (
		<div
			role="radiogroup"
			aria-label="Method"
			className={cn("grid grid-cols-2 gap-2", className)}
		>
			{shown.map((method) => {
				const active = method === value;
				return (
					<button
						key={method}
						type="button"
						role="radio"
						aria-checked={active}
						disabled={locked}
						onClick={() => onChange(method)}
						className={cn(
							methodInkClass(method),
							"flex items-center gap-3 px-3 py-3 text-left transition-[opacity,background-color] sm:gap-4 sm:px-4",
							locked && "col-span-2 cursor-default",
							active
								? "method-wash method-line border-[1.5px]"
								: "border border-line opacity-55 hover:opacity-100",
						)}
					>
						<MethodStamp
							method={method}
							size="lg"
							label={false}
							className="max-sm:size-12 max-sm:[&_svg]:size-9"
						/>
						<span className="min-w-0">
							<span className="method-ink block whitespace-nowrap font-data text-[11px] font-semibold uppercase tracking-[0.1em] sm:tracking-[0.18em]">
								{methodConfig(method).label}
							</span>
							<span className="hidden truncate font-sans text-xs text-muted-foreground sm:block">
								{locked ? lockedNote : GIST[method]}
							</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}
