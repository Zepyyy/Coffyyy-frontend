import { Check, Settings2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BACKGROUNDS } from "@/components/grain/creatures";
import { pageMotion } from "@/components/grain/motion";
import { setGrainPrefs, useGrainPrefs } from "@/components/grain/useGrainPrefs";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

const TOOLS = [
	{ to: "/backgrounds", label: "Preview backgrounds" },
	{ to: "/dev", label: "Dev tools" },
];

const row =
	"flex w-full items-center justify-between px-3 py-2.5 text-left font-data text-xs text-ink-soft transition-colors hover:bg-paper-sunken hover:text-foreground sm:py-2";

/** Settings: the Home background, then the workshop pages. */
export default function ToolsMenu() {
	const [open, setOpen] = useState(false);
	const prefs = useGrainPrefs();
	const [params, setParams] = useSearchParams();
	const reducedMotion = useReducedMotion();
	const preview = BACKGROUNDS.some(({ id }) => id === params.get("grain"));
	const motion =
		pageMotion(prefs.motion, preview, params.get("motion")) ?? !reducedMotion;

	// A lingering ?grain= from the lab would otherwise outrank this choice.
	function pick(scene: string) {
		setGrainPrefs({ scene });
		if (params.has("grain") || params.has("motion")) {
			setParams(
				(current) => {
					const next = new URLSearchParams(current);
					next.delete("grain");
					next.delete("motion");
					return next;
				},
				{ replace: true },
			);
		}
	}

	function toggleMotion() {
		setGrainPrefs({ motion: !motion });
		if (params.has("motion")) {
			setParams(
				(current) => {
					const next = new URLSearchParams(current);
					next.delete("motion");
					return next;
				},
				{ replace: true },
			);
		}
	}

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					aria-label="Settings"
					title="Settings"
					className="flex size-11 items-center justify-center text-ink-faint transition-colors hover:bg-paper-sunken hover:text-foreground sm:size-8"
				>
					<Settings2 size={16} />
				</button>
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Content
					align="end"
					sideOffset={12}
					collisionPadding={16}
					aria-label="Settings"
					className="z-50 max-h-[calc(100svh-6rem)] w-52 overflow-y-auto border border-line bg-paper-raised p-1.5 shadow-lift outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-top-1"
				>
					<p className="px-3 pb-1 pt-2 font-data text-[10px] uppercase tracking-[0.16em] text-ink-faint">
						Background
					</p>
					<div
						role="radiogroup"
						aria-label="Background"
						className="flex flex-col"
					>
						{BACKGROUNDS.map(({ id, name, exploration }) => (
							// biome-ignore lint/a11y/useSemanticElements: a styled menu row
							<button
								key={id}
								type="button"
								role="radio"
								aria-checked={prefs.scene === id}
								onClick={() => pick(id)}
								className={cn(row, prefs.scene === id && "text-foreground")}
							>
								<span>
									{name}
									{exploration && (
										<em className="ml-1.5 border border-line px-1 align-[0.15em] font-data text-[9px] not-italic uppercase tracking-[0.08em] text-ink-faint">
											exp
										</em>
									)}
								</span>
								{prefs.scene === id && <Check size={13} aria-hidden />}
							</button>
						))}
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={motion}
						onClick={toggleMotion}
						className={cn(row, "mt-1 border-t border-line")}
					>
						Motion
						<span>{motion ? "on" : "off"}</span>
					</button>
					<nav className="mt-1 flex flex-col border-t border-line pt-1">
						{TOOLS.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								onClick={() => setOpen(false)}
								className={row}
							>
								{label}
							</Link>
						))}
					</nav>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
