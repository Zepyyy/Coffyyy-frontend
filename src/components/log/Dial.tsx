import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { clampWeight, cn } from "@/lib/utils";

const DIAL_START_DEG = -135;
const DIAL_END_DEG = 135;
const DIAL_SWEEP_DEG = DIAL_END_DEG - DIAL_START_DEG;
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
	return (
		(Math.atan2(
			clientY - rect.top - rect.height / 2,
			clientX - rect.left - rect.width / 2,
		) *
			180) /
		Math.PI
	);
};
const valueToAngle = (value: number, min: number, max: number) =>
	DIAL_START_DEG +
	(max === min ? 0 : (value - min) / (max - min)) * DIAL_SWEEP_DEG;

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
	const repeated = useRef(false);
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
			className="flex h-11 min-w-11 flex-1 items-center justify-center text-ink-soft transition-colors hover:bg-paper-sunken hover:text-foreground active:bg-paper-sunken focus-visible:z-10"
			onClick={(event) => {
				// Native click includes Enter/Space. A completed hold has already nudged.
				if (!repeated.current || event.detail === 0) onNudge(dir);
				repeated.current = false;
			}}
			onPointerDown={(event) => {
				if (!event.isPrimary || event.button !== 0) return;
				stop();
				repeated.current = false;
				repeat.current.timeout = window.setTimeout(() => {
					repeated.current = true;
					onNudge(dir);
					repeat.current.interval = window.setInterval(() => onNudge(dir), 90);
				}, 420);
			}}
			onPointerUp={stop}
			onPointerLeave={stop}
			onPointerCancel={stop}
			onBlur={stop}
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
	decimals = 1,
	compact = false,
}: {
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	helpers?: boolean;
	label?: string;
	step?: number;
	/** Digits shown on the cap; 0 for whole units like °C. */
	decimals?: number;
	/** Smaller face, with full-size numeric entry and touch steppers. */
	compact?: boolean;
}) {
	const knobRef = useRef<HTMLDivElement>(null);
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
	const change = useCallback(
		(next: number) => {
			const clamped = Number(
				clampWeight({ value: next, min, max }).toFixed(decimals),
			);
			valueRef.current = clamped;
			onChange(clamped);
		},
		[onChange, min, max, decimals],
	);

	useEffect(() => {
		const element = knobRef.current;
		if (!element) return;
		const handleWheel = (event: WheelEvent) => {
			// Merely scrolling past a control must not edit a brew setting.
			if (document.activeElement !== element || event.deltaY === 0) return;
			event.preventDefault();
			change(
				valueRef.current +
					(event.deltaY < 0 ? 1 : -1) * step * (event.shiftKey ? 10 : 1),
			);
		};
		element.addEventListener("wheel", handleWheel, { passive: false });
		return () => element.removeEventListener("wheel", handleWheel);
	}, [change, step]);
	const nudge = useCallback(
		(dir: 1 | -1) => change(valueRef.current + dir * step),
		[change, step],
	);
	const handlePointerDown = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (!event.isPrimary || event.button !== 0) return;
			event.currentTarget.focus({ preventScroll: true });
			dialDrag.current = {
				pointerId: event.pointerId,
				lastAngle: getPointerAngle(
					event.clientX,
					event.clientY,
					event.currentTarget,
				),
				startValue: valueRef.current,
				accumulatedDelta: 0,
			};
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		[],
	);
	const handlePointerMove = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			const drag = dialDrag.current;
			if (
				!drag ||
				drag.pointerId !== event.pointerId ||
				!event.currentTarget.hasPointerCapture(event.pointerId)
			)
				return;
			const nextAngle = getPointerAngle(
				event.clientX,
				event.clientY,
				event.currentTarget,
			);
			drag.accumulatedDelta +=
				((normalizeDeltaAngle(nextAngle - drag.lastAngle) * POINTER_TURN_GAIN) /
					DIAL_SWEEP_DEG) *
				(max - min);
			drag.lastAngle = nextAngle;
			change(drag.startValue + drag.accumulatedDelta);
		},
		[change, max, min],
	);
	const handlePointerEnd = useCallback(
		(event: React.PointerEvent<HTMLDivElement>) => {
			if (dialDrag.current?.pointerId !== event.pointerId) return;
			dialDrag.current = null;
			if (event.currentTarget.hasPointerCapture(event.pointerId))
				event.currentTarget.releasePointerCapture(event.pointerId);
		},
		[],
	);
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			let next: number;
			const size = step * (event.shiftKey ? 5 : 1);
			switch (event.key) {
				case "ArrowRight":
				case "ArrowUp":
					next = valueRef.current + size;
					break;
				case "ArrowLeft":
				case "ArrowDown":
					next = valueRef.current - size;
					break;
				case "Home":
					next = min;
					break;
				case "End":
					next = max;
					break;
				case "PageUp":
					next = valueRef.current + step * 10;
					break;
				case "PageDown":
					next = valueRef.current - step * 10;
					break;
				default:
					return;
			}
			event.preventDefault();
			change(next);
		},
		[change, min, max, step],
	);
	const [draft, setDraft] = useState<string | null>(null);
	const cancelEdit = useRef(false);
	const activeAngle = valueToAngle(value, min, max);
	const valueRatio = max === min ? 0 : (value - min) / (max - min);
	const arcFill = valueRatio * 75;
	const faceSize = compact ? 104 : 128;

	return (
		<div className="flex min-w-0 flex-col items-center gap-2 py-2">
			<div
				className="relative shrink-0"
				style={{ width: faceSize, height: faceSize }}
			>
				<div
					ref={knobRef}
					role="slider"
					tabIndex={0}
					aria-label={label}
					aria-valuenow={value}
					aria-valuemin={min}
					aria-valuemax={max}
					aria-valuetext={value.toFixed(decimals)}
					className="absolute inset-0 touch-none rounded-full focus-visible:ring-2 focus-visible:ring-crema/60"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerEnd}
					onPointerCancel={handlePointerEnd}
					onLostPointerCapture={handlePointerEnd}
					onKeyDown={handleKeyDown}
				>
					<div
						aria-hidden="true"
						className="pointer-events-none absolute left-0 top-0 size-32 origin-top-left overflow-clip"
						style={{ transform: `scale(${faceSize / 128})` }}
					>
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
								stroke="var(--color-crema)"
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
					</div>
				</div>
				{/* A sibling field keeps the dial's precision input outside the slider. */}
				<div
					className={cn(
						"pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper-raised shadow-[inset_0_2px_6px_oklch(0.235_0.008_60/0.08)]",
						compact ? "size-12" : "size-[60px]",
					)}
				>
					<input
						aria-label={`${label} — type a value`}
						inputMode="decimal"
						className="pointer-events-auto h-11 w-12 rounded-full bg-transparent text-center font-data text-base font-semibold leading-none text-crema-deep dark:text-crema"
						value={draft ?? value.toFixed(decimals)}
						onFocus={() => {
							cancelEdit.current = false;
							setDraft(value.toFixed(decimals));
						}}
						onChange={(event) => setDraft(event.target.value)}
						onBlur={() => {
							if (!cancelEdit.current && draft?.trim()) {
								const parsed = Number(draft);
								if (Number.isFinite(parsed)) change(parsed);
							}
							cancelEdit.current = false;
							setDraft(null);
						}}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === "Escape") {
								event.preventDefault();
								cancelEdit.current = event.key === "Escape";
								event.currentTarget.blur();
							}
						}}
					/>
				</div>
			</div>
			<div
				className="flex shrink-0 divide-x divide-line border border-line"
				style={{ width: faceSize }}
			>
				<StepButton dir={-1} onNudge={nudge} label={label} />
				<StepButton dir={1} onNudge={nudge} label={label} />
			</div>
			{helpers && (
				<div className="flex max-w-full flex-col items-center gap-1 text-center font-data text-[10px] uppercase tracking-[0.08em] text-ink-faint">
					<span>
						{min}–{max}
					</span>
					<span>Drag or type</span>
				</div>
			)}
		</div>
	);
}
