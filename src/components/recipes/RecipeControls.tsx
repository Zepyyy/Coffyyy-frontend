/**
 * Recipe controls with no text boxes: hold-to-repeat steppers, a tick ruler
 * you drag along, and the ratio scale that plots your past brews.
 */
import { Minus, Plus } from "lucide-react";
import { type PointerEvent, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { RecipeMethod } from "@/types/RecipeTypes";
import {
	RATIO_SCALE,
	type RatioPoint,
	type SweetSpot,
	fmtRatio as fmt,
} from "@/lib/ratioHistory";

function useHold(action: () => void) {
	const timer = useRef<number | undefined>(undefined);
	const latest = useRef(action);
	useEffect(() => {
		latest.current = action;
	});
	const stop = () => {
		window.clearTimeout(timer.current);
		window.clearInterval(timer.current);
	};
	useEffect(() => stop, []);
	return {
		onPointerDown: (e: PointerEvent) => {
			e.preventDefault();
			latest.current();
			stop();
			timer.current = window.setTimeout(() => {
				timer.current = window.setInterval(() => latest.current(), 70);
			}, 350);
		},
		onPointerUp: stop,
		onPointerLeave: stop,
		onPointerCancel: stop,
		onKeyDown: (e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				latest.current();
			}
		},
	};
}

export function NudgeButton({
	dir,
	onNudge,
	label,
	className,
}: {
	dir: -1 | 1;
	onNudge: () => void;
	label: string;
	className?: string;
}) {
	const hold = useHold(onNudge);
	const Icon = dir < 0 ? Minus : Plus;
	return (
		<button
			type="button"
			aria-label={label}
			{...hold}
			className={cn(
				"select-none touch-manipulation flex size-8 shrink-0 sm:size-9 items-center justify-center text-ink-soft transition-colors hover:bg-paper-sunken hover:text-foreground active:bg-crema-tint",
				className,
			)}
		>
			<Icon className="size-3.5" aria-hidden />
		</button>
	);
}

/** − value + ; arrows on focus also nudge. */
export function Stepper({
	value,
	onChange,
	step,
	label,
	unit,
	format = (v) => fmt(v),
	size = "md",
	className,
}: {
	value: number;
	onChange: (v: number) => void;
	step: number;
	label: string;
	unit?: string;
	format?: (v: number) => string;
	size?: "sm" | "md" | "lg" | "resp";
	className?: string;
}) {
	return (
		<div
			role="spinbutton"
			aria-label={label}
			aria-valuenow={value}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "ArrowUp" || e.key === "ArrowRight") {
					e.preventDefault();
					onChange(value + step);
				}
				if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
					e.preventDefault();
					onChange(value - step);
				}
			}}
			className={cn(
				"inline-flex items-center border border-line-strong bg-paper-raised focus:outline-none focus-visible:ring-1 focus-visible:ring-crema",
				className,
			)}
		>
			<NudgeButton
				dir={-1}
				label={`Less ${label}`}
				onNudge={() => onChange(value - step)}
			/>
			<span
				className={cn(
					"min-w-[3.5ch] flex-1 px-1 text-center font-data tabular-nums text-foreground",
					size === "sm" && "text-xs",
					size === "md" && "text-sm",
					size === "lg" && "text-2xl font-semibold",
					size === "resp" && "text-lg font-semibold sm:text-2xl",
				)}
			>
				{format(value)}
				{unit && (
					<span className="ml-0.5 text-[0.7em] text-ink-faint">{unit}</span>
				)}
			</span>
			<NudgeButton
				dir={1}
				label={`More ${label}`}
				onNudge={() => onChange(value + step)}
			/>
		</div>
	);
}

function useDragValue(
	min: number,
	max: number,
	step: number,
	onChange: (v: number) => void,
) {
	const ref = useRef<HTMLDivElement>(null);
	const read = (clientX: number) => {
		const el = ref.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		const raw = min + t * (max - min);
		onChange(Number((Math.round(raw / step) * step).toFixed(2)));
	};
	return {
		ref,
		handlers: {
			onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
				e.currentTarget.setPointerCapture(e.pointerId);
				read(e.clientX);
			},
			onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
				if (e.currentTarget.hasPointerCapture(e.pointerId)) read(e.clientX);
			},
		},
	};
}

