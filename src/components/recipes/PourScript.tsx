/**
 * The pour plan as a script you read top to bottom. It starts generated
 * (bloom from the dose, the rest split evenly, total time from the waits);
 * you only nudge how much to pour and how long to wait. The last pour is
 * always "the rest", so the ratio never drifts.
 */
import { Plus, Trash2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Stepper } from "./RecipeControls";
import {
	addStep,
	clock,
	cueTimes,
	cumulative,
	nudgeGrams,
	nudgeWait,
	PLAN_KINDS,
	type PlanKind,
	type PourStep,
	removeStep,
	totalSeconds,
} from "@/lib/pourPlan";

type EditorProps = {
	steps: PourStep[];
	water: number;
	onChange: (steps: PourStep[]) => void;
	planKind: PlanKind | null;
	onPlan: (kind: PlanKind) => void;
};

const stepName = (i: number, n: number) =>
	i === 0 ? "Bloom" : i === n - 1 ? "Last pour" : `Pour ${i + 1}`;

function PlanPicker({
	planKind,
	onPlan,
	className,
}: {
	planKind: PlanKind | null;
	onPlan: (kind: PlanKind) => void;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-wrap items-center gap-1.5", className)}>
			<Wand2 className="mr-1 size-3.5 text-ink-faint" aria-hidden />
			{PLAN_KINDS.map((p) => (
				<button
					key={p.kind}
					type="button"
					title={p.hint}
					onClick={() => onPlan(p.kind)}
					className={cn(
						"border px-2.5 py-1 font-data text-[11px] transition-colors",
						planKind === p.kind
							? "method-line method-wash text-foreground"
							: "border-line text-muted-foreground hover:border-line-strong hover:text-foreground",
					)}
				>
					{p.label}
				</button>
			))}
		</div>
	);
}

function EmptyPlan({ onPlan }: { onPlan: (k: PlanKind) => void }) {
	return (
		<div className="border border-dashed border-line-strong p-5 text-center">
			<p className="font-sans text-sm text-muted-foreground">
				No pours yet. Pick a shape — it's worked out from your dose and water.
			</p>
			<PlanPicker
				planKind={null}
				onPlan={onPlan}
				className="mt-3 justify-center"
			/>
		</div>
	);
}

export default function PourScript({
	steps,
	water,
	onChange,
	planKind,
	onPlan,
}: EditorProps) {
	if (steps.length === 0) return <EmptyPlan onPlan={onPlan} />;
	const cues = cueTimes(steps);
	const total = totalSeconds(steps);
	const cums = cumulative(steps);
	return (
		<div className="space-y-3">
			<PlanPicker planKind={planKind} onPlan={onPlan} />
			<ol className="relative">
				{steps.map((s, i) => {
					const cum = cums[i].after;
					const last = i === steps.length - 1;
					return (
						<li key={i} className="grid grid-cols-[3.25rem_14px_1fr] gap-x-3">
							<span className="pt-3 text-right font-data text-sm font-semibold tabular-nums">
								{clock(cues[i])}
							</span>
							<span className="relative flex justify-center">
								<span className="absolute inset-y-0 w-px bg-line-strong" />
								<span className="relative mt-4 size-3 rounded-full border-2 method-line bg-paper-raised" />
							</span>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-2.5">
								<span className="w-20 font-display text-lg italic">
									{stepName(i, steps.length)}
								</span>
								{last ? (
									<span className="font-data text-sm">
										the rest, <b>{s.grams} g</b>
									</span>
								) : (
									<Stepper
										size="sm"
										label="pour"
										unit="g"
										step={5}
										value={s.grams}
										onChange={(v) =>
											onChange(nudgeGrams(steps, i, v - s.grams, water))
										}
									/>
								)}
								<span className="font-sans text-xs text-muted-foreground">
									to {Math.round(cum)} g, then {last ? "let it drain" : "wait"}
								</span>
								<Stepper
									size="sm"
									label={last ? "drawdown" : "wait"}
									step={5}
									value={s.wait}
									format={clock}
									onChange={(v) => onChange(nudgeWait(steps, i, v - s.wait))}
								/>
								<span className="ml-auto flex items-center gap-2">
									<span className="hidden h-1.5 w-20 bg-paper-sunken sm:block">
										<span
											className="method-fill block h-full opacity-40"
											style={{ width: `${(cum / water) * 100}%` }}
										/>
									</span>
									{steps.length > 1 && (
										<button
											type="button"
											aria-label={`Remove ${stepName(i, steps.length)}`}
											onClick={() => onChange(removeStep(steps, i, water))}
											className="text-ink-faint hover:text-destructive"
										>
											<Trash2 className="size-3.5" />
										</button>
									)}
								</span>
							</div>
						</li>
					);
				})}
				<li className="grid grid-cols-[3.25rem_14px_1fr] gap-x-3">
					<span className="pt-2 text-right font-data text-sm font-semibold tabular-nums">
						{clock(total)}
					</span>
					<span className="flex justify-center">
						<span className="mt-3 size-3 rotate-45 bg-ink" />
					</span>
					<div className="flex items-center justify-between py-2">
						<span className="font-display text-lg italic">Done</span>
						<button
							type="button"
							onClick={() => onChange(addStep(steps, water))}
							className="inline-flex items-center gap-1 font-data text-[11px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
						>
							<Plus className="size-3.5" /> Split a pour
						</button>
					</div>
				</li>
			</ol>
		</div>
	);
}
