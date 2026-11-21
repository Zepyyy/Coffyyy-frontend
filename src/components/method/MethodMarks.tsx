import { methodConfig } from "@/lib/brewMethods";
import { methodInkClass } from "@/lib/methodIdentity";
import { cn } from "@/lib/utils";
import type { BrewMethod } from "@/types/BrewTypes";
import MethodEngraving from "./MethodEngraving";

/** The method's instrument at text size, in its ink. */
export function MethodIcon({
	method,
	className,
	label = true,
}: {
	method: BrewMethod;
	className?: string;
	/** Announce the method to screen readers (off when text says it). */
	label?: boolean;
}) {
	const name = methodConfig(method).label;
	return (
		<span
			role={label ? "img" : undefined}
			aria-label={label ? name : undefined}
			aria-hidden={label ? undefined : true}
			title={label ? name : undefined}
			className={cn(
				methodInkClass(method),
				"method-ink inline-flex shrink-0",
				className ?? "size-4",
			)}
		>
			<MethodEngraving method={method} className="size-full" />
		</span>
	);
}

const STAMP_SIZE = {
	sm: { box: "size-9", art: "size-6", detail: false },
	md: { box: "size-12", art: "size-9", detail: true },
	lg: { box: "size-16", art: "size-12", detail: true },
} as const;

/**
 * The method's stamp: its engraving inside an ink frame. `tilt` gives the
 * small rotation used when a stamp sits over a card's corner.
 */
export function MethodStamp({
	method,
	size = "lg",
	tilt = false,
	label = true,
	className,
}: {
	method: BrewMethod;
	size?: keyof typeof STAMP_SIZE;
	tilt?: boolean;
	/** Announce the method to screen readers (off when text says it). */
	label?: boolean;
	className?: string;
}) {
	const s = STAMP_SIZE[size];
	return (
		<span
			role={label ? "img" : undefined}
			aria-label={label ? methodConfig(method).label : undefined}
			aria-hidden={label ? undefined : true}
			data-tilt={tilt}
			className={cn(methodInkClass(method), "method-stamp", s.box, className)}
		>
			<span>
				<MethodEngraving method={method} detail={s.detail} className={s.art} />
			</span>
		</span>
	);
}

/** Icon + method name, both in its ink. */
export function MethodTag({
	method,
	className,
}: {
	method: BrewMethod;
	className?: string;
}) {
	return (
		<span
			className={cn(
				methodInkClass(method),
				"method-ink inline-flex items-center gap-1.5 font-data text-[10px] font-semibold uppercase tracking-[0.14em]",
				className,
			)}
		>
			<MethodIcon method={method} label={false} className="size-4" />
			{methodConfig(method).label}
		</span>
	);
}
