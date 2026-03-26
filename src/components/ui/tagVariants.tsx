import { cva } from "class-variance-authority";

export const tagVariants = cva(
	"cursor-pointer flex items-center font-semibold tracking-tight rounded-lg border w-fit max-w-fit",
	{
		variants: {
			variant: {
				green:
					"bg-tag-green-900 border-tag-green-100 shadow-xs hover:bg-tag-green-900/50 text-tag-green-100",
				yellow:
					"bg-tag-yellow-900 border-tag-yellow-100 shadow-xs hover:bg-tag-yellow-900/50 text-tag-yellow-100",
				blue: "bg-tag-blue-900 border-tag-blue-100 shadow-xs hover:bg-tag-blue-900/50 text-tag-blue-100",
				red: "bg-tag-red-900 border-tag-red-100 shadow-xs hover:bg-tag-red-900/50 text-tag-red-100",
				purple:
					"bg-tag-purple-900 border-tag-purple-100 shadow-xs hover:bg-tag-purple-900/50 text-tag-purple-100",
				orange:
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
