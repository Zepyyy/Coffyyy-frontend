import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import SteamCup from "@/components/ui/SteamCup";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import BestBrewPanel from "@/components/home/BestBrewPanel";
import NoBrewsPanel from "@/components/home/NoBrewsPanel";
import TasteRatingPrompt from "@/components/home/TasteRatingPrompt";
import AddCard from "@/components/library/AddCard";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useLatestUnratedBrew, useRecentBrews } from "@/hooks/api/useBrews";
import {
	useBeanBrewInsights,
	useBrewCountForBeanId,
} from "@/hooks/api/useStats";
import type { Beans } from "@/types/BeanTypes";

function greetingForHour(hour: number) {
	if (hour < 5) return "Up late?";
	if (hour < 12) return "Good morning.";
	if (hour < 18) return "Good afternoon.";
	return "Good evening.";
}

/** One honest line about where the journal stands today. */
function dailyLine(
	recentBrews: Array<{ id: number; date: Date | string }>,
	beanCount: number,
): string {
	if (beanCount === 0) return "Start the journal — add your first bean.";
	const startOfToday = new Date();
	startOfToday.setHours(0, 0, 0, 0);
	const todayCount = recentBrews.filter(
		(b) => new Date(b.date).getTime() >= startOfToday.getTime(),
	).length;
	if (todayCount > 0)
		return `${todayCount} shot${todayCount === 1 ? "" : "s"} in the book today.`;
	if (recentBrews.length === 0) return "The first shot of the story.";
	const last = new Date(recentBrews[0].date);
	const yesterday = new Date(startOfToday);
	yesterday.setDate(yesterday.getDate() - 1);
	if (last.getTime() >= yesterday.getTime())
		return "Yesterday's shot is in the book. Today's?";
	const days = Math.max(
		1,
		Math.round(
			(+startOfToday - +new Date(last).setHours(0, 0, 0, 0)) / 86_400_000,
		),
	);
	return `It's been ${days} days since the last shot.`;
}

function BeanSection({ allBeans }: { allBeans: Beans[] }) {
	const [searchParams, setSearchParams] = useSearchParams();
	const selectedBeanId = searchParams.get("bean")
		? Number(searchParams.get("bean"))
		: undefined;

	const beanInsights = useBeanBrewInsights(selectedBeanId);
	const brewCount = useBrewCountForBeanId(selectedBeanId);
	const selectedBean = allBeans.find((b) => b.id === selectedBeanId);

	function selectBean(id: number) {
		setSearchParams(
			(prev) => {
				if (id === selectedBeanId) {
					prev.delete("bean");
				} else {
					prev.set("bean", String(id));
				}
				return prev;
			},
			{ replace: true },
		);
	}

	return (
		<section
			className="rise space-y-4 w-full"
			style={{ "--rise-delay": "160ms" } as React.CSSProperties}
		>
			<div className="flex items-baseline justify-between">
				<h2 className="font-display text-2xl italic tracking-tight text-foreground/90">
					Beans
				</h2>
				<Link
					to="/library"
					className="font-data text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-foreground"
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
						onClick={() => selectBean(bean.id)}
					/>
				))}
				<AddCard label="Add Bean" to="/log/bean" className="min-h-32" />
			</div>

			{selectedBean && beanInsights && (
				<BestBrewPanel
					insights={beanInsights}
					brewCount={brewCount}
					bean={selectedBean}
					withBarChart
					withHeader
					withGraph
				/>
			)}
			{selectedBean && brewCount === 0 && <NoBrewsPanel bean={selectedBean} />}
		</section>
	);
}

export default function Home() {
	const recentBrews = useRecentBrews(20);
	const allBeans = useAllBeans();
	const beanMap = new Map(allBeans.map((b) => [b.id, b]));
	const unratedBrew = useLatestUnratedBrew();
	const [dismissedBrewId, setDismissedBrewId] = useState<number | null>(null);

	const isEmpty = recentBrews.length === 0 && allBeans.length === 0;

	const pendingRating =
		unratedBrew && unratedBrew.id !== dismissedBrewId ? unratedBrew : null;

	const now = new Date();

	return (
		<div className="w-full mx-auto max-w-5xl px-6 space-y-10">
			{/* The journal opens by talking to you */}
			<section className="rise flex flex-col gap-6 pt-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="eyebrow">
						{now.toLocaleDateString(undefined, {
							weekday: "long",
							month: "long",
							day: "numeric",
						})}
					</p>
					<h1 className="mt-1 font-display text-4xl italic tracking-tight text-foreground sm:text-5xl">
						{greetingForHour(now.getHours())}
					</h1>
					<p className="mt-2 font-sans text-sm text-ink-soft">
						{dailyLine(recentBrews, allBeans.length)}
					</p>
				</div>
				{/* The censer, softened: the page's own paper, the house accent as
				    the one warm light — steam, halo, embers. It blends in. */}
				<Link
					to="/log/brew"
					className="censer-key group relative flex w-full shrink-0 items-center gap-4 overflow-hidden border border-line-strong bg-paper-raised px-6 py-4 active:translate-y-px sm:w-fit"
				>
					<span aria-hidden className="censer-halo" />
					<span aria-hidden className="censer-mote m1" />
					<span aria-hidden className="censer-mote m2" />
					<span aria-hidden className="censer-mote m3" />
					<SteamCup className="relative z-10 size-9 shrink-0 text-crema" />
					<span className="relative z-10 font-display text-xl italic tracking-tight">
						Log a brew
					</span>
					<ArrowRight className="relative z-10 size-4 text-ink-faint transition-all duration-300 ease-soft group-hover:translate-x-1 group-hover:text-ink" />
				</Link>
			</section>

			{!import.meta.env.PROD && (
				<div
					className="rise flex gap-4"
					style={{ "--rise-delay": "80ms" } as React.CSSProperties}
				>
					<Link
						to="/dev"
						className="font-data text-xs text-ink-faint transition-colors hover:text-foreground"
					>
						Dev tools →
					</Link>
					<Link
						to="/cta-lab"
						className="font-data text-xs text-ink-faint transition-colors hover:text-foreground"
					>
						CTA lab →
					</Link>
					<Link
						to="/buttons"
						className="font-data text-xs text-ink-faint transition-colors hover:text-foreground"
					>
						Design system →
					</Link>
				</div>
			)}

			{/* Taste rating prompt for latest unrated brew */}
			{pendingRating && (
				<div
					className="rise"
					style={{ "--rise-delay": "120ms" } as React.CSSProperties}
				>
					<TasteRatingPrompt
						brew={pendingRating}
						beanName={
							pendingRating.beanId
								? (beanMap.get(pendingRating.beanId)?.name ?? "Unknown bean")
								: "Unknown bean"
						}
						onDismiss={() => setDismissedBrewId(pendingRating.id)}
					/>
				</div>
			)}

			{/* Bean selection + panel */}
			{allBeans.length > 0 && <BeanSection allBeans={allBeans} />}

			{/* Empty state */}
			{isEmpty && (
				<div
					className="rise rounded-xl border border-dashed border-line-strong bg-paper-raised/60 p-12 text-center space-y-3"
					style={{ "--rise-delay": "160ms" } as React.CSSProperties}
				>
					<p className="font-display text-2xl italic text-foreground/70">
						No beans yet
					</p>
					<p className="font-sans text-sm text-ink-soft">
						Add your first bean — the story starts there.
					</p>
						<Button asChild variant="ink" className="mt-2">
							<Link to="/log/bean">Add a bean</Link>
						</Button>
				</div>
			)}
		</div>
	);
}
