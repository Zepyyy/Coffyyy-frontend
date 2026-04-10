import {
	Apple,
	Cake,
	Citrus,
	Cookie,
	FileQuestion,
	FireExtinguisher,
	Flower,
	Leaf,
	type LucideIcon,
	Salad,
} from "lucide-react";
import { useState } from "react";
import { deleteBeanById } from "@/db/crud/delete";
import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { BeanDialInState } from "@/types/BrewTypes";
import { Separator } from "../ui/separator";

const noteBadge: Partial<
	Record<
		Beans["dominantNote"],
		{
			icon: LucideIcon;
			label: string;
		}
	>
> = {
	Fruity: {
		icon: Apple,
		label: "Fruity",
	},
	Nutty: {
		icon: Cookie,
		label: "Nutty",
	},
	Floral: {
		icon: Flower,
		label: "Floral",
	},
	Green: {
		icon: Leaf,
		label: "Green",
	},
	Roasted: {
		icon: FireExtinguisher,
		label: "Roasted",
	},
	Sour: {
		icon: Citrus,
		label: "Sour",
	},
	Spices: {
		icon: Salad,
		label: "Spices",
	},
	Sweet: {
		icon: Cake,
		label: "Sweet",
	},
};
interface Parameter {
	label: string;
	singleValue?: string;
	values?: string[];
}

export default function BeanCard({
	bean,
	dialInState,
}: {
	bean: Beans;
	dialInState?: BeanDialInState;
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const NoteIcon = noteBadge[bean.dominantNote]?.icon ?? FileQuestion;

	const parameters: Parameter[] = [
		{ label: "Variety", values: bean.variety },
		{ label: "Note", singleValue: bean.dominantNote },
		{ label: "Process", values: bean.process },
	];

	console.log(dialInState);

	return (
		<div className="relative z-20 flex h-full w-full flex-col overflow-hidden border border-primary/15 bg-background">
			{/* Header row */}
			<article
				className={`p-4 relative w-full ${colorSwatch[bean.dominantNote]?.bg} overflow-hidden`}
			>
				<div
					className={`text-2xl font-Lora font-semibold leading-tight tracking-wide ${colorSwatch[bean.dominantNote]?.text}`}
				>
					{bean.name || "Unnamed bean"}
				</div>

				<div
					className={`text-sm font-Mono uppercase tracking-[0.12em] font-medium dark:text-tag-primary-200 ${colorSwatch[bean.dominantNote]?.secondaryText}`}
				>
					{bean.origin.join(", ")} · {bean.brand}
				</div>
				{dialInState?.isDialedIn && (
					<div
						className={`mt-3 absolute bottom-1 right-1 items-center border px-2 py-1 font-Mono text-[9px] uppercase tracking-[0.16em] ${colorSwatch[bean.dominantNote]?.text} border-current/20 bg-background/40`}
					>
						Dialed In
					</div>
				)}
				{/* Background text effect */}
				<div
					className={`text-8xl font-Lora font-bold absolute top-1/2 -translate-y-1/2 left-0 opacity-5 select-none text-nowrap ${colorSwatch[bean.dominantNote]?.text}`}
				>
					{bean.name || "Unnamed bean"}
				</div>
				{/* Top left icon */}
				<NoteIcon
					strokeWidth={2}
					className={`size-6 absolute top-5 right-5 ${colorSwatch[bean.dominantNote]?.text}`}
				/>
			</article>

			<Separator />
			<div className="flex flex-1 flex-col p-4">
				<article className="flex flex-wrap justify-between">
					{parameters.map(({ label, singleValue, values }) => (
						<div key={label}>
							<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
								{label}
							</div>
							<div className="text-foreground font-medium font-Recursive text-sm">
								{singleValue ?? values?.join(", ")}
							</div>
						</div>
					))}
				</article>
				<div className="squiggly-line mt-4 w-full scale-x-125 scale-y-50 opacity-20" />
				<article className="mt-4 text-wrap">
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Flavors
					</div>
					<span
						className="block text-sm font-medium font-Recursive text-foreground overflow-hidden"
						style={{
							display: "-webkit-box",
							WebkitBoxOrient: "vertical",
							WebkitLineClamp: 3,
						}}
					>
						{bean.flavors.join(", ")}
					</span>
				</article>
				<div className="mt-auto flex justify-end pt-4">
					{confirmDelete ? (
						<div className="flex items-center gap-2 text-sm">
							<span className="text-xs text-muted-foreground">Sure?</span>
							<button
								type="button"
								onClick={() => setConfirmDelete(false)}
								className="px-3 py-1 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => deleteBeanById(bean.id)}
								className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity"
							>
								Delete
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
		</div>
	);
}
