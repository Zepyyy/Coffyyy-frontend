import {
	Apple,
	Cake,
	Citrus,
	Cookie,
	FileQuestion,
	FireExtinguisher,
	Flower,
	Leaf,
	ArchiveRestore,
	Pin,
	type LucideIcon,
	Salad,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { deleteBeanById } from "@/db/crud/delete";
import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import { formatShortDate } from "@/lib/dates";
import RoastDots from "../home/RoastDots";

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
	to,
	startBrewTo,
	pinned = false,
	onTogglePinned,
	onRestore,
	hasBrewHistory = false,
	lastUsed,
	lastMethod,
	brewCount = 0,
}: {
	bean: Beans;
	to?: string;
	startBrewTo?: string;
	pinned?: boolean;
	onTogglePinned?: () => void;
	onRestore?: () => void;
	hasBrewHistory?: boolean;
	lastUsed?: Date | string;
	lastMethod?: string;
	brewCount?: number;
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);
	const NoteIcon = noteBadge[bean.dominantNote]?.icon ?? FileQuestion;

	const parameters: Parameter[] = [
		{ label: "Variety", values: bean.variety },
		{ label: "Flavors", values: bean.flavors },
		{ label: "Process", values: bean.process },
	];

	return (
		<div className="relative z-20 isolate flex h-full w-full flex-col overflow-hidden border border-primary/15 bg-background">
			<div
				aria-hidden="true"
				className={`pointer-events-none absolute inset-x-0 top-0 h-56 bg-radial-[at_25%_25%] ${colorSwatch[bean.dominantNote]?.gradient}`}
				style={{
					WebkitMaskImage:
						"linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
					maskImage:
						"linear-gradient(to bottom, black 0%, black 45%, transparent 100%)",
				}}
			/>
			{/* Header row */}
			<article className="relative w-full p-4">
				<div
					className={`text-2xl font-Lora font-semibold leading-tight tracking-wide ${colorSwatch[bean.dominantNote]?.text}`}
				>
					{bean.name || "Unnamed bean"}
				</div>

				<div
					className={`text-sm font-Mono uppercase tracking-[0.12em] font-medium ${colorSwatch[bean.dominantNote]?.secondaryText}`}
				>
					{bean.origin.join(", ")} · {bean.brand}
				</div>
				{/* Background text effect */}
				{/*<div
					className={`text-8xl font-Lora font-bold absolute top-1/2 -translate-y-1/2 left-0 opacity-5 select-none text-nowrap ${colorSwatch[bean.dominantNote]?.text}`}
				>
					{bean.name || "Unnamed bean"}
				</div>*/}
				{/* Top left icon */}
				<NoteIcon
					strokeWidth={2}
					className={`size-6 absolute top-5 right-5 ${colorSwatch[bean.dominantNote]?.text}`}
				/>
			</article>
			{/*<Separator />*/}

			<article className={`relative flex flex-1 flex-col gap-6 py-4 px-4`}>
				{parameters.map(
					(param) =>
						(param.values?.length ?? 0) > 0 && (
							<div key={param.label} className="flex flex-col gap-2">
								<span
									className={`font-News text-md uppercase ${colorSwatch[bean.dominantNote]?.text} font-normal leading-tight tracking-wider`}
								>
									{param.label}
								</span>
								<div className="flex flex-wrap gap-1.5">
									{param.values?.map((value, index) => (
										<span
											key={value}
											className="font-Mono text-xs text-foreground font-medium uppercase tracking-[0.08em] px-0.5 py-0.5"
										>
											{value}
											{index < param.values!.length - 1 && " ·"}
										</span>
									))}
								</div>
							</div>
						),
				)}
				{onTogglePinned && !bean.archived && (
					<button
						type="button"
						onClick={onTogglePinned}
						aria-label={pinned ? "Unpin bean" : "Pin bean"}
						className={`absolute right-3 top-3 border border-current/20 p-1.5 transition-colors hover:border-current ${colorSwatch[bean.dominantNote]?.text}`}
					>
						<Pin className={`size-3.5 ${pinned ? "fill-current" : ""}`} />
					</button>
				)}
				<div className="flex flex-col gap-2">
					<span
						className={`font-News text-md uppercase ${colorSwatch[bean.dominantNote]?.text} font-normal leading-tight tracking-wider`}
					>
						Roast Level
					</span>
					<div className="font-Mono text-xs text-foreground font-medium uppercase tracking-[0.08em]">
						{bean.roastLevel !== undefined && (
							<RoastDots level={bean.roastLevel} />
						)}
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
					<div>
						<span className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							Last brew
						</span>
						<p className="font-Recursive text-sm text-foreground">
							{lastUsed ? formatShortDate(lastUsed) : "Never used"}
						</p>
						{lastMethod && (
							<p className="font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
								{lastMethod}
							</p>
						)}
					</div>
					<div>
						<span className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							History
						</span>
						<p className="font-Recursive text-sm text-foreground">
							{brewCount} brew{brewCount === 1 ? "" : "s"}
						</p>
					</div>
				</div>
			</article>
			<div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
				{to && (
					<Link
						to={to}
						className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
					>
						View details
					</Link>
				)}
				{bean.archived
					? onRestore && (
							<button
								type="button"
								onClick={onRestore}
								className="inline-flex items-center gap-1.5 border border-foreground bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-background"
							>
								<ArchiveRestore className="size-3" />
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
				{!hasBrewHistory &&
					!bean.archived &&
					(confirmDelete ? (
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
					))}
			</div>
		</div>
	);
}
