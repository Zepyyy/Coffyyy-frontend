import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router";
import { db } from "@/db/db";
import type { Beans, Brews } from "@/types/default";

type Ranked = { label: string; value: number };

function beanLabel(bean: Beans) {
	if (bean.name && bean.brand) return `${bean.name} — ${bean.brand}`;
	return bean.name || bean.brand || "Unnamed bean";
}

function topBeans(beans: Beans[]): Ranked[] {
	const counts = new Map<string, number>();
	for (const b of beans) {
		const label = beanLabel(b);
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([label, value]) => ({ label, value }))
		.sort((a, b) => b.value - a.value)
		.slice(0, 5);
}

function recentBrews(brews: Brews[]): Brews[] {
	return [...brews].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 5);
}

function MiniBar({
	label,
	value,
	max,
}: {
	label: string;
	value: number;
	max: number;
}) {
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-2 text-xs">
				<span className="truncate text-muted-foreground">{label}</span>
				<span className="font-semibold shrink-0">{value}</span>
			</div>
			<div className="h-1.5 w-full rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${(value / max) * 100}%` }}
				/>
			</div>
		</div>
	);
}

export default function Home() {
	const beans = useLiveQuery(() => db.Beans.toArray(), []) ?? [];
	const brews = useLiveQuery(() => db.Brews.toArray(), []) ?? [];

	const beanRanked = topBeans(beans);
	const latestBrews = recentBrews(brews);
	const beanMax = Math.max(1, ...beanRanked.map((r) => r.value));

	return (
		<div className="space-y-6 flex-1 mx-auto w-full px-4 py-6 relative max-w-5xl">
			{/* Hero actions */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<Link
					to="/log/brew"
					className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-primary-700/10 text-foreground px-6 py-8 transition-transform hover:scale-[1.01] sm:col-span-2"
				>
					<div className="relative">
						<p className="text-xs opacity-70 font-Mono uppercase tracking-[0.16em]">
							Quick add
						</p>
						<p className="mt-1 text-4xl tracking-tight font-News">Log a Brew</p>
					</div>
				</Link>

				<div className="flex flex-col gap-3">
					<Link
						to="/log/bean"
						className="group flex-1 flex items-center rounded-xl border border-border bg-card px-4 py-4 transition-all hover:border-foreground/20"
					>
						<span className="mr-3 text-2xl">🫘</span>
						<div>
							<p className="text-sm font-semibold">Add a Bean</p>
							<p className="text-xs text-muted-foreground">
								{beans.length} in library
							</p>
						</div>
					</Link>
					<Link
						to="/log/machine"
						className="group flex-1 flex items-center rounded-xl border border-border bg-card px-4 py-4 transition-all hover:border-foreground/20"
					>
						<span className="mr-3 text-2xl">⚙️</span>
						<div>
							<p className="text-sm font-semibold">Add Equipment</p>
							<p className="text-xs text-muted-foreground">
								{brews.length} brews logged
							</p>
						</div>
					</Link>
				</div>
			</div>

			{/* Charts + recent */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{/* Top beans */}
				<div className="rounded-xl border border-border bg-card p-5 space-y-4">
					<p className="text-sm font-semibold">Top Beans</p>
					{beanRanked.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No beans catalogued yet.
						</p>
					) : (
						<div className="space-y-3">
							{beanRanked.map((r) => (
								<MiniBar
									key={r.label}
									label={r.label}
									value={r.value}
									max={beanMax}
								/>
							))}
						</div>
					)}
				</div>

				{/* Recent brews */}
				<div className="rounded-xl border border-border bg-card p-5 space-y-3">
					<p className="text-sm font-semibold">Recent Brews</p>
					{latestBrews.length === 0 ? (
						<p className="text-sm text-muted-foreground">Nothing brewed yet.</p>
					) : (
						<div className="space-y-2">
							{latestBrews.map((brew) => (
								<div
									key={brew.id}
									className="flex items-center justify-between gap-2 text-sm"
								>
									<span className="truncate text-muted-foreground">
										{brew.bean ?? "Unnamed"}
									</span>
									{brew.overallRating && (
										<span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-muted">
											{brew.overallRating}
										</span>
									)}
								</div>
							))}
						</div>
					)}
					{brews.length > 5 && (
						<Link
							to="/brews"
							className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							View all {brews.length} brews →
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}
