export default function Header({
	eyebrow,
	title,
	sub,
	icon,
}: {
	eyebrow: string;
	title: string;
	sub: string;
	icon: React.ReactNode;
}) {
	return (
		<div key={title} className="border border-primary/20 bg-primary-700/10 p-5">
			<div className="flex items-start justify-between">
				<div>
					<p className="font-data text-[10px] uppercase tracking-[0.18em] text-primary-800/60 dark:text-primary-200/60">
						{eyebrow}
					</p>
					<h1 className="mt-0.5 font-display text-3xl leading-none text-primary-800 dark:text-primary-100">
						{title}
					</h1>
					<p className="mt-2 font-sans text-xs text-muted-foreground">{sub}</p>
				</div>
				<div className="text-primary-800/30 dark:text-primary-200/20 shrink-0">
					{icon}
				</div>
			</div>
		</div>
	);
}
