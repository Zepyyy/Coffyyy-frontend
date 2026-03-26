import { Separator } from "../ui/separator";

export default function SectionTitle({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mb-4">
			<p className="text-sm font-semibold font-Mono uppercase tracking-widest text-muted-foreground">
				{children}
			</p>
			<Separator className="w-auto bg-primary" />
		</div>
	);
}
