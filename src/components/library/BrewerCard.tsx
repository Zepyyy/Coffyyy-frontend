import { useState } from "react";
import { deleteBrewerById } from "@/db/crud/delete";
import type { Brewers } from "@/types/BrewerTypes";
import { Separator } from "../ui/separator";
import Tag from "../ui/tag";

export default function BrewerCard({ brewer }: { brewer: Brewers }) {
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

			<article className="flex flex-row flex-wrap justify-between gap-5 p-6">
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						grindRange
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{brewer.grindRange}
					</div>
				</div>
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Capacity
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{brewer.capacity}
					</div>
				</div>
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Bought
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{brewer.purchaseDate}
					</div>
				</div>
			</article>
			<div className="squiggly-line w-full scale-x-150 scale-y-75 opacity-20" />
			<div className="mt-auto flex justify-end px-6 pb-3">
				{confirmDelete ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Sure?</span>
						<button
							type="button"
							onClick={() => {
								if (typeof brewer.id === "number")
									deleteBrewerById(brewer.id);
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
