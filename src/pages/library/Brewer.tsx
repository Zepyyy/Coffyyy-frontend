import {
	Archive,
	ArchiveRestore,
	ArrowLeft,
	Coffee,
	Pencil,
	Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useState } from "react";
import { archiveBrewerById, deleteBrewerById } from "@/db/crud/delete";
import { formatShortDate } from "@/lib/dates";
import { BrewHistoryRow } from "@/components/history/BrewHistoryRow";
import { useAllBeans } from "@/hooks/api/useBeans";
import { useBrewer, useBrewerUsage } from "@/hooks/api/useBrewers";
import { useBrewsForBrewerId } from "@/hooks/api/useBrews";
import { brewLogPath } from "@/lib/libraryRoutes";

export default function BrewerDetail() {
	const { brewerId } = useParams();
	const id = Number(brewerId);
	const navigate = useNavigate();
	const brewer = useBrewer(id);
	const beans = useAllBeans(true);
	const brews = useBrewsForBrewerId(id);
	const usage = useBrewerUsage().get(id);
	const [confirmArchive, setConfirmArchive] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [isUpdatingLifecycle, setIsUpdatingLifecycle] = useState(false);
	const beanNameById = new Map(beans.map((bean) => [bean.id, bean.name]));
	const lastUsed = usage?.lastUsed;
	const methods = usage?.methods ?? [];

	async function updateLifecycle(archived: boolean) {
		setIsUpdatingLifecycle(true);
		try {
			await archiveBrewerById(id, archived);
			setConfirmArchive(false);
		} finally {
			setIsUpdatingLifecycle(false);
		}
	}

	async function deleteBrewer() {
		if ((brews?.length ?? 0) > 0) return;
		setIsUpdatingLifecycle(true);
		try {
			const result = await deleteBrewerById(id);
			if (result === true) navigate("/library/brewers");
		} finally {
			setIsUpdatingLifecycle(false);
		}
	}

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
				{brewer.archived && (
					<p className="mt-4 border border-primary/20 bg-primary/5 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.14em] text-primary-800 dark:text-primary-200">
						Archived · hidden from the collection and Brew selector
					</p>
				)}
				<div className="mt-7 border-t border-foreground/10 pt-5">
					<p className="mb-4 font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Specifications
					</p>
					<div className="grid gap-4 sm:grid-cols-3">
						<Detail label="Category" value={brewer.type || "—"} />
						<Detail label="Grind range" value={brewer.grindRange || "—"} />
						<Detail label="Capacity" value={brewer.capacity || "—"} />
						<Detail label="Purchased" value={brewer.purchaseDate || "—"} />
					</div>
				</div>
				<div className="mt-6 flex flex-wrap items-center gap-3">
					{!brewer.archived && (
						<Link
							to={brewLogPath({ brewerId: brewer.id })}
							className="border border-foreground/50 bg-background/70 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-foreground transition-opacity hover:opacity-85"
						>
							Start brew
						</Link>
					)}
					<Link
						to={`/log/brewer?brewerId=${brewer.id}`}
						className="inline-flex items-center gap-1.5 border border-foreground/20 px-4 py-2.5 font-Mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:border-foreground"
					>
						<Pencil className="size-3" />
						Edit brewer
					</Link>
					{brewer.archived ? (
						<button
							type="button"
							disabled={isUpdatingLifecycle}
							onClick={() => updateLifecycle(false)}
							className="inline-flex items-center gap-1.5 border border-foreground/20 px-4 py-2.5 font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
						>
							<ArchiveRestore className="size-3" />
							Restore brewer
						</button>
					) : confirmArchive ? (
						<div className="flex items-center gap-2 font-Mono text-[10px] uppercase tracking-[0.12em]">
							<span className="text-muted-foreground">Hide this brewer?</span>
							<button
								type="button"
								disabled={isUpdatingLifecycle}
								onClick={() => updateLifecycle(true)}
								className="border border-destructive px-3 py-2 text-destructive disabled:opacity-50"
							>
								Archive
							</button>
							<button
								type="button"
								onClick={() => setConfirmArchive(false)}
								className="px-2 py-2 text-muted-foreground"
							>
								Cancel
							</button>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setConfirmArchive(true)}
							className="inline-flex items-center gap-1.5 border border-foreground/20 px-4 py-2.5 font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
						>
							<Archive className="size-3" />
							Archive brewer
						</button>
					)}
					{brews?.length === 0 &&
						(confirmDelete ? (
							<div className="flex items-center gap-2 font-Mono text-[10px] uppercase tracking-[0.12em]">
								<span>Delete permanently?</span>
								<button
									type="button"
									disabled={isUpdatingLifecycle}
									onClick={deleteBrewer}
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
								className="inline-flex items-center gap-1.5 border border-foreground/20 px-4 py-2.5 font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-destructive hover:text-destructive"
							>
								<Trash2 className="size-3" /> Delete
							</button>
						))}
				</div>
			</header>

			<section className="space-y-3">
				<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
					Usage summary
				</p>
				<div className="grid gap-3 sm:grid-cols-3">
					<UsageStat label="Total brews" value={`${brews?.length ?? 0}`} />
					<UsageStat
						label="Last used"
						value={lastUsed ? formatShortDate(lastUsed, true) : "Never used"}
					/>
					<UsageStat
						label="Methods"
						value={
							methods.length > 0 ? methods.join(" · ") : "No method history"
						}
					/>
				</div>
			</section>

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

function UsageStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="border border-border bg-background/70 p-4">
			<p className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 font-Recursive text-sm">{value}</p>
		</div>
	);
}