/**
 * A ruler you drag along. `marks` are past values (e.g. grinds that worked
 * for this bean), drawn as dots; higher-rated ones darker.
 */
export function TickRuler({
	value,
	onChange,
	min,
	max,
	step,
	label,
	unit,
	marks = [],
	major = 1,
}: {
	value: number;
	onChange: (v: number) => void;
	min: number;
	max: number;
	step: number;
	label: string;
	unit?: string;
	marks?: { value: number; rating: number | null }[];
	major?: number;
}) {
	const clamp = (v: number) => Math.min(max, Math.max(min, v));
	const { ref, handlers } = useDragValue(min, max, step, (v) =>
		onChange(clamp(v)),
	);
	const pct = (v: number) => `${((clamp(v) - min) / (max - min)) * 100}%`;
	const ticks: number[] = [];
	for (let v = min; v <= max + 1e-9; v += major)
		ticks.push(Number(v.toFixed(2)));
	return (
		<div className="flex items-center gap-2">
			<NudgeButton
				dir={-1}
				label={`Less ${label}`}
				onNudge={() => onChange(clamp(Number((value - step).toFixed(2))))}
			/>
			<div
				ref={ref}
				{...handlers}
				role="slider"
				tabIndex={0}
				aria-label={label}
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={value}
				onKeyDown={(e) => {
					if (e.key === "ArrowRight")
						onChange(clamp(Number((value + step).toFixed(2))));
					if (e.key === "ArrowLeft")
						onChange(clamp(Number((value - step).toFixed(2))));
				}}
				className="select-none touch-manipulation relative h-12 flex-1 cursor-ew-resize touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-crema"
			>
				{ticks.map((t, i) => (
					<span
						key={t}
						className="absolute bottom-3 w-px bg-line-strong"
						style={{ left: pct(t), height: i % 5 === 0 ? 12 : 6 }}
					/>
				))}
				{ticks
					.filter((_, i) => i % 5 === 0)
					.map((t) => (
						<span
							key={`l${t}`}
							className="absolute bottom-0 -translate-x-1/2 font-data text-[9px] text-ink-faint"
							style={{ left: pct(t) }}
						>
							{t}
						</span>
					))}
				{marks.map((m, i) => (
					<span
						key={i}
						title={`past: ${m.value}${m.rating ? ` · ${m.rating}★` : ""}`}
						className="absolute top-2 size-1.5 -translate-x-1/2 rounded-full bg-ink"
						style={{
							left: pct(m.value),
							opacity: m.rating ? 0.2 + m.rating * 0.15 : 0.15,
						}}
					/>
				))}
				<span
					className="absolute bottom-3 top-1 w-0.5 -translate-x-1/2 bg-crema"
					style={{ left: pct(value) }}
				/>
				<span
					className="absolute -top-1 -translate-x-1/2 bg-ink px-1 font-data text-[10px] font-semibold text-paper"
					style={{ left: pct(value) }}
				>
					{fmt(value)}
					{unit}
				</span>
			</div>
			<NudgeButton
				dir={1}
				label={`More ${label}`}
				onNudge={() => onChange(clamp(Number((value + step).toFixed(2))))}
			/>
		</div>
	);
}

/**
 * The ratio as a place on a map: zones, your past brews as dots (rated ones
 * bigger, this bean's ones in method colour), your sweet spot as a band, and
 * the recipe as the marker you drag.
 */
