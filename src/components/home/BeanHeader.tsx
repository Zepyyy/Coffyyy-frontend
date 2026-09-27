import { Link } from "react-router";
import type { Beans } from "@/types/BeanTypes";

export default function BeanHeader({
	bean,
	brewCount,
}: {
	bean: Beans;
	brewCount: number;
	insights: { target: { usesTopRatedBrews: boolean } };
}) {
	return (
		<Link
			to={`/beans/${bean.id}`}
			className="flex items-center justify-between gap-4 border-b border-line/60 bg-paper-sunken/40 px-5 py-4"
		>
			<div>
				<p className="font-display font-semibold text-xl text-foreground">
					{bean.name}
				</p>
				<p className="mt-0.5 font-data text-xs uppercase tracking-[0.16em] text-ink-faint">
					{[bean.origin.join(", "), bean.dominantNote, bean.process?.join(", ")]
						.filter(Boolean)
						.join(" · ")}
				</p>
			</div>

			<div className="text-right shrink-0">
				<p className="font-data text-xs uppercase tracking-[0.12em] text-ink-faint">
					{brewCount} brew{brewCount !== 1 ? "s" : ""}
				</p>
			</div>
		</Link>
	);
}
