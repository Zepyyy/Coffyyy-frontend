import { Plus } from "lucide-react";
import { Link, NavLink } from "react-router";
import { cn } from "@/lib/utils";

/**
 * Phone navigation: the three surfaces thumb-reachable at the bottom, with
 * the morning's main action, logging a brew, in the middle.
 */
export default function BottomNav() {
	return (
		<nav
			aria-label="Primary"
			className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden"
		>
			<div className="mx-auto grid h-16 max-w-md grid-cols-[1fr_1fr_auto_1fr] items-stretch px-2">
				<NavLink
					to="/home"
					className={({ isActive }) =>
						cn(
							"flex flex-col items-center justify-center gap-1 font-data text-[10px] uppercase tracking-[0.12em] transition-colors",
							isActive ? "text-foreground" : "text-ink-faint",
						)
					}
				>
					{({ isActive }) => (
						<>
							<span
								className={cn(
									"h-1 w-1 rounded-full transition-colors",
									isActive ? "bg-crema" : "bg-transparent",
								)}
								aria-hidden
							/>
							Dashboard
						</>
					)}
				</NavLink>
				<NavLink
					to="/library"
					className={({ isActive }) =>
						cn(
							"flex flex-col items-center justify-center gap-1 font-data text-[10px] uppercase tracking-[0.12em] transition-colors",
							isActive ? "text-foreground" : "text-ink-faint",
						)
					}
				>
					{({ isActive }) => (
						<>
							<span
								className={cn(
									"h-1 w-1 rounded-full transition-colors",
									isActive ? "bg-crema" : "bg-transparent",
								)}
								aria-hidden
							/>
							Library
						</>
					)}
				</NavLink>
				<div className="flex items-center justify-center px-2">
					<Link
						to="/log/brew"
						aria-label="Log a brew"
						className="flex size-12 items-center justify-center rounded-full border border-ink/10 bg-crema text-ink shadow-card transition-transform active:scale-95"
					>
						<Plus className="size-5" aria-hidden />
					</Link>
				</div>
				<NavLink
					to="/history"
					className={({ isActive }) =>
						cn(
							"flex flex-col items-center justify-center gap-1 font-data text-[10px] uppercase tracking-[0.12em] transition-colors",
							isActive ? "text-foreground" : "text-ink-faint",
						)
					}
				>
					{({ isActive }) => (
						<>
							<span
								className={cn(
									"h-1 w-1 rounded-full transition-colors",
									isActive ? "bg-crema" : "bg-transparent",
								)}
								aria-hidden
							/>
							History
						</>
					)}
				</NavLink>
			</div>
		</nav>
	);
}
