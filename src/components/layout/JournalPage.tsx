import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One content column and background anchor for the journal's main pages. */
export default function JournalPage({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("journal-page", className)} data-grain-anchor="content">
			{children}
		</div>
	);
}
