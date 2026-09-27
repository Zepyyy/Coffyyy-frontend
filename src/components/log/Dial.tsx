import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { clampWeight } from "@/lib/utils";

const DIAL_START_DEG = -135;
const DIAL_END_DEG = 135;
const DIAL_SWEEP_DEG = DIAL_END_DEG - DIAL_START_DEG;
// A full 360° pointer lap moves the value by roughly half the sweep range,
// so fine adjustments stay small and deliberate.
const POINTER_TURN_GAIN = 0.45;

const normalizeDeltaAngle = (delta: number) => {
	if (delta > 180) return delta - 360;
	if (delta < -180) return delta + 360;
	return delta;
};

const getPointerAngle = (
	clientX: number,
	clientY: number,
	element: HTMLElement,
) => {
	const rect = element.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
};

const valueToAngle = (value: number, min: number, max: number) => {
	const ratio = (value - min) / (max - min);
	return DIAL_START_DEG + ratio * DIAL_SWEEP_DEG;
};

function StepButton({
	dir,
	onNudge,
	label,
}: {
	dir: 1 | -1;
	onNudge: (dir: 1 | -1) => void;
	label: string;
}) {
	const repeat = useRef<{ timeout?: number; interval?: number }>({});
	const stop = useCallback(() => {
		window.clearTimeout(repeat.current.timeout);
		window.clearInterval(repeat.current.interval);
		repeat.current = {};
	}, []);
	useEffect(() => stop, [stop]);

	return (
		<button
			type="button"
			aria-label={`${label} — ${dir < 0 ? "decrease" : "increase"}`}
			className="flex size-7 shrink-0 items-center justify-center border border-line text-ink-faint transition-colors hover:border-ink-faint hover:text-foreground active:bg-paper-sunken"
			onPointerDown={(e) => {
				e.preventDefault();
				onNudge(dir);
				repeat.current.timeout = window.setTimeout(() => {
					repeat.current.interval = window.setInterval(() => onNudge(dir), 90);
				}, 420);
			}}
			onPointerUp={stop}
			onPointerLeave={stop}
			onPointerCancel={stop}
		>
			{dir < 0 ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
		</button>
	);
}

export default function Dial({
	value,
	onChange,
	min,
	max,
	helpers = true,
	label = "Weight dial",
	step = 0.1,
}: {
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	helpers?: boolean;
	label?: string;
	step?: number;
}) {
	const knobRef = useRef<HTMLButtonElement>(null);
	const dialDrag = useRef<{
		pointerId: number;
		lastAngle: number;
		startValue: number;
		accumulatedDelta: number;
	} | null>(null);
	const valueRef = useRef(value);
	useEffect(() => {
		valueRef.current = value;
	}, [value]);

	// Wheel adjusts in small steps; needs a non-passive listener so the
	// page doesn't scroll behind the dial.
	useEffect(() => {
		const el = knobRef.current;
		if (!el) return;
		const handleWheel = (event: WheelEvent) => {
			event.preventDefault();
			const size = event.shiftKey ? step * 10 : step;
			const delta = (event.deltaY < 0 ? 1 : -1) * size;
			onChange(clampWeight({ value: valueRef.current + delta, min, max }));
		};
		el.addEventListener("wheel", handleWheel, { passive: false });
		return () => el.removeEventListener("wheel", handleWheel);
	}, [min, max, onChange, step]);

	const nudge = useCallback(
		(dir: 1 | -1) => {
			onChange(clampWeight({ value: valueRef.current + dir * step, min, max }));
		},
		[onChange, step, min, max],
	);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			// Clicks on the value input should edit, not drag.
			if ((e.target as HTMLElement).tagName === "INPUT") return;
			(document.activeElement as HTMLElement | null)?.blur?.();
			const angle = getPointerAngle(e.clientX, e.clientY, e.currentTarget);
			dialDrag.current = {
				pointerId: e.pointerId,
				lastAngle: angle,
				startValue: valueRef.current,
				accumulatedDelta: 0,
			};
			e.currentTarget.setPointerCapture(e.pointerId);
		},
		[],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
			if (!dialDrag.current || dialDrag.current.pointerId !== e.pointerId)
				return;

			const nextAngle = getPointerAngle(e.clientX, e.clientY, e.currentTarget);
			const angleDelta = normalizeDeltaAngle(
				nextAngle - dialDrag.current.lastAngle,
			);
			const valueDelta =
				((angleDelta * POINTER_TURN_GAIN) / DIAL_SWEEP_DEG) * (max - min);

			dialDrag.current.accumulatedDelta += valueDelta;
			dialDrag.current.lastAngle = nextAngle;

			onChange(
				clampWeight({
					value:
						dialDrag.current.startValue + dialDrag.current.accumulatedDelta,
					min,
					max,
				}),
			);
		},
		[max, min, onChange],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			if (e.currentTarget.hasPointerCapture(e.pointerId)) {
				e.currentTarget.releasePointerCapture(e.pointerId);
			}
			dialDrag.current = null;
		},
		[],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLButtonElement>) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			e.preventDefault();
			const size = e.shiftKey ? step * 5 : step;
			const dir = e.key === "ArrowRight" ? 1 : -1;
			onChange(clampWeight({ value: valueRef.current + dir * size, min, max }));
		},
		[onChange, step, min, max],
	);

	// The center value is editable: draft holds the text while focused,
	// committed (and clamped) on blur or Enter.
	const [draft, setDraft] = useState<string | null>(null);
	const activeAngle = valueToAngle(value, min, max);

	// Gauge arc: pathLength=100 turns the fill into a plain percentage.
	// The 270° sweep is rotated so the arc opens clockwise through 12
	// o'clock, matching the tick scale.
	const valueRatio = max === min ? 0 : (value - min) / (max - min);
	const arcFill = valueRatio * 75;

	return (
		<div className="flex flex-col items-center gap-2 py-4">
			<div className="flex items-center gap-2.5">
				<StepButton dir={-1} onNudge={nudge} label={label} />

				<button
					ref={knobRef}
					type="button"
					aria-label={label}
					aria-valuenow={value}
					aria-valuemin={min}
					aria-valuemax={max}
					className="ml-1 touch-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-crema/60"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onKeyDown={handleKeyDown}
				>
					<div className="relative size-32">
						{/* Knurled collar — 48 teeth around the outside */}
						<div className="absolute inset-0">
							{Array.from({ length: 48 }, (_, i) => (
								<div
									key={i}
									className="absolute left-1/2 top-1/2 h-[5px] w-[2px] -translate-x-1/2 bg-line-strong"
									style={{
										transform: `rotate(${i * 7.5}deg) translateY(-60px)`,
									}}
								/>
							))}
						</div>

						{/* Metal body */}
						<div className="absolute inset-[6px] rounded-full border border-line bg-paper-raised shadow-knob" />

						{/* Gauge arc — the crema fill tracks the value */}
						<svg
							viewBox="0 0 128 128"
							className="absolute inset-0 size-full"
							aria-hidden
						>
							<circle
								cx="64"
								cy="64"
								r="50"
								fill="none"
								stroke="var(--line-strong)"
								strokeWidth="2"
								strokeDasharray="75 100"
								transform="rotate(225 64 64)"
								pathLength={100}
							/>
							<circle
								cx="64"
								cy="64"
								r="50"
								fill="none"
								stroke="var(--crema)"
								strokeWidth="3"
								strokeLinecap="round"
								strokeDasharray={`${arcFill} 100`}
								transform="rotate(225 64 64)"
								pathLength={100}
							/>
						</svg>

						{/* Tick scale */}
						<div className="absolute inset-0">
							{Array.from({ length: 13 }, (_, i) => {
								const angle = DIAL_START_DEG + (i / 12) * DIAL_SWEEP_DEG;
								const isMajor = i % 3 === 0;
								const isActive = angle <= activeAngle;
								return (
									<div
										key={angle}
										className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
										style={{
											transform: `rotate(${angle}deg)`,
										}}
									>
										<div
											className={`${isMajor ? "h-3.5 w-[2px]" : "h-2 w-px"} ${isActive ? "bg-crema-deep" : "bg-line-strong"}`}
											style={{
												transform: "translateY(-40px)",
											}}
										/>
									</div>
								);
							})}
						</div>

						{/* Needle */}
						<div
							className="absolute inset-0 flex items-start justify-center transition-transform duration-150 ease-soft"
							style={{
								transform: `rotate(${activeAngle}deg)`,
							}}
						>
							<div className="mt-[9px] h-7 w-[5px] bg-crema" />
						</div>

						{/* Cap — tap the number to type */}
						<div className="absolute inset-[34px] flex items-center justify-center rounded-full border border-line bg-paper-raised shadow-[inset_0_2px_6px_oklch(0.235_0.008_60/0.08)]">
							<input
								aria-label={`${label} — type a value`}
								inputMode="decimal"
								className="w-12 bg-transparent text-center font-data text-base font-semibold leading-none text-crema-deep outline-none dark:text-crema"
								value={draft ?? value.toFixed(1)}
								onFocus={() => setDraft(value.toFixed(1))}
								onChange={(e) => setDraft(e.target.value)}
								onBlur={() => {
									if (draft != null) {
										const parsed = Number(draft);
										if (Number.isFinite(parsed)) {
											onChange(clampWeight({ value: parsed, min, max }));
										}
									}
									setDraft(null);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.currentTarget.blur();
									}
									e.stopPropagation();
								}}
							/>
						</div>
					</div>
				</button>

				<StepButton dir={1} onNudge={nudge} label={label} />
			</div>

			{helpers && (
				<div className="w-fit flex items-center justify-between gap-4 font-data text-[10px] uppercase tracking-[0.12em] text-ink-faint">
					<span>{min}g</span>
					<span className="text-ink-faint/60">drag, scroll or type</span>
					<span>{max}g</span>
				</div>
			)}
		</div>
	);
}
