import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import GrainField from "@/components/grain/GrainField";
import { SCENES, sceneForMethod } from "@/components/grain/scenes";
import BeanSelectorCard from "@/components/home/BeanSelectorCard";
import BestBrewPanel from "@/components/home/BestBrewPanel";
import SteamCup from "@/components/ui/SteamCup";
import NoBrewsPanel from "@/components/home/NoBrewsPanel";
import PendingTasting from "@/components/home/PendingTasting";
import AddCard from "@/components/library/AddCard";
import { Button } from "@/components/ui/button";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useLatestUnratedBrew, useRecentBrews } from "@/hooks/api/useBrews";
import {
	useBeanBrewInsights,
	useBrewCountForBeanId,
} from "@/hooks/api/useStats";
import { isBrewMethod } from "@/lib/brewMethods";
import {
	dismissFeedbackBrew,
	getDismissedFeedbackBrewIds,
} from "@/lib/feedbackDismiss";
import type { Beans } from "@/types/BeanTypes";
import type { BrewMethod } from "@/types/BrewTypes";

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
		return `${todayCount} brew${todayCount === 1 ? "" : "s"} in the book today.`;
	if (recentBrews.length === 0) return "The first brew of the story.";
	const last = new Date(recentBrews[0].date);
	const yesterday = new Date(startOfToday);
	yesterday.setDate(yesterday.getDate() - 1);
	if (last.getTime() >= yesterday.getTime())
		return "Yesterday's brew is in the book. Today's?";
	const days = Math.max(
		1,
		Math.round(
			(+startOfToday - +new Date(last).setHours(0, 0, 0, 0)) / 86_400_000,
		),
	);
	return `It's been ${days} days since the last brew.`;
}

/** The page the ASCII lattice holds: this journal's own beans and notes. */
function journalText(beans: Beans[]) {
	const words = beans.flatMap((bean) => [
		bean.name,
		...(bean.origin ?? []),
		...(bean.flavors ?? []),
	]);
	const line =
		words.length > 0 ? words.join(" · ") : "coffyyy · a brew journal";
	return `${line} · `;
}

function BeanSection({ allBeans }: { allBeans: Beans[] }) {
	const [searchParams, setSearchParams] = useSearchParams();
	const selectedBeanId = searchParams.get("bean")
		? Number(searchParams.get("bean"))
		: undefined;

	// Unset = the bean's most recent method (resolved by the insights query).
	const methodParam = searchParams.get("method");
	const selectedMethod = isBrewMethod(methodParam) ? methodParam : undefined;

	const beanInsights = useBeanBrewInsights(selectedBeanId, selectedMethod);
	const brewCount = useBrewCountForBeanId(selectedBeanId);
	const selectedBean = allBeans.find((b) => b.id === selectedBeanId);

	function selectBean(id: number) {
		setSearchParams(
			(prev) => {
				prev.delete("method");
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

	function selectMethod(method: BrewMethod) {
		setSearchParams(
			(prev) => {
				prev.set("method", method);
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
			<div className="flex items-baseline justify-between" data-grain-quiet>
				<h2 className="font-display text-2xl italic tracking-tight text-foreground/90">
					Beans
				</h2>
				<Link
					to="/library"
					className="group inline-flex items-center gap-2 font-data text-[10px] uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-foreground word-link"
				>
					<span className="word-link">Manage →</span>
				</Link>
			</div>

			{!selectedBean && (
				<p className="font-sans text-sm text-ink-soft" data-grain-quiet>
					Choose a bean to see your last brew and what worked.
				</p>
			)}

			<div
				data-grain-anchor="shelf"
				className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
			>
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
					withLastBrew
					onMethodChange={selectMethod}
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
	const [dismissedBrewIds, setDismissedBrewIds] = useState<number[]>(() =>
		getDismissedFeedbackBrewIds(),
	);
	const unratedBrew = useLatestUnratedBrew(dismissedBrewIds);

	const isEmpty = recentBrews.length === 0 && allBeans.length === 0;

	const pendingRating =
		unratedBrew && !dismissedBrewIds.includes(unratedBrew.id)
			? unratedBrew
			: null;

	function dismissFeedback(id: number) {
		dismissFeedbackBrew(id);
		setDismissedBrewIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
	}

	const now = new Date();
	const grainParam = new URLSearchParams(window.location.search).get("grain");
	const scene =
		(grainParam && SCENES[grainParam]) ||
		sceneForMethod(recentBrews[0]?.method);

	return (
		<>
			<GrainField
				scene={scene}
				text={journalText(allBeans)}
				animated={grainParam ? true : undefined}
			/>
			<div className="relative z-[1] w-full mx-auto max-w-5xl space-y-8 sm:px-6 sm:space-y-10">
				{/* The journal opens by talking to you */}
				<section
					data-grain-anchor="content"
					className="rise flex flex-col gap-5 pt-2 lg:flex-row lg:items-end lg:justify-between sm:gap-8"
				>
					<div className="min-w-0">
						<p className="eyebrow" data-grain-quiet>
							{now.toLocaleDateString(undefined, {
								weekday: "long",
								month: "long",
								day: "numeric",
							})}
						</p>
						<h1
							data-grain-quiet
							className="mt-1 text-balance font-display text-[clamp(2.5rem,11.5vw,3.25rem)] italic leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
						>
							{greetingForHour(now.getHours())}
						</h1>
						<p
							className="mt-3 font-sans text-sm text-ink-soft"
							data-grain-quiet
						>
							{dailyLine(recentBrews, allBeans.length)}
						</p>
					</div>
					{/* The censer, softened: the page's own paper, the house accent as
				    the one warm light, with the original cup's own steam. */}
					<Link
						to="/log/brew"
						className="censer-key key-line grain-glass group relative flex w-full shrink-0 items-center gap-4 overflow-hidden border border-line-strong px-5 py-4 active:translate-y-px lg:w-[22rem] sm:px-7"
					>
						<span aria-hidden className="censer-halo" />
						<SteamCup className="relative z-10 size-12 shrink-0 text-crema" />
						<span className="relative z-10 font-display text-[1.75rem] italic leading-none tracking-tight">
							Log a brew
						</span>
						<ArrowRight className="relative z-10 ml-auto size-5 text-ink-faint transition-all duration-300 ease-soft group-hover:translate-x-1 group-hover:text-ink" />
					</Link>
				</section>

				{/* Taste feedback for the latest brew that still needs notes */}
				{pendingRating && (
					<div
						className="rise"
						style={{ "--rise-delay": "120ms" } as React.CSSProperties}
					>
						<PendingTasting
							key={pendingRating.id}
							brew={pendingRating}
							bean={
								pendingRating.beanId != null
									? (beanMap.get(pendingRating.beanId) ?? null)
									: null
							}
							onSaved={() => dismissFeedback(pendingRating.id)}
							onDismiss={() => dismissFeedback(pendingRating.id)}
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

				{!import.meta.env.PROD && (
					<div
						className="rise flex gap-4"
						style={{ "--rise-delay": "200ms" } as React.CSSProperties}
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
							Motion lab →
						</Link>
						<Link
							to="/buttons"
							className="font-data text-xs text-ink-faint transition-colors hover:text-foreground"
						>
							Design system →
						</Link>
					</div>
				)}
			</div>
		</>
	);
}
