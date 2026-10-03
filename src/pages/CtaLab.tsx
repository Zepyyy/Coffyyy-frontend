import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import SteamCup from "@/components/ui/SteamCup";

/**
 * TEMPORARY — the CTA lab. The censer ships on the dashboard; the live word
 * is the link treatment (fixed: clean at rest, sweep restored under
 * reduced-motion). The everyday-button upgrades live on /buttons.
 */

export default function CtaLab() {
	return (
		<div className="mx-auto w-full max-w-3xl px-6 py-10">
			<div className="rise">
				<p className="eyebrow">Dev only · temporary</p>
				<h1 className="mt-1 font-display text-4xl italic tracking-tight text-foreground">
					CTA lab
				</h1>
				<p className="mt-2 max-w-xl font-sans text-sm text-ink-soft">
					Two survivors. The everyday-button upgrades — key press, light
					sweep, plate texture, hint chips — live on the design system page.
				</p>
			</div>

			<div className="mt-10 space-y-10">
				<section className="space-y-3">
					<div>
						<h2 className="font-display text-xl italic tracking-tight text-foreground/90">
							0 · The censer
						</h2>
						<p className="mt-0.5 font-sans text-xs text-ink-soft">
							Ships on the dashboard. Paper face, crema cup, breath of warmth,
							steam and embers.
						</p>
					</div>
					<div className="flex min-h-40 items-center justify-center border border-line bg-paper-raised p-8">
						<Link
							to="/log/brew"
							className="censer-key group relative flex w-fit items-center gap-4 overflow-hidden border border-line-strong bg-paper-raised px-6 py-4 active:translate-y-px"
						>
							<span aria-hidden className="censer-halo" />
							<span aria-hidden className="censer-mote m1" />
							<span aria-hidden className="censer-mote m2" />
							<span aria-hidden className="censer-mote m3" />
							<SteamCup className="relative z-10 size-9 shrink-0 text-crema" />
							<span className="relative z-10 font-display text-xl italic tracking-tight">
								Log a brew
							</span>
							<ArrowRight className="relative z-10 size-4 text-ink-faint transition-all duration-300 ease-soft group-hover:translate-x-1 group-hover:text-ink" />
						</Link>
					</div>
				</section>

				<section className="space-y-3">
					<div>
						<h2 className="font-display text-xl italic tracking-tight text-foreground/90">
							1 · Live word (as the app's own link)
						</h2>
						<p className="mt-0.5 font-sans text-xs text-ink-soft">
							Clean at rest now — the faint left-edge light was a gradient-stop
							artifact. On hover, one amber light passes through the letters,
							once.
						</p>
					</div>
					<div className="flex min-h-40 items-center justify-center border border-line bg-paper-raised p-8">
						<a
							href="#"
							onClick={(e) => e.preventDefault()}
							className="group inline-flex items-center gap-2 font-data text-xs uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-foreground"
						>
							<span className="word-link">Log a brew</span>
							<ArrowRight className="size-3.5" />
						</a>
					</div>
				</section>
			</div>
		</div>
	);
}
