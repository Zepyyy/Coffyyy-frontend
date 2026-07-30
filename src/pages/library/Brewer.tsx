import { ArrowLeft, Coffee } from "lucide-react";
import { Link, useParams } from "react-router";
import { BrewHistoryRow } from "@/components/history/BrewHistoryRow";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useBrewer } from "@/hooks/api/useBrewers";
import { useBrewsForBrewerId } from "@/hooks/api/useBrews";
import { brewLogPath } from "@/lib/libraryRoutes";

export default function BrewerDetail() {
	const { brewerId } = useParams();
	const id = Number(brewerId);
	const brewer = useBrewer(id);
	const beans = useAllBeans();
	const brews = useBrewsForBrewerId(id);
	const beanNameById = new Map(beans.map((bean) => [bean.id, bean.name]));

	if (brewer === undefined) {
		return (
			<div className="flex min-h-64 items-center justify-center">
				<p className="font-Recursive text-muted-foreground">Loading…</p>
			</div>
		);
	}

	if (!brewer) {
		return (
			<div className="space-y-4 border border-dashed border-border p-12 text-center">
				<p className="font-News text-2xl">Brewer not found</p>
				<Link to="/library/brewers" className="underline underline-offset-4">
					Back to brewers
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-4xl space-y-7">
			<Link
				to="/library/brewers"
				className="inline-flex items-center gap-1.5 font-Mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft size={13} />
				All brewers
			</Link>

			<header className="border border-foreground/10 bg-background/75 p-6 sm:p-8">
				<div className="flex flex-wrap items-start justify-between gap-5">
					<div>
						<p className="font-Mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
							Brewer
						</p>
						<h1 className="mt-2 font-News text-4xl leading-none sm:text-5xl">
							{brewer.name || "Unnamed brewer"}
						</h1>
						<p className="mt-2 font-Recursive text-sm text-muted-foreground">
							{brewer.brand}
							{brewer.model ? ` · ${brewer.model}` : ""}
						</p>
					</div>
					<div className="flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em]">
						<Coffee className="size-3.5" />
						{brewer.type}
					</div>
				</div>
				<div className="mt-7 grid gap-4 border-t border-foreground/10 pt-5 sm:grid-cols-3">
					<Detail label="Category" value={brewer.type || "—"} />
					<Detail label="Grind range" value={brewer.grindRange || "—"} />
					<Detail label="Capacity" value={brewer.capacity || "—"} />
					<Detail label="Purchased" value={brewer.purchaseDate || "—"} />
					<Detail label="History" value={`${brews?.length ?? 0} brews`} />
				</div>
				<Link
					to={brewLogPath({ brewerId: brewer.id })}
					className="mt-6 inline-block bg-foreground px-4 py-2.5 font-Mono text-[10px] uppercase tracking-[0.14em] text-background"
				>
					Start brew
				</Link>
			</header>

			<section className="space-y-3">
				<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
					Recent history
				</p>
				{brews === undefined && (
					<p className="text-sm text-muted-foreground">Loading history…</p>
				)}
				{brews?.length === 0 && (
					<div className="border border-dashed border-border p-10 text-center">
						<p className="font-News text-2xl text-foreground/60">
							No brews yet
						</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Start a brew with this brewer to build its history.
						</p>
					</div>
				)}
				{brews && brews.length > 0 && (
					<div className="space-y-2">
						{brews.map((brew) => (
							<BrewHistoryRow
								key={brew.id}
								brew={brew}
								beanName={
									brew.beanId != null
										? (beanNameById.get(brew.beanId) ?? "Unknown bean")
										: "Unknown bean"
								}
								brewerName={brewer.name}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 font-Recursive text-sm">{value}</p>
		</div>
	);
}
