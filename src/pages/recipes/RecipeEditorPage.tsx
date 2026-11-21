import { useLiveQuery } from "dexie-react-hooks";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { MethodIcon } from "@/components/method/MethodMarks";
import WrittenRecipe, {
	type RecipeMode,
} from "@/components/recipes/WrittenRecipe";
import { Button } from "@/components/ui/button";
import { usePromotionSource } from "@/hooks/api/useRecipeStats";
import { useRecipes } from "@/hooks/api/useRecipes";
import { useRecipeEditor } from "@/hooks/useRecipeEditor";
import { isRecipeMethod, methodConfig } from "@/lib/brewMethods";
import {
	addRecipe,
	addRecipeFromBrew,
	deleteRecipeById,
	getRecipe,
	updateRecipeById,
} from "@/lib/data";
import { methodInkClass } from "@/lib/methodIdentity";
import { fmtRatio } from "@/lib/ratioHistory";
import {
	emptyRecipeForm,
	type RecipeFormState,
	recipeFormFromBrew,
	recipeFormFromRecipe,
	toNewRecipe,
	toRecipeChanges,
	v60StarterRecipeForm,
} from "@/lib/recipeForm";
import { cn, formatRelativeDay } from "@/lib/utils";

const RECIPES = "/recipes";

function positiveId(raw: string | null | undefined): number | undefined {
	if (raw == null) return undefined;
	const id = Number(raw);
	return Number.isInteger(id) && id > 0 ? id : undefined;
}

function Notice({
	title,
	body,
	to,
	action,
}: {
	title: string;
	body: string;
	to: string;
	action: string;
}) {
	return (
		<div className="mx-auto w-full max-w-3xl">
			<div className="space-y-3 border border-dashed border-line-strong bg-paper-raised/50 p-12 text-center">
				<p className="font-display text-2xl text-foreground/60">{title}</p>
				<p className="font-sans text-sm text-muted-foreground">{body}</p>
				<Button asChild variant="ink" className="mt-2">
					<Link to={to}>{action}</Link>
				</Button>
			</div>
		</div>
	);
}

function Editor({
	initial,
	mode,
	title,
	sourceNote,
	startFrom,
	onSave,
	onDelete,
}: {
	initial: RecipeFormState;
	mode: RecipeMode;
	title: string;
	sourceNote?: string;
	startFrom?: ReactNode;
	onSave: (form: RecipeFormState) => Promise<number | Error>;
	onDelete?: () => Promise<void>;
}) {
	const navigate = useNavigate();
	const editor = useRecipeEditor(initial);
	return (
		<WrittenRecipe
			editor={editor}
			mode={mode}
			title={title}
			sourceNote={sourceNote}
			startFrom={startFrom}
			onDelete={onDelete}
			onSave={async (form, then) => {
				const result = await onSave(form);
				if (result instanceof Error) return result.message;
				navigate(then === "brew" ? `/log/brew?recipe=${result}` : RECIPES);
				return undefined;
			}}
		/>
	);
}

/** `/recipes/:id`: edit (method locked), delete. */
function EditRecipe({ recipeId }: { recipeId: number }) {
	const navigate = useNavigate();
	// null = no such recipe; undefined = still loading.
	const recipe = useLiveQuery(
		async () => (await getRecipe(recipeId)) ?? null,
		[recipeId],
	);
	if (recipe === undefined) return null;
	if (recipe === null)
		return (
			<Notice
				title="Recipe not found"
				body="It may have been deleted."
				to={RECIPES}
				action="Back to recipes"
			/>
		);
	return (
		<Editor
			key={recipe.id}
			mode="edit"
			title="Edit recipe"
			initial={recipeFormFromRecipe(recipe)}
			onSave={async (form) => {
				await updateRecipeById(toRecipeChanges(form), recipe.id);
				return recipe.id;
			}}
			onDelete={async () => {
				await deleteRecipeById(recipe.id);
				navigate(RECIPES, { replace: true });
			}}
		/>
	);
}

/** `/recipes/new?fromBrew=<brewId>`: a brew's actuals become a recipe. */
function PromoteBrew({ brewId }: { brewId: number }) {
	const source = usePromotionSource(brewId);
	if (source === undefined) return null;
	if (source === null)
		return (
			<Notice
				title="Brew not found"
				body="It may have been deleted."
				to="/history"
				action="Back to history"
			/>
		);
	const initial = recipeFormFromBrew(source.brew, source.bean);
	const label = methodConfig(source.brew.method).label;
	if (!initial)
		return (
			<Notice
				title="No recipes for this method"
				body={`${label} brews can't become recipes.`}
				to="/history"
				action="Back to history"
			/>
		);
	return (
		<Editor
			key={source.brew.id}
			mode="promote"
			title="Save as recipe"
			initial={initial}
			sourceNote={`From your ${label.toLowerCase()} brew · ${formatRelativeDay(source.brew.date)}${source.brew.overallRating != null ? ` · ${source.brew.overallRating}★` : ""}`}
			onSave={(form) => addRecipeFromBrew(toNewRecipe(form), source.brew.id)}
		/>
	);
}

/** Recipes you already have, to open instead of starting blank. */
function StartFrom() {
	const recipes = useRecipes();
	if (recipes.length === 0) return null;
	return (
		<div className="space-y-2">
			<p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
				Or open one of yours
			</p>
			<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
				{recipes.map((r) => (
					<Link
						key={r.id}
						to={`${RECIPES}/${r.id}`}
						className={cn(
							methodInkClass(r.method),
							"flex shrink-0 items-center gap-2 border border-line bg-paper-raised px-3 py-2 hover:border-line-strong",
						)}
					>
						<MethodIcon method={r.method} />
						<span className="font-sans text-sm">{r.name}</span>
						<span className="method-ink font-data text-[11px]">
							1:{fmtRatio(r.brewWeight / r.beanWeight)}
						</span>
					</Link>
				))}
			</div>
		</div>
	);
}

/** `/recipes/new` (`?method=`, `?starter=v60`): a new recipe. */
function NewRecipe({ initial }: { initial: RecipeFormState }) {
	return (
		<Editor
			mode="new"
			title="New recipe"
			initial={initial}
			startFrom={<StartFrom />}
			onSave={(form) => addRecipe(toNewRecipe(form))}
		/>
	);
}

/** The recipe editor: `/recipes/new`, `/recipes/new?fromBrew=`, `/recipes/:id`. */
export default function RecipeEditorPage() {
	const { recipeId: rawId } = useParams();
	const [params] = useSearchParams();
	const recipeId = positiveId(rawId);
	const brewId = positiveId(params.get("fromBrew"));

	if (rawId && rawId !== "new" && !recipeId)
		return (
			<Notice
				title="Recipe not found"
				body="That link doesn't point to a recipe."
				to={RECIPES}
				action="Back to recipes"
			/>
		);
	if (recipeId) return <EditRecipe key={recipeId} recipeId={recipeId} />;
	if (brewId) return <PromoteBrew key={brewId} brewId={brewId} />;

	const method = params.get("method");
	const starter = params.get("starter") === "v60";
	const initial = starter
		? v60StarterRecipeForm()
		: emptyRecipeForm(isRecipeMethod(method) ? method : "pour-over");
	return <NewRecipe key={`${method}|${starter}`} initial={initial} />;
}
