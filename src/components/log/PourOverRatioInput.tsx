import { useState } from "react";

export default function PourOverRatioInput({
	value,
	onChange,
	onEdit,
}: {
	value: string;
	onChange: (value: number) => void;
	onEdit: () => void;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	return (
		<label className="flex min-w-0 flex-col items-center gap-2">
			<span className="font-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
				Ratio
			</span>
			<span className="flex max-w-full items-center font-display text-xl italic leading-none text-primary-700/90 min-[360px]:text-3xl sm:text-5xl dark:text-primary-200/90">
				<span aria-hidden>1:</span>
				<input
					aria-label="Ratio, grams of water per gram of coffee"
					style={{ font: "inherit" }}
					className="min-h-11 w-[4ch] min-w-0 border-b border-crema/60 bg-transparent text-center focus-visible:outline-crema"
					inputMode="decimal"
					value={draft ?? value}
					onChange={(event) => {
						onEdit();
						setDraft(event.currentTarget.value);
					}}
					onBlur={() => {
						const next = Number(draft?.trim().replace(",", "."));
						if (Number.isFinite(next) && next > 0) onChange(next);
						setDraft(null);
					}}
					onKeyDown={(event) => {
						if (event.key !== "Enter") return;
						event.preventDefault();
						event.currentTarget.blur();
					}}
				/>
			</span>
		</label>
	);
}
