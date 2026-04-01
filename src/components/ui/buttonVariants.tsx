import { cva } from "class-variance-authority";

export const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				destructive:
					"bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost:
					"hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
				link: "text-primary underline-offset-4 hover:underline",
				transparent:
					"text-foreground border-none shadow-none inset-shadow-none active:shadow-none active:inset-shadow-none",
				add: "border border-dashed border-primary/30 bg-primary/5 text-primary-800/80 dark:text-primary-200/80 hover:bg-primary/10 dark:hover:bg-primary/10",
				option:
					"border font-Recursive text-sm transition-all border-border bg-background text-muted-foreground hover:border-primary/60 hover:dark:border-primary/40 hover:text-foreground",
				chips:
					"flex items-center gap-1.5 px-2.5 py-1 font-Recursive text-xs border font-medium transition-colors border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
				steps:
					"flex items-center gap-1.5 border px-3 py-1.5 font-Recursive text-sm transition-colors border-border bg-primary-200/15 text-foreground hover:text-foreground hover:bg-primary-200/50 disabled:text-muted-foreground disabled:hover:bg-primary-200/15 disabled:border-border/50",
			},
			size: {
				default: "px-4 py-2 has-[>svg]:px-3 rounded-sm",
				xs: "px-2 py-0.5 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "px-3 py-1.5 text-xs",
				md: "px-4 py-2 has-[>svg]:px-3",
				lg: "px-6 py-4 has-[>svg]:px-4",
				icon: "size-9",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);
