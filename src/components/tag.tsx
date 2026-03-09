import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";

const colorVariant = cva(
	"cursor-pointer flex items-center text-xs md:text-sm font-semibold tracking-tight px-2 py-1 rounded-lg text-foreground-tag border",
	{
		variants: {
			variant: {
				greenColored:
					"bg-tag-green-900 border-tag-green-100 shadow-xs hover:bg-tag-green-900/50 ",
				yellowColored:
					"bg-tag-yellow-900 border-tag-yellow-100 shadow-xs hover:bg-tag-yellow-900/50 ",
				blueColored:
					"bg-tag-blue-900 border-tag-blue-100 shadow-xs hover:bg-tag-blue-900/50 ",
				redColored:
					"bg-tag-red-900 border-tag-red-100 shadow-xs hover:bg-tag-red-900/50 ",
				purpleColored:
					"bg-tag-purple-900 border-tag-purple-100 shadow-xs hover:bg-tag-purple-900/50 ",
				light:
					"border-1 border-primary border-dashed bg-transparent hover:bg-accent dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
				default: "bg-background/80 border-background/80 hover:bg-background/50",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface TagProps
	extends React.ComponentProps<"p">,
		VariantProps<typeof colorVariant> {
	text?: string;
}

export default function Tag({ className, variant, text, ...props }: TagProps) {
	return (
		<p className={clsx(colorVariant({ variant, className }))} {...props}>
			<span>{text ?? "tag"}</span>
		</p>
	);
}
