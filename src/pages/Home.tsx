import { BookOpen, Coffee } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import BestBrewPanel from "@/components/home/BestBrewPanel";
import BrewRow from "@/components/home/BrewRow";
import NoBrewsPanel from "@/components/home/NoBrewsPanel";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useRecentBrews } from "@/hooks/api/useBrews";
import {
	useBestBrewForBean,
	useBrewCountForBeanId,
} from "@/hooks/api/useStats";
import type { Beans } from "@/types/BeanTypes";

function QuickSettingsSection({ allBeans }: { allBeans: Beans[] }) {
	const [selectedBeanId, setSelectedBeanId] = useState<number | undefined>();
	const bestBrew = useBestBrewForBean(selectedBeanId);
	const brewCount = useBrewCountForBeanId(selectedBeanId);
	const selectedBean = allBeans.find((b) => b.id === selectedBeanId);

	return (
		<section className="space-y-4 w-full">
			<div className="flex items-center justify-between">
				<div className="border-l-4 border-primary/30 pl-4">
					<h2 className="font-News text-xl text-foreground/90">
						Quick Settings
					</h2>
					<p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground mt-0.5">
						Best brew per bean
					</p>
				</div>
				<Link
					to="/library"
					className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
				>
					View all →
				</Link>
			</div>

			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
				{allBeans.map((bean) => (
					<BeanSelectorCard
						key={bean.id}
						bean={bean}
						selected={bean.id === selectedBeanId}
						onClick={() =>
							setSelectedBeanId(
								bean.id === selectedBeanId ? undefined : bean.id,
							)
						}
					/>
				))}
			</div>

			{selectedBean && bestBrew && (
				<BestBrewPanel
					brew={bestBrew}
					brewCount={brewCount}
					bean={selectedBean}
				/>
			)}
			{selectedBean && brewCount === 0 && <NoBrewsPanel bean={selectedBean} />}
		</section>
	);
}

export default function Home() {
	const recentBrews = useRecentBrews(5);
	const allBeans = useAllBeans();
	const beanMap = new Map(allBeans.map((b) => [b.id, b]));

	const isEmpty = recentBrews.length === 0 && allBeans.length === 0;

	return (
		<div className="w-full mx-auto max-w-5xl px-6 space-y-10">
			{/* Quick Actions */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<Link
					to="/log/brew"
					className="group relative overflow-hidden border border-primary/20 bg-primary-700/10 px-6 py-8 transition-all hover:bg-primary-700/15 hover:border-primary/30"
				>
					<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Quick add
					</p>
					<p className="mt-1 text-4xl tracking-tight font-News text-foreground/90">
						Log a Brew
					</p>
					<Coffee className="absolute right-6 bottom-6 size-8 text-primary/20 group-hover:text-primary/30 transition-colors" />
				</Link>
				<Link
					to="/library"
					className="group relative overflow-hidden border border-border bg-background px-6 py-8 transition-all hover:border-foreground/20"
				>
					<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Your beans and equipment
					</p>
					<p className="mt-1 text-4xl tracking-tight font-News text-foreground/90">
						Library →
					</p>
					<BookOpen className="absolute right-6 bottom-6 size-8 text-muted-foreground/20 group-hover:text-muted-foreground/30 transition-colors" />
				</Link>
			</div>

			{/* Quick Settings per Bean */}
			{allBeans.length > 0 && <QuickSettingsSection allBeans={allBeans} />}

			{/* Recent Brews */}
			{recentBrews.length > 0 && (
				<section className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="border-l-4 border-primary/30 pl-4">
							<h2 className="font-News text-xl text-foreground/90">
								Recent Brews
							</h2>
						</div>
						<Link
							to="/history"
							className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
						>
							View all →
						</Link>
					</div>
					<div className="space-y-1.5">
						{recentBrews.map((brew) => {
							const bean = brew.beanId ? beanMap.get(brew.beanId) : undefined;
							return (
								<BrewRow
									key={brew.id}
									brew={brew}
									beanName={bean?.name ?? "Unknown bean"}
								/>
							);
						})}
					</div>
				</section>
			)}

			{/* Empty state */}
			{isEmpty && (
				<div className="border border-dashed border-border p-12 text-center space-y-3">
					<p className="font-News text-2xl text-foreground/60">No brews yet</p>
					<p className="font-Recursive text-sm text-muted-foreground">
						Log your first brew to start seeing insights here.
					</p>
					<Link
						to="/log/brew"
						className="inline-block mt-2 border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm text-foreground hover:bg-primary-200/25 transition-colors"
					>
						Log a Brew
					</Link>
				</div>
			)}
		</div>
	);
}
