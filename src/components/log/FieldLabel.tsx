export default function FieldLabel({
	children,
	required,
}: {
	children: React.ReactNode;
	required?: boolean;
}) {
	return (
		<label
			className="font-Lora text-lg font-medium"
			htmlFor={children as string}
		>
			{children}
			{required && (
				<span className="ml-1 text-xs text-muted-foreground font-normal">
					required
				</span>
			)}
		</label>
	);
}
