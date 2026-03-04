import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { NavLink, Outlet } from "react-router";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";
import { useTheme } from "./contexts/ThemeContext";

export default function App() {
	const { theme, toggleTheme } = useTheme();

	return (
		<main className="flex text-xl bg-background text-foreground relative">
			<div className="flex w-full h-full justify-center flex-col">
				<div className="flex flex-row transition-all duration-150 h-16">
					<NavLink
						to="/home"
						className={({ isActive }) =>
							clsx(
								"flex justify-center items-center w-full",
								isActive
									? "text-primary-100 bg-primary-800 hover:bg-primary-800/90"
									: "text-primary-800 bg-primary-200 hover:bg-primary-200/90",
							)
						}
					>
						Home
					</NavLink>
					<Separator orientation="vertical" />
					<NavLink
						to="/brew"
						className={({ isActive }) =>
							clsx(
								"flex justify-center items-center w-full",
								isActive
									? "text-primary-100 bg-primary-800 hover:bg-primary-800/90"
									: "text-primary-800 bg-primary-200 hover:bg-primary-200/90",
							)
						}
					>
						Brew
					</NavLink>
					<Separator orientation="vertical" />
					<NavLink
						to="/stats"
						className={({ isActive }) =>
							clsx(
								"flex justify-center items-center w-full",
								isActive
									? "text-primary-100 bg-primary-800 hover:bg-primary-800/90"
									: "text-primary-800 bg-primary-200 hover:bg-primary-200/90",
							)
						}
					>
						Stats
					</NavLink>
					<Separator orientation="vertical" />
					<Button
						variant="default"
						onClick={toggleTheme}
						className="flex rounded-none w-16 h-16"
					>
						{theme === "dark" ? <Sun /> : <Moon />}
					</Button>
				</div>
				<Separator />
				<div className="w-full h-full flex flex-col p-4 bg-background">
					<Outlet />
				</div>
			</div>
		</main>
	);
}
