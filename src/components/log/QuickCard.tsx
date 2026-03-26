import { Check } from "lucide-react";
import { colorSwatch } from "@/lib/utils";
import type { BeanCardProps } from "@/types/BeanTypes";

export default function QuickCard({
	bean,
	onClick,
}: {
	bean: BeanCardProps;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			data-slot="toggle"
			className={`relative overflow-hidden border cursor-pointer transition-colors text-start bg-background ${bean.selected ? " border-primary/40 bg-primary/5 backdrop-blur-xs" : " border-border bg-background hover:border-primary/40"}`}
			onClick={() => onClick?.()}
			onKeyDown={() => onClick?.()}
		>
			<div
				className={`h-2 w-full ${colorSwatch[bean.dominantNote]?.bgColor}`}
			/>
			<div className="px-2.5 py-2">
				<p className="font-Lora text-lg font-semibold line-clamp-1 leading-snug">
					{bean.name}
				</p>
				<p className="mt-0.5 font-Mono text-xs uppercase tracking-widest text-muted-foreground">
					{bean.origin.join(", ")}
				</p>
			</div>
			{bean.selected && (
				<div className="absolute right-1.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-primary">
					<Check className="size-2.5 text-primary-foreground" />
				</div>
			)}
		</button>
	);
}
