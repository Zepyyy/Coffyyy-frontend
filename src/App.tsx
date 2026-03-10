import { Analytics } from "@vercel/analytics/react";
import { Moon, Sun } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { useTheme } from "./contexts/ThemeContext";
import { cn } from "./lib/utils";

const NAV_LINKS = [
	{ to: "/home", label: "Home" },
	{ to: "/log", label: "Log" },
	{ to: "/library", label: "Library" },
	{ to: "/brews", label: "Brews" },
];

export default function App() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col">
			<header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-sm">
				<div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
					<span className="text-base font-bold tracking-tight select-none">
						Coffyyy
					</span>

					<nav className="flex items-center gap-0.5">
						{NAV_LINKS.map(({ to, label }) => (
							<NavLink
								key={to}
								to={to}
								className={({ isActive }) =>
									cn(
										"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
										isActive
											? "bg-foreground text-background"
											: "text-muted-foreground hover:text-foreground hover:bg-muted",
									)
								}
							>
								{label}
							</NavLink>
						))}
					</nav>

					<button
						type="button"
						onClick={toggleTheme}
						className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						aria-label="Toggle theme"
					>
						{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
					</button>
				</div>
			</header>

			<main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
				<Outlet />
			</main>

			<Analytics />
		</div>
	);
}
