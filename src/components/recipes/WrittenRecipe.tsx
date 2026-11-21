/**
 * The recipe editor: no form, no card. The recipe is typeset as one sentence
 * and every value in it is a button that opens its own control (underneath
 * on wider screens, in a bottom sheet on phones). The ratio is judged against
 * your past brews; pour-overs get a generated pour script.
 */
import { ArrowRight, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Link } from "react-router";
import QuickBeanCard from "@/components/log/QuickBeanCard";
import { MethodIcon } from "@/components/method/MethodMarks";
import MethodTiles from "@/components/method/MethodTiles";
import type { RecipeEditor } from "@/hooks/useRecipeEditor";
import { RECIPE_METHODS } from "@/lib/brewMethods";
import { methodInkClass } from "@/lib/methodIdentity";
import { clock } from "@/lib/pourPlan";
import { pourScheduleError } from "@/lib/pourSchedule";
import {
	fmtRatio as fmt,
	type RatioPoint,
	type SweetSpot,
} from "@/lib/ratioHistory";
import type { RecipeFormState } from "@/lib/recipeForm";
import { cn } from "@/lib/utils";
import PourScript from "./PourScript";
import { RatioScale, Stepper, TickRuler } from "./RecipeControls";

export type RecipeMode = "new" | "edit" | "promote";

type Field = "grind" | "dose" | "bean" | "ratio" | "water" | "temp" | "time";

const FIELD_LABEL: Record<Field, string> = {
	grind: "Grind",
	dose: "Dose",
	bean: "Bean",
	ratio: "Ratio",
	water: "Water",
	temp: "Water temperature",
	time: "Shot time",
};

const TONE: Record<RecipeEditor["verdict"]["tone"], string> = {
	in: "text-foreground",
	stronger: "method-ink",
	lighter: "method-ink",
	none: "text-foreground",
};

/** A value in the sentence; tapping it opens its control. */
function Token({
	children,
	active,
	onClick,
	strong,
	label,
}: {
	children: ReactNode;
	active: boolean;
	onClick: () => void;
	strong?: boolean;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-expanded={active}
			aria-label={`${label}: ${typeof children === "string" ? children : ""}`.trim()}
			className={cn(
				"mx-0.5 border-b-2 px-1 font-data not-italic tabular-nums transition-colors",
				strong
					? "method-ink border-current font-semibold"
					: "border-dotted border-ink-faint text-foreground",
				active ? "method-wash border-solid" : "hover:bg-paper-sunken",
			)}
		>
			{children}
		</button>
	);
}

/** Past ratios over time as dots; the recipe as a line; the good band shaded. */
function RatioTimeline({
	points,
	ratio,
	spot,
}: {
	points: RatioPoint[];
	ratio: number;
	spot: SweetSpot | null;
}) {
	const recent = points.slice(-40);
	if (recent.length === 0)
		return (
			<p className="font-sans text-xs text-muted-foreground">
				No brews of this method yet to compare with.
			</p>
		);
	const values = [
		...recent.map((p) => p.ratio),
		ratio,
		...(spot ? [spot.lo, spot.hi] : []),
	];
	const lo = Math.min(...values);
	const hi = Math.max(...values);
	const pad = (hi - lo) * 0.15 || 0.5;
	const W = 600;
	const H = 120;
	const y = (r: number) =>
		8 + ((hi + pad - r) / (hi - lo + 2 * pad)) * (H - 24);
	const x = (i: number) => 10 + (i / Math.max(1, recent.length - 1)) * (W - 70);
	return (
		<svg
			viewBox={`0 0 ${W} ${H}`}
			className="block w-full"
			role="img"
			aria-label="Your past ratios over time against this recipe"
		>
			{spot && (
				<rect
					className="method-wash"
					style={{
						fill: "color-mix(in oklab, var(--method) 9%, transparent)",
					}}
					x={0}
					width={W - 60}
					y={y(spot.hi)}
					height={Math.max(2, y(spot.lo) - y(spot.hi))}
				/>
			)}
			{recent.map((p, i) => (
				<circle
					key={p.id}
					cx={x(i)}
					cy={y(p.ratio)}
					r={p.rating && p.rating >= 4 ? 4 : 2.5}
					style={{ fill: p.sameBean ? "var(--method)" : "var(--ink-faint)" }}
					opacity={p.rating ? 0.35 + p.rating * 0.13 : 0.35}
				>
					<title>{`1:${fmt(p.ratio)}${p.rating ? ` · ${p.rating}★` : ""}`}</title>
				</circle>
			))}
			<line
				x1={0}
				x2={W - 60}
				y1={y(ratio)}
				y2={y(ratio)}
				stroke="var(--ink)"
				strokeWidth={1.5}
				strokeDasharray="5 3"
			/>
			<text
				x={W - 54}
				y={y(ratio) + 4}
				className="fill-foreground font-data text-[12px] font-semibold"
			>
				1:{fmt(ratio)}
			</text>
			<text
				x={10}
				y={H - 2}
				className="fill-ink-faint font-data text-[9px] uppercase"
			>
				older
			</text>
			<text
				x={W - 70}
				y={H - 2}
				textAnchor="end"
				className="fill-ink-faint font-data text-[9px] uppercase"
			>
				latest
			</text>
		</svg>
	);
}

