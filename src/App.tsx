import { Moon, Sun } from "lucide-react";
import { Button } from "./components/ui/button";
import { useTheme } from "./contexts/ThemeContext";

export default function App() {
	const { theme, toggleTheme } = useTheme();

	return (
		<main className="flex min-h-screen w-full text-xl bg-background text-foreground">
			<div className="flex w-full h-full justify-center flex-col">
				<div className="flex w-full h-full justify-center items-center px-4 py-4 gap-4 flex-row">
					<div className="flex justify-center items-center bg-primary-200 text-primary-800 h-20 w-full rounded-2xl">
						Coffyyy
					</div>
					<Button variant={"transparent"} size={"lg"} onClick={toggleTheme}>
						{theme === "dark" ? <Sun /> : <Moon />}
					</Button>
					<div className="flex justify-center items-center bg-primary-800 text-primary-200 h-20 w-full rounded-2xl">
						Coffyyy
					</div>
				</div>
				<div className="flex flex-col px-4 py-4 gap-4 w-fit">
					<Button variant={"default"} size="lg">
						azy
					</Button>
				</div>
			</div>
		</main>
	);
}
