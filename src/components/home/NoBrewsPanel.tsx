import { Link } from "react-router";
import { colorSwatch } from "@/lib/utils";
import type { Beans } from "@/types/BeanTypes";

export default function NoBrewsPanel({ bean }: { bean: Beans }) {
	const swatch = colorSwatch[bean.dominantNote] ?? colorSwatch.default;
	return (
		<div
			className={`${swatch.bg} border ${swatch.border} px-6 py-8 text-center space-y-3`}
		>
			<p className={`font-News text-xl ${swatch.text}`}>{bean.name}</p>
			<p
				className={`font-Mono text-[9px] uppercase tracking-[0.16em] ${swatch.secondaryText}`}
			>
				No brews logged yet for this bean
			</p>
			<Link
				to="/log/brew"
				className={`inline-block mt-1 border px-4 py-2 font-Mono text-[9px] uppercase tracking-[0.16em] ${swatch.border} ${swatch.text} hover:opacity-75 transition-opacity`}
			>
				Log first brew →
			</Link>
		</div>
	);
}
