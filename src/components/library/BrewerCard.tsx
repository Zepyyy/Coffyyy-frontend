import { Link } from "react-router";
import { Pin } from "lucide-react";
import { formatShortDate } from "@/lib/dates";
import type { Brewers } from "@/types/BrewerTypes";
import { Separator } from "../ui/separator";
import Tag from "../ui/tag";

function formatLastUsed(value: Date | string | undefined) {
	if (!value) return "Never used";
	return `Last used ${formatShortDate(value)}`;
}

export default function BrewerCard({
	brewer,
	lastUsed,
	brewCount = 0,
	methods = [],
	to,
	startBrewTo,
	pinned = false,
	onTogglePinned,
	onRestore,
}: {
	brewer: Brewers;
	lastUsed?: Date | string;
	brewCount?: number;
	methods?: string[];
	to?: string;
	startBrewTo?: string;
	pinned?: boolean;
	onTogglePinned?: () => void;
	onRestore?: () => void;
}) {
	return (
		<div className="relative z-20 flex h-full w-full flex-col overflow-hidden border border-primary/15 bg-background">
			<article className="p-6 relative">
				<div className="text-2xl font-News font-semibold">
					{brewer.name || "Unnamed brewer"}
				</div>
				<div className="text-md font-Bricolage font-light dark:text-tag-primary-200 tracking-widest">
					{brewer.brand} {brewer.model ? ` · ${brewer.model}` : ""}
				</div>
				{onTogglePinned && !brewer.archived && (
					<button
						type="button"
						onClick={onTogglePinned}
						aria-label={pinned ? "Unpin brewer" : "Pin brewer"}
						className="absolute right-3 bottom-3 border border-foreground/15 p-1.5 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
					>
						<Pin
							className={`size-3.5 ${pinned ? "fill-current text-primary" : ""}`}
						/>
					</button>
				)}
				<Tag
					text={brewer.type}
					size="sm"
					variant={brewer.type === "Espresso" ? "blue" : "purple"}
					className="absolute top-0 right-3 border-t-0 border-dashed rounded-t-none pt-2"
				/>
			</article>

			<Separator />

			<article className="grid grid-cols-2 gap-5 p-6">
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Category
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{brewer.type || "—"}
					</div>
				</div>
				<div className="border border-primary/20 bg-primary/5 p-2">
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Brew method
					</div>
					<div className="font-Recursive text-sm font-medium text-primary-800 dark:text-primary-200">
						{methods.length > 0 ? methods.join(" · ") : "No method history"}
					</div>
				</div>
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						History
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{brewCount} brew{brewCount === 1 ? "" : "s"}
					</div>
				</div>
			</article>
			<div className="squiggly-line w-full scale-x-150 scale-y-75 opacity-20" />
			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-3">
				<div className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
					{formatLastUsed(lastUsed)}
				</div>
				<div className="flex flex-wrap items-center gap-3">
					{to && (
						<Link
							to={to}
							className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
						>
							View details
						</Link>
					)}
					{brewer.archived
						? onRestore && (
								<button
									type="button"
									onClick={onRestore}
									className="border border-foreground bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-background"
								>
									Restore
								</button>
							)
						: startBrewTo && (
								<Link
									to={startBrewTo}
									className="border border-foreground/50 bg-background/70 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-foreground transition-opacity hover:opacity-85"
								>
									Start brew
								</Link>
							)}
				</div>
			</div>
		</div>
	);
}
