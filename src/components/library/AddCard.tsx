import { Plus } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export default function AddCard({
	to,
	label,
	className,
}: {
	to: string;
	label: string;
	className?: string;
}) {
	return (
		<Link
			to={to}
			className={cn(
				"key-ticks group relative flex h-full w-full flex-col items-center justify-center gap-2 border border-dashed border-line-strong bg-paper-raised/40 text-ink-faint transition-colors hover:border-crema hover:bg-paper-raised hover:text-foreground",
				className,
			)}
		>
			<Plus
				strokeWidth={1.5}
				className="size-6 transition-transform duration-300 ease-soft group-hover:rotate-90"
			/>
			<span className="font-data text-[11px] uppercase tracking-[0.16em]">
				{label}
			</span>
		</Link>
	);
}
