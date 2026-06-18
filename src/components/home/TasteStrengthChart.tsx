type ChartData = {
	taste: number | null;
	strength: number | null;
	rating?: number | null;
};

// Viewbox-based responsive chart — width is controlled by the CSS container
const VB = 200;
const PAD = 28;
const inner = VB - PAD * 2;
const cx = VB / 2;
const cy = VB / 2;

function toX(taste: number) {
	return PAD + ((taste + 5) / 10) * inner;
}
function toY(strength: number) {
	return PAD + ((5 - strength) / 10) * inner;
}

export default function TasteStrengthChart({
	ChartData,
}: {
	ChartData: ChartData[];
}) {
	const validPoints = ChartData.filter(
		(p) => p.taste != null && p.strength != null,
	);

	const avgTaste =
		validPoints.length > 0
			? validPoints.reduce((s, p) => s + p.taste!, 0) / validPoints.length
			: null;
	const avgStrength =
		validPoints.length > 0
			? validPoints.reduce((s, p) => s + p.strength!, 0) / validPoints.length
			: null;

	return (
		<svg
			viewBox={`0 0 ${VB} ${VB}`}
			width="100%"
			height="auto"
			className="text-foreground"
		>
			<title>Taste vs Strength</title>
			{/* Chart area border */}
			<rect
				x={PAD}
				y={PAD}
				width={inner}
				height={inner}
				fill="none"
				stroke="currentColor"
				strokeOpacity={0.1}
				strokeWidth={0.75}
			/>

			{/* Crosshair */}
			<line
				x1={PAD}
				y1={cy}
				x2={VB - PAD}
				y2={cy}
				stroke="currentColor"
				strokeOpacity={0.15}
				strokeWidth={0.75}
			/>
			<line
				x1={cx}
				y1={PAD}
				x2={cx}
				y2={VB - PAD}
				stroke="currentColor"
				strokeOpacity={0.15}
				strokeWidth={0.75}
			/>

			{/* Balanced zone (dashed circle) */}
			<circle
				cx={cx}
				cy={cy}
				r={inner * 0.1}
				fill="none"
				stroke="currentColor"
				strokeOpacity={0.1}
				strokeWidth={0.75}
				strokeDasharray="3,3"
			/>

			{/* Axis labels */}
			<text
				x={PAD + 3}
				y={cy - 5}
				fontSize={11}
				fill="currentColor"
				fillOpacity={0.45}
				dominantBaseline="auto"
			>
				Sour
			</text>
			<text
				x={VB - PAD - 3}
				y={cy - 5}
				fontSize={11}
				fill="currentColor"
				fillOpacity={0.45}
				textAnchor="end"
				dominantBaseline="auto"
			>
				Bitter
			</text>
			<text
				x={cx + 4}
				y={PAD + 13}
				fontSize={11}
				fill="currentColor"
				fillOpacity={0.45}
			>
				Strong
			</text>
			<text
				x={cx + 4}
				y={VB - PAD - 4}
				fontSize={11}
				fill="currentColor"
				fillOpacity={0.45}
			>
				Weak
			</text>

			{/* Individual brew dots — oldest = most faded, newest = most opaque */}
			{validPoints.map((p, i) => {
				const opacity = 0.12 + (i / Math.max(validPoints.length - 1, 1)) * 0.4;
				return (
					<circle
						// biome-ignore lint/suspicious/noArrayIndexKey: ordered list
						key={i}
						cx={toX(p.taste!)}
						cy={toY(p.strength!)}
						r={5}
						fill="currentColor"
						fillOpacity={opacity}
					/>
				);
			})}

			{/* Average dot — glow + solid center */}
			{avgTaste != null && avgStrength != null && (
				<>
					<circle
						cx={toX(avgTaste)}
						cy={toY(avgStrength)}
						r={10}
						fill="currentColor"
						fillOpacity={0.1}
					/>
					<circle
						cx={toX(avgTaste)}
						cy={toY(avgStrength)}
						r={6}
						fill="currentColor"
						fillOpacity={0.75}
					/>
				</>
			)}
		</svg>
	);
}
