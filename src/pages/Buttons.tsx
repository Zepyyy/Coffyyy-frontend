import Dial from "@/components/log/Dial";
import { Button } from "@/components/ui/button";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useState } from "react";

const PALETTE: Array<{ name: string; className: string; note: string }> = [
	{ name: "paper", className: "bg-paper", note: "the counter" },
	{ name: "paper-raised", className: "bg-paper-raised", note: "cards" },
	{ name: "paper-sunken", className: "bg-paper-sunken", note: "wells" },
	{ name: "crema", className: "bg-crema", note: "active / filled / true" },
	{ name: "crema-tint", className: "bg-crema-tint", note: "selected" },
	{ name: "crema-deep", className: "bg-crema-deep", note: "pressed" },
	{ name: "roast", className: "bg-ink", note: "strongest surface" },
	{ name: "ink", className: "bg-ink", note: "text" },
	{ name: "ink-soft", className: "bg-ink-soft", note: "secondary text" },
	{ name: "line", className: "bg-line", note: "hairline" },
];

const TYPE_SAMPLES: Array<{ role: string; className: string; sample: string }> =
	[
		{
			role: "display · Fraunces",
			className: "font-display text-4xl italic tracking-tight",
			sample: "Log a brew",
		},
		{
			role: "display, weights",
			className: "font-display text-2xl font-semibold tracking-tight",
			sample: "Ethiopia Guji — natural",
		},
		{
			role: "body · Instrument Sans",
			className: "font-sans text-base",
			sample: "Go finer and extract longer.",
		},
		{
			role: "data · Spline Sans Mono",
			className: "font-data text-sm font-semibold",
			sample: "grind 12 · in 18g → out 36g · 1:2.0 · 28s",
		},
		{
			role: "eyebrow",
			className: "eyebrow",
			sample: "The recipe",
		},
	];

function Section({
	title,
	note,
	children,
}: {
	title: string;
	note?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-4">
			<div className="flex items-baseline gap-3">
				<h2 className="font-display text-2xl italic tracking-tight text-foreground/90">
					{title}
				</h2>
				{note && <span className="eyebrow">{note}</span>}
			</div>
			{children}
		</section>
	);
}

