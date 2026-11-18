import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	type Pour,
	clockTime,
	scaledPours,
	V60_STARTER_POURS,
} from "@/lib/pourSchedule";

const fieldClass =
	"min-h-11 w-full border border-line-strong bg-paper-raised px-2 font-data text-sm";

export default function PourScheduleEditor({
	pours = [],
	water,
	onChange,
	error,
}: {
	pours?: Pour[];
	water: number;
	onChange: (pours: Pour[] | undefined) => void;
	error?: string;
}) {
	const targets = scaledPours(pours, water);
	const numberValue = (value: string) => (value === "" ? NaN : Number(value));

	function replace(index: number, changes: Partial<Pour>) {
		onChange(
			pours.map((pour, i) => (i === index ? { ...pour, ...changes } : pour)),
		);
	}

	function addPour() {
		const last = pours.at(-1);
		if (!last) {
			onChange([{ atSeconds: 0, fraction: 1 }]);
			return;
		}
		const previous = pours.at(-2);
		const next =
			last.fraction === 1
				? [
						...pours.slice(0, -1),
						{ ...last, fraction: ((previous?.fraction ?? 0) + 1) / 2 },
					]
				: pours;
		onChange([...next, { atSeconds: last.atSeconds + 30, fraction: 1 }]);
	}

	return (
		<section className="space-y-4" aria-labelledby="recipe-pour-heading">
			<h2
				id="recipe-pour-heading"
				className="font-display text-2xl italic tracking-tight text-foreground/90"
			>
				Pour schedule
			</h2>
			{pours.map((pour, index) => {
				const target = targets[index];
				return (
					<fieldset
						key={index}
						className="grid grid-cols-[1fr_1fr_auto] items-end gap-x-3 gap-y-2 border-b border-line pb-3"
					>
						<legend className="mb-2 font-sans text-sm font-medium">
							Pour {index + 1}
						</legend>
						<label className="grid gap-1 font-sans text-xs text-muted-foreground">
							Cue (seconds)
							<input
								className={fieldClass}
								type="number"
								min={0}
								step={1}
								value={Number.isFinite(pour.atSeconds) ? pour.atSeconds : ""}
								onChange={(event) =>
									replace(index, { atSeconds: numberValue(event.target.value) })
								}
								required
							/>
						</label>
						<label className="grid gap-1 font-sans text-xs text-muted-foreground">
							Total water (%)
							<input
								className={fieldClass}
								type="number"
								min={0}
								max={100}
								step="any"
								value={
									Number.isFinite(pour.fraction)
										? Number((pour.fraction * 100).toPrecision(15))
										: ""
								}
								onChange={(event) =>
									replace(index, {
										fraction: numberValue(event.target.value) / 100,
									})
								}
								required
							/>
						</label>
						<Button
							type="button"
							variant="ghost"
							aria-label={`Remove pour ${index + 1}`}
							className="size-11"
							onClick={() => {
								const remaining = pours.filter((_, i) => i !== index);
								onChange(remaining.length ? remaining : undefined);
							}}
						>
							<X aria-hidden />
						</Button>
						{Number.isSafeInteger(target.atSeconds) &&
							target.atSeconds >= 0 &&
							Number.isFinite(pour.fraction) && (
								<p className="col-span-3 font-data text-sm">
									{clockTime(target.atSeconds)} · Pour to {target.grams} g
								</p>
							)}
					</fieldset>
				);
			})}
			{error && (
				<p role="alert" className="font-sans text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				{pours.length === 0 && (
					<Button
						type="button"
						variant="outline"
						onClick={() =>
							onChange(V60_STARTER_POURS.map((pour) => ({ ...pour })))
						}
					>
						Use V60 starter
					</Button>
				)}
				<Button type="button" variant="outline" onClick={addPour}>
					Add pour
				</Button>
			</div>
		</section>
	);
}
