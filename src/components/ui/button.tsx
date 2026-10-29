import type { VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cloneElement, isValidElement } from "react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./buttonVariants";

/**
 * The outline key's border retraces itself on hover, and the dashed slot's
 * dashes march — both drawn by a normalized-perimeter SVG injected here so
 * call sites stay untouched.
 */
function KeyOutline({ marching }: { marching?: boolean }) {
	return (
		<svg aria-hidden className={marching ? "key-march" : "key-trace"}>
			<rect
				pathLength={100}
				x="1"
				y="1"
				style={{ width: "calc(100% - 2px)", height: "calc(100% - 2px)" }}
			/>
		</svg>
	);
}

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	children,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
	}) {
	const Comp = asChild ? Slot.Root : "button";
	const keyOutline =
		variant === "outline" ? (
			<KeyOutline />
		) : variant === "outline-dashed" ? (
			<KeyOutline marching />
		) : null;

	// asChild merges everything into the single child element (Slot rejects
	// siblings), so the outline SVG has to live inside it.
	if (asChild && isValidElement(children)) {
		const child = children as React.ReactElement<{
			children?: React.ReactNode;
		}>;
		return (
			<Comp
				data-slot="button"
				data-variant={variant}
				data-size={size}
				className={cn(buttonVariants({ variant, size, className }))}
				{...props}
			>
				{keyOutline
					? cloneElement(child, undefined, child.props.children, keyOutline)
					: child}
			</Comp>
		);
	}

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		>
			{keyOutline}
			{children}
		</Comp>
	);
}

export { Button };