export default function WrittenRecipe({
	editor,
	mode,
	title,
	sourceNote,
	startFrom,
	onSave,
	onDelete,
}: {
	editor: RecipeEditor;
	mode: RecipeMode;
	title: string;
	/** Promote: where the values came from. */
	sourceNote?: string;
	/** New: recipes and brews to start from instead. */
	startFrom?: ReactNode;
	/** Resolves with an error message, or nothing on success. */
	onSave: (
		form: RecipeFormState,
		then: "stay" | "brew",
	) => Promise<string | undefined>;
	onDelete?: () => Promise<void>;
}) {
	const { form, config, ratio, verdict, bean, beans } = editor;
	const m = form.method;
	const [field, setField] = useState<Field | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [confirmDelete, setConfirmDelete] = useState(false);
	const toggle = (f: Field) => setField((cur) => (cur === f ? null : f));
	const scheduleError = pourScheduleError(form.pours, form.method);
	const canSave = Boolean(form.name.trim()) && !scheduleError && !saving;

	async function save(then: "stay" | "brew") {
		if (!canSave) return;
		setError("");
		setSaving(true);
		try {
			const message = await onSave(form, then);
			if (message) setError(message);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Save failed — try again.");
		} finally {
			setSaving(false);
		}
	}

	const grindMin = config.grind.presets[0];
	const grindMax = config.grind.presets[config.grind.presets.length - 1];
	const panel: Record<Field, ReactNode> = {
		grind: (
			<TickRuler
				label="grind"
				value={form.grindSize}
				onChange={(v) => editor.set("grindSize", v)}
				min={Math.min(grindMin, form.grindSize)}
				max={Math.max(grindMax, form.grindSize)}
				step={0.5}
				marks={editor.grindHistory}
			/>
		),
		dose: (
			<Stepper
				size="lg"
				label="dose"
				unit="g"
				step={0.5}
				value={form.beanWeight}
				onChange={editor.setDose}
			/>
		),
		bean: (
			<div className="space-y-2">
				<div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
					{beans
						.filter((b) => !b.finished || b.id === form.beanId)
						.map((b) => (
							<div key={b.id} className="w-44 shrink-0 [&>button]:w-full">
								<QuickBeanCard
									bean={{
										id: b.id,
										name: b.name,
										origin: b.origin ?? [],
										dominantNote: b.dominantNote,
									}}
									selected={form.beanId === b.id}
									onClick={() =>
										editor.set(
											"beanId",
											form.beanId === b.id ? undefined : b.id,
										)
									}
								/>
							</div>
						))}
				</div>
				<p className="font-sans text-xs text-muted-foreground">
					Optional. Leave it open to use with any bag.
				</p>
			</div>
		),
		ratio: (
			<div className="space-y-3">
				<RatioScale
					method={m}
					ratio={ratio}
					onChange={editor.setRatio}
					points={editor.history}
					spot={editor.spot}
					height={70}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Stepper
						label="ratio"
						step={0.1}
						value={Number(ratio.toFixed(1))}
						format={(v) => `1:${fmt(v)}`}
						onChange={editor.setRatio}
					/>
					{config.ratioPresets.map((x) => (
						<button
							key={x}
							type="button"
							onClick={() => editor.setRatio(x)}
							className="border border-line px-2.5 py-1 font-data text-xs text-muted-foreground hover:text-foreground"
						>
							1:{x}
						</button>
					))}
					{editor.spot && (
						<button
							type="button"
							onClick={() =>
								editor.setRatio(Number(editor.spot?.median.toFixed(1)))
							}
							className="method-line method-wash border px-2.5 py-1 font-data text-xs"
						>
							your usual · 1:{fmt(editor.spot.median)}
						</button>
					)}
				</div>
			</div>
		),
		water: (
			<Stepper
				size="lg"
				label={config.brewWeight.label}
				unit="g"
				step={m === "espresso" ? 0.5 : 5}
				value={form.brewWeight}
				onChange={editor.setWater}
			/>
		),
		temp: config.waterTemp ? (
			<TickRuler
				label="temperature"
				unit="°"
				value={form.waterTemp}
				onChange={(v) => editor.set("waterTemp", v)}
				min={config.waterTemp.min}
				max={config.waterTemp.max}
				step={1}
			/>
		) : null,
		time: (
			<TickRuler
				label="shot time"
				unit="s"
				value={editor.seconds ?? 28}
				onChange={(v) => editor.set("extractionTime", String(v))}
				min={15}
				max={45}
				step={1}
			/>
		),
	};

	return (
		<div
			className={cn(
				methodInkClass(m),
				"mx-auto max-w-3xl space-y-10 pb-28 sm:pb-24",
			)}
		>
			<div className="flex flex-wrap items-baseline justify-between gap-2 border-l-4 border-crema pl-5">
				<div>
					<h1 className="font-display text-4xl italic tracking-tight text-foreground/90">
						{title}
					</h1>
					{sourceNote && (
						<p className="mt-1 font-sans text-xs text-muted-foreground">
							{sourceNote}
						</p>
					)}
				</div>
				<Link
					to="/recipes"
					className="font-data text-[11px] uppercase tracking-[0.12em] text-ink-faint hover:text-foreground"
				>
					All recipes
				</Link>
			</div>

			{startFrom}

			<MethodTiles
				methods={RECIPE_METHODS}
				value={m}
				onChange={editor.setMethod}
				locked={mode !== "new"}
				lockedNote={
					mode === "edit" ? "Fixed once saved" : "Taken from the brew"
				}
			/>

			<div className="space-y-4">
				<input
					aria-label="Recipe name"
					value={form.name}
					onChange={(e) => editor.set("name", e.target.value)}
					placeholder="Name it — Morning V60"
					className="w-full bg-transparent font-display text-4xl! font-semibold tracking-tight placeholder:text-ink-faint/60 focus:outline-none sm:text-5xl!"
				/>
				<p className="font-display text-xl italic leading-[2.1] text-foreground/90 sm:text-2xl">
					Grind at{" "}
					<Token
						label="Grind"
						active={field === "grind"}
						onClick={() => toggle("grind")}
					>
						{fmt(form.grindSize)}
					</Token>
					, dose{" "}
					<Token
						label="Dose"
						active={field === "dose"}
						onClick={() => toggle("dose")}
					>
						{`${fmt(form.beanWeight)} g`}
					</Token>{" "}
					of{" "}
					<Token
						label="Bean"
						active={field === "bean"}
						onClick={() => toggle("bean")}
					>
						{bean?.name ?? "any bean"}
					</Token>
					, brewed at{" "}
					<Token
						label="Ratio"
						strong
						active={field === "ratio"}
						onClick={() => toggle("ratio")}
					>
						{`1:${fmt(ratio)}`}
					</Token>
					{m === "pour-over" ? " with " : " for "}
					<Token
						label={config.brewWeight.label}
						active={field === "water"}
						onClick={() => toggle("water")}
					>
						{`${fmt(form.brewWeight)} g`}
					</Token>
					{m === "pour-over" ? " of water" : " in the cup"}
					{config.waterTemp && (
						<>
							{" "}
							at{" "}
							<Token
								label="Temperature"
								active={field === "temp"}
								onClick={() => toggle("temp")}
							>
								{`${form.waterTemp}°C`}
							</Token>
						</>
					)}
					{m === "espresso" ? (
						<>
							, in{" "}
							<Token
								label="Shot time"
								active={field === "time"}
								onClick={() => toggle("time")}
							>
								{editor.seconds != null ? `${editor.seconds} s` : "— s"}
							</Token>
							.
						</>
					) : (
						<>
							, done by{" "}
							<span className="font-data not-italic">
								{editor.seconds != null ? clock(editor.seconds) : "—"}
							</span>
							.
						</>
					)}
				</p>

				{field && panel[field] && (
					<>
						{/* Phones: the control rises as a sheet over the nav. */}
						<button
							type="button"
							aria-label="Close"
							onClick={() => setField(null)}
							className="fixed inset-0 z-[60] bg-ink/25 sm:hidden"
						/>
						<div
							role="group"
							aria-label={FIELD_LABEL[field]}
							className="fixed inset-x-0 bottom-0 z-[61] border-t border-line bg-paper-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lift sm:relative sm:inset-auto sm:z-auto sm:border sm:pb-4 sm:shadow-none"
						>
							<div className="mb-3 flex items-center justify-between sm:mb-2">
								<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
									{FIELD_LABEL[field]}
								</p>
								<button
									type="button"
									aria-label="Done"
									onClick={() => setField(null)}
									className="flex size-8 items-center justify-center text-ink-faint hover:text-foreground"
								>
									<X className="size-4" />
								</button>
							</div>
							{panel[field]}
						</div>
					</>
				)}
			</div>

			<section className="space-y-2" aria-labelledby="ratio-verdict">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<h2
						id="ratio-verdict"
						className={cn("font-display text-2xl italic", TONE[verdict.tone])}
					>
						{verdict.headline}
					</h2>
					<span className="font-sans text-xs text-muted-foreground">
						{verdict.detail}
					</span>
				</div>
				<RatioTimeline
					points={editor.history}
					ratio={ratio}
					spot={editor.spot}
				/>
			</section>

			{m === "pour-over" && (
				<section className="space-y-3" aria-labelledby="pours-heading">
					<h2 id="pours-heading" className="font-display text-2xl italic">
						The pours
					</h2>
					<PourScript
						steps={editor.steps}
						water={form.brewWeight}
						onChange={editor.setSteps}
						planKind={editor.planKind}
						onPlan={editor.applyPlan}
					/>
					{scheduleError && (
						<p role="alert" className="font-sans text-sm text-destructive">
							{scheduleError}
						</p>
					)}
				</section>
			)}

			<section className="space-y-2">
				<h2 className="font-display text-2xl italic">Notes</h2>
				<textarea
					value={form.notes}
					onChange={(e) => editor.set("notes", e.target.value)}
					placeholder={
						m === "pour-over"
							? "Swirl after the bloom, Rao spin at the end…"
							: "WDT, puck screen, anything worth repeating"
					}
					aria-label="Notes"
					className="min-h-20 w-full resize-y border-b border-line-strong bg-transparent py-2 font-sans text-sm placeholder:text-ink-faint focus:outline-none"
				/>
			</section>

			{onDelete && (
				<div className="flex items-center gap-2">
					{confirmDelete ? (
						<>
							<span className="text-xs text-ink-soft">
								Sure? Linked brews stay, unlinked.
							</span>
							<button
								type="button"
								onClick={() => setConfirmDelete(false)}
								className="bg-paper-sunken px-3 py-1 text-xs font-medium text-ink-soft hover:text-foreground"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() =>
									void onDelete().catch((err: unknown) =>
										setError(
											err instanceof Error
												? err.message
												: "Delete failed — try again.",
										),
									)
								}
								className="bg-destructive px-3 py-1 text-xs font-medium text-white hover:opacity-90"
							>
								Delete
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={() => setConfirmDelete(true)}
							className="px-0 py-1 text-xs text-ink-faint transition-colors hover:text-destructive"
						>
							Delete recipe
						</button>
					)}
				</div>
			)}

			{/* Save bar: sits above the phone nav, at the foot on wider screens. */}
			<div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-line bg-paper/95 backdrop-blur-sm sm:bottom-0">
				<div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
					<MethodIcon method={m} className="size-6" />
					<p className="min-w-0 flex-1 truncate font-data text-xs">
						{error ? (
							<span role="alert" className="text-destructive">
								{error}
							</span>
						) : (
							<>
								<b>{form.name.trim() || "Untitled"}</b> · {fmt(form.beanWeight)}
								→{fmt(form.brewWeight)}g ·{" "}
								<span className="method-ink font-semibold">1:{fmt(ratio)}</span>
							</>
						)}
					</p>
					<button
						type="button"
						onClick={() => void save("stay")}
						disabled={!canSave}
						className="h-10 shrink-0 border border-ink px-4 font-data text-[11px] uppercase tracking-[0.12em] transition-colors hover:bg-paper-sunken disabled:opacity-40"
					>
						{saving ? "Saving…" : "Save"}
					</button>
					<button
						type="button"
						onClick={() => void save("brew")}
						disabled={!canSave}
						className="inline-flex h-10 shrink-0 items-center gap-2 bg-ink px-4 font-data text-[11px] uppercase tracking-[0.12em] text-paper hover:bg-ink/85 disabled:opacity-40"
					>
						{mode === "edit" ? "Brew" : "Save & brew"}{" "}
						<ArrowRight className="size-3.5" aria-hidden />
					</button>
				</div>
			</div>
		</div>
	);
}
