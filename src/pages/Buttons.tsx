import { Button } from "@/components/ui/button";

export default function Buttons() {
	return (
		<div className="w-full mx-auto max-w-4xl px-6 py-8 space-y-8">
			{/* Header */}
			<div>
				<p className="font-Mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
					Dev only
				</p>
				<h1 className="font-News text-3xl text-foreground/90 mt-1">Buttons.</h1>
			</div>

			{/* Controls row */}
			<div className="flex flex-wrap items-center gap-12 border border-border px-4 py-3 bg-background">
				<div className="grid grid-cols-8 gap-4">
					<Button variant={"add"} size="md">
						add
					</Button>
					<Button variant={"chips"} size="md">
						chips
					</Button>
					<Button variant={"default"} size="md">
						default
					</Button>
					<Button variant={"destructive"} size="md">
						destructive
					</Button>
					<Button variant={"ghost"} size="md">
						ghost
					</Button>
					<Button variant={"ink"} size="md">
						ink
					</Button>
					<Button variant={"link"} size="md">
						link
					</Button>
					<Button variant={"option"} size="md">
						option
					</Button>
					<Button variant={"outline"} size="md">
						outline
					</Button>
					<Button variant={"outline-dashed"} size="md">
						dashed
					</Button>
					<Button variant={"secondary"} size="md">
						secondary
					</Button>
					<Button variant={"steps"} size="md">
						steps
					</Button>
					<Button variant={"subtle-destructive"} size="md">
						subtle
					</Button>
					<Button variant={"transparent"} size="md">
						transparent
					</Button>
				</div>
			</div>
		</div>
	);
}
