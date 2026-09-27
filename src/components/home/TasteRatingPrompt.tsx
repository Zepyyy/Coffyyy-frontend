import { Star } from "lucide-react";
import { useState } from "react";
import { updateBrewById } from "@/lib/data";
import { cn } from "@/lib/utils";
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

export default function TasteRatingPrompt({
	brew,
	beanName,
	onDismiss,
}: {
	brew: Brews;
	beanName: string;
	onDismiss: () => void;
}) {
	const [tasteScore, setTasteScore] = useState(brew.tasteScore ?? 0);
	const [strengthScore, setStrengthScore] = useState(brew.strengthScore ?? 0);
	const [overallRating, setOverallRating] = useState(brew.overallRating ?? 0);
	const [saving, setSaving] = useState(false);

	const date = new Date(brew.date).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	const specs = [
		brew.grindSize,
		brew.beanWeight ? `${brew.beanWeight}g` : null,
		brew.espressoWeight ? `→ ${brew.espressoWeight}g` : null,
	]
		.filter(Boolean)
		.join(" · ");

	async function handleRate() {
		if (overallRating < 1) return;

		setSaving(true);
		await updateBrewById(
			{
				overallRating,
				tasteScore,
				strengthScore,
			},
			brew.id,
		);
		setSaving(false);
		onDismiss();
	}

	return (
		<div className="rounded-xl border border-line bg-paper-raised p-5 space-y-5 shadow-card">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="eyebrow">How was that cup?</p>
					<p className="font-display text-xl italic tracking-tight text-foreground mt-1">
						{beanName}
					</p>
					<p className="eyebrow mt-1.5">
						{date}
						{specs ? ` · ${specs}` : ""}
					</p>
				</div>
				<button
					type="button"
					onClick={onDismiss}
					className="font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint transition-colors hover:text-foreground shrink-0"
				>
					Skip
				</button>
			</div>

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
								onClick={() => setOverallRating(value)}
								className="transition-transform hover:scale-110"
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
				</div>
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				<div className="space-y-2">
					<p className="eyebrow">Taste axis</p>
					<AxisSlider
						value={tasteScore}
						onChange={setTasteScore}
						leftLabel="Sour"
						centerLabel="Balanced"
						rightLabel="Bitter"
						hint={TASTE_HINT[tasteScore]}
						tintClassName={
							tasteScore < 0
								? "text-tag-teal-500"
								: tasteScore > 0
									? "text-tag-orange-500"
									: "text-crema-deep"
						}
					/>
				</div>

				<div className="space-y-2">
					<p className="eyebrow">Strength axis</p>
					<AxisSlider
						value={strengthScore}
						onChange={setStrengthScore}
						leftLabel="Weak"
						centerLabel="Balanced"
						rightLabel="Strong"
						hint={STRENGTH_HINT[strengthScore]}
						tintClassName={
							strengthScore < 0
								? "text-tag-teal-500"
								: strengthScore > 0
									? "text-tag-orange-500"
									: "text-crema-deep"
						}
					/>
				</div>
			</div>

			<button
				type="button"
				onClick={handleRate}
				disabled={saving || overallRating < 1}
				className="h-10 w-full rounded-lg bg-ink font-sans text-sm font-semibold text-paper transition-all hover:bg-ink/85 disabled:opacity-40"
			>
				{saving ? "Saving…" : "Save rating →"}
			</button>
		</div>
	);
}
