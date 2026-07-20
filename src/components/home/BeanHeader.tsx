import { Link } from "react-router";
import type { Beans } from "@/types/BeanTypes";

export default function BeanHeader({
	bean,
	brewCount,
	swatch,
}: {
	bean: Beans;
	brewCount: number;
	insights: { target: { usesTopRatedBrews: boolean } };
	swatch: { secondaryBg: string; text: string; secondaryText: string };
}) {
	return (
		<Link
			to={`/beans/${bean.id}`}
			className={`px-5 py-4 ${swatch.secondaryBg} flex items-center justify-between gap-4`}
		>
			<div>
				<p className={`font-Lora font-semibold text-xl ${swatch.text}`}>
					{bean.name}
				</p>
				<p
					className={`font-Mono text-xs uppercase tracking-[0.16em] ${swatch.secondaryText} mt-0.5`}
				>
					{[bean.countries.join(", "), bean.dominantNote, bean.cities.join(", ")]
						.filter(Boolean)
						.join(" · ")}
				</p>
			</div>

			<div className="text-right shrink-0">
				<p
					className={`font-Mono text-xs uppercase tracking-[0.12em] ${swatch.secondaryText}`}
				>
					{brewCount} brew{brewCount !== 1 ? "s" : ""}
				</p>
			</div>
		</Link>
	);
}
