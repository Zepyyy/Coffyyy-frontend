import { lazy, Suspense } from "react";

const CtaLab = lazy(() => import("./CtaLab"));

/** Keep experimental animation code off the daily brewing path. */
export default function CtaLabRoute() {
	return (
		<Suspense
			fallback={
				<p className="font-sans text-sm text-ink-soft">Loading studies…</p>
			}
		>
			<CtaLab />
		</Suspense>
	);
}
