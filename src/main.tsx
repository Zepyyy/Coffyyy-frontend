import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import App from "./App.tsx";
import Brews from "./pages/Brews.tsx";
import { CatchAll } from "./pages/CatchAll.tsx";
import Home from "./pages/Home.tsx";
import Library from "./pages/Library.tsx";
import Beans from "./pages/log/Beans.tsx";
import Brew from "./pages/log/Brew.tsx";
import Log from "./pages/log/Log.tsx";
import Machines from "./pages/log/Machines.tsx";
import Providers from "./providers/Providers.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Providers>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<App />}>
						<Route index element={<Navigate to="/home" replace />} />
						<Route path="home" element={<Home />} />
						<Route path="brews" element={<Brews />} />
						<Route path="library" element={<Library />} />
						<Route path="log">
							<Route index element={<Log />} />
							<Route path="brew" element={<Brew />} />
							<Route path="bean" element={<Beans />} />
							<Route path="machine" element={<Machines />} />
						</Route>
						{/* Legacy redirects */}
						<Route path="brew" element={<Navigate to="/log/brew" replace />} />
						<Route path="beans" element={<Navigate to="/log/bean" replace />} />
						<Route
							path="machines"
							element={<Navigate to="/log/machine" replace />}
						/>
						<Route
							path="database"
							element={<Navigate to="/library" replace />}
						/>
						<Route path="stats" element={<Navigate to="/brews" replace />} />
						<Route
							path="workflows/*"
							element={<Navigate to="/log" replace />}
						/>
						<Route path="/*" element={<CatchAll />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</Providers>
	</StrictMode>,
);
