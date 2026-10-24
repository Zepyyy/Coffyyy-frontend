# Spec: multi-method brewing (espresso, pour-over, moka)

Source: map #61. Settled in grilling: #62 (research), #64 (Brewer/method). Settled by the build agent (decisions below): #63, #65, #66, #67, #68.
Domain terms: `CONTEXT.md` (**Brew method**, **Brewer**, **Recipe**). Research: branch `research/multi-method-params`, `docs/research/multi-method-params.md`.

## Already settled (#61, #64)

- Methods: fixed enum `espresso | pour-over | moka`, labels Espresso / Pour-over / Moka. Extensible in code only.
- "Machine" is **Brewer** in UI text + glossary. Schema names `machines`, `machineLocalId` stay. Code identifiers (`Machines`, `useMachines`, `MachineCard`) stay; no code-wide rename.
- Brewer has exactly one `method` (replaces free-text `type`). Editable only while the Brewer has zero brews.
- Brew stores its own immutable `method`, copied from its Brewer at log time. Brewer required when logging new brews. Legacy brewer-less brews read as espresso.
- Migration of `Machine.type`: case-insensitive contains, first match wins: "espresso"→espresso; "moka", "bialetti", "stovetop"→moka; "pour", "v60", "chemex", "kalita", "filter", "drip", "origami"→pour-over; else espresso. Old text dropped.
- Deleting a Brewer: unchanged (brews keep `method`, lose brewer link).
- `grindRange`, `capacity` stay optional free text.
- Moka has no Recipes. SteamCup / save moment unchanged.
- Pour-over recipe v1 = flat fields, no staged pours.

## #63 Brew core + per-method config

Brew fields (snapshot v2):

| field | type | notes |
|---|---|---|
| `localId` | string | |
| `method` | `espresso\|pour-over\|moka` | required, immutable |
| `beanLocalId?` | string | |
| `machineLocalId?` | string | Brewer |
| `recipeLocalId?` | string | Recipe followed, optional, never moka |
| `beanWeight` | number | dose (g). Label "Dose" |
| `brewWeight` | number | **renamed from `espressoWeight`**. The liquid weight the ratio is computed from. Label per method: Espresso "Yield", Pour-over "Water", Moka "Output" |
| `grindSize` | number | unchanged |
| `extractionTime?` | string | seconds as string, unchanged. Label per method: "Time" / "Total time" / "Time" |
| `flow?` | string | espresso only |
| `waterTemp?` | number | °C, pour-over only |
| `heat?` | `low\|medium\|high` | moka only |
| `notes?` | string | all methods, free text (pour-over pours, etc.) |
| `overallRating?`, `tasteScore?`, `strengthScore?` | number | unchanged, all methods |
| `date` | ISO string | |

Ratio is always `brewWeight / beanWeight`, shown `1:x`.

Per-method config lives in one module `src/lib/brewMethods.ts` (single source; UI reads from it, never hard-codes per-method numbers):

| | espresso | pour-over | moka |
|---|---|---|---|
| label | Espresso | Pour-over | Moka |
| dose range / default | 12–24 / 18 (existing consts) | 10–30 / 15 | 7–30 / 15 |
| brewWeight label | Yield | Water | Output |
| brewWeight range / default | 12–48 / 24 (existing consts) | 150–500 / 250 | 30–300 / 100 |
| ratio presets | existing espresso presets | 1:15, 1:16, 1:17 | none |
| time label | Time | Total time | Time |
| time presets (s) | existing | 150, 180, 210, 240 | 180, 240, 300, 360 |
| fields shown | flow | waterTemp | heat |
| waterTemp range / default | – | 85–100 / 93 | – |
| heat options / default | – | – | low, medium, high / medium |
| recipes | yes | yes | no |

Grind presets stay shared (grinder setting, not method-specific).
Existing `MIN_/MAX_/DIAL_DEFAULT_ESPRESSO_WEIGHT` consts move into / are re-exported by the config.

## #65 Recipe model

Recipe entity (snapshot `recipes` collection; Dexie table `Recipes`):

| field | type | notes |
|---|---|---|
| `localId` | string | |
| `name` | string | required, non-empty |
| `method` | `espresso\|pour-over` | moka rejected. Immutable after creation |
| `beanLocalId?` | string | optional bean tie |
| `beanWeight` | number | target dose |
| `brewWeight` | number | target yield/water |
| `grindSize?` | number | |
| `extractionTime?` | string | seconds, like brews |
| `waterTemp?` | number | pour-over only |
| `notes?` | string | |
| `createdAt` | ISO string | |

