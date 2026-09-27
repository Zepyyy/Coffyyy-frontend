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
									"flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-sans text-xs font-medium transition-colors",
									selected.includes(s)
										? "border-crema bg-crema-tint text-crema-deep dark:text-crema"
										: isPending
											? "border-crema/50 border-dashed text-foreground hover:border-crema"
											: "border-line bg-paper-raised text-ink-soft hover:border-crema/40 hover:text-foreground",
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
					className="flex-1 rounded-lg border border-line-strong bg-paper-raised px-3 py-1.5 font-sans text-sm placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-crema/60"
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
