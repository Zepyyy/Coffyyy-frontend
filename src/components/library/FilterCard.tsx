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
		<div className="bg-primary-700/10 border border-primary-700/25">
			<section className=" p-4 space-y-3">
				<p className="text-2xl text-primary-800 dark:text-primary-100 italic font-News">
					{title}
				</p>
			</section>
			<div className="squiggly-line opacity-30 scale-y-50" />
			<section className=" p-4 space-y-3">
				<ul className="space-y-3 grid grid-cols-1">
					{options.map((option) => (
						<li
							className={cn(
								"flex items-center justify-between group cursor-pointer transition-colors gap-12",
								option.active
									? "text-foreground"
									: "text-primary-800/70 dark:text-primary-200 hover:text-foreground hover:dark:text-foreground",
							)}
							key={option.label}
							onClick={() => onToggle(option.label)}
							onKeyUp={(e) => {
								if (e.key === "Enter") {
									onToggle(option.label);
								}
							}}
						>
							<span className="font-Mono text-sm uppercase">
								{option.label}
							</span>
							<span
								className={cn(
									"text-[10px] font-Mono px-2 py-0.5 rounded-full",
									option.active
										? "bg-primary text-primary-foreground"
										: "bg-primary/10",
								)}
							>
								{option.count}
							</span>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
