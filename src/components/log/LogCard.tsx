import { cn } from "@/lib/utils";

type LogCardProps = {
	frontContent?: Array<logCardContent>;
	backContent?: Array<logCardContent>;
	className?: string;
};

type logCardContent = {
	title?: string;
	value?: string;
};

export default function LogCard({
	frontContent,
	backContent,
	className,
}: LogCardProps) {
	return (
		<div className={cn("w-48 h-80 perspective-distant group/flip", className)}>
			<div className="relative h-full w-full transform-3d transition-all duration-200 ease-in group-hover/flip:rotate-y-180">
				<article
					className={cn(
						"absolute inset-0 flex flex-col rounded-xl border border-line bg-paper-raised p-4 shadow-card backface-hidden",
					)}
				>
					<div className="eyebrow flex w-fit rounded-md border border-crema/30 bg-crema-tint px-2 py-1 text-crema-deep dark:text-crema">
						Your brew
					</div>
					<div className="flex flex-col gap-1.5 justify-start pt-8 h-full">
						{/*<p className="font-data text-[0.6rem] tracking-widest uppercase text-muted-foreground">
							Front
						</p>*/}
						<h2 className="font-display text-lg/6 text-foreground">
							{frontContent?.map((line) => (
								<div key={line.title}>
									<p className="eyebrow mb-0">{line.title}</p>
									<p className="text-foreground font-medium font-sans text-sm tracking-tighter mb-1">
										{line.value}
									</p>
								</div>
							)) || "Untitled card"}
						</h2>
					</div>
					<div className="border-t border-border/70 pt-2 font-data text-[0.6rem] tracking-widest uppercase text-muted-foreground">
						Hover to flip
					</div>
				</article>
				<article
					className={cn(
						"absolute inset-0 flex flex-col rounded-xl border border-line bg-paper-raised p-4 shadow-card backface-hidden rotate-y-180",
					)}
				>
					<div className="eyebrow flex w-fit rounded-md border border-line bg-paper-sunken px-2 py-1 text-ink-soft">
						Notes
					</div>
					<div className="flex flex-col gap-1.5 justify-start pt-8 h-full">
						{/*<p className="font-data text-[0.6rem] tracking-widest uppercase text-muted-foreground">
							Back
						</p>*/}
						<h2 className="font-display text-lg/6 text-foreground">
							{backContent?.map((line) => (
								<div key={line.title}>
									<p className="eyebrow mb-0">{line.title}</p>
									<p className="text-foreground font-medium font-sans text-sm tracking-tighter mb-1">
										{line.value}
									</p>
								</div>
							)) || "Untitled card"}
						</h2>
					</div>
					<div className="border-t border-border/70 pt-2 font-data text-[0.6rem] tracking-widest uppercase text-muted-foreground">
						Use this for reminders
					</div>
				</article>
			</div>
		</div>
	);
}
