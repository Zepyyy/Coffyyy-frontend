import { Star } from "lucide-react";
import { useState } from "react";
import { updateBrewById } from "@/db/crud/update";
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
					className="w-full accent-primary cursor-pointer"
				/>
				<div className="flex justify-between font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground select-none">
					<span>{leftLabel}</span>
					<span>{centerLabel}</span>
					<span>{rightLabel}</span>
				</div>
			</div>
			<p
				className={cn(
					"font-Recursive text-xs text-center transition-colors",
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
		<div className="border border-primary/30 bg-primary-700/5 p-5 space-y-5 backdrop-blur-sm">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
						How was that cup?
					</p>
					<p className="font-News text-xl text-foreground/90 mt-0.5">
						"{beanName}"
					</p>
					<p className="font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
						{date}
						{specs ? ` · ${specs}` : ""}
					</p>
				</div>
				<button
					type="button"
					onClick={onDismiss}
					className="font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground transition-colors shrink-0"
				>
					Skip
				</button>
			</div>

			<div className="space-y-2">
				<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
					Overall rating
				</p>
				<div className="flex items-center gap-1">
					{Array.from({ length: 5 }, (_, index) => {
						const value = index + 1;
						const active = value <= overallRating;
						return (
							<button
								key={value}
								type="button"
								onClick={() => setOverallRating(value)}
								className="transition-transform hover:scale-105"
								aria-label={`Rate ${value} out of 5`}
							>
								<Star
									className={cn(
										"size-5",
										active
											? "fill-primary text-primary"
											: "text-muted-foreground/25",
									)}
								/>
							</button>
						);
					})}
				</div>
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				<div className="space-y-2">
					<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
						Taste axis
					</p>
					<AxisSlider
						value={tasteScore}
						onChange={setTasteScore}
						leftLabel="Sour"
						centerLabel="Balanced"
						rightLabel="Bitter"
						hint={TASTE_HINT[tasteScore]}
						tintClassName={
							tasteScore < 0
								? "text-tag-teal-400"
								: tasteScore > 0
									? "text-tag-orange-400"
									: "text-primary"
						}
					/>
				</div>

				<div className="space-y-2">
					<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
						Strength axis
					</p>
					<AxisSlider
						value={strengthScore}
						onChange={setStrengthScore}
						leftLabel="Weak"
						centerLabel="Balanced"
						rightLabel="Strong"
						hint={STRENGTH_HINT[strengthScore]}
						tintClassName={
							strengthScore < 0
								? "text-tag-teal-400"
								: strengthScore > 0
									? "text-tag-orange-400"
									: "text-primary"
						}
					/>
				</div>
			</div>

			<button
				type="button"
				onClick={handleRate}
				disabled={saving || overallRating < 1}
				className="w-full h-9 bg-foreground text-background font-Recursive text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
			>
				{saving ? "Saving…" : "Save rating →"}
			</button>
		</div>
	);
}
