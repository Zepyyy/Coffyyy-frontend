export default function SectionDescription({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mb-6">
			<p className="font-sans text-xs text-ink-soft">{children}</p>
		</div>
	);
}
