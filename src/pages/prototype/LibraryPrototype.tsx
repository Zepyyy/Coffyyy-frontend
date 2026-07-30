import {
	ArrowLeft,
	ArrowRight,
	Coffee,
	Filter,
	Plus,
	Search,
	X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { cn } from "@/lib/utils";

/**
 * PROTOTYPE — round two, based on the editorial collection direction.
 * Question: how can the collection show all useful Brewer context and make
 * the brew method obvious without introducing clickable inventory rows?
 * Three A-derived treatments are switchable with ?variant=A|B|C.
 */

type Section = "beans" | "brewers";
type VariantKey = "A" | "B" | "C";

const VARIANTS: Array<{ key: VariantKey; name: string; note: string }> = [
	{ key: "A", name: "Editorial cards", note: "A baseline, tightened" },
	{ key: "B", name: "Method rail", note: "method stays in the periphery" },
	{ key: "C", name: "Lead card grid", note: "method gets a bigger first read" },
];

type Bean = {
	id: string;
	name: string;
	roaster: string;
	origin: string;
	process: string;
	roast: string;
	note: string;
	lastUsed: string;
	lastMethod: string;
	pinned: boolean;
	archived: boolean;
	brews: number;
};

type Brewer = {
	id: string;
	name: string;
	brand: string;
	model: string;
	method: string;
	methodCue: string;
	lastUsed: string;
	pinned: boolean;
	archived: boolean;
	brews: number;
};

const BEANS: Bean[] = [
	{
		id: "costa-rica",
		name: "Costa Rica La Pastora",
		roaster: "Kawa",
		origin: "Costa Rica",
		process: "Honey",
		roast: "Light",
		note: "Stone fruit · caramel",
		lastUsed: "Today",
		lastMethod: "Espresso",
		pinned: true,
		archived: false,
		brews: 18,
	},
	{
		id: "ethiopia",
		name: "Ethiopia Chelbesa",
		roaster: "Fuglen",
		origin: "Ethiopia",
		process: "Washed",
		roast: "Light",
		note: "Jasmine · bergamot",
		lastUsed: "3 days ago",
		lastMethod: "Pour over",
		pinned: false,
		archived: false,
		brews: 9,
	},
	{
		id: "colombia",
		name: "Colombia El Paraiso",
		roaster: "The Barn",
		origin: "Colombia",
		process: "Thermal shock",
		roast: "Medium",
		note: "Peach · cacao",
		lastUsed: "2 weeks ago",
		lastMethod: "Moka pot",
		pinned: false,
		archived: false,
		brews: 6,
	},
	{
		id: "house-decaf",
		name: "House Decaf",
		roaster: "Café 1802",
		origin: "Brazil",
		process: "Natural",
		roast: "Medium",
		note: "Chocolate · almond",
		lastUsed: "Never used",
		lastMethod: "No brew yet",
		pinned: false,
		archived: true,
		brews: 0,
	},
];

const BREWERS: Brewer[] = [
	{
		id: "robot",
		name: "The Robot",
		brand: "Cafelat",
		model: "Robot Barista",
		method: "Espresso",
		methodCue: "Pressure · concentrated",
		lastUsed: "Yesterday",
		pinned: true,
		archived: false,
		brews: 42,
	},
	{
		id: "v60",
		name: "Daily V60",
		brand: "Hario",
		model: "V60 02 Plastic",
		method: "Pour over",
		methodCue: "Filter · clarity",
		lastUsed: "4 days ago",
		pinned: false,
		archived: false,
		brews: 31,
	},
	{
		id: "moka",
		name: "Sunday Moka",
		brand: "Bialetti",
		model: "Moka Express 3 cup",
		method: "Moka pot",
		methodCue: "Stovetop · strong",
		lastUsed: "12 days ago",
		pinned: false,
		archived: false,
		brews: 12,
	},
	{
		id: "old-press",
		name: "Travel Press",
		brand: "AeroPress",
		model: "Original",
		method: "Immersion",
		methodCue: "Steep · travel",
		lastUsed: "Never used",
		pinned: false,
		archived: true,
		brews: 0,
	},
];

const beanColors = [
	"from-amber-100 via-orange-50 to-stone-50",
	"from-sky-100 via-indigo-50 to-stone-50",
	"from-rose-100 via-orange-50 to-stone-50",
	"from-stone-200 via-stone-50 to-amber-50",
];

const methodTones: Record<string, string> = {
	Espresso: "bg-amber-100/80 text-amber-950 dark:bg-amber-200/15 dark:text-amber-100",
	"Pour over": "bg-sky-100 text-sky-950 dark:bg-sky-200/15 dark:text-sky-100",
	"Moka pot": "bg-orange-100 text-orange-950 dark:bg-orange-200/15 dark:text-orange-100",
	Immersion: "bg-violet-100 text-violet-950 dark:bg-violet-200/15 dark:text-violet-100",
};

function LibraryShell({
	section,
	setSection,
	children,
}: {
	section: Section;
	setSection: (section: Section) => void;
	children: ReactNode;
}) {
	return (
		<div className="mx-auto w-full max-w-6xl pb-28">
			<div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-foreground/10 pb-3">
				<div>
					<p className="font-Mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Library</p>
					<h1 className="mt-1 font-News text-4xl italic tracking-tight sm:text-5xl">{section}</h1>
				</div>
				<nav className="flex items-center gap-1 border-b border-foreground/10">
					{(["beans", "brewers"] as Section[]).map((item) => (
						<button
							key={item}
							type="button"
							onClick={() => setSection(item)}
							className={cn(
								"relative px-3 pb-3 font-Mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground",
								section === item && "text-foreground",
							)}
						>
							{item}
							{section === item && <span className="absolute inset-x-0 bottom-[-1px] border-b border-foreground" />}
						</button>
					))}
				</nav>
			</div>
			{children}
		</div>
	);
}

function CollectionTools({
	section,
	search,
	setSearch,
	showFilters,
	setShowFilters,
	includeArchived,
	setIncludeArchived,
}: {
	section: Section;
	search: string;
	setSearch: (value: string) => void;
	showFilters: boolean;
	setShowFilters: (value: boolean) => void;
	includeArchived: boolean;
	setIncludeArchived: (value: boolean) => void;
}) {
	return (
		<div className="space-y-3">
			<div className="flex flex-col gap-2 sm:flex-row">
				<label className="relative min-w-0 flex-1">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={`Search ${section}...`}
						className="h-11 w-full border border-foreground/15 bg-background/70 pl-10 pr-3 font-Recursive text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
					/>
				</label>
				<button
					type="button"
					onClick={() => setShowFilters(!showFilters)}
					className={cn(
						"flex h-11 items-center justify-center gap-2 border border-foreground/15 px-4 font-Mono text-[10px] uppercase tracking-[0.14em] transition-colors hover:bg-foreground/5",
						showFilters && "bg-foreground text-background",
					)}
				>
					<Filter className="size-3.5" /> Filters
				</button>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
					{section === "beans" ? "12 beans" : "8 brewers"}
				</span>
				<span className="text-muted-foreground/50">·</span>
				<button
					type="button"
					onClick={() => setIncludeArchived(!includeArchived)}
					className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
				>
					{includeArchived ? "Showing archived" : "Include archived"}
				</button>
			</div>
			{showFilters && (
				<div className="flex flex-wrap items-center gap-2 border-y border-foreground/10 py-3">
					<span className="font-Mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
						{section === "beans" ? "Origin" : "Category"}
					</span>
					{(section === "beans" ? ["Ethiopia", "Costa Rica", "Colombia"] : ["Espresso", "Pour over", "Moka pot"]).map((filter) => (
						<button key={filter} type="button" className="border border-foreground/15 px-2.5 py-1 font-Recursive text-xs hover:border-primary">
							{filter}
						</button>
					))}
					<span className="ml-auto font-Mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Brand available below</span>
				</div>
			)}
		</div>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="font-Mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
			<p className="mt-1 font-Recursive text-sm leading-snug">{value}</p>
		</div>
	);
}

function MethodLabel({ brewer, mode = "band" }: { brewer: Brewer; mode?: "band" | "rail" | "lead" }) {
	return (
		<div className={cn("flex items-baseline justify-between gap-3", mode === "rail" && "flex-col items-start gap-1", mode === "lead" && "border-l-2 border-current pl-3")}>
			<div className="flex items-baseline gap-2">
				<span className="font-Mono text-[11px] font-semibold uppercase tracking-[0.18em]">{brewer.method}</span>
				<span className="font-Mono text-[9px] uppercase tracking-[0.1em] opacity-65">{brewer.methodCue}</span>
			</div>
			{mode === "band" && <Coffee className="size-5 opacity-40" />}
		</div>
	);
}

function BrewPreview({
	section,
	item,
	close,
}: {
	section: Section;
	item: Bean | Brewer;
	close: () => void;
}) {
	return (
		<div className="fixed inset-x-3 bottom-4 z-50 mx-auto max-w-xl border border-foreground bg-background p-4 shadow-2xl sm:inset-x-auto sm:right-6 sm:left-auto sm:w-[28rem]">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="font-Mono text-[9px] uppercase tracking-[0.18em] text-primary-800/60 dark:text-primary-200/60">Prototype brew setup</p>
					<h2 className="mt-1 font-News text-2xl">Start a brew</h2>
				</div>
				<button type="button" onClick={close} aria-label="Close brew setup"><X className="size-4 text-muted-foreground" /></button>
			</div>
			<div className="mt-4 grid grid-cols-3 gap-2 border-y border-foreground/10 py-3">
				<div><p className="font-Mono text-[9px] uppercase text-muted-foreground">Bean</p><p className="mt-1 truncate font-Recursive text-sm">{section === "beans" ? item.name : "Choose a bean"}</p></div>
				<div><p className="font-Mono text-[9px] uppercase text-muted-foreground">Method</p><p className="mt-1 font-Recursive text-sm">Choose method</p></div>
				<div><p className="font-Mono text-[9px] uppercase text-muted-foreground">Brewer</p><p className="mt-1 truncate font-Recursive text-sm">{section === "brewers" ? item.name : "Optional"}</p></div>
			</div>
			<button type="button" onClick={close} className="mt-4 flex w-full items-center justify-center gap-2 bg-foreground px-4 py-2.5 font-Mono text-[10px] uppercase tracking-[0.14em] text-background">Continue to brew log <ArrowRight className="size-3.5" /></button>
		</div>
	);
}

function BrewerActions({ brewer, startBrew }: { brewer: Brewer; startBrew: (item: Brewer) => void }) {
	return (
		<div className="flex items-center justify-between gap-3 border-t border-foreground/10 pt-4">
			<button type="button" className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline decoration-dotted underline-offset-4">View details</button>
			<button type="button" onClick={() => startBrew(brewer)} className="flex items-center gap-1.5 bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-background">Start brew <ArrowRight className="size-3" /></button>
		</div>
	);
}

function BeanActions({ bean, startBrew }: { bean: Bean; startBrew: (item: Bean) => void }) {
	return (
		<div className="flex items-center justify-between gap-3 border-t border-foreground/10 pt-4">
			<button type="button" className="font-Mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground underline decoration-dotted underline-offset-4">View details</button>
			<button type="button" onClick={() => startBrew(bean)} className="flex items-center gap-1.5 bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] text-background">Start brew <ArrowRight className="size-3" /></button>
		</div>
	);
}

function BrewerCardA({ brewer, startBrew }: { brewer: Brewer; startBrew: (item: Brewer) => void }) {
	return (
		<article className="flex min-h-72 flex-col overflow-hidden border border-foreground/10 bg-background/75">
			<div className={cn("min-h-32 p-5", methodTones[brewer.method])}>
				<MethodLabel brewer={brewer} />
				<h2 className="mt-6 font-News text-3xl leading-none">{brewer.name}</h2>
				<p className="mt-1 font-Recursive text-sm opacity-75">{brewer.brand} · {brewer.model}</p>
			</div>
			<div className="flex flex-1 flex-col p-5">
				<div className="grid grid-cols-2 gap-4">
					<Detail label="Last used" value={brewer.lastUsed} />
					<Detail label="History" value={`${brewer.brews} brews`} />
				</div>
				<div className="mt-auto pt-5"><BrewerActions brewer={brewer} startBrew={startBrew} /></div>
			</div>
		</article>
	);
}

function BeanCardA({ bean, index, startBrew }: { bean: Bean; index: number; startBrew: (item: Bean) => void }) {
	return (
		<article className="flex min-h-72 flex-col overflow-hidden border border-foreground/10 bg-background/75">
			<div className={cn("relative min-h-32 overflow-hidden bg-gradient-to-br p-5", beanColors[index % beanColors.length])}>
				<div className="absolute -right-3 -top-6 font-Lora text-8xl italic text-foreground/10">{index + 1}</div>
				<p className="relative font-Mono text-[9px] uppercase tracking-[0.16em] text-foreground/55">{bean.origin} · {bean.roast} roast</p>
				<h2 className="relative mt-6 max-w-[14rem] font-Lora text-2xl leading-none text-foreground">{bean.name}</h2>
			</div>
			<div className="flex flex-1 flex-col p-5">
				<p className="font-Recursive text-sm">{bean.roaster}</p>
				<div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4">
					<Detail label="Process" value={bean.process} />
					<Detail label="Last brewed" value={`${bean.lastUsed} · ${bean.lastMethod}`} />
					<Detail label="Tasting notes" value={bean.note} />
					<Detail label="History" value={`${bean.brews} brews`} />
				</div>
				<div className="mt-auto pt-5"><BeanActions bean={bean} startBrew={startBrew} /></div>
			</div>
		</article>
	);
}

function AddCard({ section }: { section: Section }) {
	return <button type="button" className="flex min-h-72 flex-col items-center justify-center gap-3 border border-dashed border-foreground/20 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"><Plus className="size-5" /><span className="font-Mono text-[10px] uppercase tracking-[0.14em]">Add {section === "beans" ? "bean" : "brewer"}</span></button>;
}

function useCollection(section: Section) {
	const [search, setSearch] = useState("");
	const [showFilters, setShowFilters] = useState(false);
	const [includeArchived, setIncludeArchived] = useState(false);
	const source = section === "beans" ? BEANS : BREWERS;
	const items = source.filter((item) => (includeArchived || !item.archived) && `${item.name} ${section === "beans" ? `${(item as Bean).roaster} ${(item as Bean).origin}` : `${(item as Brewer).brand} ${(item as Brewer).model} ${(item as Brewer).method}`}`.toLowerCase().includes(search.toLowerCase()));
	const ordered = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
	return { search, setSearch, showFilters, setShowFilters, includeArchived, setIncludeArchived, ordered };
}

function PrototypeFrame({ section, setSection, children }: { section: Section; setSection: (section: Section) => void; children: ReactNode }) {
	return <LibraryShell section={section} setSection={setSection}>{children}</LibraryShell>;
}

function VariantA({ section, setSection, startBrew }: { section: Section; setSection: (section: Section) => void; startBrew: (item: Bean | Brewer) => void }) {
	const collection = useCollection(section);
	return (
		<PrototypeFrame section={section} setSection={setSection}>
			<div className="mb-6 flex items-center justify-between gap-4"><p className="font-Recursive text-sm text-muted-foreground">Everything useful, at a glance.</p><button type="button" className="hidden items-center gap-2 border border-foreground/15 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em] sm:flex"><Plus className="size-3.5" /> Add {section === "beans" ? "bean" : "brewer"}</button></div>
			<CollectionTools section={section} {...collection} />
			<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{collection.ordered.map((item, index) => section === "beans" ? <BeanCardA key={item.id} bean={item as Bean} index={index} startBrew={startBrew} /> : <BrewerCardA key={item.id} brewer={item as Brewer} startBrew={startBrew} />)}
				<AddCard section={section} />
			</div>
		</PrototypeFrame>
	);
}

function WideCard({ item, section, startBrew }: { item: Bean | Brewer; section: Section; startBrew: (item: Bean | Brewer) => void }) {
		if (section === "beans") {
			const bean = item as Bean;
			return <article className="grid gap-5 border-b border-foreground/10 py-5 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-center"><div className={cn("flex min-h-28 flex-col justify-between bg-gradient-to-br p-4", beanColors[BEANS.indexOf(bean) % beanColors.length])}><span className="font-Mono text-[9px] uppercase tracking-[0.15em] text-foreground/60">{bean.origin}</span><span className="font-Lora text-2xl leading-none text-foreground">{bean.name}</span></div><div><div className="flex flex-wrap items-baseline gap-2"><h2 className="font-News text-2xl">{bean.name}</h2><span className="font-Recursive text-sm text-muted-foreground">{bean.roaster}</span></div><div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4"><Detail label="Roast / process" value={`${bean.roast} · ${bean.process}`} /><Detail label="Notes" value={bean.note} /><Detail label="Last brewed" value={`${bean.lastUsed} · ${bean.lastMethod}`} /><Detail label="History" value={`${bean.brews} brews`} /></div></div><div className="flex gap-2 md:flex-col"><button type="button" className="border border-foreground/15 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.1em]">Details</button><button type="button" onClick={() => startBrew(bean)} className="bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.1em] text-background">Brew</button></div></article>;
		}
		const brewer = item as Brewer;
		return <article className="grid gap-5 border-b border-foreground/10 py-5 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-center"><div className={cn("flex min-h-28 flex-col justify-between p-4", methodTones[brewer.method])}><MethodLabel brewer={brewer} mode="rail" /><span className="font-News text-2xl leading-none">{brewer.name}</span></div><div><div className="flex flex-wrap items-baseline gap-2"><h2 className="font-News text-2xl">{brewer.name}</h2><span className="font-Recursive text-sm text-muted-foreground">{brewer.brand} · {brewer.model}</span></div><div className="mt-4 grid grid-cols-2 gap-4"><Detail label="Last used" value={brewer.lastUsed} /><Detail label="History" value={`${brewer.brews} brews`} /></div></div><div className="flex gap-2 md:flex-col"><button type="button" className="border border-foreground/15 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.1em]">Details</button><button type="button" onClick={() => startBrew(brewer)} className="bg-foreground px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.1em] text-background">Brew</button></div></article>;
}

