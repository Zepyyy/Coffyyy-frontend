import { useState } from "react";
import { Link } from "react-router";
import { deleteBrewerById } from "@/db/crud/delete";
import type { Brewers } from "@/types/BrewerTypes";
import { Separator } from "../ui/separator";
import Tag from "../ui/tag";

function formatLastUsed(value: Date | string | undefined) {
	if (!value) return "Never used";
	return `Last used ${new Date(value).toLocaleDateString(undefined, {
		day: "numeric",
		month: "short",
	})}`;
}

export default function BrewerCard({
	brewer,
	lastUsed,
	brewCount = 0,
	methods = [],
	to,
	startBrewTo,
}: {
	brewer: Brewers;
	lastUsed?: Date | string;
	brewCount?: number;
	methods?: string[];
	to?: string;
	startBrewTo?: string;
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);

	return (
		<div className="relative z-20 flex h-full w-full flex-col overflow-hidden border border-primary/15 bg-background">
			<article className="p-6 relative">
				<div className="text-2xl font-News font-semibold">
					{brewer.name || "Unnamed bean"}
				</div>
				<div className="text-md font-Bricolage font-light dark:text-tag-primary-200 tracking-widest">
					{brewer.brand} {brewer.model ? ` · ${brewer.model}` : ""}
				</div>
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
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Brew method
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{methods.length > 0 ? methods.join(" · ") : "No brew history"}
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
					{startBrewTo && (
						<Link
							to={startBrewTo}
							className="border border-foreground bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-background"
						>
							Start brew
						</Link>
					)}
				</div>
				{confirmDelete ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Sure?</span>
						<button
							type="button"
							onClick={() => {
								if (typeof brewer.id === "number") deleteBrewerById(brewer.id);
							}}
							className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setConfirmDelete(true)}
						className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive transition-colors"
					>
						Delete
					</button>
				)}
			</div>
		</div>
	);
}
