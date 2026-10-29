import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
	value: T;
	label: string;
};

/**
 * View switch in the nav's voice: mono uppercase labels, a crema hairline
 * under the active view. No track, no nested boxes — the underline is the
 * whole control, same as the header nav.
 */
export default function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	ariaLabel,
	className,
	disabled,
}: {
	options: Array<SegmentedOption<T>>;
	value: T;
	onChange: (value: T) => void;
	ariaLabel: string;
	className?: string;
	/** Shows the value but locks every option. */
	disabled?: boolean;
}) {
	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn("flex flex-wrap items-center gap-x-5 gap-y-1", className)}
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						aria-pressed={active}
						disabled={disabled}
						className={cn(
							"group relative min-h-11 py-2 font-data text-[11px] uppercase tracking-[0.16em] transition-colors active:translate-y-px disabled:cursor-not-allowed",
							active
								? "text-foreground"
								: "text-ink-faint hover:text-foreground disabled:hover:text-ink-faint",
							disabled && !active && "opacity-50",
						)}
					>
						{option.label}
						<span
							aria-hidden
							className={cn(
								"seg-underline absolute inset-x-0 bottom-0 h-px origin-left bg-crema transition-transform duration-300 ease-soft",
								active
									? "scale-x-100"
									: "scale-x-0 group-enabled:group-hover:scale-x-50 group-enabled:group-focus-visible:scale-x-50",
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}
