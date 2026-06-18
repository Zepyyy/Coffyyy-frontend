import { Flame } from "lucide-react";

export default function RoastDots({ level }: { level: number | undefined }) {
	const levelToShow = level ?? 0;
	return (
		<div className="flex gap-0.5 items-center">
			<Flame size={12} className="mr-1 mb-0.5 text-current" strokeWidth={3} />
			{Array.from({ length: 10 }).map((_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static list
					key={i}
					className={`h-1.5 w-1.5 rounded-full ${i < levelToShow ? "bg-current opacity-70" : "bg-current opacity-15"}`}
				/>
			))}
		</div>
	);
}
