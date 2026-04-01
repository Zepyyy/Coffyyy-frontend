import { useCallback, useRef } from "react";

const DIAL_START_DEG = -135;
const DIAL_END_DEG = 135;
const DIAL_SWEEP_DEG = DIAL_END_DEG - DIAL_START_DEG;
const POINTER_TURN_GAIN = 1.15;

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

const beanWeightToAngle = (value: number, min: number, max: number) => {
	const ratio = (value - min) / (max - min);
	return DIAL_START_DEG + ratio * DIAL_SWEEP_DEG;
};

export default function Dial({
	value,
	onChange,
	min,
	max,
	helpers = true,
}: {
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	helpers?: boolean;
}) {
	const dialDrag = useRef<{
		pointerId: number;
		lastAngle: number;
		startValue: number;
		accumulatedDelta: number;
	} | null>(null);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLButtonElement>) => {
			const angle = getPointerAngle(e.clientX, e.clientY, e.currentTarget);
			dialDrag.current = {
				pointerId: e.pointerId,
				lastAngle: angle,
				startValue: value,
				accumulatedDelta: 0,
			};
			e.currentTarget.setPointerCapture(e.pointerId);
		},
		[value],
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

			onChange(dialDrag.current.startValue + dialDrag.current.accumulatedDelta);
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
			const stepSize = e.shiftKey ? 0.5 : 0.1;
			const dir = e.key === "ArrowRight" ? 1 : -1;
			onChange(value + dir * stepSize);
		},
		[onChange, value],
	);

	const activeAngle = beanWeightToAngle(value, min, max);

	return (
		<div className="flex items-center justify-center flex-col space-y-3 py-4 gap-2">
			<div className="flex items-center justify-center py-1">
				<button
					type="button"
					aria-label="Bean weight dial"
					className="ml-2 touch-none rounded-full focus:outline-none focus:ring-1 focus:ring-primary/40"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onKeyDown={handleKeyDown}
				>
					<div className="relative size-24">
						<div className="absolute inset-0 rounded-full border border-primary/20 bg-primary-700/10" />
						<div className="absolute inset-2 rounded-full border-4 border-primary/15" />
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
											className={`border-r bg-transparent ${isMajor ? "h-2.5" : "h-1.5"} ${isMajor ? "w-0.5" : "w-px"} rounded-none ${isActive ? "border-primary/70" : "border-primary/25"}`}
											style={{
												transform: "translateY(-53px)",
											}}
										/>
									</div>
								);
							})}
						</div>
						<div
							className="absolute inset-0 flex items-start justify-center"
							style={{
								transform: `rotate(${activeAngle}deg)`,
							}}
						>
							<div className="mt-1.5 h-7 w-1.5 rounded-full bg-primary shadow-[0_0_14px_rgba(0,0,0,0.15)]" />
						</div>
						<div className="absolute inset-7 flex items-center justify-center rounded-full border border-primary/40 bg-background/95">
							<span className="font-News text-sm leading-none text-primary-800 dark:text-primary-100">
								{value.toFixed(1)}g
							</span>
						</div>
					</div>
				</button>
			</div>
			{helpers && (
				<div className="w-fit flex items-center justify-between gap-4 font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
					<span>{min}g</span>
					<span>Shift + arrows = 0.5g</span>
					<span>{max}g</span>
				</div>
			)}
		</div>
	);
}
