import { useState } from "react";
import { deleteMachine } from "@/db/crud/delete";
import type { Machines } from "@/types/default";
import Tag from "../tag";
import { Separator } from "../ui/separator";

export default function MachineCard({ machine }: { machine: Machines }) {
	const [confirmDelete, setConfirmDelete] = useState(false);

	return (
		<div className="border border-primary/15 text-nowrap overflow-hidden z-20 relative bg-background my-2 mx-1">
			<article className="p-6 relative">
				<div className="text-2xl font-News font-semibold">
					{machine.name || "Unnamed bean"}
				</div>
				<div className="text-md font-Bricolage font-light dark:text-tag-primary-200 tracking-widest">
					{machine.brand} {machine.model ? ` · ${machine.model}` : ""}
				</div>
				<Tag
					text={machine.type}
					size="sm"
					variant={
						machine.type === "Espresso" ? "blueColored" : "purpleColored"
					}
					className="absolute top-0 right-3 border-t-0 rounded-t-none"
				/>
			</article>

			<Separator />

			<article className="flex flex-row flex-wrap justify-between p-6 gap-5">
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						grindRange
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{machine.grindRange}
					</div>
				</div>
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Capacity
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{machine.capacity}
					</div>
				</div>
				<div>
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Bought
					</div>
					<div className="text-foreground font-medium font-Recursive text-sm">
						{machine.purchaseDate}
					</div>
				</div>
			</article>
			<div className="squiggly-line opacity-20 w-full scale-x-150 scale-y-75" />
			<article className="p-6">
				<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
					Induction
				</div>
				<div className="text-foreground font-medium font-Recursive text-sm">
					{machine.induction ? (
						<Tag
							text="Yes"
							variant={"light"}
							size="sm"
							className="px-1.5! py-0.5!"
						/>
					) : (
						<Tag
							text="No"
							variant={"light"}
							size="sm"
							className="px-1.5! py-0.5!"
						/>
					)}
				</div>
			</article>

			<div className="flex justify-end pb-1">
				{confirmDelete ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground">Sure?</span>
						<button
							type="button"
							onClick={() => {
								if (typeof machine.id === "number") deleteMachine(machine.id);
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
