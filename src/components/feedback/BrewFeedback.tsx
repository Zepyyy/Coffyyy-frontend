import { Star } from "lucide-react";
import { useState } from "react";
import BeanVerdictPicker from "@/components/feedback/BeanVerdictPicker";
import { updateBrewById } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";

const TASTE_HINT: Record<string, string> = {
	"-5": "Very sour. Go finer and extract longer.",
	"-4": "Sour. Go finer or let it run a bit longer.",
	"-3": "Slightly sour. Nudge the grind finer.",
	"-2": "A touch sour. Close to dialed in.",
	"-1": "Almost there. Tiny grind tweak.",
	"0": "Balanced. Taste is on target.",
	"1": "Almost there. Tiny grind tweak.",
	"2": "A touch bitter. Close to dialed in.",
	"3": "Slightly bitter. Nudge the grind coarser.",
	"4": "Bitter. Go coarser or shorten the shot.",
	"5": "Very bitter. Go coarser and shorten the shot.",
};

const STRENGTH_HINT: Record<string, string> = {
	"-5": "Very weak. Increase dose or decrease yield.",
	"-4": "Weak. Increase dose or cut yield a bit.",
	"-3": "Slightly weak. Tighten the ratio.",
	"-2": "A touch weak. Strength is close.",
	"-1": "Almost there. Small ratio tweak.",
	"0": "Balanced. Strength is on target.",
	"1": "Almost there. Small ratio tweak.",
	"2": "A touch strong. Loosen the ratio slightly.",
	"3": "Slightly strong. Decrease dose or increase yield.",
	"4": "Strong. Back off the dose or push more yield.",
	"5": "Very strong. Decrease dose and increase yield.",
};

/**
 * A -5..5 axis rendered as an instrument gauge: the crema fill measures the
 * deviation from balanced (the center), not progress from the left.
 */
function AxisSlider({
	value,
	onChange,
	leftLabel,
	centerLabel,
	rightLabel,
	hint,
	tintClassName,
}: {
	value: number;
	onChange: (value: number) => void;
	leftLabel: string;
	centerLabel: string;
	rightLabel: string;
	hint: string;
	tintClassName: string;
}) {
	const centerPct = 50;
	const thumbPct = ((value + 5) / 10) * 100;
	const from = Math.min(centerPct, thumbPct);
	const to = Math.max(centerPct, thumbPct);

	return (
		<div className="space-y-3">
			<div className="space-y-2">
				<input
					type="range"
					min={-5}
					max={5}
					step={1}
					value={value}
					onChange={(event) => onChange(Number(event.target.value))}
					aria-label={`${leftLabel} to ${rightLabel}, currently ${hint}`}
					className="h-6 w-full cursor-pointer appearance-none bg-transparent focus:outline-none [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-crema [&::-moz-range-thumb]:bg-paper-raised [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-crema [&::-webkit-slider-thumb]:bg-paper-raised [&::-webkit-slider-thumb]:shadow-[0_1px_4px_oklch(0.33_0.03_50/0.3)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
					style={{
						background: `linear-gradient(to right, transparent 0%, transparent ${from}%, var(--crema) ${from}%, var(--crema) ${to}%, transparent ${to}%, transparent 100%) center / 100% 4px no-repeat`,
					}}
				/>
				<div className="flex justify-between font-data text-[9px] uppercase tracking-[0.12em] text-ink-faint select-none">
					<span>{leftLabel}</span>
					<span>{centerLabel}</span>
					<span>{rightLabel}</span>
				</div>
			</div>
			<p
				className={cn(
					"font-sans text-xs text-center transition-colors",
					tintClassName,
				)}
			>
				{hint}
			</p>
		</div>
	);
}

type AxisState = { value: number; touched: boolean };

/**
 * Post-taste feedback for one brew: an optional overall rating, the taste and
 * strength axes, and the bean verdict (saved on the bean). Untouched axes
 * are left out, so a quick save never invents "balanced" data.
 */
