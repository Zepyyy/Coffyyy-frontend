export default function SectionTitle({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mb-4">
			<p className="eyebrow">{children}</p>
			<div className="mt-2 h-px w-8 bg-crema" aria-hidden />
		</div>
	);
}
