import { Analytics } from "@vercel/analytics/react";
import { Moon, Sun } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import SyncPanel from "./components/SyncPanel";
import { useTheme } from "./contexts/ThemeContext";
import { cn } from "./lib/utils";

const NAV_LINKS = [
	{ to: "/home", label: "Dashboard" },
	{ to: "/library", label: "Library" },
	{ to: "/history", label: "History" },
];

export default function App() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="min-h-screen text-foreground flex flex-col diamond-bg">
			<header className="sticky top-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur-sm">
				<div className="flex h-full w-full px-4 items-center">
					<span className="flex text-2xl font-News italic tracking-tight select-none flex-1">
						Coffyyy
					</span>
					<div className="flex">
						<nav className="items-center gap-8 sm:flex hidden">
							{NAV_LINKS.map(({ to, label }) => (
								<NavLink
									key={to}
									to={to}
									className={({ isActive }) =>
										cn(
											"relative inline-flex items-center justify-center h-8 text-sm duration-150 tracking-widest font-News mx-3 uppercase",
											isActive
												? ""
												: "text-muted-foreground hover:text-foreground delay-75",
										)
									}
								>
									{({ isActive }) => (
										<>
											<span
												className={cn(
													"inline-block leading-8 transition-transform duration-150",
													isActive ? "-translate-y-0.5" : "translate-y-0",
												)}
											>
												{label}
											</span>
											<span
												className={cn(
													"absolute left-1/2 bottom-1 transform -translate-x-1/2 w-full h-px bg-foreground transition-opacity duration-150",
													isActive ? "opacity-100" : "opacity-0",
												)}
											/>
										</>
									)}
								</NavLink>
							))}
						</nav>
					</div>
					<div className="flex">
						<SyncPanel />
						<button
							type="button"
							onClick={toggleTheme}
							className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							aria-label="Toggle theme"
						>
							{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
						</button>
					</div>
				</div>
			</header>

			<main className="flex-1 mx-auto w-full px-4 py-6 relative">
				<Outlet />
			</main>

			<Analytics />
		</div>
	);
}
