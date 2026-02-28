import { createContext, useContext } from "react";
import type { ThemeContextType } from "@/types/default";

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
};
