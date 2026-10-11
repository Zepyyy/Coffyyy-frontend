/**
 * The one-time save moment: a measure draws itself into the ledger. The
 * baseline writes left to right, the ruler ticks rise in sequence, and the
 * crema reading sweeps the full span. The app's motion idea — lines that
 * draw themselves — instead of a literal cup. CSS lives in index.css
 * (.measure-*); reduced motion shows the finished measure immediately.
 */
const TICK_COUNT = 34;

export default function BrewMeasure() {
	return (
		<svg
			viewBox="0 0 280 44"
			preserveAspectRatio="xMinYMid meet"
			className="h-11 w-full max-w-md"
			aria-hidden
			role="presentation"
		>
			<line
				x1={8}
				y1={36}
				x2={272}
				y2={36}
				pathLength={1}
				className="measure-baseline"
				stroke="var(--ink-faint)"
				strokeWidth={1}
			/>
			{Array.from({ length: TICK_COUNT }, (_, i) => (
				<line
					key={i}
					x1={8 + i * 8}
					y1={36}
					x2={8 + i * 8}
					y2={i % 6 === 0 ? 26 : 31}
					className="measure-tick"
					style={{ "--tick-i": i } as React.CSSProperties}
					stroke={i % 6 === 0 ? "var(--ink-soft)" : "var(--ink-faint)"}
					strokeWidth={1}
				/>
			))}
			<line
				x1={8}
				y1={36}
				x2={272}
				y2={36}
				pathLength={1}
				className="measure-crema"
				stroke="var(--color-crema)"
				strokeWidth={2}
			/>
			<rect
				x={269}
				y={33}
				width={6}
				height={6}
				className="measure-cap"
				fill="var(--color-crema)"
			/>
		</svg>
	);
}
