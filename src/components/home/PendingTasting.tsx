import { ArrowRight } from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import BrewFeedback from "@/components/feedback/BrewFeedback";
import { methodConfig } from "@/lib/brewMethods";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import "./PendingTasting.css";

type AnchorPosition = { x: number; y: number; visible: boolean };
type TastingSnapshot = {
	height: number;
	top: number;
	anchors: Map<string, AnchorPosition>;
};

/** What this brew still has no answer for, in the user's words. */
function openFields(brew: Brews): string[] {
	return [
		brew.overallRating == null ? "rating" : null,
		brew.tasteScore == null ? "taste" : null,
		brew.strengthScore == null ? "strength" : null,
	].filter((field): field is string => field !== null);
}

function joinWords(words: string[]): string {
	if (words.length < 2) return words.join("");
	return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/**
 * Home's pending taste prompt, folded: the named brew, one way in and one way
 * out. Expanding reveals the existing BrewFeedback untouched; folding never
 * rates or dismisses anything, so unknown stays unknown.
 */
export default function PendingTasting({
	brew,
	bean,
	onSaved,
	onDismiss,
	animated,
}: {
	brew: Brews;
	bean?: { id: number; name?: string; status?: Beans["status"] } | null;
	onSaved?: () => void;
	onDismiss?: () => void;
	/** Explicit preview override; production follows the OS motion preference. */
	animated?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const frameRef = useRef<HTMLDivElement>(null);
	const regionId = useId();
	const regionRef = useRef<HTMLDivElement>(null);
	const openButtonRef = useRef<HTMLButtonElement>(null);
	const moved = useRef(false);
	const animations = useRef<Animation[]>([]);
	const generation = useRef(0);
	const snapshot = useRef<TastingSnapshot | null>(null);
	const [reduced, setReduced] = useState(
		() => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	const motion = animated ?? !reduced;

	const clearMotion = useCallback(() => {
		generation.current += 1;
		animations.current.forEach((animation) => animation.cancel());
		animations.current = [];
		frameRef.current?.style.removeProperty("height");
		frameRef.current?.style.removeProperty("overflow");
	}, []);

	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReduced(query.matches);
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);

	useEffect(() => clearMotion, [clearMotion]);

	useLayoutEffect(() => {
		const before = snapshot.current;
		snapshot.current = null;
		const frame = frameRef.current;
		const allowed =
			animated ??
			!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (!allowed || !before || !frame) {
			clearMotion();
			return;
		}
		const panel = frame.querySelector<HTMLElement>(
			open ? ".pending-editor" : ".pending-row",
		);
		if (!panel) {
			clearMotion();
			return;
		}
		const style = getComputedStyle(frame);
		const target =
			panel.getBoundingClientRect().height +
			parseFloat(style.paddingTop) +
			parseFloat(style.paddingBottom) +
			parseFloat(style.borderTopWidth) +
			parseFloat(style.borderBottomWidth);
		// Very tall or offscreen content changes settle without a page-wide flight.
		if (
			before.top > innerHeight ||
			before.top + before.height < 0 ||
			Math.abs(target - before.height) > 1100
		) {
			clearMotion();
			return;
		}
		const current = generation.current;
		const timing = {
			duration: 520,
			easing: "cubic-bezier(.2,.85,.2,1)",
			fill: "both" as FillMode,
		};
		animations.current.push(
			frame.animate(
				[{ height: `${before.height}px` }, { height: `${target}px` }],
				timing,
			),
		);
		const origin = frame.getBoundingClientRect();
		panel
			.querySelectorAll<HTMLElement>("[data-tasting-anchor]")
			.forEach((element) => {
				const previous = before.anchors.get(element.dataset.tastingAnchor!);
				const next = element.getBoundingClientRect();
				if (
					!previous?.visible ||
					!next.width ||
					!next.height ||
					next.bottom < 0 ||
					next.top > innerHeight
				)
					return;
				const dx = previous.x - (next.left - origin.left);
				const dy = previous.y - (next.top - origin.top);
				if (Math.hypot(dx, dy) > 180) return;
				// Both states use the same type size; translate without distorting glyphs.
				animations.current.push(
					element.animate(
						[
							{ transform: `translate(${dx}px, ${dy}px)` },
							{ transform: "translate(0, 0)" },
						],
						timing,
					),
				);
			});
		const fields = open ? panel.querySelector("fieldset") : null;
		if (fields)
			animations.current.push(
				fields.animate([{ opacity: 0 }, { opacity: 1 }], {
					duration: 220,
					delay: 70,
					fill: "backwards",
				}),
			);
		void Promise.allSettled(
			animations.current.map((animation) => animation.finished),
		).then(() => {
			if (generation.current === current) clearMotion();
		});
	}, [open, motion, animated, clearMotion]);

	// Keyboard users keep their place: the trigger hides on expand, so focus
	// goes to the form region, and back to the trigger on fold.
	useEffect(() => {
		if (!moved.current) return;
		const target = open ? regionRef.current : openButtonRef.current;
		target?.focus({ preventScroll: true });
		if (!open && target) {
			// Folding may be initiated at the bottom of a long editor. Keep
			// opening still, but never strand the restored focus offscreen.
			const rect = target.getBoundingClientRect();
			const header = document.querySelector("header")?.getBoundingClientRect();
			const nav = document
				.querySelector('nav[aria-label="Primary"]')
				?.getBoundingClientRect();
			const top = Math.max(0, header?.bottom ?? 0) + 12;
			const bottom = (nav && nav.height > 0 ? nav.top : innerHeight) - 12;
			const delta =
				rect.top < top
					? rect.top - top
					: rect.bottom > bottom
						? rect.bottom - bottom
						: 0;
			if (delta) window.scrollBy({ top: delta, behavior: "instant" });
		}
	}, [open]);

	function toggle(next: boolean) {
		if (saving || next === open) return;
		const frame = frameRef.current;
		const before = frame?.getBoundingClientRect();
		const anchors = new Map<string, AnchorPosition>();
		frame
			?.querySelectorAll<HTMLElement>("[data-tasting-anchor]")
			.forEach((element) => {
				const rect = element.getBoundingClientRect();
				if (before && rect.width && rect.height)
					anchors.set(element.dataset.tastingAnchor!, {
						x: rect.left - before.left,
						y: rect.top - before.top,
						visible: rect.bottom > 0 && rect.top < innerHeight,
					});
			});
		clearMotion();
		const allowed =
			animated ??
			!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (allowed && frame && before) {
			snapshot.current = { height: before.height, top: before.top, anchors };
			// Freeze the current height before swapping visibility so scroll position
			// cannot clamp to the short state before the closing animation starts.
			frame.style.height = `${before.height}px`;
			frame.style.overflow = "hidden";
		}
		moved.current = true;
		setOpen(next);
	}

	const name = bean?.name ?? methodConfig(brew.method).label;
	const date = new Date(brew.date).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	const missing = openFields(brew);

	return (
		<div className="pending-tasting" ref={frameRef} data-open={open}>
			<div
				hidden={!open}
				ref={regionRef}
				id={regionId}
				role="group"
				aria-label={`Taste notes for ${name}`}
				tabIndex={-1}
				onKeyDown={(event) => {
					if (event.key === "Escape" && !saving) toggle(false);
				}}
				className="pending-editor space-y-1 outline-none"
			>
				<BrewFeedback
					bare
					brew={brew}
					bean={bean}
					onSavingChange={setSaving}
					onSaved={onSaved}
					onDismiss={onDismiss}
				/>
				<div className="flex justify-end">
					<button
						type="button"
						onClick={() => toggle(false)}
						disabled={saving}
						className="min-h-11 px-1 font-data text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-foreground"
					>
						Fold away
					</button>
				</div>
			</div>
			<section
				hidden={open}
				aria-label="Taste notes waiting"
				className="pending-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
			>
				<div className="min-w-0">
					<p className="eyebrow">
						<span data-tasting-anchor="date">{date}</span>
					</p>
					<p className="mt-1 truncate font-display text-xl italic tracking-tight text-foreground">
						<span data-tasting-anchor="name">{name}</span>
					</p>
					{missing.length < 3 && (
						<p className="mt-1 font-sans text-xs text-ink-soft">
							{joinWords(missing)} still open
						</p>
					)}
				</div>
				<div className="flex items-center gap-1 sm:shrink-0">
					<button
						ref={openButtonRef}
						type="button"
						onClick={() => toggle(true)}
						aria-label={`Add taste notes for ${name}`}
						aria-expanded={open}
						aria-controls={regionId}
						className="key-line group flex h-11 min-w-0 flex-1 items-center justify-center gap-3 border border-line-strong px-4 font-display text-base italic transition-colors hover:border-ink-faint active:translate-y-px sm:flex-none"
					>
						Add taste notes
						<ArrowRight className="size-4 text-ink-faint transition-transform duration-300 ease-soft group-hover:translate-x-1" />
					</button>
					<button
						type="button"
						onClick={onDismiss}
						aria-label={`Later, skip taste notes for ${name}`}
						className="h-11 px-3 font-data text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-foreground active:translate-y-px"
					>
						Later
					</button>
				</div>
			</section>
		</div>
	);
}
