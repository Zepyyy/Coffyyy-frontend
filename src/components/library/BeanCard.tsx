import { useState } from "react";
import { deleteBeanById } from "@/db/crud/delete";
import { getColorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { BeanDialInState } from "@/types/BrewTypes";
import RoastDots from "../home/RoastDots";

const noteLabel: Partial<Record<Beans["dominantNote"], string>> = {
	Fruity: "Fruity",
	Nutty: "Nutty",
	Floral: "Floral",
	Green: "Green",
	Roasted: "Roasted",
	Sour: "Sour",
	Spices: "Spices",
	Sweet: "Sweet",
};

interface Parameter {
	label: string;
	values?: string[];
}

/** Library card styled as a coffee-bag label: tinted band, spec rows, and a
 * "Dialed in" stamp once the bean is dialed. */
export default function BeanCard({
	bean,
	dialInState,
}: {
	bean: Beans;
	dialInState?: BeanDialInState;
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const swatch = getColorSwatch(bean.dominantNote);

	const parameters: Parameter[] = [
		{ label: "Variety", values: bean.variety },
		{ label: "Flavors", values: bean.flavors },
		{ label: "Process", values: bean.process },
	];

	return (
		<div className="hover-line flex h-full w-full flex-col rounded-xl border border-line bg-paper-raised shadow-card">
			{/* Label band */}
			<article className="relative w-full border-b border-line/60 bg-paper-sunken/40 p-4">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="font-display text-xl font-semibold leading-tight tracking-tight text-foreground">
							{bean.name || "Unnamed bean"}
						</p>
						<p className="mt-1 flex items-center gap-1.5 font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
							<span
								className={`size-2 shrink-0 ${swatch.stripe}`}
								aria-hidden
							/>
							{noteLabel[bean.dominantNote] ?? "Bean"} · {bean.brand}
						</p>
					</div>
				</div>
				{dialInState?.isDialedIn && (
					<div className="absolute right-3 bottom-2 rotate-[-4deg] border-2 border-ink/50 px-2 py-0.5 font-data text-[9px] font-semibold uppercase tracking-[0.2em] text-ink/80">
						Dialed in
					</div>
				)}
			</article>

			{/* Spec sheet */}
			<article className="flex flex-1 flex-col gap-4 px-4 py-4">
				{parameters.map(
					(param) =>
						(param.values?.length ?? 0) > 0 && (
							<div key={param.label} className="space-y-1.5">
								<span className="eyebrow">{param.label}</span>
								<div className="flex flex-wrap gap-1.5">
									{param.values?.map((value) => (
										<span
											key={value}
											className="rounded-md border border-line bg-paper-sunken px-2 py-0.5 font-data text-[11px] tracking-[0.04em] text-foreground/85"
										>
											{value}
										</span>
									))}
								</div>
							</div>
						),
				)}
				<div className="space-y-1.5">
					<span className="eyebrow">Roast level</span>
					<div className="text-ink-soft">
						<RoastDots level={bean.roastLevel} />
					</div>
				</div>
			</article>

			<div className="mt-auto flex justify-end px-4 pb-3">
				{confirmDelete ? (
					<div className="flex items-center gap-2 text-sm">
						<span className="text-xs text-ink-soft">Sure?</span>
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="rounded-lg bg-paper-sunken px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:text-foreground"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() => deleteBeanById(bean.id)}
							className="rounded-lg bg-destructive px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
						>
							Delete
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => setConfirmDelete(true)}
						className="rounded-lg px-3 py-1 text-xs text-ink-faint transition-colors hover:text-destructive"
					>
						Delete
					</button>
				)}
			</div>
		</div>
	);
}
