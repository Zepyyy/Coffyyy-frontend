import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import App from "./App.tsx";
import { CatchAll } from "./pages/CatchAll.tsx";
import Database from "./pages/Database.tsx";
import Home from "./pages/Home.tsx";
import Stats from "./pages/Stats.tsx";
import Tests from "./pages/Tests.tsx";
import BeansDB from "./pages/WorkFlows/BeansDB.tsx";
import Brew from "./pages/WorkFlows/Brew.tsx";
import Default from "./pages/WorkFlows/Default.tsx";
import Machines from "./pages/WorkFlows/Machines.tsx";
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
						<Route path="tests" element={<Tests />} />
						<Route path="database" element={<Database />} />
						<Route path="brew" element={<Brew />} />
						<Route path="beans" element={<BeansDB />} />
						<Route path="machines" element={<Machines />} />
						<Route path="workflows">
							<Route
								index
								path=""
								element={<Navigate to="/workflows/default" replace />}
							/>
							<Route path="default" element={<Default />} />
							<Route path="brew" element={<Brew />} />
							<Route path="beans" element={<BeansDB />} />
							<Route path="machines" element={<Machines />} />
						</Route>
						<Route path="/*" element={<CatchAll />} />
					</Route>
				</Routes>
			</BrowserRouter>
		</Providers>
	</StrictMode>,
);