function VariantB({ section, setSection, startBrew }: { section: Section; setSection: (section: Section) => void; startBrew: (item: Bean | Brewer) => void }) {
	const collection = useCollection(section);
	return <PrototypeFrame section={section} setSection={setSection}><div className="mb-6 flex items-center justify-between gap-4"><p className="font-Recursive text-sm text-muted-foreground">A little more breathing room for the details.</p><button type="button" className="flex items-center gap-2 border border-foreground/15 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em]"><Plus className="size-3.5" /> Add</button></div><CollectionTools section={section} {...collection} /><div className="mt-6">{collection.ordered.map((item) => <WideCard key={item.id} item={item as Bean | Brewer} section={section} startBrew={startBrew} />)}<div className="pt-5"><AddCard section={section} /></div></div></PrototypeFrame>;
}

function LeadCard({ item, section, startBrew, lead }: { item: Bean | Brewer; section: Section; startBrew: (item: Bean | Brewer) => void; lead: boolean }) {
	if (section === "beans") {
		const bean = item as Bean;
		return <article className={cn("flex flex-col overflow-hidden border border-foreground/10 bg-background/75", lead ? "min-h-96 sm:col-span-2" : "min-h-72")}><div className={cn("relative flex flex-1 flex-col justify-end overflow-hidden bg-gradient-to-br p-6", beanColors[BEANS.indexOf(bean) % beanColors.length])}><div className="absolute -right-6 -top-10 font-Lora text-[11rem] italic leading-none text-foreground/10">{BEANS.indexOf(bean) + 1}</div><p className="relative font-Mono text-[10px] uppercase tracking-[0.16em] text-foreground/60">{bean.origin} · {bean.roast} roast</p><h2 className={cn("relative mt-5 font-Lora leading-[0.9] text-foreground", lead ? "text-5xl" : "text-3xl")}>{bean.name}</h2></div><div className="p-6"><p className="font-Recursive text-sm">{bean.roaster}</p><div className="mt-4 grid grid-cols-2 gap-4"><Detail label="Process" value={bean.process} /><Detail label="Last brewed" value={`${bean.lastUsed} · ${bean.lastMethod}`} /><Detail label="Notes" value={bean.note} /><Detail label="History" value={`${bean.brews} brews`} /></div><div className="mt-5"><BeanActions bean={bean} startBrew={startBrew} /></div></div></article>;
	}
	const brewer = item as Brewer;
	return <article className={cn("flex flex-col overflow-hidden border border-foreground/10 bg-background/75", lead ? "min-h-96 sm:col-span-2" : "min-h-72")}><div className={cn("flex flex-1 flex-col justify-between p-6", methodTones[brewer.method])}><MethodLabel brewer={brewer} mode="lead" /><div><h2 className={cn("mt-10 font-News leading-[0.9]", lead ? "text-5xl" : "text-3xl")}>{brewer.name}</h2><p className="mt-2 font-Recursive text-sm opacity-75">{brewer.brand} · {brewer.model}</p></div></div><div className="p-6"><div className="grid grid-cols-2 gap-4"><Detail label="Last used" value={brewer.lastUsed} /><Detail label="History" value={`${brewer.brews} brews`} /></div><div className="mt-5"><BrewerActions brewer={brewer} startBrew={startBrew} /></div></div></article>;
}

