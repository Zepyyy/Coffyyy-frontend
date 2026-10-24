import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate, useSearchParams } from "react-router";
import RecipeForm from "@/components/recipes/RecipeForm";
import { Button } from "@/components/ui/button";
import { usePromotionSource } from "@/hooks/api/useRecipeStats";
import { methodConfig } from "@/lib/brewMethods";
import {
	addRecipe,
	deleteRecipeById,
	getRecipe,
	linkBrewToRecipe,
	updateRecipeById,
} from "@/lib/data";
import {
	emptyRecipeForm,
	type RecipeFormState,
	recipeFormFromBrew,
	recipeFormFromRecipe,
	toNewRecipe,
	toRecipeChanges,
} from "@/lib/recipeForm";
import { formatRelativeDay } from "@/lib/utils";

const LIBRARY_RECIPES = "/library?tab=recipes";

function positiveId(raw: string | null): number | undefined {
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
		<div className="mx-auto w-full max-w-3xl px-4 lg:px-0">
			<div className="space-y-3 rounded-xl border border-dashed border-line-strong bg-paper-raised/50 p-12 text-center">
				<p className="font-display text-2xl text-foreground/60">{title}</p>
				<p className="font-sans text-sm text-muted-foreground">{body}</p>
				<Button asChild variant="ink" className="mt-2">
					<Link to={to}>{action}</Link>
				</Button>
			</div>
		</div>
	);
}

/** `/log/recipe?id=<recipeId>`: edit (method locked), delete. */
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
				to={LIBRARY_RECIPES}
				action="Back to recipes"
			/>
		);

	return (
		<RecipeForm
			key={recipe.id}
			mode="edit"
			initial={recipeFormFromRecipe(recipe)}
			onSave={async (form) => {
				await updateRecipeById(toRecipeChanges(form), recipe.id);
				navigate(LIBRARY_RECIPES);
				return undefined;
			}}
			onDelete={async () => {
				await deleteRecipeById(recipe.id);
				navigate(LIBRARY_RECIPES, { replace: true });
			}}
		/>
	);
}

/** `/log/recipe?fromBrew=<brewId>`: promote a brew's actuals to a recipe. */
function PromoteBrew({ brewId }: { brewId: number }) {
	const navigate = useNavigate();
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

	const initial = recipeFormFromBrew(source.brew, source.beanName);
	if (!initial)
		return (
			<Notice
				title="No recipes for this method"
				body={`${methodConfig(source.brew.method).label} brews can't become recipes.`}
				to="/history"
				action="Back to history"
			/>
		);

	return (
		<RecipeForm
			key={source.brew.id}
			mode="promote"
			initial={initial}
			sourceNote={`From your ${methodConfig(source.brew.method).label.toLowerCase()} brew · ${formatRelativeDay(source.brew.date)}${source.brew.overallRating != null ? ` · ${source.brew.overallRating}★` : ""}`}
			onSave={async (form) => {
				const result = await addRecipe(toNewRecipe(form));
				if (result instanceof Error) return result.message;
				await linkBrewToRecipe(source.brew.id, result);
				navigate("/history");
				return undefined;
			}}
		/>
	);
}

/** `/log/recipe`: a new recipe from scratch. */
function NewRecipe() {
	const navigate = useNavigate();
	return (
		<RecipeForm
			mode="new"
			initial={emptyRecipeForm("espresso")}
			onSave={async (form: RecipeFormState) => {
				const result = await addRecipe(toNewRecipe(form));
				if (result instanceof Error) return result.message;
				navigate(LIBRARY_RECIPES);
				return undefined;
			}}
		/>
	);
}

/** Recipe form: new, `?id=` edit, or `?fromBrew=` promote. */
export default function RecipeLog() {
	const [searchParams] = useSearchParams();
	const recipeId = positiveId(searchParams.get("id"));
	const brewId = positiveId(searchParams.get("fromBrew"));

	if (recipeId) return <EditRecipe key={recipeId} recipeId={recipeId} />;
	if (brewId) return <PromoteBrew key={brewId} brewId={brewId} />;
	return <NewRecipe />;
}
