import { ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useParams } from "react-router";
import { BrewHistoryRow } from "@/components/history/BrewHistoryRow";
import BestBrewPanel from "@/components/home/BestBrewPanel";
import RoastDots from "@/components/home/RoastDots";
import { useBean } from "@/hooks/api/useBeans";
import { useBrewsForBeanId } from "@/hooks/api/useBrews";
import {
	useBeanBrewInsights,
	useBrewCountForBeanId,
} from "@/hooks/api/useStats";
import { colorSwatch } from "@/lib/utils";

export default function Bean() {
	const { BeanId } = useParams();
	const beanId = Number(BeanId);

	const bean = useBean(beanId);
	const brewCount = useBrewCountForBeanId(beanId);
	const insights = useBeanBrewInsights(beanId);
	const brews = useBrewsForBeanId(beanId);

	if (!bean) {
		return (
			<div className="flex h-64 items-center justify-center">
				<p className="font-Recursive text-muted-foreground">Loading…</p>
			</div>
		);
	}

	const swatch = colorSwatch[bean.dominantNote] ?? colorSwatch.default;

	const beanMeta = [
		bean.origin?.join(", "),
		bean.dominantNote,
		bean.process?.join(", "),
	]
		.filter(Boolean)
		.join(" · ");

	const detailChips = [
		bean.botanic,
		bean.designation,
		...(bean.variety ?? []),
	].filter(Boolean);

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6">
			<Link
				to={`/home?bean=${beanId}`}
				className="inline-flex items-center gap-1.5 font-Mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft size={13} />
				All beans
			</Link>

			{/* Bean header */}
			<div className={`${swatch.bg} border border-border`}>
				<div className="px-6 py-5">
					<p className={`font-Lora text-3xl font-semibold ${swatch.text}`}>
						{bean.name}
					</p>
					{bean.brand && (
						<p
							className={`mt-0.5 font-Mono text-xs uppercase tracking-[0.16em] ${swatch.secondaryText}`}
						>
							{bean.brand}
						</p>
					)}
					<p
						className={`mt-2 font-Mono text-xs uppercase tracking-[0.12em] ${swatch.secondaryText}`}
					>
						{beanMeta}
					</p>
					<div className={`mt-3 ${swatch.secondaryText}`}>
						<RoastDots level={bean.roastLevel} />
					</div>
				</div>

				{detailChips.length > 0 && (
					<div
						className={`${swatch.secondaryBg} flex flex-wrap gap-x-4 gap-y-1 border-t border-border/20 px-6 py-3`}
					>
						{detailChips.map((chip) => (
							<span
								key={chip}
								className={`font-Mono text-[10px] uppercase tracking-widest ${swatch.secondaryText}`}
							>
								{chip}
							</span>
						))}
					</div>
				)}

				{bean.flavors?.length > 0 && (
					<div className="flex flex-wrap gap-2 border-t border-border/20 px-6 py-3">
						{bean.flavors.map((f) => (
							<span
								key={f}
								className={`rounded-full border ${swatch.border} px-2.5 py-0.5 font-Mono text-[10px] uppercase tracking-widest ${swatch.text}`}
							>
								{f}
							</span>
						))}
					</div>
				)}
			</div>

			{/* Charts */}
			{insights && (
				<BestBrewPanel
					insights={insights}
					brewCount={brewCount}
					bean={bean}
					withHeader={false}
					withGraph={true}
					withBarChart={true}
				/>
			)}

			{/* Target parameters */}
			{insights && (
				<div className="space-y-4 border border-border p-5">
					<div className="flex items-center justify-between gap-4">
						<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
							{insights.target.usesTopRatedBrews
								? "Target — based on top brews"
								: "Average parameters"}
						</p>
						{insights._dialIn.isDialedIn && (
							<span className="inline-flex items-center gap-1.5 font-Mono text-[10px] uppercase tracking-widest text-primary">
								<CheckCircle size={12} />
								Dialed in
							</span>
						)}
					</div>
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
						{(
							[
								["Grind", insights.target.grindSize],
								[
									"Dose",
									insights.target.beanWeight != null
										? `${insights.target.beanWeight.toFixed(1)} g`
										: null,
								],
								[
									"Espresso",
									insights.target.espressoWeight != null
										? `${insights.target.espressoWeight.toFixed(1)} g`
										: null,
								],
								[
									"Ratio",
									insights.target.ratio != null
										? `1:${insights.target.ratio.toFixed(1)}`
										: null,
								],
								["Extraction", insights.target.extractionTime],
							] as Array<[string, string | null | undefined]>
						)
							.filter(([, v]) => v != null && v !== "—")
							.map(([label, value]) => (
								<div key={label}>
									<p className="font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
										{label}
									</p>
									<p className="mt-0.5 font-Recursive text-sm font-medium">
										{value}
									</p>
								</div>
							))}
					</div>
				</div>
			)}

			{/* Brew history */}
			<div className="space-y-3">
				<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
					{brewCount} brew{brewCount !== 1 ? "s" : ""}
				</p>

				{brews === undefined && (
					<div className="space-y-2">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-17 animate-pulse rounded border border-border bg-muted/40"
							/>
						))}
					</div>
				)}

				{brews?.length === 0 && (
					<div className="space-y-3 border border-dashed border-border p-10 text-center">
						<p className="font-News text-2xl text-foreground/60">
							No brews yet
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							Log your first brew with this bean.
						</p>
						<Link
							to="/log/brew"
							className="mt-2 inline-block border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm text-foreground transition-colors hover:bg-primary-200/25"
						>
							Log a brew
						</Link>
					</div>
				)}

				{brews && brews.length > 0 && (
					<div className="space-y-2">
						{brews.map((brew) => (
							<BrewHistoryRow
								key={brew.id}
								brew={brew}
								dotBgClass={swatch.stripe}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
