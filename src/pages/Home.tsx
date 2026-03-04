import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { db } from "@/db/db";
import type { Beans } from "@/types/default";

function beanLabel(brew: Beans) {
	if (brew.name && brew.brand) return `${brew.name} - ${brew.brand}`;
	if (brew.name) return brew.name;
	if (brew.brand) return brew.brand;
	return "Unnamed bean";
}

type Ranked = {
	label: string;
	value: number;
};

function bestBeans(brews: Array<Beans>): Array<Ranked> {
	const counts = new Map<string, number>();
	for (const brew of brews) {
		const label = beanLabel(brew);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, 5);
}

function bestBrews(brews: Array<Beans>): Array<Ranked> {
	const ranked = brews.map((brew) => {
		const roast = typeof brew.roastLevel === "number" ? brew.roastLevel : 0;
		const flavorDepth =
			(brew.flavors?.length ?? 0) + (brew.tastingNotes?.length ?? 0);
		const finishedBonus = brew.finished ? 1 : 0;
		return {
			label: beanLabel(brew),
			value: roast + flavorDepth + finishedBonus,
		};
	});
	return ranked.sort((a, b) => b.value - a.value).slice(0, 5);
}

function BarChart({ title, rows }: { title: string; rows: Array<Ranked> }) {
	const max = Math.max(1, ...rows.map((row) => row.value));

	return (
		<div className="rounded-xl border border-border bg-card/50 p-4">
			<p className="text-sm font-semibold mb-3">{title}</p>
			{rows.length === 0 ? (
				<p className="text-sm text-muted-foreground">No data yet</p>
			) : (
				<div className="space-y-3">
					{rows.map((row) => (
						<div key={row.label}>
							<div className="mb-1 flex items-center justify-between gap-2 text-xs">
								<span className="truncate">{row.label}</span>
								<span className="font-semibold">{row.value}</span>
							</div>
							<div className="h-2 w-full rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-primary"
									style={{ width: `${(row.value / max) * 100}%` }}
								/>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default function Home() {
	const brews = useLiveQuery(async () => db.Beans.toArray(), []);
	const data = brews ?? [];
	const topBeans = bestBeans(data);
	const topBrews = bestBrews(data);

	return (
		<section className="w-full h-full flex flex-col gap-5 py-1">
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<Link
					to="/brew"
					aria-label="Open brew log"
					className="lg:col-span-2 group relative overflow-hidden min-h-[clamp(10rem,24vh,16rem)] rounded-2xl border border-primary/20 bg-primary text-primary-foreground px-6 py-5 flex items-end transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<div className="absolute inset-0 bg-linear-to-tr from-primary/25 to-transparent group-hover:from-primary/35 transition-colors" />
					<div className="relative z-10 flex items-end h-full">
						<p className="text-3xl md:text-5xl font-semibold tracking-tight">
							Add new
						</p>
					</div>
				</Link>

				<Link
					to="/stats"
					aria-label="Open statistics"
					className="group relative overflow-hidden min-h-[clamp(10rem,24vh,16rem)] rounded-2xl border border-border bg-background px-6 py-5 flex items-end transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<div className="absolute inset-0 bg-linear-to-tr from-primary/10 to-transparent group-hover:from-primary/20 transition-colors" />
					<div className="relative z-10 flex items-end h-full">
						<p className="text-2xl md:text-4xl font-semibold tracking-tight">
							Statistics
						</p>
					</div>
				</Link>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<BarChart title="Top Beans" rows={topBeans} />
				<BarChart title="Best Brews" rows={topBrews} />
			</div>
		</section>
	);
}
