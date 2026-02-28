import { useEffect } from "react";
import { ThemeContext } from "@/contexts/ThemeContext";

export default function ThemeProvider({
	children,
	theme,
	toggleTheme,
}: {
	children: React.ReactNode;
	theme: string;
	toggleTheme: () => void;
}) {
	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
		localStorage.setItem("theme", theme);
	}, [theme]);

	return (
		<ThemeContext.Provider
			value={{
				theme,
				toggleTheme,
			}}
		>
			{children}
		</ThemeContext.Provider>
	);
}
