import { useEffect, useState } from "react";
import type { BrewLogForm } from "./brewForm";
import { Button } from "@/components/ui/button";

import type { BrewSession } from "./brewSession";
import { clockTime } from "@/lib/pourSchedule";
export default function V60Timer({
	session,
	update,
	cancel,
	cancelLabel,
	save,
	busy,
	error,
}: {
	session: BrewSession;
	update: (next: BrewSession) => void;
	cancel: () => void;
	cancelLabel: string;
	save: (actual: BrewLogForm & { machineId: number }) => void;
	busy: boolean;
	error: string;
}) {
	const elapsedNow = () =>
		Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
	const [elapsed, setElapsed] = useState(elapsedNow);
	useEffect(() => {
		if (session.actuals) return;
		const tick = () =>
			setElapsed(
				Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000)),
			);
		tick();
		const timer = window.setInterval(tick, 250);
		document.addEventListener("visibilitychange", tick);
		return () => {
			clearInterval(timer);
			document.removeEventListener("visibilitychange", tick);
		};
	}, [session.startedAt, session.actuals]);
	const actuals = session.actuals;
	const currentPour = session.steps[session.step];
	const nextPour = session.steps[session.step + 1];
	const wait = currentPour ? Math.max(0, currentPour.atSeconds - elapsed) : 0;
	const cueTime =
		wait || Math.max(0, (nextPour?.atSeconds ?? elapsed) - elapsed);
	let cueLabel = "Finish after drawdown";
	if (wait > 0) cueLabel = "Pour in";
	else if (nextPour) cueLabel = cueTime > 0 ? "Next pour in" : "Next pour due";
	return (
		<section className="mx-auto w-full max-w-xl space-y-6 border-y border-line bg-paper-raised p-4 sm:border sm:p-8">
			<header>
				<p className="font-data text-xs text-muted-foreground">
					V60 · {session.brewer}
				</p>
				<h1 className="font-display text-3xl italic">
					{actuals ? "Finish brew" : session.bean}
				</h1>
			</header>
			{actuals ? (
				<form
					className="space-y-5"
					onSubmit={(e) => {
						e.preventDefault();
						save({
							...session.form,
							extractionTime: actuals.seconds,
							brewWeight: Number(actuals.water),
							targetRatio: undefined,
							waterTemp: actuals.temperature
								? Number(actuals.temperature)
								: undefined,
							notes: "",
						});
					}}
				>
					{(
						[
							{ key: "seconds", label: "Elapsed time · s", min: 0, step: 1 },
							{ key: "water", label: "Poured water · g", min: 0.1, step: 0.1 },
							{
								key: "temperature",
								label: "Water temperature · °C (optional)",
								min: 0,
								max: 100,
								step: 0.1,
							},
						] as const
					).map((field) => (
						<label key={field.key} className="grid gap-1 text-sm">
							{field.label}
							<input
								className="min-h-12 border border-line-strong bg-paper px-3 font-data text-lg"
								type="number"
								min={field.min}
								max={"max" in field ? field.max : undefined}
								step={field.step}
								required={field.key !== "temperature"}
								value={actuals[field.key]}
								onChange={(e) =>
									update({
										...session,
										actuals: { ...actuals, [field.key]: e.target.value },
									})
								}
							/>
						</label>
					))}

					<Button variant="ink" className="h-12 w-full" disabled={busy}>
						Save brew
					</Button>
				</form>
			) : (
				<>
					{currentPour && (
						<div className="space-y-2 border-y border-line py-4">
							<p className="font-data text-sm text-ink-soft">
								{wait > 0 ? "Wait · " : ""}
								Pour {session.step + 1} of {session.steps.length}
							</p>
							<p className="flex items-baseline gap-2">
								<span className="font-data text-6xl tabular-nums">
									{currentPour.grams}
								</span>
								<span className="text-sm text-ink-soft">g on scale</span>
							</p>
						</div>
					)}
					<div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
						<div>
							<p className="text-sm text-ink-soft">Elapsed time</p>
							<p
								role="timer"
								aria-label="Elapsed time"
								className="font-data text-4xl tabular-nums"
							>
								{clockTime(elapsed)}
							</p>
						</div>
						{currentPour && (
							<div className="text-sm">
								<p className="text-ink-soft">{cueLabel}</p>
								{cueTime > 0 && (
									<p className="font-data text-2xl tabular-nums">
										{clockTime(cueTime)}
									</p>
								)}
							</div>
						)}
					</div>
					<div className={nextPour ? "grid grid-cols-2 gap-2" : ""}>
						{nextPour && (
							<Button
								variant="ink"
								className="h-14"
								onClick={() => update({ ...session, step: session.step + 1 })}
							>
								Next pour
							</Button>
						)}
						<Button
							variant={nextPour ? "outline" : "ink"}
							className="h-14 w-full"
							onClick={() =>
								update({
									...session,
									actuals: {
										seconds: String(elapsedNow()),
										water: String(session.form.brewWeight),
										temperature: "",
									},
								})
							}
						>
							Finish
						</Button>
					</div>
				</>
			)}
			{error && <p role="alert">{error}</p>}
			<button
				className="min-h-11 text-sm underline"
				disabled={busy}
				onClick={cancel}
			>
				{cancelLabel}
			</button>
		</section>
	);
}
