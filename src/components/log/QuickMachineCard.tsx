import { Check } from "lucide-react";
import { MethodTag } from "@/components/method/MethodMarks";
import type { MachineCardProps } from "@/types/MachineTypes";

export default function QuickMachineCard({
	machine,
	selected,
	onClick,
}: {
	machine: MachineCardProps;
	selected?: boolean;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			aria-pressed={Boolean(selected)}
			data-slot="toggle"
			className={`hover-line relative cursor-pointer rounded-xl border text-start shadow-card transition-colors ${
				selected
					? "border-crema bg-crema-tint ring-1 ring-crema/40"
					: "border-line bg-paper-raised hover:border-line-strong"
			}`}
			onClick={() => onClick?.()}
		>
			<div className="px-2.5 py-2">
				<p className="line-clamp-1 font-display text-base font-semibold leading-snug tracking-tight text-foreground">
					{machine.name}
				</p>
				<MethodTag method={machine.method} className="mt-1" />
			</div>
			{selected && (
				<div className="absolute right-1.5 top-2.5 flex size-4 items-center justify-center bg-ink">
					<Check className="size-2.5 text-paper" />
				</div>
			)}
		</button>
	);
}