function VariantC({ section, setSection, startBrew }: { section: Section; setSection: (section: Section) => void; startBrew: (item: Bean | Brewer) => void }) {
	const collection = useCollection(section);
	return <PrototypeFrame section={section} setSection={setSection}><div className="mb-6 flex items-center justify-between gap-4"><p className="font-Recursive text-sm text-muted-foreground">One item gets more visual weight; everything stays actionable.</p><button type="button" className="flex items-center gap-2 border border-foreground/15 px-3 py-2 font-Mono text-[10px] uppercase tracking-[0.12em]"><Plus className="size-3.5" /> Add</button></div><CollectionTools section={section} {...collection} /><div className="mt-7 grid gap-4 sm:grid-cols-2">{collection.ordered.map((item, index) => <LeadCard key={item.id} item={item as Bean | Brewer} section={section} startBrew={startBrew} lead={index === 0} />)}<AddCard section={section} /></div></PrototypeFrame>;
}

function PrototypeSwitcher({ current, setVariant }: { current: VariantKey; setVariant: (variant: VariantKey) => void }) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement;
			if (target.matches("input, textarea, [contenteditable='true']")) return;
			if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
			event.preventDefault();
			const index = VARIANTS.findIndex((variant) => variant.key === current);
			const next = event.key === "ArrowRight" ? (index + 1) % VARIANTS.length : (index - 1 + VARIANTS.length) % VARIANTS.length;
			setVariant(VARIANTS[next].key);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [current, setVariant]);

	const index = VARIANTS.findIndex((variant) => variant.key === current);
	const cycle = (direction: number) => setVariant(VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length].key);
	const active = VARIANTS[index];
	return <div className="fixed inset-x-0 bottom-4 z-[60] mx-auto flex w-fit items-center gap-4 border border-foreground bg-foreground px-3 py-2 text-background shadow-2xl"><button type="button" onClick={() => cycle(-1)} aria-label="Previous variant"><ArrowLeft className="size-4" /></button><div className="min-w-52 text-center"><p className="font-Mono text-[9px] uppercase tracking-[0.16em] text-background/60">Round 2 · {active.key}</p><p className="font-Recursive text-xs">{active.name} <span className="text-background/60">· {active.note}</span></p></div><button type="button" onClick={() => cycle(1)} aria-label="Next variant"><ArrowRight className="size-4" /></button></div>;
}

