import { Analytics } from "@vercel/analytics/react";
import { Moon, Sun } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router";
import BottomNav from "./components/BottomNav";
import SyncControl from "./components/SyncControl";
import ToolsMenu from "./components/ToolsMenu";
import { useTheme } from "./contexts/ThemeContext";
import { useHistoryScroll } from "./hooks/useHistoryScroll";
import { cn } from "./lib/utils";

const NAV_LINKS = [
	{ to: "/home", label: "Dashboard" },
	{ to: "/library", label: "Library" },
	{ to: "/history", label: "History" },
];

export default function App() {
	const { theme, toggleTheme } = useTheme();
	useHistoryScroll();

	return (
		<div className="min-h-svh text-foreground flex flex-col blueprint-grid">
			<header className="sticky top-0 z-50 h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] border-b border-border bg-paper/90 backdrop-blur-sm">
				<div className="flex h-full w-full gap-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] items-center relative sm:gap-0">
					<Link
						to="/home"
						className="flex select-none min-w-0 shrink-0 font-display text-xl italic tracking-tight text-foreground sm:flex-1 sm:text-2xl"
						aria-label="Coffyyy — dashboard"
					>
						Coffyyy
					</Link>
					<div className="hidden sm:flex">
						<nav className="items-center gap-1 sm:gap-8 flex">
							{NAV_LINKS.map(({ to, label }) => (
								<NavLink
									key={to}
									to={to}
									className={({ isActive }) =>
										cn(
											"group relative inline-flex items-center justify-center h-8 whitespace-nowrap uppercase font-display text-[10px] tracking-[0.08em] sm:text-sm sm:tracking-[0.12em] sm:mx-3 transition-colors",
											isActive
												? "text-foreground"
												: "text-ink-faint hover:text-foreground",
										)
									}
								>
									{({ isActive }) => (
										<>
											<span className="inline-block leading-8">{label}</span>
											<span
												className={cn(
													"seg-underline absolute left-1/2 bottom-1 h-px w-full -translate-x-1/2 origin-center scale-x-0 bg-crema transition-transform duration-300 ease-soft group-hover:scale-x-50",
													isActive && "scale-x-100",
												)}
											/>
										</>
									)}
								</NavLink>
							))}
						</nav>
					</div>
					<div className="ml-auto flex gap-1.5 sm:ml-5 sm:gap-2">
						<SyncControl />
						<ToolsMenu />
						<button
							type="button"
							onClick={toggleTheme}
							className="flex size-11 items-center sm:size-8 justify-center text-ink-faint transition-colors hover:bg-paper-sunken hover:text-foreground"
							aria-label="Toggle theme"
						>
							{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
						</button>
					</div>
				</div>
			</header>

			<main className="flex-1 mx-auto w-full min-w-0 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-6 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-6 relative">
				<Outlet />
			</main>

			<BottomNav />

			<Analytics />
		</div>
	);
}
