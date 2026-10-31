import { Settings2 } from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";
import { Link } from "react-router";

const TOOLS = [
	{ to: "/cta-lab", label: "Motion lab" },
	{ to: "/dev", label: "Dev tools" },
	{ to: "/buttons", label: "Design system" },
];

/** The workshop pages: not part of the journal, but one click from anywhere. */
export default function ToolsMenu() {
	const [open, setOpen] = useState(false);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<button
					type="button"
					aria-label="Tools"
					title="Tools"
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
					aria-label="Tools"
					className="z-50 w-44 border border-line bg-paper-raised p-1.5 shadow-lift outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-top-1"
				>
					<nav className="flex flex-col">
						{TOOLS.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								onClick={() => setOpen(false)}
								className="px-3 py-2.5 font-data text-xs text-ink-soft transition-colors hover:bg-paper-sunken hover:text-foreground sm:py-2"
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
