import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clearDatabase, resetDatabaseWithSeed } from "@/db/crud/seed";
import { useDatabaseCounts } from "@/hooks/api/useDatabase";
import type { DatabaseSeedCounts } from "@/db/crud/seed";

const PRESETS: Array<{
	name: string;
	description: string;
	counts: DatabaseSeedCounts;
}> = [
	{
		name: "Small",
		description: "Quick UI smoke test",
		counts: { beans: 3, machines: 2, brews: 12 },
	},
	{
		name: "Demo",
		description: "Balanced everyday dataset",
		counts: { beans: 8, machines: 3, brews: 48 },
	},
	{
		name: "Stress",
		description: "More rows for filtering and charts",
		counts: { beans: 24, machines: 6, brews: 300 },
	},
];

type PendingAction =
	| { type: "clear" }
	| { type: "seed"; label: string; counts: DatabaseSeedCounts };

type OperationStatus = {
	tone: "success" | "error";
	message: string;
} | null;

function formatCounts(counts: DatabaseSeedCounts) {
	return `${counts.beans} beans · ${counts.machines} machines · ${counts.brews} brews`;
}

export default function DatabaseWorkbench() {
	const databaseCounts = useDatabaseCounts();
	const [customCounts, setCustomCounts] = useState<DatabaseSeedCounts>(
		PRESETS[1].counts,
	);
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(
		null,
	);
	const [isRunning, setIsRunning] = useState(false);
	const [status, setStatus] = useState<OperationStatus>(null);

	const customCountsValid =
		Number.isInteger(customCounts.beans) &&
		customCounts.beans >= 1 &&
		customCounts.beans <= 50 &&
		Number.isInteger(customCounts.machines) &&
		customCounts.machines >= 1 &&
		customCounts.machines <= 12 &&
		Number.isInteger(customCounts.brews) &&
		customCounts.brews >= 0 &&
		customCounts.brews <= 500;

	function requestSeed(label: string, counts: DatabaseSeedCounts) {
		setStatus(null);
		setPendingAction({ type: "seed", label, counts });
	}

	function requestClear() {
		setStatus(null);
		setPendingAction({ type: "clear" });
	}

	async function runPendingAction() {
		if (!pendingAction) return;

		setIsRunning(true);
		setStatus(null);
		try {
			if (pendingAction.type === "clear") {
				await clearDatabase();
				setStatus({ tone: "success", message: "Database cleared." });
			} else {
				const summary = await resetDatabaseWithSeed(pendingAction.counts);
				setStatus({
					tone: "success",
					message: `Seeded ${formatCounts(summary)}.`,
				});
			}
			setPendingAction(null);
		} catch (error: unknown) {
			setStatus({
				tone: "error",
				message:
					error instanceof Error ? error.message : "Database operation failed.",
			});
		} finally {
			setIsRunning(false);
		}
	}

	function updateCustomCount(field: keyof DatabaseSeedCounts, value: string) {
		setCustomCounts((current) => ({
			...current,
			[field]: value === "" ? 0 : Number(value),
		}));
	}

	return (
		<section className="space-y-5 border border-primary/30 bg-background/70 p-5">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Local IndexedDB
					</p>
					<h2 className="mt-1 font-News text-3xl text-foreground/90">
						Database workbench
					</h2>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						Generate realistic records, exercise every screen, then reset
						without leaving the browser.
					</p>
				</div>
				<Button
					variant="destructive"
					size="sm"
					onClick={requestClear}
					disabled={isRunning}
				>
					Clear all data
				</Button>
			</div>

			<div className="grid grid-cols-3 gap-2">
				{[
					["Beans", databaseCounts.beans],
					["Machines", databaseCounts.machines],
					["Brews", databaseCounts.brews],
				].map(([label, count]) => (
					<div key={label} className="border border-border bg-background p-3">
						<p className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
							{label}
						</p>
						<p className="mt-1 font-News text-2xl">{count}</p>
					</div>
				))}
			</div>

			<div className="space-y-3">
				<div>
					<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
						Reset presets
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						Every preset clears current rows before inserting new ones.
					</p>
				</div>
				<div className="grid gap-3 md:grid-cols-3">
					{PRESETS.map((preset) => (
						<div key={preset.name} className="border border-border p-4">
							<p className="font-News text-xl">{preset.name}</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{preset.description}
							</p>
							<p className="mt-3 font-Mono text-[10px] text-foreground/70">
								{formatCounts(preset.counts)}
							</p>
							<Button
								variant="add"
								size="sm"
								className="mt-4 w-full"
								onClick={() => requestSeed(preset.name, preset.counts)}
								disabled={isRunning}
							>
								Reset with {preset.name.toLowerCase()} data
							</Button>
						</div>
					))}
				</div>
			</div>

			<div className="border border-border p-4">
				<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
					Custom reset
				</p>
				<div className="mt-3 grid gap-3 sm:grid-cols-3">
					{(
						[
							["beans", "Beans", 1, 50],
							["machines", "Machines", 1, 12],
							["brews", "Brews", 0, 500],
						] as Array<[keyof DatabaseSeedCounts, string, number, number]>
					).map(([field, label, min, max]) => (
						<label key={field} className="space-y-1">
							<span className="block font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
								{label}
							</span>
							<input
								type="number"
								min={min}
								max={max}
								value={customCounts[field]}
								onChange={(event) =>
									updateCustomCount(field, event.target.value)
								}
								className="h-9 w-full border border-border bg-background px-2 font-Mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
							/>
						</label>
					))}
				</div>
				<div className="mt-4 flex flex-wrap items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={() => requestSeed("custom", customCounts)}
						disabled={isRunning || !customCountsValid}
					>
						Reset with custom data
					</Button>
					<span className="font-Mono text-[10px] text-muted-foreground">
						Beans 1–50 · Machines 1–12 · Brews 0–500
					</span>
				</div>
			</div>

			{pendingAction && (
				<div className="border border-destructive/50 bg-destructive/5 p-4">
					<p className="text-sm font-medium">
						{pendingAction.type === "clear"
							? "Clear every local bean, machine, and brew?"
							: `Replace current database with ${pendingAction.label.toLowerCase()} data?`}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						This cannot be undone.
					</p>
					<div className="mt-3 flex gap-2">
						<Button
							variant="destructive"
							size="sm"
							onClick={() => void runPendingAction()}
							disabled={isRunning}
						>
							{isRunning ? "Working…" : "Confirm"}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setPendingAction(null)}
							disabled={isRunning}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{status && (
				<p
					className={
						status.tone === "success"
							? "text-sm text-emerald-500"
							: "text-sm text-destructive"
					}
				>
					{status.message}
				</p>
			)}
		</section>
	);
}
