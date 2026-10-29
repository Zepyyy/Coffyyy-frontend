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
	const [failedValue, setFailedValue] = useState<Beans["status"] | null>(null);
	const [saved, setSaved] = useState(false);

	const value = pending ?? status ?? "";

	async function saveVerdict(updated: Beans["status"]) {
		if (saving) return;
		setFailedValue(null);
		setSaved(false);
		setPending(updated);
		setSaving(true);
		try {
			if ((await updateBeanById({ status: updated }, beanId)) !== 1) {
				throw new Error("Bean no longer exists");
			}
			setSaved(true);
		} catch {
			setFailedValue(updated);
			return;
		} finally {
			setPending(null);
			setSaving(false);
		}
		onChange?.(updated);
	}

	return (
		<div className="space-y-2">
			<p role="status" className="font-sans text-xs text-ink-soft">
				{saving
					? "Saving bean verdict…"
					: saved
						? "Bean verdict saved separately."
						: "Bean verdict saves automatically, separately from brew notes."}
			</p>
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
							onClick={() =>
								saveVerdict(value === option.value ? "" : option.value)
							}
							aria-pressed={active}
							disabled={saving}
							className={cn(
								"opt-frame min-h-11 border px-3 py-1.5 font-data text-xs transition-colors disabled:opacity-60",
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
			{failedValue != null && (
				<div className="flex flex-wrap items-center gap-2">
					<p role="alert" className="font-sans text-xs text-destructive">
						Couldn’t save your bean verdict.
					</p>
					<button
						type="button"
						onClick={() => saveVerdict(failedValue)}
						className="min-h-11 px-2 font-sans text-xs text-foreground underline underline-offset-4"
					>
						Retry bean verdict
					</button>
				</div>
			)}
		</div>
	);
}
