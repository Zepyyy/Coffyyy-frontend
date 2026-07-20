import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import ThemeProvider from "./ThemeProvider";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30_000,
			retry: (failureCount, error) =>
				failureCount < 2 &&
				!(error instanceof Error && "status" in error && error.status === 401),
		},
	},
});

export default function Providers({ children }: { children: React.ReactNode }) {
	const [theme, setTheme] = useState<string>(
		localStorage.getItem("theme") || "light",
	);

	function toggleTheme() {
		setTheme(theme === "light" ? "dark" : "light");
		localStorage.setItem("theme", theme === "light" ? "dark" : "light");
	}

	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<ThemeProvider theme={theme} toggleTheme={toggleTheme}>
					{children}
				</ThemeProvider>
			</AuthProvider>
		</QueryClientProvider>
	);
}
