import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import type { TagProps } from "@/components/tag";
import Tag from "@/components/tag";
import { Toggle } from "@/components/ui/toggle";
import { db } from "@/db/db";
import { buildBeanSuggestions } from "@/lib/beanSuggestions";

type SuggestionGroup = {
	title: string;
	items: Array<string>;
	variant: NonNullable<TagProps["variant"]>;
};

export default function Tests() {
	const beans = useLiveQuery(async () => db.Beans.toArray(), []);
	const suggestions = useMemo(() => buildBeanSuggestions(beans ?? []), [beans]);

	const groups: Array<SuggestionGroup> = [
		{ title: "Brands", items: suggestions.brands, variant: "redColored" },
		{ title: "Origins", items: suggestions.origins, variant: "yellowColored" },
		{
			title: "Varieties",
			items: suggestions.varieties,
			variant: "greenColored",
		},
		{
			title: "Dominant Notes",
			items: suggestions.dominantNotes,
			variant: "blueColored",
		},
		{ title: "Flavors", items: suggestions.flavors, variant: "purpleColored" },
	];

	return (
		<section className="w-full h-full rounded-2xl border border-border bg-background px-6 py-5">
			<h1 className="text-2xl font-semibold">Saved Suggestions</h1>
			<p className="mt-1 text-sm text-muted-foreground">
				Suggestions are generated from saved brew entries only.
			</p>
			<div className="mt-6 flex flex-col gap-4">
				{groups.map((group) => (
					<div key={group.title} className="flex flex-col gap-2 max-w-3xl">
						<p className="text-sm font-semibold">{group.title}</p>
						<div className="flex flex-wrap gap-6 justify-between w-full ">
							<div className="flex flex-row justify-start items-center gap-2">
								{group.items.length === 0 ? (
									<Tag variant="light" text="None yet" />
								) : (
									group.items.map((item) => (
										<Tag
											key={`${group.title}-${item}`}
											variant={group.variant}
											text={item}
										/>
									))
								)}
							</div>
							<div className="flex flex-row justify-start items-center gap-2">
								{group.items.length === 0 ? (
									<Toggle />
								) : (
									group.items.map((item) => (
										<Toggle
											defaultPressed
											key={`${group.title}-${item}`}
											value={item}
											color={
												group.variant !== "light" ? group.variant : undefined
											}
											className="px-4"
										>
											{item}
										</Toggle>
									))
								)}
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
