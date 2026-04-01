import {
	AlertCircle,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Coffee,
	Cpu,
	Flower,
	ForkKnife,
	Search,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import Header from "@/components/Header";
import BeanCard from "@/components/library/BeanCard";
import FilterCard from "@/components/library/FilterCard";
import MachineCard from "@/components/library/MachineCard";
import Dial from "@/components/log/Dial";
import QuickCard from "@/components/log/QuickCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Tag from "@/components/ui/tag";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BeanCardProps } from "@/types/BeanTypes";

type SwatchToken = {
	name: string;
	bgClass: string;
	textClass?: string;
	borderClass?: string;
};

const SEMANTIC_SWATCHES: SwatchToken[] = [
	{
		name: "background",
		bgClass: "bg-background",
		borderClass: "border-border",
	},
	{
		name: "background-light",
		bgClass: "bg-background-light",
		borderClass: "border-border",
	},
	{ name: "foreground", bgClass: "bg-foreground" },
	{ name: "card", bgClass: "bg-card", borderClass: "border-border" },
	{ name: "primary", bgClass: "bg-primary" },
	{
		name: "primary-100",
		bgClass: "bg-primary-100",
		textClass: "text-foreground",
	},
	{
		name: "primary-200",
		bgClass: "bg-primary-200",
		textClass: "text-foreground",
	},
	{
		name: "primary-700",
		bgClass: "bg-primary-700",
		textClass: "text-primary-foreground",
	},
	{
		name: "primary-800",
		bgClass: "bg-primary-800",
		textClass: "text-primary-foreground",
	},
	{ name: "muted", bgClass: "bg-muted", borderClass: "border-border" },
	{ name: "accent", bgClass: "bg-accent", borderClass: "border-border" },
	{ name: "destructive", bgClass: "bg-destructive", textClass: "text-white" },
];

const TAG_SWATCHES: SwatchToken[] = [
	{
		name: "tag-teal-900",
		bgClass: "bg-tag-teal-900",
		textClass: "text-tag-teal-100",
	},
	{
		name: "tag-teal-100",
		bgClass: "bg-tag-teal-100",
		textClass: "text-tag-teal-900",
	},
	{
		name: "tag-green-900",
		bgClass: "bg-tag-green-900",
		textClass: "text-tag-green-100",
	},
	{
		name: "tag-green-100",
		bgClass: "bg-tag-green-100",
		textClass: "text-tag-green-900",
	},
	{
		name: "tag-blue-900",
		bgClass: "bg-tag-blue-900",
		textClass: "text-tag-blue-100",
	},
	{
		name: "tag-blue-100",
		bgClass: "bg-tag-blue-100",
		textClass: "text-tag-blue-900",
	},
	{
		name: "tag-yellow-900",
		bgClass: "bg-tag-yellow-900",
		textClass: "text-tag-yellow-100",
	},
	{
		name: "tag-yellow-100",
		bgClass: "bg-tag-yellow-100",
		textClass: "text-tag-yellow-900",
	},
	{
		name: "tag-red-900",
		bgClass: "bg-tag-red-900",
		textClass: "text-tag-red-100",
	},
	{
		name: "tag-red-100",
		bgClass: "bg-tag-red-100",
		textClass: "text-tag-red-900",
	},
	{
		name: "tag-purple-900",
		bgClass: "bg-tag-purple-900",
		textClass: "text-tag-purple-100",
	},
	{
		name: "tag-purple-100",
		bgClass: "bg-tag-purple-100",
		textClass: "text-tag-purple-900",
	},
	{
		name: "tag-orange-900",
		bgClass: "bg-tag-orange-900",
		textClass: "text-tag-orange-100",
	},
	{
		name: "tag-orange-100",
		bgClass: "bg-tag-orange-100",
		textClass: "text-tag-orange-900",
	},
];

function SwatchCard({ name, bgClass, textClass, borderClass }: SwatchToken) {
	return (
		<div className="rounded-xl border border-border bg-card/50 p-3">
			<div
				className={`h-16 w-full rounded-lg border ${borderClass ?? "border-transparent"} ${bgClass}`}
			/>
			<div className="mt-2 space-y-1">
				<p className="font-Mono text-xs text-muted-foreground">{name}</p>
				<p
					className={`font-Mono text-[11px] ${textClass ?? "text-foreground"}`}
				>
					{textClass ?? "text-foreground"}
				</p>
				<p className="font-Mono text-[11px] text-muted-foreground">{bgClass}</p>
			</div>
		</div>
	);
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-2xl border border-border bg-background-light/60 p-5 md:p-6">
			<div className="mb-4">
				<h2 className="font-News text-2xl md:text-3xl text-primary-800 dark:text-primary-100">
					{title}
				</h2>
				{description ? (
					<p className="mt-1 text-sm md:text-base text-muted-foreground">
						{description}
					</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-Mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
			{children}
		</p>
	);
}

function SubSection({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="space-y-3 rounded-xl border border-border bg-background p-4">
			<SectionLabel>{label}</SectionLabel>
			{children}
		</div>
	);
}

export default function DesignSystem() {
	const [togglePressed, setTogglePressed] = useState(false);
	const [viewMode, setViewMode] = useState("components");

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<header className="rounded-2xl border border-primary/20 bg-primary-700/10 p-5 md:p-6">
				<p className="font-Mono text-xs md:text-sm uppercase tracking-[0.18em] text-primary-800 dark:text-primary-100/90">
					Coffyyy internal
				</p>
				<h1 className="mt-1 font-News text-4xl md:text-5xl leading-none text-primary-800 dark:text-primary-100">
					Design System
				</h1>
				<p className="mt-3 max-w-3xl text-sm md:text-base text-muted-foreground">
					Living reference for tokens, UI primitives, and visual rhythm. Add new
					colors, components, and usage examples here as the app grows.
				</p>
			</header>

			{/* ── TOKENS ──────────────────────────────────────────────────────── */}

			<Section
				title="Core Colors"
				description="Semantic colors used by the application shell and components."
			>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{SEMANTIC_SWATCHES.map((token) => (
						<SwatchCard key={token.name} {...token} />
					))}
				</div>
			</Section>

			<Section
				title="Tag Palette"
				description="Accent colors used in tags, filters, and statuses."
			>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{TAG_SWATCHES.map((token) => (
						<SwatchCard key={token.name} {...token} />
					))}
				</div>
			</Section>

			<Section
				title="Typography"
				description="Quick visual check of families used in the interface."
			>
				<div className="space-y-3 text-4xl">
					<p className="font-News leading-none">
						Newsreader display <span className="italic">(Titles)</span>
					</p>
					<p className="font-Script">
						Marck Script <span className="italic">(Titles)</span>
					</p>
					<p className="font-Lora">
						Lora <span className="italic">(Titles)</span>
					</p>
					<p className="font-Crimson">
						Crimson Pro <span className="italic">(Body)</span>
					</p>
					<p className="font-Bricolage">
						Bricolage body <span className="italic">(Body)</span>
					</p>
					<p className="font-Recursive">Recursive utility text</p>
					<p className="font-Mono uppercase tracking-[0.16em]">
						JetBrains mono labels
					</p>
					<p className="font-Alan">Alan Sans (Body)</p>
				</div>
			</Section>

			{/* ── PRIMITIVES ──────────────────────────────────────────────────── */}

			<Section
				title="Components"
				description="Live examples of your reusable primitives."
			>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<SubSection label="Buttons">
						<div className="flex flex-wrap items-center gap-2">
							<Button>Default</Button>
							<Button variant="option" size="xs">
								Option
							</Button>
							<Button variant="chips" size="sm">
								Chips
							</Button>
							<Button variant="steps" size="md">
								Steps
							</Button>
							<Button variant="outline">Outline</Button>

							<Button variant="secondary">Secondary</Button>
							<Button variant="ghost">Ghost</Button>
							<Button variant="add">Add</Button>
							<Button variant="destructive">Delete</Button>
							<Button variant="link">Link style</Button>
						</div>
					</SubSection>

					<SubSection label="Tags">
						<div className="flex flex-wrap items-center gap-2">
							<Tag variant="default" text="Default" />
							<Tag variant="light" text="Light" />
							<Tag variant="green" text="Green" />
							<Tag variant="teal" text="Teal" />
							<Tag variant="yellow" text="Yellow" />
							<Tag variant="blue" text="Blue" />
							<Tag variant="red" text="Red" />
							<Tag variant="purple" text="Purple" />
							<Tag variant="orange" text="Orange" />
						</div>
					</SubSection>

					<SubSection label="Toggle">
						<Toggle
							pressed={togglePressed}
							onPressedChange={setTogglePressed}
							variant="green"
							aria-label="Sample toggle"
						>
							{togglePressed ? "Enabled" : "Disabled"}
						</Toggle>
					</SubSection>

					<SubSection label="Toggle Group">
						<ToggleGroup
							type="single"
							value={viewMode}
							onValueChange={(value) => {
								if (value) setViewMode(value);
							}}
							spacing={2}
							variant="purple"
						>
							<ToggleGroupItem value="components">Components</ToggleGroupItem>
							<ToggleGroupItem value="colors">Colors</ToggleGroupItem>
							<ToggleGroupItem value="type">Type</ToggleGroupItem>
						</ToggleGroup>
					</SubSection>
				</div>
			</Section>

			{/* ── INPUTS ──────────────────────────────────────────────────────── */}

			<Section
				title="Inputs & Form Controls"
				description="Form elements styled to match the design language."
			>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<SubSection label="Text Input">
						<div className="space-y-3">
							<div className="space-y-1">
								<label
									className="block font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2"
									htmlFor="bean-name"
								>
									Bean Name
								</label>
								<input
									className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-Recursive placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
									placeholder="e.g. Ethiopia Yirgacheffe"
									readOnly
								/>
							</div>
							<div className="space-y-1">
								<label
									className="block font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2"
									htmlFor="Search"
								>
									Search
								</label>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
									<input
										className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm font-Recursive placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
										placeholder="Search beans…"
										readOnly
									/>
								</div>
							</div>
						</div>
					</SubSection>

					<SubSection label="Textarea">
						<div className="space-y-1">
							<label
								className="block font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2"
								htmlFor="tasting-notes"
							>
								Tasting Notes
							</label>
							<textarea
								className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm font-Recursive placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
								rows={4}
								placeholder="Describe the flavors you're experiencing…"
								readOnly
							/>
						</div>
					</SubSection>

					<SubSection label="Rating Sliders">
						<div className="space-y-3">
							{(["Acidity", "Bitterness", "Sweetness"] as const).map(
								(label, i) => (
									<div key={label} className="space-y-1">
										<div className="flex justify-between">
											<span className="font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200">
												{label}
											</span>
											<span className="font-Mono text-[10px] text-muted-foreground">
												{[6, 4, 8][i]}/10
											</span>
										</div>
										<div className="h-2 w-full rounded-full bg-muted">
											<div
												className="h-full rounded-full bg-primary/70 transition-all"
												style={{ width: `${[60, 40, 80][i]}%` }}
											/>
										</div>
									</div>
								),
							)}
						</div>
					</SubSection>

					<SubSection label="Select & Segmented Control">
						<div className="space-y-3">
							<div className="space-y-1">
								<label
									className="block font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2"
									htmlFor="Process"
								>
									Process
								</label>
								<div className="relative">
									<select className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-8 text-sm font-Recursive focus:outline-none focus:ring-1 focus:ring-primary/40">
										<option>Natural</option>
										<option>Washed</option>
										<option>Honey</option>
										<option>Anaerobic</option>
									</select>
									<ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
								</div>
							</div>
							<div className="space-y-1">
								<label
									className="block font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2"
									htmlFor="RoastLevel"
								>
									Roast Level
								</label>
								<div className="flex gap-2">
									{["Light", "Medium", "Dark"].map((l) => (
										<button
											key={l}
											type="button"
											className={`flex-1 rounded-lg border py-1.5 text-xs font-Mono uppercase tracking-widest transition-colors ${
												l === "Medium"
													? "border-primary bg-primary text-primary-foreground"
													: "border-border text-muted-foreground hover:border-primary/40"
											}`}
										>
											{l}
										</button>
									))}
								</div>
							</div>
						</div>
					</SubSection>
				</div>
			</Section>

			{/* ── DATA DISPLAY ────────────────────────────────────────────────── */}

			<Section
				title="Data Display"
				description="Stats, ratings, and metrics in the design language."
			>
				{/* Stat tiles */}
				<div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
					{[
						{ label: "Total Beans", value: "24", sub: "in library" },
						{ label: "Brews Logged", value: "138", sub: "all time" },
						{ label: "Avg. Rating", value: "7.4", sub: "out of 10" },
						{ label: "Countries", value: "12", sub: "origins" },
					].map(({ label, value, sub }) => (
						<div
							key={label}
							className="space-y-1 rounded-xl border border-border bg-background p-4"
						>
							<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
								{label}
							</p>
							<p className="font-News text-3xl leading-none text-primary-800 dark:text-primary-100">
								{value}
							</p>
							<p className="font-Mono text-[10px] text-muted-foreground">
								{sub}
							</p>
						</div>
					))}
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<SubSection label="Rating Dots">
						<div className="space-y-3">
							{[
								{ label: "Overall", score: 8 },
								{ label: "Aroma", score: 7 },
								{ label: "Aftertaste", score: 9 },
							].map(({ label, score }) => (
								<div key={label} className="flex items-center gap-3">
									<span className="w-20 shrink-0 font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
										{label}
									</span>
									<div className="flex gap-1">
										{Array.from({ length: 10 }).map((value, i) => (
											<div
												key={`${label} - ${score} - ${value}`}
												className={`size-2 rounded-full ${i < score ? "bg-primary" : "bg-muted"}`}
											/>
										))}
									</div>
									<span className="font-Mono text-xs text-muted-foreground">
										{score}
									</span>
								</div>
							))}
						</div>
					</SubSection>

					<SubSection label="Flavor Wheel (placeholder)">
						<div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
							<p className="font-Mono text-xs text-muted-foreground">
								[ radar / wheel chart ]
							</p>
						</div>
					</SubSection>
				</div>
			</Section>

			{/* ── CARDS ───────────────────────────────────────────────────────── */}

			<Section
				title="Library Cards"
				description="A collection of reusable card components for displaying beans and machines."
			>
				<div className="gap-4 w-full flex justify-around">
					<div className="flex shrink-0">
						<FilterCard
							key={"2"}
							onToggle={() => {}}
							options={[
								{ label: "Option 1", count: 2, active: true },
								{ label: "Option 2", count: 1, active: false },
								{ label: "Option 3", count: 1, active: false },
								{ label: "Another option", count: 1, active: false },
							]}
							title="Filter Card"
						/>
					</div>
					<div className="flex max-w-3/4 w-full gap-4">
						<BeanCard
							bean={{
								id: 123,
								botanic: "Arabica",
								brand: "BeanBrand",
								dominantNote: "Floral",
								designation: "",
								roastLevel: 4,
								finished: false,
								flavors: [""],
								name: "Bean Card",
								origin: ["Origin"],
								rating: 4,
								process: ["default"],
								status: "Excellent",
								tastingNotes: ["default", "default", "default"],
								variety: ["Variety"],
							}}
						/>
						<MachineCard
							machine={{
								id: 123,
								name: "Machine Card",
								type: "Espresso",
								capacity: "123",
								brand: "Placeholder",
								grindRange: "123",
								model: "Placeholder",
								purchaseDate: "01-01-2024",
							}}
						/>
					</div>
				</div>
			</Section>

			{/* ── BREW SESSION CARD ───────────────────────────────────────────── */}

			<Section
				title="Brew Session Card"
				description="Design concept for logging and viewing individual brew sessions."
			>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Compact list items */}
					<div className="space-y-2">
						<SectionLabel>List Item</SectionLabel>
						<div className="space-y-2 mt-2">
							{[
								{
									bean: "Ethiopia Yirgacheffe",
									machine: "Aeropress",
									rating: 8,
									notes: "Fruity, floral, bright",
									color: "bg-tag-teal-900",
								},
								{
									bean: "Colombia Huila",
									machine: "V60",
									rating: 7,
									notes: "Nutty, caramel, smooth",
									color: "bg-tag-orange-900",
								},
								{
									bean: "Kenya AA",
									machine: "Chemex",
									rating: 9,
									notes: "Berry, citrus, complex",
									color: "bg-tag-blue-900",
								},
							].map((brew) => (
								<div
									key={brew.bean}
									className="group flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-background px-4 py-3 transition-colors hover:border-primary/30"
								>
									<div
										className={`size-8 shrink-0 rounded-full ${brew.color} flex items-center justify-center`}
									>
										<span className="font-News text-sm text-white/90">
											{brew.rating}
										</span>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate font-Recursive text-sm font-medium">
											{brew.bean}
										</p>
										<p className="truncate font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
											{brew.machine} · {brew.notes}
										</p>
									</div>
									<ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
								</div>
							))}
						</div>
					</div>

					{/* Full brew card */}
					<div className="space-y-2">
						<SectionLabel>Full Card</SectionLabel>
						<div className="mt-2 overflow-hidden border border-primary/15 bg-background">
							<div className="relative bg-tag-teal-900 p-5">
								<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-tag-teal-100/60">
									Session #138
								</p>
								<p className="mt-0.5 font-Lora text-2xl font-semibold leading-tight text-tag-teal-100">
									Ethiopia Yirgacheffe
								</p>
								<p className="mt-1 font-Mono text-xs uppercase tracking-widest text-tag-teal-100/60">
									Aeropress · 15g · 240ml
								</p>
								<div className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full border border-tag-teal-100/20">
									<span className="font-News text-lg text-tag-teal-100">8</span>
								</div>
							</div>
							<Separator />
							<div className="grid grid-cols-3 gap-4 p-5">
								{[
									{ label: "Acidity", val: 7 },
									{ label: "Bitterness", val: 4 },
									{ label: "Sweetness", val: 8 },
								].map(({ label, val }) => (
									<div key={label}>
										<p className="mb-1 font-Mono text-[10px] uppercase tracking-widest text-primary-800/60 underline decoration-dotted decoration-2 dark:text-primary-200/60">
											{label}
										</p>
										<div className="flex gap-0.5">
											{Array.from({ length: 5 }).map((value, i) => (
												<div
													key={`${label} - ${value}`}
													className={`h-1 flex-1 rounded-full ${i < Math.round(val / 2) ? "bg-primary/70" : "bg-muted"}`}
												/>
											))}
										</div>
									</div>
								))}
							</div>
							<div className="squiggly-line w-full scale-x-125 scale-y-75 opacity-20" />
							<div className="p-5 pt-3">
								<p className="mb-1 font-Mono text-[10px] uppercase tracking-widest text-primary-800/60 underline decoration-dotted decoration-2 dark:text-primary-200/60">
									Notes
								</p>
								<p className="font-Recursive text-sm text-muted-foreground">
									Bright and complex. Strong citrus on the nose. Long floral
									aftertaste.
								</p>
							</div>
						</div>
					</div>
				</div>
			</Section>

			{/* ── LAYOUT PATTERNS ─────────────────────────────────────────────── */}

			<Section
				title="Layout Patterns"
				description="Grid and composition blueprints for new pages."
			>
				<div className="space-y-6">
					{/* Split panel */}
					<div>
						<SectionLabel>Split Panel — sidebar + content</SectionLabel>
						<div className="mt-3 flex h-40 overflow-hidden rounded-xl border border-dashed border-border">
							<div className="w-44 shrink-0 border-r border-dashed border-border bg-primary-700/5 p-3">
								<div className="mb-2 h-4 w-16 rounded bg-primary/20" />
								<div className="space-y-2">
									{Array.from({ length: 4 }).map((value) => (
										<div
											key={`split-panel-${value}`}
											className="h-5 rounded bg-primary/10"
										/>
									))}
								</div>
							</div>
							<div className="flex-1 p-3">
								<div className="grid h-full grid-cols-3 gap-2 content-start">
									{Array.from({ length: 6 }).map((value) => (
										<div
											key={`masonry-${value}`}
											className="h-14 rounded-lg bg-muted/40"
										/>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Masonry */}
					<div>
						<SectionLabel>Masonry / Mixed Sizes</SectionLabel>
						<div className="mt-3 overflow-hidden rounded-xl border border-dashed border-border p-3">
							<div className="grid grid-cols-4 gap-2">
								<div className="col-span-2 row-span-2 h-36 rounded-lg bg-primary-700/10" />
								<div className="h-16 rounded-lg bg-muted/40" />
								<div className="h-16 rounded-lg bg-muted/40" />
								<div className="h-16 rounded-lg bg-tag-teal-900/20" />
								<div className="h-16 rounded-lg bg-muted/40" />
							</div>
						</div>
					</div>

					{/* Table */}
					<div>
						<SectionLabel>Table / Log View</SectionLabel>
						<div className="mt-3 overflow-hidden rounded-xl border border-border">
							<div className="grid grid-cols-4 border-b border-border bg-muted/30 px-4 py-2">
								{["Bean", "Machine", "Rating", "Date"].map((h) => (
									<p
										key={h}
										className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
									>
										{h}
									</p>
								))}
							</div>
							{[
								["Ethiopia Yirgacheffe", "Aeropress", "8/10", "Today"],
								["Colombia Huila", "V60", "7/10", "Yesterday"],
								["Kenya AA", "Chemex", "9/10", "2d ago"],
							].map((row, i) => (
								<div
									key={row.join("-")}
									className={`grid grid-cols-4 px-4 py-3 transition-colors hover:bg-muted/20 ${i !== 2 ? "border-b border-border" : ""}`}
								>
									{row.map((cell, j) => (
										<p
											key={cell}
											className={`text-sm ${j === 0 ? "font-Recursive font-medium" : j === 2 ? "font-Mono text-primary-700 dark:text-primary-200" : "font-Recursive text-muted-foreground"}`}
										>
											{cell}
										</p>
									))}
								</div>
							))}
						</div>
					</div>

					{/* Full-width hero */}
					<div>
						<SectionLabel>Hero / Dashboard Banner</SectionLabel>
						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<div className="relative col-span-2 overflow-hidden rounded-xl border border-primary/20 bg-primary-700/10 px-6 py-8">
								<p className="font-Mono text-[10px] uppercase tracking-[0.16em] opacity-60">
									Quick add
								</p>
								<p className="mt-1 font-News text-3xl tracking-tight text-primary-800 dark:text-primary-100">
									Log a Brew
								</p>
								<div className="absolute -right-4 -top-4 size-24 rounded-full bg-primary/5" />
							</div>
							<div className="flex flex-col gap-3">
								<div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-background px-4 py-4">
									<div className="size-8 rounded-full bg-muted flex items-center justify-center text-lg">
										🫘
									</div>
									<div>
										<p className="text-sm font-semibold">Add a Bean</p>
										<p className="text-xs text-muted-foreground">
											24 in library
										</p>
									</div>
								</div>
								<div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-background px-4 py-4">
									<div className="size-8 rounded-full bg-muted flex items-center justify-center text-lg">
										⚙️
									</div>
									<div>
										<p className="text-sm font-semibold">Add Equipment</p>
										<p className="text-xs text-muted-foreground">
											138 brews logged
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Section>

			{/* ── STATES ──────────────────────────────────────────────────────── */}

			<Section
				title="States"
				description="Empty states, loading skeletons, and feedback messages."
			>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					{/* Empty state */}
					<SubSection label="Empty State">
						<div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
							<div className="flex size-12 items-center justify-center rounded-full bg-muted">
								<Coffee className="size-6 text-muted-foreground" />
							</div>
							<div>
								<p className="font-News text-lg text-primary-800 dark:text-primary-100">
									No beans yet
								</p>
								<p className="mt-0.5 font-Recursive text-sm text-muted-foreground">
									Add your first bean to get started.
								</p>
							</div>
							<Button size="sm" variant="outline">
								Add a bean
							</Button>
						</div>
					</SubSection>

					{/* Skeleton */}
					<SubSection label="Skeleton Loader">
						<div className="animate-pulse space-y-3">
							<div className="h-24 rounded-lg bg-muted" />
							<div className="space-y-2">
								<div className="h-3 w-3/4 rounded bg-muted" />
								<div className="h-3 w-1/2 rounded bg-muted" />
								<div className="h-3 w-5/6 rounded bg-muted" />
							</div>
							<div className="flex gap-2">
								<div className="h-6 w-16 rounded-full bg-muted" />
								<div className="h-6 w-12 rounded-full bg-muted" />
							</div>
						</div>
					</SubSection>

					{/* Notifications */}
					<SubSection label="Notifications">
						<div className="space-y-2">
							<div className="flex items-start gap-2 rounded-lg border border-tag-green-900 bg-tag-green-900/20 px-3 py-2.5">
								<CheckCircle className="mt-0.5 size-4 shrink-0 text-tag-green-100" />
								<div>
									<p className="font-Recursive text-sm font-medium text-tag-green-100">
										Bean added
									</p>
									<p className="font-Mono text-[10px] text-tag-green-100/70">
										Ethiopia Yirgacheffe saved
									</p>
								</div>
							</div>
							<div className="flex items-start gap-2 rounded-lg border border-tag-red-900 bg-tag-red-900/20 px-3 py-2.5">
								<XCircle className="mt-0.5 size-4 shrink-0 text-tag-red-100" />
								<div>
									<p className="font-Recursive text-sm font-medium text-tag-red-100">
										Error
									</p>
									<p className="font-Mono text-[10px] text-tag-red-100/70">
										Something went wrong
									</p>
								</div>
							</div>
							<div className="flex items-start gap-2 rounded-lg border border-tag-yellow-900 bg-tag-yellow-900/20 px-3 py-2.5">
								<AlertCircle className="mt-0.5 size-4 shrink-0 text-tag-yellow-100" />
								<div>
									<p className="font-Recursive text-sm font-medium text-tag-yellow-100">
										Heads up
									</p>
									<p className="font-Mono text-[10px] text-tag-yellow-100/70">
										Grind size not set
									</p>
								</div>
							</div>
						</div>
					</SubSection>
				</div>
			</Section>

			{/* ── COMPOSITION SANDBOX ─────────────────────────────────────────── */}

			<Section
				title="Composition Sandbox"
				description="A quick interaction zone to evaluate spacing, borders, and contrast combinations."
			>
				<div className="rounded-xl border border-primary/30 bg-card p-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<p className="font-News text-2xl text-primary-800 dark:text-primary-100">
								Sample Card Block
							</p>
							<p className="text-sm text-muted-foreground">
								Use this area to drop new components and compare them in
								context.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Tag variant="blue" text="Info" />
							<Button size="sm">Primary action</Button>
						</div>
					</div>
					<Separator className="my-4" />
					<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
						<div className="rounded-lg border border-border bg-background p-3 text-sm">
							Surface A
						</div>
						<div className="rounded-lg border border-primary/20 bg-primary-700/10 p-3 text-sm">
							Surface B
						</div>
						<div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
							Surface C
						</div>
					</div>
				</div>
			</Section>

			{/* ── IDEAS ───────────────────────────────────────────────────────── */}

			<Section
				title="Ideas"
				description="Rough concepts and explorations — not yet implemented."
			>
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
					{/* Concept A — Timeline */}
					<div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary-700/5 p-4">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-primary-800/60 dark:text-primary-200/60">
							Concept A
						</p>
						<p className="font-News text-xl text-primary-800 dark:text-primary-100">
							Timeline View
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							A chronological scroll of brew sessions, grouped by day.
							Full-bleed color bands per dominant note.
						</p>
						<div className="space-y-1.5">
							{(["Today", "Yesterday", "Last week"] as const).map((day, i) => (
								<div key={day} className="flex items-start gap-3">
									<div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/50" />
									<div className="flex-1">
										<p className="font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
											{day}
										</p>
										<div
											className={`mt-1 h-8 rounded-md ${["bg-tag-teal-900/40", "bg-tag-orange-900/40", "bg-tag-blue-900/40"][i]}`}
										/>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Concept B — Flavor Map */}
					<div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary-700/5 p-4">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-primary-800/60 dark:text-primary-200/60">
							Concept B
						</p>
						<p className="font-News text-xl text-primary-800 dark:text-primary-100">
							Flavor Map
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							A 2D scatter plot mapping beans by acidity vs. sweetness. Hover to
							preview the bean card.
						</p>
						<div className="relative h-32 overflow-hidden rounded-lg border border-dashed border-border">
							{[
								{ x: 20, y: 70, color: "bg-tag-teal-900" },
								{ x: 50, y: 40, color: "bg-tag-orange-900" },
								{ x: 80, y: 60, color: "bg-tag-blue-900" },
								{ x: 35, y: 20, color: "bg-tag-green-900" },
								{ x: 65, y: 80, color: "bg-tag-purple-900" },
							].map((dot) => (
								<div
									key={dot.color}
									className={`absolute size-3 rounded-full ${dot.color} opacity-70`}
									style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
								/>
							))}
							<p className="absolute bottom-1 left-2 font-Mono text-[9px] uppercase tracking-widest text-muted-foreground">
								Acidity →
							</p>
						</div>
					</div>

					{/* Concept C — Brew Dial */}
					<div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary-700/5 p-4">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-primary-800/60 dark:text-primary-200/60">
							Concept C
						</p>
						<p className="font-News text-xl text-primary-800 dark:text-primary-100">
							Brew Dial
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							A circular dial UI for dialing in espresso — ratio, time, and
							grind all in one view.
						</p>
						<div className="flex items-center justify-center gap-1.5">
							<Dial
								min={12}
								max={24}
								helpers={false}
								value={18}
								onChange={(value) => console.log(value)}
							/>
							<div className="relative size-24">
								<div className="size-24 rounded-full border-4 border-primary/20" />
								<div className="absolute inset-3 rounded-full border-4 border-dashed border-primary/40" />
								<div className="absolute inset-6 flex items-center justify-center rounded-full border-2 border-primary/60">
									<span className="font-News text-xs text-primary-700 dark:text-primary-200">
										1:15
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* Concept D — Note card */}
					<div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary-700/5 p-4">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-primary-800/60 dark:text-primary-200/60">
							Concept D
						</p>
						<p className="font-News text-xl text-primary-800 dark:text-primary-100">
							Tasting Note Stack
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							A stack of flavor tags with size indicating intensity. Could
							replace the plain comma list.
						</p>
						<div className="flex flex-wrap gap-2 pt-1">
							{[
								{
									label: "Citrus",
									size: "text-lg",
									variant: "default" as const,
								},
								{
									label: "Floral",
									size: "text-base",
									variant: "blue" as const,
								},
								{
									label: "Caramel",
									size: "text-sm",
									variant: "yellow" as const,
								},
								{
									label: "Bergamot",
									size: "text-xs",
									variant: "green" as const,
								},
								{
									label: "Vanilla",
									size: "text-xs",
									variant: "purple" as const,
								},
							].map(({ label, variant }) => (
								<Tag key={label} text={label} variant={variant} />
							))}
						</div>
					</div>

					{/* Concept E — Split metric */}
					<div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary-700/5 p-4">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-primary-800/60 dark:text-primary-200/60">
							Concept E
						</p>
						<p className="font-News text-xl text-primary-800 dark:text-primary-100">
							Split Metric Card
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							A card split diagonally or by line — left shows the label, right
							shows a large number.
						</p>
						<div className="overflow-hidden rounded-lg border border-border">
							<div className="flex">
								<div className="flex-1 border-r border-border bg-primary-700/10 p-3">
									<p className="font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
										Avg. rating
									</p>
									<p className="font-News text-4xl text-primary-800 dark:text-primary-100 leading-none mt-1">
										7.4
									</p>
								</div>
								<div className="flex-1 p-3">
									<p className="font-Mono text-[10px] uppercase tracking-widest text-muted-foreground">
										Best bean
									</p>
									<p className="font-Lora text-sm font-semibold text-foreground mt-1">
										Kenya AA
									</p>
									<p className="font-Mono text-[10px] text-muted-foreground mt-0.5">
										9.1 avg.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Concept F — Progress ring */}
					<div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary-700/5 p-4">
						<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-primary-800/60 dark:text-primary-200/60">
							Concept F
						</p>
						<p className="font-News text-xl text-primary-800 dark:text-primary-100">
							Streak / Progress
						</p>
						<p className="font-Recursive text-sm text-muted-foreground">
							Track brewing streaks or weekly goals. Could live on the home
							dashboard.
						</p>
						<div className="flex items-center gap-4">
							<div className="relative size-16 shrink-0">
								<svg viewBox="0 0 36 36" className="size-16 -rotate-90">
									<title>Streak Progress</title>
									<circle
										cx="18"
										cy="18"
										r="15.9"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										className="text-muted"
									/>
									<circle
										cx="18"
										cy="18"
										r="15.9"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeDasharray="75 25"
										className="text-primary"
									/>
								</svg>
								<span className="absolute inset-0 flex items-center justify-center font-News text-sm text-primary-800 dark:text-primary-100">
									75%
								</span>
							</div>
							<div>
								<p className="font-Recursive text-sm font-medium">
									Weekly Goal
								</p>
								<p className="font-Mono text-[10px] text-muted-foreground uppercase tracking-widest">
									3 of 4 brews
								</p>
							</div>
						</div>
					</div>
				</div>
			</Section>

			{/* ── LOG FORM COMPONENTS ─────────────────────────────────────────── */}

			<Section
				title="Log Form Components"
				description="Redesigned primitives for the brew / bean / machine log forms — targeted at replacing the startup-chip aesthetic."
			>
				<div className="space-y-8">
					{/* ── BEAN PICKER ── */}
					<div className="space-y-3">
						<SectionLabel>
							Bean Picker — compact grid tiles (recommended)
						</SectionLabel>
						<p className="font-Recursive text-sm text-muted-foreground -mt-1">
							Scales to many beans. The color bar communicates dominant note at
							a glance. Name truncates gracefully.
						</p>
						<div className="relative max-w-xs">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
							<input
								readOnly
								className="w-full border border-border bg-background pl-8 pr-3 py-1.5 font-Mono text-xs uppercase tracking-widest placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
								placeholder="Filter beans…"
							/>
						</div>
						<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{[
								{
									name: "Ethiopia Yirgacheffe",
									origin: "Ethiopia",
									process: "Natural",
									color: "bg-tag-teal-900",
									selected: true,
								},
								{
									name: "Colombia Huila",
									origin: "Colombia",
									process: "Washed",
									color: "bg-tag-orange-900",
									selected: false,
								},
								{
									name: "Kenya AA",
									origin: "Kenya",
									process: "Washed",
									color: "bg-tag-blue-900",
									selected: false,
								},
								{
									name: "Guatemala Antigua",
									origin: "Guatemala",
									process: "Honey",
									color: "bg-tag-yellow-900",
									selected: false,
								},
								{
									name: "Brazil Cerrado",
									origin: "Brazil",
									process: "Natural",
									color: "bg-tag-red-900",
									selected: false,
								},
								{
									name: "Panama Gesha",
									origin: "Panama",
									process: "Washed",
									color: "bg-tag-purple-900",
									selected: false,
								},
								{
									name: "Yemen Mocha",
									origin: "Yemen",
									process: "Natural",
									color: "bg-tag-green-900",
									selected: false,
								},
								{
									name: "Costa Rica SHB",
									origin: "Costa Rica",
									process: "Honey",
									color: "bg-tag-teal-900",
									selected: false,
								},
							].map((bean) => (
								<div
									key={bean.name}
									className={`relative cursor-pointer overflow-hidden border transition-all ${
										bean.selected
											? "border-primary bg-primary/5"
											: "border-border bg-background hover:border-primary/40"
									}`}
								>
									<div className={`h-1 w-full ${bean.color}`} />
									<div className="px-2.5 py-2">
										<p className="font-Lora text-sm font-semibold leading-snug line-clamp-1">
											{bean.name}
										</p>
										<p className="mt-0.5 font-Mono text-[9px] uppercase tracking-widest text-muted-foreground line-clamp-1">
											{bean.origin} · {bean.process}
										</p>
									</div>
									{bean.selected && (
										<div className="absolute right-1.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-primary">
											<Check className="size-2.5 text-primary-foreground" />
										</div>
									)}
								</div>
							))}
						</div>
					</div>

					<Separator />

					{/* ── BEAN PICKER ALT ── */}
					<div className="space-y-3">
						<SectionLabel>
							Bean Picker — color-dot chips (alt, fewer beans)
						</SectionLabel>
						<div className="flex flex-wrap gap-2">
							{[
								{
									name: "Ethiopia Yirgacheffe",
									color: "bg-tag-teal-900",
									selected: true,
								},
								{
									name: "Colombia Huila",
									color: "bg-tag-orange-900",
									selected: false,
								},
								{ name: "Kenya AA", color: "bg-tag-blue-900", selected: false },
								{
									name: "Guatemala Antigua",
									color: "bg-tag-yellow-900",
									selected: false,
								},
								{
									name: "Brazil Cerrado",
									color: "bg-tag-red-900",
									selected: false,
								},
							].map((bean) => (
								<button
									key={bean.name}
									type="button"
									className={`flex items-center gap-2 border px-3 py-1.5 transition-all ${
										bean.selected
											? "border-primary bg-primary/5"
											: "border-border bg-background hover:border-primary/30"
									}`}
								>
									<span
										className={`size-2.5 shrink-0 rounded-full ${bean.color}`}
									/>
									<span className="font-Recursive text-sm">{bean.name}</span>
									{bean.selected && (
										<Check className="ml-0.5 size-3 text-primary" />
									)}
								</button>
							))}
						</div>
					</div>

					<Separator />

					{/* ── MACHINE PICKER ── */}
					<div className="space-y-3">
						<SectionLabel>Machine Picker — horizontal mini-cards</SectionLabel>
						<p className="font-Recursive text-sm text-muted-foreground -mt-1">
							Machines are typically few. Scrollable strip with a colored
							avatar, name, and brand.
						</p>
						<div className="flex gap-2 overflow-x-auto pb-1">
							{[
								{
									name: "Aeropress",
									brand: "Aerobie",
									abbr: "AP",
									color: "bg-tag-teal-900",
									selected: true,
								},
								{
									name: "Gaggia Classic",
									brand: "Gaggia",
									abbr: "ESP",
									color: "bg-tag-blue-900",
									selected: false,
								},
								{
									name: "V60 02",
									brand: "Hario",
									abbr: "V60",
									color: "bg-tag-green-900",
									selected: false,
								},
								{
									name: "Chemex 6c",
									brand: "Chemex",
									abbr: "CHX",
									color: "bg-tag-yellow-900",
									selected: false,
								},
								{
									name: "Moka Pot",
									brand: "Bialetti",
									abbr: "MKP",
									color: "bg-tag-orange-900",
									selected: false,
								},
							].map((m) => (
								<div
									key={m.name}
									className={`shrink-0 flex cursor-pointer items-center gap-2.5 border px-3 py-2.5 transition-all ${
										m.selected
											? "border-primary bg-primary/5"
											: "border-border bg-background hover:border-primary/30"
									}`}
								>
									<div
										className={`${m.color} flex size-8 shrink-0 items-center justify-center rounded-full`}
									>
										<span className="font-Mono text-[8px] uppercase tracking-wide text-white/90">
											{m.abbr}
										</span>
									</div>
									<div>
										<p className="font-Recursive text-sm font-medium leading-none">
											{m.name}
										</p>
										<p className="mt-1 font-Mono text-[9px] uppercase tracking-widest text-muted-foreground">
											{m.brand}
										</p>
									</div>
									{m.selected && (
										<Check className="ml-1 size-3 shrink-0 text-primary" />
									)}
								</div>
							))}
						</div>
					</div>

					<Separator />

					{/* ── REDESIGNED FORM CONTROLS ── */}
					<div className="space-y-3">
						<SectionLabel>
							Form Controls — redesigned to match the design system
						</SectionLabel>
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
							<SubSection label="Option Chips (redesigned)">
								<div className="space-y-4">
									<div className="space-y-1.5">
										<p className="font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2">
											Overall Rating
										</p>
										<div className="flex flex-wrap gap-1.5">
											{["Excellent", "Good", "Mid", "Horrible"].map((opt) => (
												<button
													key={opt}
													type="button"
													className={`border px-3 py-1.5 font-Recursive text-sm transition-all ${
														opt === "Excellent"
															? "border-primary bg-primary text-primary-foreground"
															: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
													}`}
												>
													{opt}
												</button>
											))}
										</div>
									</div>
									<div className="space-y-1.5">
										<p className="font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2">
											Dominant Note
										</p>
										<div className="flex flex-wrap gap-1.5">
											{[
												{ label: "Fruity", color: "bg-tag-teal-900" },
												{ label: "Floral", color: "bg-tag-blue-900" },
												{ label: "Nutty", color: "bg-tag-red-900" },
												{ label: "Roasted", color: "bg-tag-yellow-900" },
												{ label: "Spices", color: "bg-tag-purple-900" },
												{ label: "Green", color: "bg-tag-green-900" },
											].map(({ label, color }) => (
												<button
													key={label}
													type="button"
													className={`flex items-center gap-1.5 border px-3 py-1.5 font-Recursive text-sm transition-all ${
														label === "Floral"
															? "border-primary bg-primary/5 text-foreground"
															: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
													}`}
												>
													<span
														className={`size-2 shrink-0 rounded-full ${color}`}
													/>
													{label}
												</button>
											))}
										</div>
									</div>
								</div>
							</SubSection>

							<SubSection label="Roast Level Picker (redesigned)">
								<div className="space-y-1.5">
									<p className="font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2">
										Roast Level
									</p>
									<div className="flex gap-1">
										{Array.from({ length: 10 }, (_, i) => i + 1).map((lvl) => (
											<button
												key={lvl}
												type="button"
												className={`flex-1 py-2.5 font-Mono text-xs font-semibold transition-all border-b-2 ${
													lvl === 4
														? "border-primary text-primary-800 dark:text-primary-200 bg-primary/10"
														: "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
												}`}
											>
												{lvl}
											</button>
										))}
									</div>
									<div
										className="h-1 w-full"
										style={{
											background:
												"linear-gradient(to right, oklch(0.916 0.033 221), oklch(0.949 0.032 76), oklch(0.857 0.05 54), oklch(0.425 0.137 25))",
										}}
									/>
									<div className="flex justify-between">
										<span className="font-Mono text-[9px] text-muted-foreground uppercase">
											Light
										</span>
										<span className="font-Mono text-[9px] text-muted-foreground uppercase">
											Dark
										</span>
									</div>
								</div>
							</SubSection>
						</div>
					</div>

					<Separator />

					{/* ── MULTI-TAG INPUT ── */}
					<div className="space-y-3">
						<SectionLabel>Multi-tag Input (redesigned)</SectionLabel>
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
							<SubSection label="Tasting Notes">
								<div className="space-y-2">
									<div className="flex flex-wrap gap-1.5">
										{["Citrus", "Dark chocolate", "Bergamot"].map((tag) => (
											<span
												key={tag}
												className="flex items-center gap-1.5 border border-primary/30 bg-primary/5 px-2.5 py-1 font-Recursive text-xs font-medium text-primary-800 dark:text-primary-200"
											>
												{tag}
												<button
													type="button"
													className="opacity-50 hover:opacity-100 leading-none text-sm"
												>
													×
												</button>
											</span>
										))}
									</div>
									<div className="flex flex-wrap gap-1.5">
										{["Caramel", "Vanilla", "Hazelnut", "Floral"].map((tag) => (
											<button
												key={tag}
												type="button"
												className="border border-border bg-background px-2.5 py-1 font-Recursive text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
											>
												+ {tag}
											</button>
										))}
									</div>
									<div className="flex gap-2">
										<input
											readOnly
											placeholder="Type your own note…"
											className="flex-1 border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
										/>
										<button
											type="button"
											className="border border-border bg-background px-3 font-Mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
										>
											Add
										</button>
									</div>
								</div>
							</SubSection>

							<SubSection label="Taste Profiles">
								<div className="space-y-2">
									<div className="flex flex-wrap gap-1.5">
										{[
											"Balanced",
											"Complex",
											"Clean",
											"Bright",
											"Smooth",
											"Intense",
										].map((tag) => (
											<button
												key={tag}
												type="button"
												className={`border px-2.5 py-1 font-Recursive text-xs transition-colors ${
													["Balanced", "Bright"].includes(tag)
														? "border-primary/40 bg-primary/5 text-primary-800 dark:text-primary-200"
														: "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
												}`}
											>
												{["Balanced", "Bright"].includes(tag) ? "✓ " : ""}
												{tag}
											</button>
										))}
									</div>
									<input
										readOnly
										placeholder="Custom profile…"
										className="w-full border border-border bg-background px-3 py-1.5 font-Recursive text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 rounded-none"
									/>
								</div>
							</SubSection>
						</div>
					</div>

					<Separator />

					{/* ── FULL FORM LAYOUT CONCEPT ── */}
					<div className="space-y-3">
						<SectionLabel>
							Full Form Layout — how a log page section should look
						</SectionLabel>
						<div className="border border-border bg-background-light/60 p-5 space-y-5 max-w-2xl">
							<div className="pb-4 border-b border-border">
								<p className="font-Mono text-[10px] uppercase tracking-[0.18em] text-primary-800/60 dark:text-primary-200/60">
									Log
								</p>
								<h1 className="font-News text-4xl text-primary-800 dark:text-primary-100 mt-0.5 leading-none">
									A Brew
								</h1>
								<p className="font-Recursive text-sm text-muted-foreground mt-2">
									How was that cup?
								</p>
							</div>
							<div className="space-y-3">
								<div>
									<p className="font-News text-xl italic text-primary-800 dark:text-primary-100">
										Bean
									</p>
									<div className="squiggly-line mt-1 opacity-20 scale-y-75" />
								</div>
								<div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
									{[
										{
											name: "Ethiopia Yirgacheffe",
											origin: ["Ethiopia", "France"],
											dominantNote: "Fruity",
											selected: false,
										},
										{
											name: "Colombia Huila",
											origin: ["Colombia"],
											dominantNote: "Sour",
											selected: true,
										},
										{
											name: "Kenya AA",
											origin: ["Kenya"],
											dominantNote: "Sweet",
											selected: false,
										},
									].map((bean) => (
										<QuickCard
											key={bean.name}
											bean={bean as BeanCardProps}
											onClick={() => console.log(bean.name)}
										/>
									))}
								</div>
							</div>
							<div className="space-y-3">
								<div>
									<p className="font-News text-xl italic text-primary-800 dark:text-primary-100">
										The Brew
									</p>
									<div className="squiggly-line mt-1 opacity-20 scale-y-75" />
								</div>
								<div className="space-y-1">
									<p className="font-Mono text-[10px] uppercase tracking-[0.12em] text-primary-800/70 dark:text-primary-200 underline decoration-dotted decoration-2">
										Overall Rating
									</p>
									<div className="flex flex-wrap gap-1.5">
										{["Excellent", "Good", "Mid", "Horrible"].map((opt) => (
											<button
												key={opt}
												type="button"
												className={`border px-3 py-1.5 font-Recursive text-sm transition-all ${
													opt === "Good"
														? "border-primary bg-primary text-primary-foreground"
														: "border-border bg-background text-muted-foreground hover:border-primary/40"
												}`}
											>
												{opt}
											</button>
										))}
									</div>
								</div>
							</div>
							<div className="border-t border-border pt-4">
								<button
									type="button"
									className="w-full border border-primary bg-primary py-3 font-News text-lg italic text-primary-foreground transition-opacity hover:opacity-90"
								>
									Save Brew
								</button>
							</div>
						</div>
					</div>

					<Separator />

					{/* ── LOG PAGE HEADERS ── */}
					<div className="space-y-3">
						<SectionLabel>Log Page Headers — variants</SectionLabel>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
							{[
								{
									eyebrow: "Log",
									title: "A Brew",
									sub: "How was that cup?",
									icon: <Coffee className="size-6" />,
								},
								{
									eyebrow: "Add",
									title: "A Bean",
									sub: "Catalog a new coffee bean",
									icon: <Flower className="size-6" />,
								},
								{
									eyebrow: "What",
									title: "the fuck",
									sub: "AM I DOING IT right?",
									icon: <ForkKnife className="size-6" />,
								},
								{
									eyebrow: "Add",
									title: "Equipment",
									sub: "Register a machine or brewer",
									icon: <Cpu className="size-6" />,
								},
							].map(({ eyebrow, title, sub, icon }) => (
								<div key={title}>
									<Header
										eyebrow={eyebrow}
										title={title}
										sub={sub}
										icon={icon}
									/>
								</div>
							))}
						</div>
					</div>
				</div>
			</Section>
		</div>
	);
}
