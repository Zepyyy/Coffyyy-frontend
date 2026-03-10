import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useMemo, useState } from "react";
import { addBean } from "@/db/crud/add";
import { db } from "@/db/db";
import { buildBeanSuggestions } from "@/lib/beanSuggestions";
import { cn } from "@/lib/utils";

type BeanForm = {
	name: string;
	brand: string;
	roastLevel: string;
	process: string;
	botanic: string;
	designation: string;
	origin: string[];
	variety: string[];
	dominantNote: string;
	flavors: string[];
	tastingNotes: string[];
};

const INITIAL: BeanForm = {
	name: "",
	brand: "",
	roastLevel: "",
	process: "",
	botanic: "",
	designation: "",
	origin: [],
	variety: [],
	dominantNote: "",
	flavors: [],
	tastingNotes: [],
};

const SAVE_MESSAGES = [
	"Bean immortalized. The coffee gods are pleased.",
	"Saved to the sacred bean archive.",
	"Another one for the collection. Legend.",
	"Catalogued with love. Next cup awaits.",
	"A fine addition to the archive.",
	"Delicious. Documented. Done.",
	"Saved! May your next cup be even better.",
];

const ROAST_LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
			{children}
		</p>
	);
}

function FieldLabel({
	children,
	required,
}: {
	children: React.ReactNode;
	required?: boolean;
}) {
	return (
		<label className="text-sm font-medium" htmlFor={children as string}>
			{children}
			{required && (
				<span className="ml-1 text-xs text-muted-foreground font-normal">
					required
				</span>
			)}
		</label>
	);
}

function OptionChips({
	options,
	value,
	onChange,
}: {
	options: string[];
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="flex flex-wrap gap-1.5">
			{options.map((opt) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(value === opt ? "" : opt)}
					className={cn(
						"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
						value === opt
							? "bg-foreground text-background"
							: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
					)}
				>
					{opt}
				</button>
			))}
		</div>
	);
}

