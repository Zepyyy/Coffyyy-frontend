export default function SectionDescription({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mb-6">
			<p className="text-xs text-muted-foreground font-Mono">{children}</p>
		</div>
	);
}
