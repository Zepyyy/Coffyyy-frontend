import type { VariantProps } from "class-variance-authority";
import clsx from "clsx";
import { tagVariants } from "./tagVariants";

export interface TagProps
	extends React.ComponentProps<"p">,
		VariantProps<typeof tagVariants> {
	text?: string;
}

export default function Tag({
	className,
	variant = "default",
	size = "default",
	text,
	...props
}: TagProps) {
	return (
		<p className={clsx(tagVariants({ variant, size, className }))} {...props}>
			<span>{text ?? "tag"}</span>
		</p>
	);
}
