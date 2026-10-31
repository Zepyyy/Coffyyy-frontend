import { Check, Settings2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BACKGROUNDS } from "@/components/grain/creatures";
import { setGrainPrefs, useGrainPrefs } from "@/components/grain/useGrainPrefs";
import { cn } from "@/lib/utils";

const TOOLS = [
	{ to: "/cta-lab", label: "Motion lab" },
	{ to: "/dev", label: "Dev tools" },
];

const row =
	"flex w-full items-center justify-between px-3 py-2.5 text-left font-data text-xs text-ink-soft transition-colors hover:bg-paper-sunken hover:text-foreground sm:py-2";

/** Settings: the Home background, then the workshop pages. */
export default function ToolsMenu() {
	const [open, setOpen] = useState(false);
	const prefs = useGrainPrefs();
	const [params, setParams] = useSearchParams();

	// A lingering ?grain= from the lab would otherwise outrank this choice.
	function pick(scene: string) {
		setGrainPrefs({ scene });
		if (params.has("grain")) {
			params.delete("grain");
			setParams(params, { replace: true });
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
						{BACKGROUNDS.map(({ id, name }) => (
							// biome-ignore lint/a11y/useSemanticElements: a styled menu row
							<button
								key={id}
								type="button"
								role="radio"
								aria-checked={prefs.scene === id}
								onClick={() => pick(id)}
								className={cn(row, prefs.scene === id && "text-foreground")}
							>
								{name}
								{prefs.scene === id && <Check size={13} aria-hidden />}
							</button>
						))}
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={prefs.motion}
						onClick={() => setGrainPrefs({ motion: !prefs.motion })}
						className={cn(row, "mt-1 border-t border-line")}
					>
						Motion
						<span>{prefs.motion ? "on" : "off"}</span>
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
