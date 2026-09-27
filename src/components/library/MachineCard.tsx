import { useState } from "react";
import { deleteMachineById } from "@/lib/data";
import type { Machines } from "@/types/MachineTypes";

/** Spec-plate card: the machine's details read like its factory plate. */
export default function MachineCard({ machine }: { machine: Machines }) {
	const [confirmDelete, setConfirmDelete] = useState(false);

	const specs = [
		{ label: "Grind range", value: machine.grindRange },
		{ label: "Capacity", value: machine.capacity },
		{ label: "Bought", value: machine.purchaseDate },
	];

	return (
		<div className="hover-line relative flex h-full w-full flex-col rounded-xl border border-line bg-paper-raised shadow-card">
			<article className="relative border-b border-line/60 p-5">
				<div className="font-display text-xl font-semibold tracking-tight text-foreground">
					{machine.name || "Unnamed machine"}
				</div>
				<div className="mt-1 font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
					{machine.brand}
					{machine.model ? ` · ${machine.model}` : ""}
					{machine.type ? ` · ${machine.type}` : ""}
				</div>
			</article>

			<article className="flex flex-1 flex-col gap-3 p-5">
				{specs.map(
					(spec) =>
						spec.value && (
							<div key={spec.label} className="flex items-baseline gap-2">
								<span className="eyebrow shrink-0">{spec.label}</span>
								<span
									className="mx-1 h-px flex-1 border-b border-dotted border-line-strong"
									aria-hidden
								/>
								<span className="font-data text-xs text-foreground/90">
									{spec.value}
								</span>
							</div>
						),
				)}
			</article>

			<div className="mt-auto flex justify-end px-5 pb-3">
				{confirmDelete ? (
					<div className="flex items-center gap-2">
						<span className="text-xs text-ink-soft">Sure?</span>
						<button
							type="button"
							onClick={() => {
								if (typeof machine.id === "number")
									deleteMachineById(machine.id);
							}}
							className="rounded-lg bg-destructive px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
						>
							Delete
						</button>
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="rounded-lg bg-paper-sunken px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:text-foreground"
						>
							Cancel
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setConfirmDelete(true)}
						className="rounded-lg px-3 py-1 text-xs text-ink-faint hover:text-destructive transition-colors"
					>
						Delete
					</button>
				)}
			</div>
		</div>
	);
}