export default function LibraryPrototype() {
	const [searchParams, setSearchParams] = useSearchParams();
	const rawVariant = searchParams.get("variant")?.toUpperCase();
	const variant: VariantKey = rawVariant === "B" || rawVariant === "C" ? rawVariant : "A";
	const [section, setSection] = useState<Section>(searchParams.get("section") === "brewers" ? "brewers" : "beans");
	const [brewItem, setBrewItem] = useState<Bean | Brewer | null>(null);
	const setVariant = (next: VariantKey) => setSearchParams((current) => { current.set("variant", next); return current; }, { replace: true });
	const changeSection = (next: Section) => { setSection(next); setSearchParams((current) => { current.set("section", next); return current; }, { replace: true }); };
	const content = variant === "A" ? <VariantA section={section} setSection={changeSection} startBrew={setBrewItem} /> : variant === "B" ? <VariantB section={section} setSection={changeSection} startBrew={setBrewItem} /> : <VariantC section={section} setSection={changeSection} startBrew={setBrewItem} />;

	return <>
		<div className="mb-5 border border-dashed border-primary/30 bg-primary-700/5 px-4 py-2.5 text-center"><p className="font-Mono text-[9px] uppercase tracking-[0.18em] text-primary-800/70 dark:text-primary-200/70">Throwaway prototype · round 2 · read-only sample data</p></div>
		{content}
		{brewItem && <BrewPreview section={section} item={brewItem} close={() => setBrewItem(null)} />}
		<PrototypeSwitcher current={variant} setVariant={setVariant} />
	</>;
}
