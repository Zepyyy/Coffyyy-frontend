import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import App from "./App.tsx";
import { CatchAll } from "./pages/CatchAll.tsx";
import Brew from "./pages/Brew.tsx";
import Home from "./pages/Home.tsx";
import Stats from "./pages/Stats.tsx";
import Providers from "./providers/Providers.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Providers>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<App />}>
						<Route index element={<Navigate to="/home" replace />} />
						<Route path="home" element={<Home />} />
						<Route path="stats" element={<Stats />} />
						<Route path="brew" element={<Brew />} />
						<Route path="/*" element={<CatchAll />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</Providers>
	</StrictMode>,
);