- Brew → recipe: optional `recipeLocalId`. A brew's recipe must have the same method.
- Logging: when the selected Brewer's method has recipes, the form shows a recipe picker (recipes for that method; bean-tied ones only when that bean is selected, plus bean-less ones). Picking one prefills the form with its targets and links it. Changing values after picking keeps the link (brew = actuals).
- Actual vs target: wherever a brew linked to a recipe is shown in detail (History ledger row expanded / brew row), show the recipe name and per-field deltas vs the recipe (e.g. `yield +2g`, `time −4s`) for fields that differ.
- Promote: "Save as recipe" action on a brew (History row) for espresso/pour-over brews. Opens the recipe form at `/log/recipe?fromBrew=<brewId>` prefilled from the brew's actuals, method, and bean (bean tie on by default, removable). Default name `"<bean name> · 1:<ratio>"`. On save the source brew gets `recipeLocalId` of the new recipe.
- Edit recipe: `/log/recipe?id=<recipeId>`. Edits never rewrite linked brews.
- Delete recipe: allowed; linked brews have `recipeLocalId` cleared (same transaction).
- Deleting a bean: recipes tied to it lose the bean tie (`beanLocalId` cleared), brews behave as today.
- Library gets a third tab **Recipes** (cards: name, method, bean, `dose → brewWeight · 1:x · time · temp`, linked brew count + avg rating).

## #66 Dial-in and insights per bean per method

- All insights (`getBeanBrewInsights`, dial-in state, target/average/best, recent scores, charts) take `(beanId, method)` and only use brews of that method. Rules unchanged otherwise (TOP_RATED_THRESHOLD etc.).
- Default method for a bean = method of that bean's most recent brew. Bean views (Home bean panel, Bean page) show a method switcher only when that bean has brews in >1 method.
- Bean dial-in badges (Library, Home selector) use the bean's most-recent method.
- Recipes do not feed the derived target. Derived best/target stays empirical; recipes are user targets used for prefill. They don't compete.
- Parameter summary uses `brewWeight`; label via config. `flow` only summarised for espresso; `waterTemp` averaged for pour-over; `heat` most-common for moka.
- `recipeLine(brew)` becomes method-aware: espresso `grind 12 · 18g → 36g · 1:2 · 28s · even`; pour-over `grind 20 · 15g → 250g · 1:16.7 · 3:00 · 93°C`; moka `grind 8 · 15g → 100g · 1:6.7 · 4:00 · medium heat`.
- Grind-history strip / "last brew for this bean" suggestions on the form are filtered to the selected method.
- History: method filter chips (All / Espresso / Pour-over / Moka), shown only when >1 method exists in the data. Each ledger row shows a small method label when >1 method exists.

## #67 Schema and non-destructive migration

- Snapshot `schemaVersion: 2`:
  - `machines[]`: `type` removed, `method` (enum, required) added.
  - `brews[]`: `espressoWeight` → `brewWeight`; `method` required; optional `recipeLocalId`, `waterTemp`, `heat`, `notes`.
  - `recipes[]`: new, required array.
  - Relationships validated: brew→bean/machine/recipe, recipe→bean; recipe method ≠ moka; brew.method = recipe.method when linked.
- Shared upgrade `v1 → v2` (same mapping rules as above; brew method = its machine's mapped method, else espresso; `recipes: []`). Implemented in both backend and frontend.
- Backend (`../coffyyy-backend`): `snapshot.schema.ts` becomes v2. `fromStored` upgrades stored v1 snapshots to v2 in memory (persisted on next write). GET always returns v2. PUT accepts v2 only; PUT of v1 → 409-style error "client outdated" (no silent field stripping — note Ajv `removeAdditional` would otherwise drop fields). Regenerate `docs/openapi.json`.
- Frontend:
  - Dexie version 12: `Machines` gets `method` from `type` (delete `type`); `Brews` gets `brewWeight` from `espressoWeight` (delete old), `method` from its machine's mapped method else espresso; new `Recipes` table `++id, localId, method, beanId`; `Brews` index adds `method, recipeId`. Local rows use Dexie ids (`beanId`, `machineId`, `recipeId`) like today.
  - `readLocalSnapshot` emits v2; `replaceLocalSnapshot`, `validateSnapshot`, merge, backup import, enrollment `baseSnapshot` all go through `upgradeSnapshot()` so any v1 input (old backup file, stored base snapshot) is upgraded first.
  - Merge: `recipes` is a merged collection; `keepReferenced` keeps recipes referenced by merged brews and beans referenced by merged recipes.
- Rollout: deploy backend first. Either order is data-safe: new frontend → old backend PUT fails validation (enum [1]); old frontend → new backend GET fails its own v1 check and PUT v1 is rejected. No stripping, no loss.
- New ADR `docs/adr/0003-versioned-snapshot-migrations.md`: snapshots are versioned and upgraded non-destructively; supersedes ADR-0001's "destructive reset acceptable" clause.

## #68 Method-aware brew log form (no prototype; decided directly)

- Brewer picker is first (it picks the method); required. Preselects last-used Brewer as today. If no Brewers exist, prompt to add one (link to `/log/machine`).
- Method shown as a small label next to the picked Brewer.
- Recipe picker row (espresso, pour-over only) under the Brewer/bean pick; "None" default; picking prefills.
- Fields, labels, ranges, presets and visible extras all come from `brewMethods.ts`. Switching Brewer to another method resets dial values to that method's defaults (or the last brew of that bean+method).
- Notes field (optional, collapsed by default) for all methods.
- Brewer form (`/log/machine`): free-text `type` chip replaced by a method segmented control; disabled with a hint when the Brewer has brews.
- All user-facing "Machine" text → "Brewer" (nav/Library tab "Brewers", forms, empty states).

## Out of scope

User-defined methods, other methods, staged pours, moka recipes, SteamCup restyle, Brewer archive, code identifier renames.
