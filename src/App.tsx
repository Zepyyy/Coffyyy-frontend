import { Analytics } from "@vercel/analytics/react";
import { Moon, Sun } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { useTheme } from "./contexts/ThemeContext";
import { cn } from "./lib/utils";

const NAV_LINKS = [
	{ to: "/home", label: "Home" },
	{ to: "/library", label: "Library" },
	{ to: "/history", label: "History" },
];

export default function App() {
	const { theme, toggleTheme } = useTheme();

	return (
		<div className="min-h-screen text-foreground flex flex-col diamond-bg">
			<header className="sticky top-0 z-50 h-14 border-b border-border bg-background/95 backdrop-blur-sm">
				<div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
					<span className="text-base font-bold tracking-tight select-none">
						Coffyyy
					</span>

					<nav className="items-center gap-0.5 sm:flex hidden">
						{NAV_LINKS.map(({ to, label }) => (
							<NavLink
								key={to}
								to={to}
								className={({ isActive }) =>
									cn(
										"flex px-3 py-1.5 rounded-lg text-sm transition-normal duration-150 font-medium tracking-widest",
										isActive
											? "underline underline-offset-8 decoration-2 font-bold"
											: "text-muted-foreground hover:text-foreground hover:underline delay-75 underline-offset-6 decoration-2",
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

			<main className="flex-1 mx-auto w-full px-4 py-6 relative">
				<Outlet />
			</main>

			<Analytics />
		</div>
	);
}
