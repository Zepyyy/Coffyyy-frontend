import { Archive, ArchiveRestore, ArrowLeft, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { BrewHistoryRow } from "@/components/history/BrewHistoryRow";
import BestBrewPanel from "@/components/home/BestBrewPanel";
import RoastDots from "@/components/home/RoastDots";
import { archiveBeanById, deleteBeanById } from "@/db/crud/delete";
import { useBean } from "@/hooks/api/useBeans";
import { useAllBrewers } from "@/hooks/api/useBrewers";
import { useBrewsForBeanId } from "@/hooks/api/useBrews";
import {
	useBeanBrewInsights,
	useBrewCountForBeanId,
} from "@/hooks/api/useStats";
import { brewLogPath } from "@/lib/libraryRoutes";
import { colorSwatch } from "@/lib/utils";
import type { BeanBrewParameterSummary } from "@/types/BrewTypes";

function formatWeight(value: number | null) {
	return value == null ? "—" : `${value.toFixed(1)} g`;
}

function formatRatio(value: number | null) {
	return value == null ? "—" : `1:${value.toFixed(1)}`;
}

function formatRating(value: number | null) {
	return value == null ? "—" : `${value.toFixed(1)}/5`;
}

function buildStatRows(
	average: BeanBrewParameterSummary,
	best: BeanBrewParameterSummary | null,
	methods: Array<"Espresso" | "Moka Pot" | "Unknown">,
) {
	const rows: Array<[string, string, string]> = [
		["Grind", average.grindSize, best?.grindSize ?? "—"],
		[
			"Dose",
			formatWeight(average.beanWeight),
			formatWeight(best?.beanWeight ?? null),
		],
		[
			"Rating",
			formatRating(average._rating),
			formatRating(best?._rating ?? null),
		],
	];
	if (methods.includes("Espresso")) {
		rows.splice(
			2,
			0,
			[
				"Espresso output",
				formatWeight(average.espressoWeight),
				formatWeight(best?.espressoWeight ?? null),
			],
			[
				"Extraction",
				average.extractionTime ?? "—",
				best?.extractionTime ?? "—",
			],
			["Ratio", formatRatio(average.ratio), formatRatio(best?.ratio ?? null)],
		);
	}
	if (methods.includes("Moka Pot")) {
		rows.splice(
			2,
			0,
			[
				"Moka yield",
				formatWeight(average.yieldWeight),
				formatWeight(best?.yieldWeight ?? null),
			],
			[
				"Water",
				average.waterAmount == null
					? "—"
					: `${average.waterAmount.toFixed(1)} ml`,
				best?.waterAmount == null ? "—" : `${best.waterAmount.toFixed(1)} ml`,
			],
			["Brew time", average.brewTime ?? "—", best?.brewTime ?? "—"],
			["Heat", average.heatLevel ?? "—", best?.heatLevel ?? "—"],
		);
	}
	return rows;
}

export default function Bean() {
	const { BeanId } = useParams();
	const beanId = Number(BeanId);
	const navigate = useNavigate();

	const allBrewers = useAllBrewers(true);
	const bean = useBean(beanId);
	const brewCount = useBrewCountForBeanId(beanId);
	const insights = useBeanBrewInsights(beanId);
	const brews = useBrewsForBeanId(beanId);
	const [confirmArchive, setConfirmArchive] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isUpdatingLifecycle, setIsUpdatingLifecycle] = useState(false);

	const brewerNameById = new Map(
		allBrewers.map((brewer) => [brewer.id, brewer.name]),
	);

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
	const statRows = insights
		? buildStatRows(insights.average, insights.best, insights.methods)
		: [];

	async function updateLifecycle(archived: boolean) {
		setIsUpdatingLifecycle(true);
		try {
			await archiveBeanById(beanId, archived);
			setConfirmArchive(false);
		} finally {
			setIsUpdatingLifecycle(false);
		}
	}

	async function deleteBean() {
		if ((brews?.length ?? 0) > 0) return;
		setIsUpdatingLifecycle(true);
		try {
			const result = await deleteBeanById(beanId);
			if (result === true) navigate("/library/beans");
		} finally {
			setIsUpdatingLifecycle(false);
		}
	}

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6">
			<Link
				to="/library/beans"
				className="inline-flex items-center gap-1.5 font-Mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft size={13} />
				All beans
			</Link>

			{/* Bean header */}
			<div
				className={`${swatch.bg} border border-foreground/15 shadow-sm shadow-foreground/5 ring-1 ring-inset ring-background/50 dark:border-border dark:shadow-none dark:ring-0`}
			>
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
					{bean.archived && (
						<p className="mt-4 border border-primary/20 bg-background/30 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.14em]">
							Archived · hidden from the collection and Brew selector
						</p>
					)}
					<div className="mt-4 flex flex-wrap items-center gap-2">
						{!bean.archived && (
							<Link
								to={brewLogPath({ beanId })}
								className="border border-foreground bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-background transition-opacity hover:opacity-85"
							>
								Start brew
							</Link>
						)}
						{bean.archived ? (
							<button
								type="button"
								disabled={isUpdatingLifecycle}
								onClick={() => updateLifecycle(false)}
								className="inline-flex items-center gap-1.5 border border-foreground/20 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] disabled:opacity-50"
							>
								<ArchiveRestore className="size-3" />
								Restore bean
							</button>
						) : confirmArchive ? (
							<div className="flex items-center gap-2 font-Mono text-[10px] uppercase tracking-[0.12em]">
								<span className="text-muted-foreground">
									Archive this bean?
								</span>
								<button
									type="button"
									disabled={isUpdatingLifecycle}
									onClick={() => updateLifecycle(true)}
									className="border border-destructive px-3 py-2 text-destructive disabled:opacity-50"
								>
									Archive
								</button>
								<button type="button" onClick={() => setConfirmArchive(false)}>
									Cancel
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setConfirmArchive(true)}
								className="inline-flex items-center gap-1.5 border border-foreground/20 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-destructive hover:text-destructive"
							>
								<Archive className="size-3" />
								Archive bean
							</button>
						)}
						{brews?.length === 0 &&
							(confirmDelete ? (
								<div className="flex items-center gap-2 font-Mono text-[10px] uppercase tracking-[0.12em]">
									<span>Delete permanently?</span>
									<button
										type="button"
										disabled={isUpdatingLifecycle}
										onClick={deleteBean}
										className="text-destructive disabled:opacity-50"
									>
										Delete
									</button>
									<button type="button" onClick={() => setConfirmDelete(false)}>
										Cancel
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setConfirmDelete(true)}
									className="inline-flex items-center gap-1.5 border border-foreground/20 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:border-destructive hover:text-destructive"
								>
									<Trash2 className="size-3" /> Delete
								</button>
							))}
					</div>
				</div>

				{detailChips.length > 0 && (
					<div
						className={`${swatch.secondaryBg} flex flex-wrap gap-x-4 gap-y-1 border-t border-foreground/15 px-6 py-3 dark:border-border/20`}
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
					<div className="flex flex-wrap gap-2 border-t border-foreground/15 bg-background/20 px-6 py-3 backdrop-blur-sm dark:border-border/20 dark:bg-transparent dark:backdrop-blur-none">
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
				<div className="space-y-4 border border-border bg-background/80 p-5 backdrop-blur-md">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
								Brew settings
							</p>
							<p className="mt-1 font-Recursive text-xs text-muted-foreground">
								Average vs best from{" "}
								{insights.best
									? `${insights.best._basedOnCount} ${
											insights.best.usesTopRatedBrews
												? "top-rated"
												: "highest-rated"
										} brew${insights.best._basedOnCount !== 1 ? "s" : ""}`
									: "rated brews"}
							</p>
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{statRows.map(([label, averageValue, bestValue]) => (
							<div
								key={label}
								className="border border-border bg-background/70 p-3 backdrop-blur-sm"
							>
								<p className="font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
									{label}
								</p>
								<div className="mt-2 grid grid-cols-2 gap-2">
									<div className="min-w-0 border border-border/70 bg-muted/20 px-2 py-1.5">
										<p className="font-Mono text-[9px] uppercase tracking-widest text-muted-foreground">
											Avg
										</p>
										<p className="truncate font-Recursive text-sm font-medium">
											{averageValue}
										</p>
									</div>
									<div className="min-w-0 border border-border/70 bg-background/80 px-2 py-1.5">
										<div className="flex items-center gap-1.5">
											<span
												className={`h-1.5 w-1.5 shrink-0 rounded-full ${swatch.stripe}`}
											/>
											<p className="font-Mono text-[9px] uppercase tracking-widest text-muted-foreground">
												Best
											</p>
										</div>
										<p className="truncate font-Recursive text-sm font-semibold">
											{bestValue}
										</p>
									</div>
								</div>
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
						{!bean.archived && (
							<Link
								to={brewLogPath({ beanId })}
								className="mt-2 inline-block border border-primary/30 bg-primary-200/15 px-4 py-2 font-Recursive text-sm text-foreground transition-colors hover:bg-primary-200/25"
							>
								Log a brew
							</Link>
						)}
					</div>
				)}

				{brews && brews.length > 0 && (
					<div className="space-y-2">
						{brews.map((brew) => (
							<BrewHistoryRow
								key={brew.id}
								brew={brew}
								beanName={bean.name}
								brewerName={
									brew.brewerId != null
										? brewerNameById.get(brew.brewerId)
										: undefined
								}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
