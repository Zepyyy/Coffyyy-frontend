/**
 * One-time "shot logged" moment: espresso rises in the cup, crema settles on
 * top, steam curls up. CSS-driven (see index.css); reduced-motion users see
 * the filled cup immediately.
 */
export default function BrewCelebration() {
	return (
		<div className="relative mx-auto size-24" aria-hidden>
			<svg viewBox="0 0 96 96" className="size-full overflow-visible">
				<defs>
					<clipPath id="brew-cup-clip">
						<path d="M24 38 h48 l-4.5 36 a7 7 0 0 1 -7 6.5 h-25 a7 7 0 0 1 -7 -6.5 Z" />
					</clipPath>
				</defs>

				{/* steam */}
				<g
					className="celebrate-steam"
					fill="none"
					stroke="var(--ink-faint)"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<path d="M40 26 q 3 -5 0 -10" />
					<path d="M48 24 q 3 -6 0 -12" />
					<path d="M56 26 q 3 -5 0 -10" />
				</g>

				{/* liquid, clipped to the cup */}
				<g clipPath="url(#brew-cup-clip)">
					<rect
						className="celebrate-espresso"
						x="20"
						y="34"
						width="56"
						height="52"
						fill="var(--roast)"
					/>
					{/* crema rides the rising liquid, fading in as it settles */}
					<g className="celebrate-crema">
						<rect
							className="celebrate-espresso"
							x="20"
							y="34"
							width="56"
							height="7"
							fill="var(--crema)"
						/>
					</g>
				</g>

				{/* cup */}
				<path
					d="M24 38 h48 l-4.5 36 a7 7 0 0 1 -7 6.5 h-25 a7 7 0 0 1 -7 -6.5 Z"
					fill="none"
					stroke="var(--ink)"
					strokeWidth="3"
					strokeLinejoin="round"
				/>
				{/* handle */}
				<path
					d="M72 44 h6 a8 8 0 0 1 0 16 h-8"
					fill="none"
					stroke="var(--ink)"
					strokeWidth="3"
					strokeLinecap="round"
				/>
				{/* saucer */}
				<path
					d="M20 86 h56"
					fill="none"
					stroke="var(--ink)"
					strokeWidth="3"
					strokeLinecap="round"
				/>
			</svg>
		</div>
	);
}
