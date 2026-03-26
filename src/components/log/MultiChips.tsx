import { cn } from "@/lib/utils";

export default function MultiChips({
	suggestions,
	selected,
	onToggle,
	customInput,
	onCustomChange,
	onCustomAdd,
	placeholder,
}: {
	suggestions: string[];
	selected: string[];
	onToggle: (v: string) => void;
	customInput: string;
	onCustomChange: (v: string) => void;
	onCustomAdd: () => void;
	placeholder: string;
}) {
	const allChips = [
		...suggestions,
		...selected.filter((s) => !suggestions.includes(s)),
	];

	return (
		<div className="space-y-2">
			{allChips.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{allChips.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onToggle(s)}
							className={cn(
								"flex items-center gap-1.5 px-2.5 py-1 font-Recursive text-xs border font-medium transition-colors",
								selected.includes(s)
									? "border-primary/30 bg-primary/5 text-primary-800 dark:text-primary-200"
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
					))}
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
				/>
				{customInput.trim() && (
					<button
						type="button"
						onClick={onCustomAdd}
						className="border border-border bg-background px-3 font-Mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
					>
						Add
					</button>
				)}
			</div>
		</div>
	);
}
