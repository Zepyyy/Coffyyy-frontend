import { cn } from "@/lib/utils";

export default function MultiChips({
	suggestions,
	selected,
	onToggle,
	customInput,
	onCustomChange,
	onCustomAdd,
	placeholder,
	requiredField,
}: {
	suggestions: string[];
	selected: string[];
	onToggle: (v: string) => void;
	customInput: string;
	onCustomChange: (v: string) => void;
	onCustomAdd: () => void;
	placeholder: string;
	requiredField?: string;
}) {
	const pending = customInput.trim();
	const baseChips = [
		...suggestions,
		...selected.filter((s) => !suggestions.includes(s)),
	];
	const allChips =
		pending && !baseChips.includes(pending)
			? [...baseChips, pending]
			: baseChips;

	return (
		<div
			className={cn(
				"space-y-2",
				requiredField && "rounded-sm border border-destructive/60 p-2",
			)}
		>
			{allChips.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{allChips.map((s) => {
						const isPending = s === pending && !selected.includes(s);
						return (
							<button
								key={s}
								type="button"
								onClick={() => (isPending ? onCustomAdd() : onToggle(s))}
								className={cn(
									"flex items-center gap-1.5 px-2.5 py-1 font-Recursive text-xs border font-medium transition-colors",
									selected.includes(s)
										? "border-primary/30 bg-primary/5 text-primary-800 dark:text-primary-200"
										: isPending
											? "border-primary/50 border-dashed text-foreground hover:border-primary"
											: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
								)}
							>
								{s}
								{selected.includes(s) ? (
									<span className="opacity-50 hover:opacity-100 leading-none text-sm">
										×
									</span>
								) : (
									<span>+</span>
								)}
							</button>
						);
					})}
				</div>
			)}
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
						if (customInput.trim()) onCustomAdd();
					}}
				/>
			</div>
			{requiredField && (
				<p className="text-xs text-destructive">{requiredField}</p>
			)}
		</div>
	);
}
