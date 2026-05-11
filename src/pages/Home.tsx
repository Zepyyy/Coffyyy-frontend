import { Coffee } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import BestBrewPanel from "@/components/home/BestBrewPanel";
import NoBrewsPanel from "@/components/home/NoBrewsPanel";
import TasteRatingPrompt from "@/components/home/TasteRatingPrompt";
import { Button } from "@/components/ui/button";
import addRandomBrewsInsights from "@/db/crud/add";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useLatestUnratedBrew, useRecentBrews } from "@/hooks/api/useBrews";
import {
	useBeanBrewInsights,
	useBrewCountForBeanId,
} from "@/hooks/api/useStats";
import type { Beans } from "@/types/BeanTypes";

function BeanSection({ allBeans }: { allBeans: Beans[] }) {
	const [selectedBeanId, setSelectedBeanId] = useState<number | undefined>();
	const beanInsights = useBeanBrewInsights(selectedBeanId);
	const brewCount = useBrewCountForBeanId(selectedBeanId);
	const selectedBean = allBeans.find((b) => b.id === selectedBeanId);

	return (
		<section className="space-y-4 w-full">
			<div className="flex items-center justify-between">
				<h2 className="font-News text-2xl text-foreground/90">Beans</h2>
				<Link
					to="/library"
					className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
				>
					Manage →
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

			{selectedBean && beanInsights && (
				<BestBrewPanel
					insights={beanInsights}
					brewCount={brewCount}
					bean={selectedBean}
				/>
			)}
			{selectedBean && brewCount === 0 && <NoBrewsPanel bean={selectedBean} />}
		</section>
	);
}

export default function Home() {
	const recentBrews = useRecentBrews(3);
	const allBeans = useAllBeans();
	const beanMap = new Map(allBeans.map((b) => [b.id, b]));
	const unratedBrew = useLatestUnratedBrew();
	const [dismissedBrewId, setDismissedBrewId] = useState<number | null>(null);

	const isEmpty = recentBrews.length === 0 && allBeans.length === 0;

	const pendingRating =
		unratedBrew && unratedBrew.id !== dismissedBrewId ? unratedBrew : null;

	return (
		<div className="w-full mx-auto max-w-5xl px-6 space-y-8">
			{/* Quick action */}
			<Link
				to="/log/brew"
				className="group relative overflow-hidden flex items-center justify-between border border-primary/20 bg-primary-700/10 px-6 py-5 transition-all hover:bg-primary-700/15 hover:border-primary/30 backdrop-blur-sm"
			>
				<div>
					<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Quick add
					</p>
					<p className="mt-0.5 text-3xl tracking-tight font-News text-foreground/90">
						Log a Brew
					</p>
				</div>
				<Coffee className="size-8 text-primary/20 group-hover:text-primary/30 transition-colors" />
			</Link>

			<Button
				variant="add"
				onClick={() => addRandomBrewsInsights(36)}
				className={`${import.meta.env.PROD && "hidden"}`}
			>
				Add insights
			</Button>

			{/* Taste rating prompt for latest unrated brew */}
			{pendingRating && (
				<TasteRatingPrompt
					brew={pendingRating}
					beanName={
						pendingRating.beanId
							? (beanMap.get(pendingRating.beanId)?.name ?? "Unknown bean")
							: "Unknown bean"
					}
					onDismiss={() => setDismissedBrewId(pendingRating.id)}
				/>
			)}

			{/* Bean selection + panel */}
			{allBeans.length > 0 && <BeanSection allBeans={allBeans} />}

			{/* Empty state */}
			{isEmpty && (
				<div className="border border-dashed border-border p-12 text-center space-y-3 w-full">
					<p className="font-News text-2xl text-foreground/60">No beans</p>
					<p className="font-Recursive text-sm text-muted-foreground">
						Add your first bean to get started.
					</p>
					<Link
						to="/log/bean"
						className="inline-block mt-2 border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm text-foreground hover:bg-primary-200/25 transition-colors"
					>
						Log a Bean
					</Link>
				</div>
			)}
		</div>
	);
}
