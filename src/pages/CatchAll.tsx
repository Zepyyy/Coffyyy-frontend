import { useState } from "react";
import { Link } from "react-router";

const EXCUSES = [
	"This page went to get coffee and never came back.",
	"Looks like this page got lost in the roasting process.",
	"404: Beans not found. Have you tried turning it off and on again?",
	"This page is currently steeping. Please try again never.",
	"Grind error. The page you're looking for has been over-extracted.",
	"Your request reached the bottom of the cup. Nothing left.",
];

export function CatchAll() {
	const [excuseIndex, setExcuseIndex] = useState(
		() => Math.floor(Math.random() * EXCUSES.length),
	);
	const [wiggling, setWiggling] = useState(false);

	function nextExcuse() {
		setWiggling(true);
		setExcuseIndex((current) => (current + 1) % EXCUSES.length);
		setTimeout(() => setWiggling(false), 750);
	}

	return (
		<div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center px-4">
			<button
				type="button"
				onClick={nextExcuse}
				className={`text-8xl select-none cursor-pointer transition-transform hover:scale-110 active:scale-95 ${wiggling ? "animate-wiggle" : ""}`}
				aria-label="Click for a new excuse"
				title="Click me"
			>
				☕
			</button>

			<div className="space-y-1">
				<p className="text-7xl font-semibold tracking-tight text-muted-foreground/30">
					404
				</p>
			</div>

			<p
				key={excuseIndex}
				className="text-lg text-muted-foreground max-w-sm animate-fade-slide-up"
			>
				{EXCUSES[excuseIndex]}
			</p>

			<p className="text-xs text-muted-foreground/50">
				(Click the cup for another excuse)
			</p>

			<Link
				to="/home"
				className="mt-2 rounded-xl border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-semibold text-foreground transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-95"
			>
				Back to the grind →
			</Link>
		</div>
	);
}
