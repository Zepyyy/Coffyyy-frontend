# Repository Guidelines

## Project Structure & Module Organization
- `src/main.tsx` bootstraps the app; `src/App.tsx` is the top-level UI shell.
- Feature UI lives under `src/components/`, with shared primitives in `src/components/ui/` (shadcn-based).
- State/theme wiring sits in `src/contexts/` and `src/providers/`.
- Client storage is handled in `src/db/` (Dexie).
- Shared helpers belong in `src/lib/` and type definitions in `src/types/`.
- Global styles and Tailwind setup are in `src/index.css`.

## Build, Test, and Development Commands
- `npm run dev`: start Vite dev server with HMR.
- `npm run build`: typecheck (`tsc -b`) then build for production.
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint across the repo.
- `npm run biome`: format `./src` using Biome (via `bunx`).

## Coding Style & Naming Conventions
- TypeScript + React (Vite) with Tailwind CSS utilities in JSX.
- Prefer functional components and hooks; name components in `PascalCase` and hooks in `useCamelCase`.
- Keep files in `PascalCase.tsx` for components and `camelCase.ts` for utilities.
- Run `npm run biome` before committing to keep formatting consistent.

## Testing Guidelines
- No test runner is configured yet. If you add tests, document the framework and add a script in `package.json`.
- Suggested convention: `src/**/__tests__/*.test.ts(x)` or `*.spec.ts(x)`.

## Commit & Pull Request Guidelines
- Current git history is informal and doesn’t follow a strict convention. Prefer short, imperative messages (e.g., “Add theme toggle”).
- PRs should include:
  - A concise description of what changed and why.
  - Linked issues if applicable.
  - UI screenshots or GIFs for visual changes (before/after when helpful).

## Security & Configuration Tips
- Do not commit secrets; store local config in `.env` files and keep them out of git.
- If you add env vars, document them in `README.md` and consider adding an `.env.example`.
