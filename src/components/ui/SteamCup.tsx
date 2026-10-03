/**
 * A small line-drawn coffee cup whose steam is alive: three wisps rise off
 * the rim and dissolve, staggered so the plume never repeats exactly. The
 * coffee line inside the rim is the one amber accent. The cup itself stays
 * still; inherits `currentColor` for the porcelain.
 */
export default function SteamCup({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 30 30"
			fill="none"
			aria-hidden
			className={`steam-cup ${className ?? ""}`}
		>
			<path
				d="M6.5 13.5h14v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z"
				stroke="currentColor"
				strokeWidth="1.6"
			/>
			<path
				d="M20.5 15h2.4a2.6 2.6 0 0 1 0 5.2h-2.8"
				stroke="currentColor"
				strokeWidth="1.6"
			/>
			<path
				className="coffee-line"
				d="M9 17h9"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<path
				className="steam steam-w1"
				d="M10.6 10.2c0-1.5 1.5-1.5 1.5-3s-1.3-1.5-1.2-2.7"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<path
				className="steam steam-w3"
				d="M14 9.8c0-1.2 1.2-1.2 1.2-2.4s-1-1.2-1-2.1"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
			<path
				className="steam steam-w2"
				d="M17.2 10.2c0-1.5 1.5-1.5 1.5-3s-1.3-1.5-1.2-2.7"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
