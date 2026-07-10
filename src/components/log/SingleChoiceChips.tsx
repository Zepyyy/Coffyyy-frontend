import { cn } from "@/lib/utils";

export default function SingleChoiceChips({
	options,
	unknown,
	selected,
	onChange,
	customInput,
	onCustomChange,
	onCustomAdd,
	placeholder,
	requiredField,
}: {
	options: string[];
	unknown?: string;
	selected: string;
	onChange: (v: string) => void;
	customInput: string;
	onCustomChange: (v: string) => void;
	onCustomAdd: () => void;
	placeholder: string;
	requiredField?: string;
}) {
	const allChips = [
		...new Set([...options, customInput.trim()].filter(Boolean)),
	];
	return (
		<div
			className={cn(
				"space-y-2",
				requiredField && "rounded-sm border border-destructive/60 p-2",
			)}
		>
			<div className="flex flex-wrap gap-1.5">
				{allChips.map((opt) => (
					<button
						key={opt}
						type="button"
						onClick={() => onChange(selected === opt ? "" : opt)}
						className={cn(
							"flex items-center gap-1.5 border px-3 py-1.5 font-Recursive text-sm transition-all",
							opt === unknown
								? selected === opt
									? "border-primary bg-primary/5 text-primary-900 dark:text-primary-200 border-dashed"
									: "border-primary/30 bg-background text-muted-foreground hover:border-primary hover:text-foreground border-dashed"
								: selected === opt
									? "border-primary/30 bg-primary/25 text-primary-900 dark:text-primary-200"
									: "border-border bg-background text-muted-foreground hover:border-primary/60 hover:dark:border-primary/40 hover:text-foreground",
						)}
					>
						{opt}
					</button>
				))}
			</div>
			<div className="flex gap-2">
				<input
					className="flex-1 border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
					placeholder={placeholder}
					value={customInput}
					onChange={(e) => onCustomChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							onCustomAdd();
						}
					}}
					onBlur={() => {
						const val = customInput.trim();
						if (val) {
							onChange(val);
							onCustomChange("");
						}
					}}
				/>
			</div>
			{requiredField && (
				<p className="text-xs text-destructive">{requiredField}</p>
			)}
		</div>
	);
}