/** The living styleguide — the design system you can poke. /buttons */
export default function Buttons() {
	const [view, setView] = useState<"bean" | "timeline">("bean");

	return (
		<div className="w-full mx-auto max-w-4xl px-6 py-10 space-y-12">
			<div className="rise">
				<p className="eyebrow">Dev only · the system on one page</p>
				<h1 className="mt-1 font-display text-4xl italic tracking-tight text-foreground">
					Design system
				</h1>
				<p className="mt-2 max-w-xl font-sans text-sm text-ink-soft">
					Calm instrument: neutral paper, near-black ink, hairlines and squares,
					zero radius. One dusty caramel accent for what is active or true.
					Fraunces speaks, Instrument Sans works, Spline Sans Mono measures.
				</p>
			</div>

			<Section title="Color" note="semantic tokens, dark mode swaps them in">
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
					{PALETTE.map((c) => (
						<div
							key={c.name}
							className="rounded-xl border border-line bg-paper-raised shadow-card"
						>
							<div className={`h-14 w-full ${c.className}`} />
							<div className="px-2.5 py-2">
								<p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground">
									{c.name}
								</p>
								<p className="font-sans text-[10px] text-ink-faint">{c.note}</p>
							</div>
						</div>
					))}
				</div>
			</Section>

			<Section title="Type">
				<div className="space-y-5 rounded-xl border border-line bg-paper-raised p-6 shadow-card">
					{TYPE_SAMPLES.map((t) => (
						<div key={t.role} className="space-y-1">
							<p className="eyebrow">{t.role}</p>
							<p className={`${t.className} text-foreground`}>{t.sample}</p>
						</div>
					))}
				</div>
			</Section>

			<Section title="Buttons" note="every variant the app uses">
				<div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper-raised p-6 shadow-card">
					<Button variant="add" size="md">
						add
					</Button>
					<Button variant="chips" size="md">
						chips
					</Button>
					<Button variant="default" size="md">
						default
					</Button>
					<Button variant="destructive" size="md">
						destructive
					</Button>
					<Button variant="ghost" size="md">
						ghost
					</Button>
					<Button variant="ink" size="md">
						ink
					</Button>
					<Button variant="link" size="md">
						link
					</Button>
					<Button variant="option" size="md">
						option
					</Button>
					<Button variant="outline" size="md">
						outline
					</Button>
					<Button variant="outline-dashed" size="md">
						dashed
					</Button>
					<Button variant="secondary" size="md">
						secondary
					</Button>
					<Button variant="steps" size="md">
						steps
					</Button>
					<Button variant="subtle-destructive" size="md">
						subtle
					</Button>
					<Button variant="transparent" size="md">
						transparent
					</Button>
				</div>

				{/* The language: lines draw themselves, per family. */}
				<div className="mt-4 space-y-3 rounded-xl border border-line bg-paper-raised p-6 shadow-card">
					<p className="eyebrow">The language — hover them</p>
					<div className="flex flex-wrap items-center gap-3">
						<Button variant="default" size="md">
							default
						</Button>
						<Button variant="ink" size="md">
							ink
						</Button>
						<Button variant="destructive" size="md">
							destructive
						</Button>
						<Button variant="outline" size="md">
							outline
						</Button>
						<Button variant="add" size="md">
							add
						</Button>
					</div>
					<p className="font-sans text-xs text-ink-faint">
						the frame draws · the ruler rises · the arms close · the border
						retraces · the corners mark — and every key presses. quiet keys
						draw the underline.
					</p>
				</div>
			</Section>

			<Section
				title="View switch"
				note="the nav's underline, no track, no nested boxes"
			>
				<div className="rounded-xl border border-line bg-paper-raised p-6 shadow-card">
					<SegmentedControl
						ariaLabel="Example view switch"
						className="w-fit"
						options={[
							{ value: "bean", label: "By bean" },
							{ value: "timeline", label: "Timeline" },
						]}
						value={view}
						onChange={setView}
					/>
				</div>
			</Section>

			<Section
				title="Elevation & shape"
				note="hairlines, 0 radius, borders answer on hover"
			>
				<div className="grid gap-4 sm:grid-cols-3">
					<div className="rounded-xl border border-line bg-paper-raised p-5 shadow-card">
						<p className="eyebrow">shadow-card</p>
						<p className="mt-1 font-sans text-sm">Resting card.</p>
					</div>
					<div className="hover-line rounded-xl border border-line bg-paper-raised p-5 shadow-card">
						<p className="eyebrow">hover-line</p>
						<p className="mt-1 font-sans text-sm">Hover me.</p>
					</div>
					<div className="rounded-xl border border-crema bg-crema-tint p-5 ring-1 ring-crema/40">
						<p className="eyebrow">selected</p>
						<p className="mt-1 font-sans text-sm">Crema wash + ring.</p>
					</div>
				</div>
			</Section>

			<Section
				title="The dial"
				note="the signature instrument — round because it is a knob"
			>
				<div className="flex flex-wrap items-center justify-around gap-8 rounded-xl border border-line bg-paper-raised p-6 shadow-card">
					<div className="flex flex-col items-center gap-1">
						<p className="font-sans text-sm text-foreground">In — dose</p>
						<Dial value={18} onChange={() => {}} min={5} max={25} />
					</div>
					<div className="flex flex-col items-center gap-1">
						<p className="font-sans text-sm text-foreground">Out — yield</p>
						<Dial value={36} onChange={() => {}} min={10} max={60} />
					</div>
				</div>
			</Section>

			<Section title="Motion" note="rise on load, 45ms stagger">
				<div className="rounded-xl border border-line bg-paper-raised p-6 shadow-card">
					<div className="flex gap-2">
						{[0, 45, 90, 135, 180].map((d) => (
							<div
								key={d}
								className="rise size-10 rounded-lg bg-crema-tint ring-1 ring-crema/30"
								style={{ "--rise-delay": `${d}ms` } as React.CSSProperties}
							/>
						))}
					</div>
					<p className="mt-4 font-sans text-xs text-ink-soft">
						Reload the page to see the choreography. Disabled under
						prefers-reduced-motion.
					</p>
				</div>
			</Section>
		</div>
	);
}
