import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BrewFeedback from "@/components/feedback/BrewFeedback";
import { methodConfig } from "@/lib/brewMethods";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import "./PendingTasting.css";

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
}: {
	brew: Brews;
	bean?: { id: number; name?: string; status?: Beans["status"] } | null;
	onSaved?: () => void;
	onDismiss?: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const regionRef = useRef<HTMLDivElement>(null);
	const openButtonRef = useRef<HTMLButtonElement>(null);
	const moved = useRef(false);

	// Keyboard users keep their place: the trigger hides on expand, so focus
	// goes to the form region, and back to the trigger on fold.
	useEffect(() => {
		if (!moved.current) return;
		(open ? regionRef.current : openButtonRef.current)?.focus();
	}, [open]);

	function toggle(next: boolean) {
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
		<>
			<div
				hidden={!open}
				ref={regionRef}
				role="group"
				aria-label={`Taste notes for ${name}`}
				tabIndex={-1}
				onKeyDown={(event) => {
					if (event.key === "Escape" && !saving) toggle(false);
				}}
				className="pending-editor pending-open space-y-1 outline-none"
			>
				<BrewFeedback
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
				className="pending-row flex flex-col gap-3 border border-line border-l-2 border-l-crema bg-paper-raised p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
			>
				<div className="min-w-0">
					<p className="eyebrow">{date}</p>
					<p className="mt-1 truncate font-display text-xl italic tracking-tight text-foreground">
						{name}
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
		</>
	);
}
