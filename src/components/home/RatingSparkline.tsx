export default function RatingSparkline({
	ratings,
	width = 110,
	height = 36,
}: {
	ratings: (number | null)[];
	width?: number;
	height?: number;
}) {
	const PAD = { x: 3, y: 4 };
	const innerW = width - PAD.x * 2;
	const innerH = height - PAD.y * 2;

	const validRatings = ratings.filter((r): r is number => r != null);
	if (validRatings.length < 2) return null;

	const points = validRatings.map((r, i) => ({
		x: PAD.x + (i / (validRatings.length - 1)) * innerW,
		y: PAD.y + ((5 - r) / 4) * innerH,
		r,
	}));

	const pathD = points
		.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
		.join(" ");

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			className="text-foreground"
		>
			<title>Rating Sparkline</title>
			<path
				d={pathD}
				stroke="currentColor"
				strokeOpacity={0.35}
				fill="none"
				strokeWidth={1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			{points.map((p, i) => (
				<circle
					// biome-ignore lint/suspicious/noArrayIndexKey: ordered list
					key={i}
					cx={p.x}
					cy={p.y}
					r={i === points.length - 1 ? 3 : 2}
					fill="currentColor"
					fillOpacity={i === points.length - 1 ? 0.85 : 0.3}
				/>
			))}
		</svg>
	);
}
