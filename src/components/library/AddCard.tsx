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
				`group w-full h-full flex flex-col items-center justify-center gap-2 border border-dashed border-primary/40 bg-background/40 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary-200/10 hover:text-foreground backdrop-blur-xl`,
				className,
			)}
		>
			<Plus
				strokeWidth={1.5}
				className="size-6 transition-transform group-hover:scale-110"
			/>
			<span className="font-Mono text-[11px] uppercase tracking-[0.16em]">
				{label}
			</span>
		</Link>
	);
}
