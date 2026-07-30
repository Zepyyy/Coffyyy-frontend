import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import App from "./App.tsx";
import Bean from "./pages/Bean.tsx";
import { CatchAll } from "./pages/CatchAll.tsx";
import Dev from "./pages/Dev.tsx";
import History from "./pages/History.tsx";
import Home from "./pages/Home.tsx";
import Library, {
	LegacyBeanRedirect,
	LibraryIndexRedirect,
} from "./pages/Library.tsx";
import BeansLibrary from "./pages/library/Beans.tsx";
import BrewerDetail from "./pages/library/Brewer.tsx";
import BrewersLibrary from "./pages/library/Brewers.tsx";
import BeansLog from "./pages/log/Beans.tsx";
import BrewLog from "./pages/log/Brew.tsx";
import BrewersLog from "./pages/log/Brewers.tsx";
import LibraryPrototype from "./pages/prototype/LibraryPrototype.tsx";
import Providers from "./providers/Providers.tsx";
import { LIBRARY_ROUTE_SEGMENTS } from "./lib/libraryRoutes.ts";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Providers>
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<App />}>
						<Route index element={<Navigate to="/home" replace />} />
						<Route path="home" element={<Home />} />
						<Route path="history" element={<History />} />
						<Route path="library" element={<Library />}>
							<Route index element={<LibraryIndexRedirect />} />
							<Route path={LIBRARY_ROUTE_SEGMENTS.beans}>
								<Route index element={<BeansLibrary />} />
								<Route path={LIBRARY_ROUTE_SEGMENTS.beanDetail} element={<Bean />} />
							</Route>
							<Route path={LIBRARY_ROUTE_SEGMENTS.brewers}>
								<Route index element={<BrewersLibrary />} />
								<Route path={LIBRARY_ROUTE_SEGMENTS.brewerDetail} element={<BrewerDetail />} />
							</Route>
						</Route>
						<Route path="prototype/library" element={<LibraryPrototype />} />
						<Route path="log">
							<Route index element={<BeansLog />} />
							<Route path="brew" element={<BrewLog />} />
							<Route path="bean" element={<BeansLog />} />
							<Route path="brewer" element={<BrewersLog />} />
						</Route>
						{/* Legacy redirects */}
						<Route path="brew" element={<Navigate to="/log/brew" replace />} />
						<Route path="beans/:BeanId" element={<LegacyBeanRedirect />} />
						<Route path="dev" element={<Dev />} />
						{/*<Route path="beans" element={<Navigate to="/log/bean" replace />} />*/}
						<Route
							path="brewers"
							element={<Navigate to="/log/brewer" replace />}
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
