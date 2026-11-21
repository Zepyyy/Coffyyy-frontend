/**
 * Editing state for the written recipe: ratio-first (dose and ratio set the
 * water), the pour plan as pour/wait steps, and how the ratio sits against
 * the brews already logged.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { db } from "@/db/db";
import { useAllBeans } from "@/hooks/api/useBeans";
import { methodConfig } from "@/lib/brewMethods";
import {
	autoPlan,
	cueTimes,
	type PlanKind,
	type PourStep,
	poursFromSteps,
	stepsFromPours,
	totalSeconds,
} from "@/lib/pourPlan";
import { ratioHistory, ratioVerdict, sweetSpot } from "@/lib/ratioHistory";
import { type RecipeFormState, switchRecipeMethod } from "@/lib/recipeForm";
import { parseExtractionTime } from "@/lib/utils";
import type { RecipeMethod } from "@/types/RecipeTypes";

/**
 * A pour-over with no pours gets a generated plan: nothing to type. A total
 * time it already had (e.g. from a brew) is kept as the drawdown's end.
 */
export function withAutoPlan(form: RecipeFormState): RecipeFormState {
	if (form.method !== "pour-over" || form.pours?.length) return form;
	const steps = autoPlan("classic", form.beanWeight, form.brewWeight);
	const had = parseExtractionTime(form.extractionTime);
	const lastCue = cueTimes(steps).at(-1) ?? 0;
	return {
		...form,
		pours: poursFromSteps(steps, form.brewWeight),
		extractionTime:
			had != null && had > lastCue + 10
				? String(had)
				: String(totalSeconds(steps)),
	};
}

export function useRecipeEditor(initial: RecipeFormState) {
	const [form, setForm] = useState(() => withAutoPlan(initial));
	const [planKind, setPlanKind] = useState<PlanKind | null>(
		initial.method === "pour-over" && !initial.pours?.length ? "classic" : null,
	);

	const beans = useAllBeans();
	const brewRows = useLiveQuery(() => db.Brews.toArray(), []);
	const brews = useMemo(() => brewRows ?? [], [brewRows]);

	const config = methodConfig(form.method);
	const ratio = form.brewWeight / form.beanWeight;
	const bean = beans.find((b) => b.id === form.beanId);
	const history = useMemo(
		() => ratioHistory(brews, form.method, form.beanId),
		[brews, form.method, form.beanId],
	);
	const spot = useMemo(() => sweetSpot(history), [history]);
	const verdict = ratioVerdict(ratio, spot, form.method, bean?.name);
	const seconds = parseExtractionTime(form.extractionTime);
	const steps = useMemo(
		() => stepsFromPours(form.pours, form.brewWeight, seconds),
		[form.pours, form.brewWeight, seconds],
	);
	const grindHistory = useMemo(
		() =>
			history
				.filter((p) => p.sameBean && p.grind != null)
				.map((p) => ({ value: p.grind as number, rating: p.rating })),
		[history],
	);

	const clampWater = (w: number) =>
		Math.min(config.brewWeight.max, Math.max(config.brewWeight.min, w));
	// Espresso yields move in tenths, pour-over water in whole grams.
	const roundWater = (w: number) =>
		form.method === "espresso" ? Number(w.toFixed(1)) : Math.round(w);

	const set = <K extends keyof RecipeFormState>(
		key: K,
		value: RecipeFormState[K],
	) => setForm((f) => ({ ...f, [key]: value }));

	return {
		form,
		config,
		bean,
		beans,
		brews,
		ratio,
		history,
		spot,
		verdict,
		steps,
		seconds,
		grindHistory,
		planKind,
		set,
		setMethod: (method: RecipeMethod) => {
			setPlanKind(method === "pour-over" ? "classic" : null);
			setForm((f) => withAutoPlan(switchRecipeMethod(f, method)));
		},
		/** Keeps the ratio: the water follows the dose. */
		setDose: (dose: number) => {
			const d = Math.min(
				config.dose.max,
				Math.max(config.dose.min, Number(dose.toFixed(1))),
			);
			setForm((f) => ({
				...f,
				beanWeight: d,
				brewWeight: roundWater(clampWater(d * (f.brewWeight / f.beanWeight))),
			}));
		},
		setRatio: (r: number) =>
			set("brewWeight", roundWater(clampWater(form.beanWeight * r))),
		setWater: (w: number) => set("brewWeight", roundWater(clampWater(w))),
		setSteps: (next: PourStep[]) =>
			setForm((f) => ({
				...f,
				pours: next.length ? poursFromSteps(next, f.brewWeight) : undefined,
				extractionTime: next.length
					? String(totalSeconds(next))
					: f.extractionTime,
			})),
		applyPlan: (kind: PlanKind) => {
			setPlanKind(kind);
			const next = autoPlan(kind, form.beanWeight, form.brewWeight);
			setForm((f) => ({
				...f,
				pours: poursFromSteps(next, f.brewWeight),
				extractionTime: String(totalSeconds(next)),
			}));
		},
		/** Replace everything (e.g. start from a brew), keeping the method. */
		load: (next: RecipeFormState) => {
			setPlanKind(null);
			setForm(withAutoPlan(next));
		},
	};
}

export type RecipeEditor = ReturnType<typeof useRecipeEditor>;
