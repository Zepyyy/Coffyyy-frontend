export default function FieldLabel({
	children,
	required,
}: {
	children: React.ReactNode;
	required?: boolean;
}) {
	return (
		<label className="eyebrow" htmlFor={children as string}>
			{children}
			{required && (
				<span className="ml-1.5 font-sans text-[10px] normal-case tracking-normal text-destructive">
					required
				</span>
			)}
		</label>
	);
}
