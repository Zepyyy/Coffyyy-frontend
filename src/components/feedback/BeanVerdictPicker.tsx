import { useState } from "react";
import { updateBeanById } from "@/lib/data";
import { cn } from "@/lib/utils";
import { VERDICT_OPTIONS } from "@/lib/verdict";
import type { Beans } from "@/types/BeanTypes";

/**
 * "How much do you like this bean?" Saved on the bean, not on any single
 * brew, so it survives as preference even when shots go unrated. Tapping the
 * active verdict clears it.
 */
export default function BeanVerdictPicker({
	beanId,
	status,
	onChange,
}: {
	beanId: number;
	status: Beans["status"] | null | undefined;
	onChange?: (status: Beans["status"]) => void;
}) {
	const [pending, setPending] = useState<Beans["status"] | null>(null);
	const [saving, setSaving] = useState(false);

	const value = pending ?? status ?? "";

	async function pick(next: Beans["status"]) {
		if (saving) return;
		const updated: Beans["status"] = value === next ? "" : next;
		setPending(updated);
		setSaving(true);
		try {
			await updateBeanById({ status: updated }, beanId);
			onChange?.(updated);
		} finally {
			setPending(null);
			setSaving(false);
		}
	}

	return (
		<div
			className="flex flex-wrap gap-1.5"
			role="group"
			aria-label="Your verdict on this bean"
		>
			{VERDICT_OPTIONS.map((option) => {
				const active = value === option.value;
				return (
					<button
						key={option.value}
						type="button"
						onClick={() => pick(option.value)}
						aria-pressed={active}
						disabled={saving}
						className={cn(
							"opt-frame border px-3 py-1.5 font-data text-xs transition-colors disabled:opacity-60",
							active
								? cn("border-current/30 bg-paper-sunken", option.text)
								: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
						)}
						data-active={active}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
