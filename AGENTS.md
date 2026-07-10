# Repository Guidelines

Coffyyy is a **client-side, offline-first espresso journal**: a Vite + React 19 + TypeScript single-page app with **no backend**. All data lives in the browser's IndexedDB database named `Coffyyy`, accessed through Dexie. There are no network calls for app data and no server code in this repo.

## Build, Test, and Development Commands
- `npm run dev` — start the Vite dev server with HMR.
- `npm run build` — type-check with `tsc -b`, then produce a production build.
- `npm run preview` — serve the built bundle locally.
- `npm run lint` — run ESLint across the repo.
- `npm run biome` — format `src/` and organize imports with Biome. **This uses `bunx`, so Bun must be installed** even if you otherwise use npm.

Before opening a PR, at minimum run `npm run build` and `npm run lint`. There is no automated test runner configured yet.

## Project Structure & Module Organization
`src/main.tsx` boots the app, defines all routes (`react-router` v7, `BrowserRouter`), and wraps everything in `Providers`. `src/App.tsx` is the route shell: the sticky header, nav links, theme toggle, and an `<Outlet />`.

```text
src/
  components/   Feature-grouped UI: home/, library/, log/, history/, ui/
  contexts/     ThemeContext
  providers/    Providers.tsx (theme state + localStorage), ThemeProvider.tsx
  db/           db.ts (Dexie schema + versions) and crud/ (mutations)
  lib/api/      Read/query helpers (pure async functions over Dexie)
  lib/          Shared utilities: utils.ts, defaults.ts, formValidation.ts
  hooks/api/    useLiveQuery hooks wrapping lib/api
  hooks/types.ts  Hook-local types
  pages/        Route components, incl. log/ multi-step forms
  types/        Shared models: BeanTypes.tsx, BrewTypes.tsx, MachineTypes.tsx
```

`@/` is aliased to `src/` (configured in `vite.config.ts`, `tsconfig.app.json`, and `components.json`). Always import with `@/...`, not long relative paths.

## Data Layer Architecture (important)
The data flow is **strictly layered** — follow it when adding features:

1. **`src/db/db.ts`** — the single Dexie instance and its versioned schema. Three tables: `Beans`, `Machines`, `Brews`, all with numeric auto-increment `id` (`++id`).
2. **`src/db/crud/`** — all **mutations** (`add.ts`, `update.ts`, `delete.ts`, `get.ts`). `add*` helpers guard against duplicate names; `addRandom*` / `addRandomBrewsInsights` seed fake data for development.
3. **`src/lib/api/`** — **read/query** helpers as plain async functions (`beans.ts`, `brews.ts`, `machines.ts`, `stats.ts`, `utils.ts`). These hold the query and derivation logic (averages, dial-in state, suggestions).
4. **`src/hooks/api/`** — thin React hooks that wrap `lib/api` functions in `useLiveQuery` (from `dexie-react-hooks`) so components re-render reactively on DB changes. Each hook supplies a sensible fallback (`?? []`, `?? undefined`, `?? 0`).
5. **Components/pages** consume the hooks. Do not call Dexie directly from a component.

**Schema changes are append-only.** When the shape of a table changes, add a new `db.version(N).stores({...})` block — never edit an existing version. The current schema is **version 5**.

Gotcha: `Brews` records reference beans/machines via `beanId` / `machineId`, but the Dexie index strings still name `bean` / `machine`. Because of this, bean-scoped brew queries use full-scan `.filter((b) => b.beanId === id)` rather than indexed `.where()` lookups (see `lib/api/stats.ts`). Keep that in mind before assuming an index exists.

## Coding Style & Naming Conventions
- TypeScript React function components and hooks only.
- **Formatting is Biome's job**: tabs for indentation, double quotes in JS/TS. Run `npm run biome` before committing. Biome lints `src/` **except `src/components/ui/`** (shadcn primitives are excluded) and ignores `.css`, `.json`, `.md`, `.js`.
- Naming: components and page files `PascalCase.tsx`; hooks `useCamelCase.ts`; utilities and api helpers `camelCase.ts`. Shared type modules live in `src/types/*.tsx` (they carry the `.tsx` extension by convention even though they hold no JSX).
- Prefer Tailwind utility classes in JSX. Use the `cn()` helper (`@/lib/utils`) to merge conditional classes.
- TypeScript is strict: `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` are on. Use `import type` for type-only imports.

## UI, Theme & Styling
- shadcn ("new-york" style, neutral base, CSS variables) provides primitives in `src/components/ui/`. Add new primitives there rather than duplicating patterns; don't hand-edit them to fail lint.
- Tailwind CSS 4 is configured entirely in `src/index.css` via `@theme inline` (there is no `tailwind.config`). Custom font families are exposed as utilities like `font-News`, `font-Mono`, `font-Crimson`, etc. Icons come from `lucide-react`; charts from `recharts`.
- **Dominant-note color system**: `colorSwatch` in `src/lib/utils.ts` maps each bean `dominantNote` to a coordinated set of Tailwind tag classes and CSS-variable values. Reuse it for note-colored UI instead of inventing colors.
- Theme is light/dark via the `.dark` variant. State lives in `Providers.tsx` (persisted to `localStorage` under `"theme"`) and is exposed through `useTheme()` from `@/contexts/ThemeContext`.

## Domain Conventions
- Three core models live in `src/types/`: `Beans`, `Machines`, `Brews`, each paired with `*Form`, `*Suggestions`, and `*Filters` helper types.
- **Suggestions** in the log forms are derived from previously saved records (see `getBeanSuggestions`, deduped/sorted via `uniqueSorted`), not hardcoded — except seed lists in `src/lib/defaults.ts` (`DEFAULT_*`) used as form fallbacks, plus weight clamps (`MIN/MAX_*_WEIGHT`, `DIAL_DEFAULT_*`).
- Brews carry `tasteScore` and `strengthScore`, each on a **−5…+5** scale where 0 is balanced (negative = sour/weak, positive = bitter/strong). Derived insights (dial-in state, target dial, recent scores) are computed in `lib/api/stats.ts`.
- Multi-step brew logging is driven by the `STEPS` array in `src/lib/utils.ts`. Required-field validation uses `validateRequiredFields` from `src/lib/formValidation.ts`.

## Routing
Routes are declared in `src/main.tsx`. `/` redirects to `/home`. Primary routes: `/home`, `/library`, `/history`, `/log` (default = bean form), `/log/brew`, `/log/bean`, `/log/machine`, and `/beans/:BeanId`. Several legacy paths (`/brew`, `/machines`, `/database`, `/stats`, `/workflows/*`) `<Navigate>`-redirect to current locations; unmatched paths fall through to `CatchAll` (404). The `History` page and `/beans/:BeanId` detail view are early scaffolds.

## Commit & Pull Request Guidelines
Keep commit messages brief, imperative, and specific (e.g. `Add brew stats hook`, `Fix log card spacing`). PRs should explain what changed and why, link relevant issues, and attach screenshots or GIFs for UI changes. Run `npm run build`, `npm run lint`, and `npm run biome` before pushing.

## Security & Configuration
Do not commit secrets. Keep local config in untracked `.env` files; document any new environment variable in `README.md` and add an `.env.example` when appropriate. Remember all user data is local to the browser — clearing IndexedDB wipes it.
