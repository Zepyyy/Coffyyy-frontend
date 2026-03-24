import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const colorVariant = cva(
	"cursor-pointer flex items-center font-semibold tracking-tight rounded-lg border w-fit max-w-fit",
	{
		variants: {
			variant: {
				greenColored:
					"bg-tag-green-900 border-tag-green-100 shadow-xs hover:bg-tag-green-900/50 text-tag-green-100",
				yellowColored:
					"bg-tag-yellow-900 border-tag-yellow-100 shadow-xs hover:bg-tag-yellow-900/50 text-tag-yellow-100",
				blueColored:
					"bg-tag-blue-900 border-tag-blue-100 shadow-xs hover:bg-tag-blue-900/50 text-tag-blue-100",
				redColored:
					"bg-tag-red-900 border-tag-red-100 shadow-xs hover:bg-tag-red-900/50 text-tag-red-100",
				purpleColored:
					"bg-tag-purple-900 border-tag-purple-100 shadow-xs hover:bg-tag-purple-900/50 text-tag-purple-100",
				orangeColored:
					"bg-tag-orange-900 border-tag-orange-100 shadow-xs hover:bg-tag-orange-900/50 text-tag-orange-100",
				light:
					"border-1 border-primary border-dashed bg-transparent hover:bg-accent dark:bg-input/30 dark:border-input dark:hover:bg-input/50 pointer-events-none",
				default: "bg-background/80 border-background/80 hover:bg-background/50",
			},
			size: {
				sm: "px-2 py-0.5 text-xs rounded-xs",
				lg: "px-2 py-1 text-sm",
				default: "px-2 py-0.5 text-xs rounded-xs",
			},
		},
	},
);

export interface TagProps
	extends React.ComponentProps<"p">,
		VariantProps<typeof colorVariant> {
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
		<p className={clsx(colorVariant({ variant, size, className }))} {...props}>
			<span>{text ?? "tag"}</span>
		</p>
	);
}
