import { useId } from "react";
import type { BrewMethod } from "@/types/BrewTypes";

/**
 * The method's instrument, drawn like an engraving: a portafilter for
 * espresso, a V60 for pour-over, a moka pot for moka. `detail` adds the
 * hatching and fine lines for stamp sizes (≥40px); without it the drawing
 * is simplified to stay legible at 16–20px.
 */
export default function MethodEngraving({
	method,
	detail = false,
	className,
}: {
	method: BrewMethod;
	detail?: boolean;
	className?: string;
}) {
	const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
	const sw = detail ? 1.1 : 2.4;
	const props = {
		viewBox: "0 0 48 48",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: sw,
		strokeLinejoin: "round" as const,
		strokeLinecap: "round" as const,
		className,
		"aria-hidden": true,
	};
	const solid = detail ? "none" : "currentColor";

	if (method === "espresso") {
		const basket = "M8 17h22l-2.4 10q-8.6 3.2-17.2 0z";
		return (
			<svg {...props}>
				{detail && (
					<defs>
						<Hatch id={`a${uid}`} gap={1.8} angle={40} />
						<Hatch id={`b${uid}`} gap={1.8} angle={-40} />
						<clipPath id={`c${uid}`}>
							<path d={basket} />
						</clipPath>
					</defs>
				)}
				<path d="M5 14.5h28v2.5H5z" fill={solid} />
				<path d={basket} />
				{detail && (
					<g clipPath={`url(#c${uid})`} stroke="none">
						<rect x={8} y={17} width={22} height={13} fill={`url(#a${uid})`} />
						<rect x={19} y={17} width={11} height={13} fill={`url(#b${uid})`} />
					</g>
				)}
				<path
					d="M30 19.5 L44.5 23 Q46.5 24 44.8 26.2 L29.5 23.6"
					fill={solid}
				/>
				{detail && <path d="M36 22.2l7.5 1.9" strokeWidth={0.5} />}
				<path d="M15 29.5h8v2.6h-8z" />
				<path d="M16.2 32.1l-0.8 2.6M21.8 32.1l0.8 2.6" />
				<path
					d="M15.4 36.5v6M22.6 36.5v6"
					strokeWidth={detail ? 0.8 : 1.8}
					strokeDasharray={detail ? "1.6 1.4" : "2.5 2.5"}
				/>
			</svg>
		);
	}

	if (method === "pour-over") {
		const cone = "M7 10h30l-10 21h-10z";
		return (
			<svg {...props}>
				{detail && (
					<defs>
						<Hatch id={`a${uid}`} gap={1.5} angle={0} />
						<clipPath id={`c${uid}`}>
							<path d={cone} />
						</clipPath>
					</defs>
				)}
				<path d="M4.5 9.5h35" strokeWidth={sw + 0.4} />
				<path d={cone} />
				{detail ? (
					<path
						d="M11.5 12q6.5 8 7.4 17M17 12q5 8 4.6 17M22.5 12q3.8 8 2 17M28 12q2.6 7.5-0.6 15"
						strokeWidth={0.6}
					/>
				) : (
					<path d="M16 12q3.5 8 4 17" strokeWidth={1.4} />
				)}
				{detail && (
					<g clipPath={`url(#c${uid})`} stroke="none">
						<rect x={29} y={10} width={9} height={21} fill={`url(#a${uid})`} />
					</g>
				)}
				<path d="M37.5 12.5c6 0.4 6.6 8.2 0.8 9.6" />
				<path d="M12.5 31h19v2.6h-19z" fill={solid} />
				<path d="M22 36v2.5M22 41.5v1.8" strokeWidth={detail ? 1 : 2} />
			</svg>
		);
	}

	// Moka: knob, faceted upper chamber, waist, faceted boiler, angled handle.
	const upper = "M14.5 9h19l-2.6 12.5h-13.8z";
	const boiler = "M17.5 24h13l3.2 16.5h-19.4z";
	return (
		<svg {...props}>
			{detail && (
				<defs>
					<Hatch id={`a${uid}`} gap={1.5} angle={0} />
					<clipPath id={`c${uid}`}>
						<path d={upper} />
						<path d={boiler} />
					</clipPath>
				</defs>
			)}
			<path d="M22 5h4v4h-4z" fill={solid} />
			<path d={upper} />
			<path d="M14.5 9l-4.5-1.6 1.6 3.8 3.4 0.4" />
			<path d="M17 21.5h14v2.5H17z" fill={solid} />
			<path d={boiler} />
			<path d="M33 10.5l8 1.6-1.4 8.6-7.8-2.2" fill={solid} />
			{detail && (
				<>
					<path
						d="M20.5 9l1 12.5M27.5 9l-1 12.5M21.6 24l-0.8 16.5M26.4 24l0.8 16.5"
						strokeWidth={0.6}
					/>
					<circle cx={30} cy={31} r={1.2} strokeWidth={0.7} />
					<g clipPath={`url(#c${uid})`} stroke="none">
						<rect x={27} y={8} width={8} height={33} fill={`url(#a${uid})`} />
					</g>
				</>
			)}
			<path d="M10 43h28" strokeWidth={detail ? 1.2 : 2.4} />
		</svg>
	);
}

function Hatch({ id, gap, angle }: { id: string; gap: number; angle: number }) {
	return (
		<pattern
			id={id}
			width={gap}
			height={gap}
			patternUnits="userSpaceOnUse"
			patternTransform={`rotate(${angle})`}
		>
			<line
				x1={0}
				y1={0}
				x2={0}
				y2={gap}
				stroke="currentColor"
				strokeWidth={0.5}
			/>
		</pattern>
	);
}
