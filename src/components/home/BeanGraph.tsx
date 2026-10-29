import TasteStrengthChart from "./TasteStrengthChart";

export default function BeanGraph({
	ChartData,
}: {
	ChartData: {
		taste: number | null;
		strength: number | null;
	}[];
}) {
	return (
		<div className="min-w-0 p-5">
			<p className="font-data text-xs uppercase tracking-[0.16em] text-muted-foreground mb-4">
				Extraction profile
			</p>
			<TasteStrengthChart ChartData={ChartData} />
		</div>
	);
}
