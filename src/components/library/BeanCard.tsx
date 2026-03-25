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
import { deleteBean } from "@/db/crud/delete";
import { cn } from "@/lib/utils";
import type { Beans } from "@/types/default";
import { Separator } from "../ui/separator";

const colorSwatch: Partial<
	Record<
		Beans["dominantNote"],
		{
			bgColor: string;
			textColor: string;
			secondaryTextColor: string;
		}
	>
> = {
	Fruity: {
		bgColor: "bg-tag-teal-900",
		textColor: "text-tag-teal-100",
		secondaryTextColor: "text-tag-teal-100/75",
	},
	Nutty: {
		bgColor: "bg-tag-red-900",
		textColor: "text-tag-red-100",
		secondaryTextColor: "text-tag-red-100/75",
	},
	Floral: {
		bgColor: "bg-tag-blue-900",
		textColor: "text-tag-blue-100",
		secondaryTextColor: "text-tag-blue-100/75",
	},
	Green: {
		bgColor: "bg-tag-green-900",
		textColor: "text-tag-green-100",
		secondaryTextColor: "text-tag-green-100/75",
	},
	Roasted: {
		bgColor: "bg-tag-yellow-900",
		textColor: "text-tag-yellow-100",
		secondaryTextColor: "text-tag-yellow-100/75",
	},
	Sour: {
		bgColor: "bg-tag-orange-900",
		textColor: "text-tag-orange-100",
		secondaryTextColor: "text-tag-orange-100/75",
	},
	Spices: {
		bgColor: "bg-tag-purple-900",
		textColor: "text-tag-purple-100",
		secondaryTextColor: "text-tag-purple-100/75",
	},
	Sweet: {
		bgColor: "bg-tag-yellow-900",
		textColor: "text-tag-yellow-100",
		secondaryTextColor: "text-tag-yellow-100/75",
	},
};

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

export default function BeanCard({ bean }: { bean: Beans }) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const NoteIcon = noteBadge[bean.dominantNote]?.icon ?? FileQuestion;
	const tastingNotes = bean.tastingNotes.join(", ");
	const origin = bean.origin.join(", ");

	const parameters: Parameter[] = [
		{ label: "Origin", values: bean.origin },
		{ label: "Variety", values: bean.variety },
		{ label: "Process", singleValue: bean.process },
	];

	return (
		<div className="relative z-20 flex h-full w-full flex-col overflow-hidden border border-primary/15 bg-background">
			{/* Header row */}
			<div
				className={cn(
					"p-6 relative w-full",
					colorSwatch[bean.dominantNote]?.bgColor,
				)}
			>
				{/* Top left icon */}
				<NoteIcon
					strokeWidth={2}
					className={cn(
						"size-6 absolute top-5 right-5",
						colorSwatch[bean.dominantNote]?.textColor,
					)}
				/>
				<article className="">
					<div
						className={cn(
							"text-3xl font-Lora font-semibold leading-none tracking-wide",
							colorSwatch[bean.dominantNote]?.textColor,
						)}
					>
						{bean.name || "Unnamed bean"}
					</div>

					<div
						className={cn(
							"text-sm font-Mono uppercase tracking-[0.12em] font-medium dark:text-tag-primary-200",
							colorSwatch[bean.dominantNote]?.secondaryTextColor,
						)}
					>
						{origin} / {/*{bean.country && bean.country} */} El Paraiso
					</div>
					{/* Background text effect */}
					<div
						className={cn(
							"text-8xl font-Lora font-semibold absolute top-1/2 -translate-y-1/2 left-0 opacity-5 select-none text-nowrap",
							colorSwatch[bean.dominantNote]?.textColor,
						)}
					>
						{bean.name || "Unnamed bean"}
					</div>
				</article>
			</div>

			<Separator />
			<div className="flex flex-1 flex-col p-6">
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
				<div className="squiggly-line mt-6 w-full scale-x-125 scale-y-75 opacity-20" />
				<article className="mt-6 text-wrap">
					<div className="text-sm font-light dark:text-primary-200 text-primary-800/70 tracking-tighter font-Mono underline decoration-2 decoration-dotted mb-1">
						Notes
					</div>
					<span
						className="block text-sm font-medium font-Recursive text-foreground overflow-hidden"
						style={{
							display: "-webkit-box",
							WebkitBoxOrient: "vertical",
							WebkitLineClamp: 3,
						}}
					>
						{/*{bean.flavors}*/}
						{tastingNotes}
					</span>
				</article>
				<div className="mt-auto flex justify-end pt-6">
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
								onClick={() => deleteBean(bean.id)}
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
