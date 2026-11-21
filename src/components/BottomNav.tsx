import { Plus } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";

function Tab({ to, label }: { to: string; label: string }) {
	return (
		<NavLink
			to={to}
			className={({ isActive }) =>
				cn(
					"flex flex-col items-center justify-center gap-1 font-data text-[11px] tracking-[0.02em] transition-colors",
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
					{label}
				</>
			)}
		</NavLink>
	);
}

/**
 * Phone navigation: the four surfaces thumb-reachable at the bottom, with
 * the morning's main action, logging a brew, in the middle.
 */
export default function BottomNav() {
	return (
		<nav
			aria-label="Primary"
			className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden"
		>
			<div className="mx-auto grid h-16 max-w-md grid-cols-[1fr_1fr_auto_1fr_1fr] items-stretch pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))]">
				<Tab to="/home" label="Dashboard" />
				<Tab to="/library" label="Library" />
				<div className="flex items-center justify-center px-2">
					<NavLink
						to="/log/brew"
						aria-label="Log a brew"
						className={({ isActive }) =>
							cn(
								"key-line flex size-11 items-center justify-center border transition-colors active:bg-paper-sunken active:translate-y-px",
								isActive
									? "border-crema bg-crema-tint text-foreground"
									: "border-line-strong bg-paper-raised text-ink-soft hover:border-crema",
							)
						}
					>
						<Plus className="size-5" aria-hidden />
					</NavLink>
				</div>
				<Tab to="/recipes" label="Recipes" />
				<Tab to="/history" label="History" />
			</div>
		</nav>
	);
}
