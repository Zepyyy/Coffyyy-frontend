import { NavLink, Outlet } from "react-router";
import { LIBRARY_PATHS } from "@/lib/libraryRoutes";
import { cn } from "@/lib/utils";

const SECTIONS = [
	{ to: LIBRARY_PATHS.beans, label: "Beans" },
	{ to: LIBRARY_PATHS.brewers, label: "Brewers" },
];

export default function LibraryShell() {
	return (
		<div className="mx-auto w-full max-w-6xl pb-20">
			<header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-foreground/10 pb-3">
				<div>
					<p className="font-Mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
						Library
					</p>
					<h1 className="mt-1 font-News text-4xl italic tracking-tight sm:text-5xl">
						Your collection
					</h1>
				</div>
				<nav aria-label="Library sections" className="flex items-center gap-1">
					{SECTIONS.map(({ to, label }) => (
						<NavLink
							key={to}
							to={to}
							className={({ isActive }) =>
								cn(
									"relative px-3 pb-3 font-Mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground",
									isActive && "text-foreground",
								)
							}
						>
							{({ isActive }) => (
								<>
									{label}
									{isActive && (
										<span className="absolute inset-x-0 bottom-[-1px] border-b border-foreground" />
									)}
								</>
							)}
						</NavLink>
					))}
				</nav>
			</header>
			<Outlet />
		</div>
	);
}