function MultiChips({
	suggestions,
	selected,
	onToggle,
	customInput,
	onCustomChange,
	onCustomAdd,
	placeholder,
}: {
	suggestions: string[];
	selected: string[];
	onToggle: (v: string) => void;
	customInput: string;
	onCustomChange: (v: string) => void;
	onCustomAdd: () => void;
	placeholder: string;
}) {
	return (
		<div className="space-y-2">
			{suggestions.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{suggestions.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onToggle(s)}
							className={cn(
								"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
								selected.includes(s)
									? "bg-foreground text-background"
									: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
							)}
						>
							{s}
						</button>
					))}
				</div>
			)}
			<div className="flex gap-2">
				<input
					className="h-10 flex-1 rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					placeholder={placeholder}
					value={customInput}
					onChange={(e) => onCustomChange(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === ",") {
							e.preventDefault();
							onCustomAdd();
						}
					}}
				/>
				{customInput.trim() && (
					<button
						type="button"
						onClick={onCustomAdd}
						className="px-3 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
					>
						Add
					</button>
				)}
			</div>
			{selected.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{selected.map((s) => (
						<span
							key={s}
							className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
						>
							{s}
							<button
								type="button"
								onClick={() => onToggle(s)}
								className="opacity-60 hover:opacity-100 leading-none"
							>
								×
							</button>
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export default function Beans() {
	const [form, setForm] = useState<BeanForm>(INITIAL);
	const [customOrigin, setCustomOrigin] = useState("");
	const [customVariety, setCustomVariety] = useState("");
	const [customFlavor, setCustomFlavor] = useState("");
	const [customNote, setCustomNote] = useState("");
	const [status, setStatus] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const beans = useLiveQuery(() => db.Beans.toArray(), []);
	const suggestions = useMemo(() => buildBeanSuggestions(beans ?? []), [beans]);

	function setField<K extends keyof BeanForm>(field: K, value: BeanForm[K]) {
		setForm((f) => ({ ...f, [field]: value }));
	}

	function toggleItem(
		field: "origin" | "variety" | "flavors" | "tastingNotes",
		value: string,
	) {
		setForm((f) => {
			const list = f[field] as string[];
			return {
				...f,
				[field]: list.includes(value)
					? list.filter((v) => v !== value)
					: [...list, value],
			};
		});
	}

	function addCustom(
		field: "origin" | "variety" | "flavors" | "tastingNotes",
		value: string,
		clearFn: () => void,
	) {
		const val = value.trim();
		if (!val) return;
		const current = form[field] as string[];
		if (!current.includes(val)) {
			setForm((f) => ({ ...f, [field]: [...(f[field] as string[]), val] }));
		}
		clearFn();
	}

	async function handleSubmit(e: ChangeEvent) {
		e.preventDefault();
		setIsSaving(true);
		setStatus("");
		try {
			const roast = Number(form.roastLevel);
			await addBean({
				name: form.name,
				brand: form.brand,
				rating: 0,
				status: "New",
				process: (form.process || "?") as "Washed" | "Natural" | "Honey" | "?",
				botanic: (form.botanic || "?") as "Arabica" | "Robusta" | "?",
				designation: (form.designation || "?") as "Pure Origin" | "Blend" | "?",
				origin: form.origin,
				variety: form.variety,
				roastLevel: Number.isFinite(roast) && roast > 0 ? roast : -1,
				dominantNote: form.dominantNote,
				flavors: form.flavors,
				tastingNotes: form.tastingNotes,
				finished: false,
			});
			setForm(INITIAL);
			setStatus(
				SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)],
			);
		} catch {
			setStatus("Save failed.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="mx-auto max-w-2xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Add a Bean</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Catalog a new coffee bean
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-10">
				{/* Identity */}
				<section className="space-y-4">
					<SectionTitle>Identity</SectionTitle>

					<div className="space-y-1.5">
						<FieldLabel required>Bean name</FieldLabel>
						<input
							className="h-12 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							placeholder="e.g. El Paraiso — Red Berries"
							value={form.name}
							onChange={(e) => setField("name", e.target.value)}
							required
						/>
					</div>

					<div className="space-y-1.5">
						<FieldLabel>Brand / Roaster</FieldLabel>
						{suggestions.brands.length > 0 && (
							<div className="flex flex-wrap gap-1.5 mb-1.5">
								{suggestions.brands.map((b) => (
									<button
										key={b}
										type="button"
										onClick={() => setField("brand", b)}
										className={cn(
											"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
											form.brand === b
												? "bg-foreground text-background"
												: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
										)}
									>
										{b}
									</button>
								))}
							</div>
						)}
						<input
							className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							placeholder="e.g. Onyx Coffee Lab"
							value={form.brand}
							onChange={(e) => setField("brand", e.target.value)}
						/>
					</div>
				</section>

				{/* Origin & Processing */}
				<section className="space-y-4">
					<SectionTitle>Origin & Processing</SectionTitle>

					<div className="space-y-1.5">
						<FieldLabel>Origin</FieldLabel>
						<MultiChips
							suggestions={suggestions.origins}
							selected={form.origin}
							onToggle={(v) => toggleItem("origin", v)}
							customInput={customOrigin}
							onCustomChange={setCustomOrigin}
							onCustomAdd={() =>
								addCustom("origin", customOrigin, () => setCustomOrigin(""))
							}
							placeholder="Type a country or region…"
						/>
					</div>

					<div className="space-y-1.5">
						<FieldLabel>Roast level</FieldLabel>
						<div className="flex flex-wrap gap-1.5">
							{ROAST_LEVELS.map((lvl) => (
								<button
									key={lvl}
									type="button"
									onClick={() =>
										setField("roastLevel", form.roastLevel === lvl ? "" : lvl)
									}
									className={cn(
										"h-10 w-10 rounded-lg text-sm font-semibold transition-colors",
										form.roastLevel === lvl
											? "bg-foreground text-background"
											: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
									)}
								>
									{lvl}
								</button>
							))}
						</div>
					</div>

					<div className="space-y-1.5">
						<FieldLabel>Process</FieldLabel>
						<OptionChips
							options={suggestions.processes}
							value={form.process}
							onChange={(v) => setField("process", v)}
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div className="space-y-1.5">
							<FieldLabel>Botanic</FieldLabel>
							<OptionChips
								options={suggestions.botanics}
								value={form.botanic}
								onChange={(v) => setField("botanic", v)}
							/>
						</div>
						<div className="space-y-1.5">
							<FieldLabel>Designation</FieldLabel>
							<OptionChips
								options={suggestions.designations}
								value={form.designation}
								onChange={(v) => setField("designation", v)}
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<FieldLabel>Variety</FieldLabel>
						<MultiChips
							suggestions={suggestions.varieties}
							selected={form.variety}
							onToggle={(v) => toggleItem("variety", v)}
							customInput={customVariety}
							onCustomChange={setCustomVariety}
							onCustomAdd={() =>
								addCustom("variety", customVariety, () => setCustomVariety(""))
							}
							placeholder="e.g. Gesha, Bourbon…"
						/>
					</div>
				</section>

				{/* Flavor Profile */}
				<section className="space-y-4">
					<SectionTitle>Flavor Profile</SectionTitle>

					<div className="space-y-1.5">
						<FieldLabel>Dominant note</FieldLabel>
						{suggestions.dominantNotes.length > 0 && (
							<div className="flex flex-wrap gap-1.5 mb-1.5">
								{suggestions.dominantNotes.map((n) => (
									<button
										key={n}
										type="button"
										onClick={() => setField("dominantNote", n)}
										className={cn(
											"px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
											form.dominantNote === n
												? "bg-foreground text-background"
												: "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
										)}
									>
										{n}
									</button>
								))}
							</div>
						)}
						<input
							className="h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
							placeholder="e.g. Fruity, Chocolatey…"
							value={form.dominantNote}
							onChange={(e) => setField("dominantNote", e.target.value)}
						/>
					</div>

					<div className="space-y-1.5">
						<FieldLabel>Flavors</FieldLabel>
						<MultiChips
							suggestions={suggestions.flavors}
							selected={form.flavors}
							onToggle={(v) => toggleItem("flavors", v)}
							customInput={customFlavor}
							onCustomChange={setCustomFlavor}
							onCustomAdd={() =>
								addCustom("flavors", customFlavor, () => setCustomFlavor(""))
							}
							placeholder="e.g. Blueberry, Dark chocolate…"
						/>
					</div>

					<div className="space-y-1.5">
						<FieldLabel>Tasting notes</FieldLabel>
						<MultiChips
							suggestions={suggestions.tastingNotes}
							selected={form.tastingNotes}
							onToggle={(v) => toggleItem("tastingNotes", v)}
							customInput={customNote}
							onCustomChange={setCustomNote}
							onCustomAdd={() =>
								addCustom("tastingNotes", customNote, () => setCustomNote(""))
							}
							placeholder="More descriptive impressions…"
						/>
					</div>
				</section>

				{/* Save */}
				<div className="space-y-3 border-t border-border pt-4">
					{status && <p className="text-sm text-muted-foreground">{status}</p>}
					<button
						type="submit"
						disabled={!form.name.trim() || isSaving}
						className="w-full h-12 rounded-xl bg-foreground text-background font-semibold text-sm transition-opacity disabled:opacity-40 hover:opacity-90"
					>
						{isSaving ? "Saving…" : "Save Bean"}
					</button>
				</div>
			</form>
		</div>
	);
}
