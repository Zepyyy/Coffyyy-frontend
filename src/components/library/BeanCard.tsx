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
import { useDeleteBean } from "@/hooks/api/useBeans";
import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { BeanDialInState } from "@/types/BrewTypes";
import RoastDots from "../home/RoastDots";
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
	const deleteBean = useDeleteBean();
	const NoteIcon = noteBadge[bean.dominantNote]?.icon ?? FileQuestion;

	const parameters: Parameter[] = [
		{ label: "Variety", values: bean.varieties },
		{ label: "Flavors", values: bean.flavors },
		{ label: "Cities", values: bean.cities },
	];

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
					className={`text-sm font-Mono uppercase tracking-[0.12em] font-medium ${colorSwatch[bean.dominantNote]?.secondaryText}`}
				>
					{bean.countries.join(", ")} · {bean.brands.join(", ")}
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

			<article className="flex flex-1 flex-col gap-6 py-4 px-4">
				{parameters.map(
					(param) =>
						(param.values?.length ?? 0) > 0 && (
							<div key={param.label} className="flex flex-col gap-2">
								<span className="font-Mono text-md uppercase text-primary-700 dark:text-primary-200 font-extralight leading-tighter">
									{param.label}
								</span>
								<div className="flex flex-wrap gap-1.5">
									{param.values?.map((value) => (
										<span
											key={value}
											className="font-Mono text-xs text-foreground font-medium uppercase tracking-[0.08em] border border-primary/15 bg-primary/5 px-2 py-0.5"
										>
											{value}
										</span>
									))}
								</div>
							</div>
						),
				)}
				<div className="flex flex-col gap-2">
					<span className="font-Mono text-md uppercase text-primary-700 dark:text-primary-200 font-extralight leading-tighter">
						Roast Level
					</span>
					<div className="font-Mono text-xs text-foreground font-medium uppercase tracking-[0.08em]">
						{bean.roastLevel !== undefined && (
							<RoastDots level={bean.roastLevel} />
						)}
					</div>
				</div>
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
							onClick={() => void deleteBean.mutateAsync(bean.id)}
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
	);
}