export function RatioScale({
	method,
	ratio,
	onChange,
	points,
	spot,
	height = 92,
	showZones = true,
	children,
}: {
	method: RecipeMethod;
	ratio: number;
	onChange: (r: number) => void;
	points: RatioPoint[];
	spot: SweetSpot | null;
	height?: number;
	showZones?: boolean;
	children?: ReactNode;
}) {
	const { min, max, step, zones } = RATIO_SCALE[method];
	const clamp = (v: number) => Math.min(max, Math.max(min, v));
	const { ref, handlers } = useDragValue(min, max, step, (v) =>
		onChange(clamp(v)),
	);
	const pct = (v: number) => ((clamp(v) - min) / (max - min)) * 100;
	// Simple beeswarm: stack dots that land in the same bucket.
	const buckets = new Map<number, number>();
	const placed = points.slice(-60).map((p) => {
		const key = Math.round(pct(p.ratio) / 1.6);
		const row = buckets.get(key) ?? 0;
		buckets.set(key, row + 1);
		return { p, row };
	});
	const ticks: number[] = [];
	const major = method === "espresso" ? 0.5 : 1;
	for (let v = min; v <= max + 1e-9; v += major)
		ticks.push(Number(v.toFixed(1)));

	return (
		<div className="select-none">
			<div
				ref={ref}
				{...handlers}
				role="slider"
				tabIndex={0}
				aria-label="Ratio"
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={Number(ratio.toFixed(1))}
				aria-valuetext={`1:${fmt(ratio)}`}
				onKeyDown={(e) => {
					if (e.key === "ArrowRight") onChange(clamp(ratio + step));
					if (e.key === "ArrowLeft") onChange(clamp(ratio - step));
				}}
				className="select-none touch-manipulation relative cursor-ew-resize touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-crema"
				style={{ height }}
			>
				{showZones &&
					zones.map((z, i) => (
						<div
							key={z.label}
							className={cn(
								"absolute inset-y-0 overflow-hidden border-l border-dashed border-line",
								i % 2 === 1 && "bg-paper-sunken/60",
							)}
							style={{
								left: `${pct(z.from)}%`,
								width: `${pct(z.to) - pct(z.from)}%`,
							}}
						>
							<span
								className="absolute left-1.5 top-1 truncate font-data text-[9px] uppercase tracking-[0.14em] text-ink-faint"
								style={{ maxWidth: "calc(100% - 0.5rem)" }}
							>
								{z.label}
							</span>
						</div>
					))}
				{spot && (
					<div
						className="method-wash method-line absolute bottom-5 top-5 border-x-2"
						style={{
							left: `${pct(spot.lo)}%`,
							width: `max(4px, ${pct(spot.hi) - pct(spot.lo)}%)`,
						}}
						title="Where your 4★+ brews landed"
					/>
				)}
				{placed.map(({ p, row }) => (
					<span
						key={p.id}
						title={`1:${fmt(p.ratio)}${p.rating ? ` · ${p.rating}★` : " · unrated"}`}
						className={cn(
							"absolute -translate-x-1/2 rounded-full",
							p.sameBean ? "method-fill" : "bg-ink-faint",
						)}
						style={{
							left: `${pct(p.ratio)}%`,
							bottom: 22 + row * 7,
							width: p.rating && p.rating >= 4 ? 7 : 4,
							height: p.rating && p.rating >= 4 ? 7 : 4,
							opacity: p.rating ? 0.35 + p.rating * 0.13 : 0.3,
						}}
					/>
				))}
				{/* axis */}
				<div className="absolute inset-x-0 bottom-4 h-px bg-line-strong" />
				{ticks.map((t) => (
					<span
						key={t}
						className="absolute bottom-0 -translate-x-1/2 font-data text-[9px] text-ink-faint"
						style={{ left: `${pct(t)}%` }}
					>
						{t}
					</span>
				))}
				{/* the recipe */}
				<div
					className="pointer-events-none absolute bottom-4 top-0 -translate-x-1/2"
					style={{ left: `${pct(ratio)}%` }}
				>
					<div className="mx-auto h-full w-0.5 bg-ink" />
					<div className="absolute -bottom-1 left-1/2 size-3 -translate-x-1/2 rotate-45 border-2 border-paper bg-ink" />
				</div>
			</div>
			{children}
		</div>
	);
}