export default function BrewFeedback({
	brew,
	bean,
	onSaved,
	onDismiss,
	bare = false,
}: {
	brew: Brews;
	bean?: { id: number; name?: string; status?: Beans["status"] } | null;
	onSaved?: () => void;
	onDismiss?: () => void;
	/** Skip the card chrome when embedding in another surface. */
	bare?: boolean;
}) {
	const [overallRating, setOverallRating] = useState(brew.overallRating ?? 0);
	const [taste, setTaste] = useState<AxisState>({
		value: brew.tasteScore ?? 0,
		touched: brew.tasteScore != null,
	});
	const [strength, setStrength] = useState<AxisState>({
		value: brew.strengthScore ?? 0,
		touched: brew.strengthScore != null,
	});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const date = new Date(brew.date).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const specs = [
		brew.grindSize != null ? `grind ${brew.grindSize}` : null,
		brew.beanWeight ? `${brew.beanWeight}g` : null,
		brew.espressoWeight ? `→ ${brew.espressoWeight}g` : null,
	]
		.filter(Boolean)
		.join(" · ");

	async function handleSave() {
		if (saving) return;
		setSaving(true);
		try {
			const payload: Partial<Brews> = {};
			if (overallRating > 0) payload.overallRating = overallRating;
			else if (brew.overallRating != null) payload.overallRating = undefined;
			if (taste.touched || brew.tasteScore != null)
				payload.tasteScore = taste.value;
			if (strength.touched || brew.strengthScore != null)
				payload.strengthScore = strength.value;
			await updateBrewById(payload, brew.id);
			setSaved(true);
			onSaved?.();
		} finally {
			setSaving(false);
		}
	}

	const body = (
		<div className="space-y-5">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0">
					<p className="eyebrow">
						{saved ? "Notes saved" : "How was that cup?"}
					</p>
					{bean?.name && (
						<p className="mt-1 truncate font-display text-xl italic tracking-tight text-foreground">
							{bean.name}
						</p>
					)}
					<p className="eyebrow mt-1.5">
						{date}
						{specs ? ` · ${specs}` : ""}
					</p>
				</div>
				{onDismiss && !saved && (
					<button
						type="button"
						onClick={onDismiss}
						className="font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:text-foreground shrink-0"
					>
						Later
					</button>
				)}
			</div>

			{!saved && (
				<>
					<div className="space-y-2">
						<p className="eyebrow">Overall rating</p>
						<div className="flex items-center gap-1">
							{Array.from({ length: 5 }, (_, index) => {
								const value = index + 1;
								const active = value <= overallRating;
								return (
									<button
										key={value}
										type="button"
										onClick={() =>
											setOverallRating((current) =>
												current === value ? 0 : value,
											)
										}
										className="transition-transform hover:scale-110 p-1.5 -m-1.5"
										aria-label={`Rate ${value} out of 5`}
									>
										<Star
											className={cn(
												"size-5",
												active ? "fill-crema text-crema" : "text-line-strong",
											)}
										/>
									</button>
								);
							})}
							<span className="ml-2 font-sans text-xs text-muted-foreground">
								{overallRating === 0 ? "Optional" : undefined}
							</span>
						</div>
					</div>

					<div className="grid gap-5 sm:grid-cols-2">
						<div className="space-y-2">
							<p className="eyebrow">Taste axis</p>
							<AxisSlider
								value={taste.value}
								onChange={(value) => setTaste({ value, touched: true })}
								leftLabel="Sour"
								centerLabel="Balanced"
								rightLabel="Bitter"
								hint={TASTE_HINT[taste.value]}
								tintClassName={
									taste.value < 0
										? "text-tag-teal-500"
										: taste.value > 0
											? "text-tag-orange-500"
											: "text-crema-deep"
								}
							/>
						</div>

						<div className="space-y-2">
							<p className="eyebrow">Strength axis</p>
							<AxisSlider
								value={strength.value}
								onChange={(value) => setStrength({ value, touched: true })}
								leftLabel="Weak"
								centerLabel="Balanced"
								rightLabel="Strong"
								hint={STRENGTH_HINT[strength.value]}
								tintClassName={
									strength.value < 0
										? "text-tag-teal-500"
										: strength.value > 0
											? "text-tag-orange-500"
											: "text-crema-deep"
								}
							/>
						</div>
					</div>

					{bean && (
						<div className="space-y-2 border-t border-line/60 pt-4">
							<p className="eyebrow">The bean itself</p>
							<p className="font-sans text-xs text-muted-foreground">
								How much you like this bean, kept separate from this shot.
							</p>
							<BeanVerdictPicker beanId={bean.id} status={bean.status} />
						</div>
					)}

					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={handleSave}
							disabled={saving}
							className="h-10 flex-1 rounded-lg bg-ink px-5 font-sans text-sm font-semibold text-paper transition-colors hover:bg-ink/85 disabled:opacity-40"
						>
							{saving ? "Saving…" : "Save notes"}
						</button>
					</div>
				</>
			)}
		</div>
	);

	if (bare) return body;

	return (
		<div className="rounded-xl border border-line bg-paper-raised p-5 shadow-card">
			{body}
		</div>
	);
}
