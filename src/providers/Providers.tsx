import { useState } from "react";
import ThemeProvider from "./ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<string>(
		localStorage.getItem("theme") || "light",
	);

	function toggleTheme() {
		setTheme(theme === "light" ? "dark" : "light");
		localStorage.setItem("theme", theme === "light" ? "dark" : "light");
	}

	return (
		<ThemeProvider theme={theme} toggleTheme={toggleTheme}>
			{children}
		</ThemeProvider>
	);
}
