import { Link } from "react-router";

const ENTRIES = [
	{
		to: "/log/brew",
		label: "Log a Brew",
		description: "Record a brew session — taste, grind, machine, and more.",
		emoji: "☕",
		accent: "from-amber-500/10",
	},
	{
		to: "/log/bean",
		label: "Add a Bean",
		description: "Catalog a new coffee bean with its flavor profile.",
		emoji: "🫘",
		accent: "from-green-500/10",
	},
	{
		to: "/log/machine",
		label: "Add Equipment",
		description: "Register a grinder, espresso machine, or brewer.",
		emoji: "⚙️",
		accent: "from-blue-500/10",
	},
];

export default function Log() {
	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Log</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					What are you adding today?
				</p>
			</div>

			<div className="space-y-3">
				{ENTRIES.map(({ to, label, description, emoji, accent }) => (
					<Link
						key={to}
						to={to}
						className={`group flex items-center gap-5 rounded-2xl border border-border bg-linear-to-r ${accent} to-transparent p-6 transition-all hover:border-foreground/20 hover:shadow-sm`}
					>
						<span className="text-4xl">{emoji}</span>
						<div className="flex-1">
							<p className="font-semibold">{label}</p>
							<p className="mt-0.5 text-sm text-muted-foreground">
								{description}
							</p>
						</div>
						<span className="text-lg text-muted-foreground transition-transform group-hover:translate-x-1">
							→
						</span>
					</Link>
				))}
			</div>
		</div>
	);
}
