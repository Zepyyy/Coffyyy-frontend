# Coffyyy

A personal passion project for coffee enthusiasts (me). It's a coffee journaling app that helps you track your espresso brews and keep in mind the setting that worked best. It also serves as a library of beans with relevant information about its origin, process, roast level, and tasting notes.

<img src="./src/assets/Landing.jpg" alt="Landing page sreenshot" />

## Why does it exist ?

I started this project to get started down the rabbit hole of coffee brewing and learn more about the coffee brewing process. As a complete beginner, I wanted to build something that could help me understand the relationship between my machine's settings and the type of bean I was using. I wanted to create my own personal coffee app, with my vision and design in mind. 

## Features

Currently, the only metrics are the grind size, and user's direct feedback on the brew using a strength and bitterness rating (-5 to +5).
A more elaborate dashboard and statistics will be added in the future to understand the user's bean preferences and brew history.
<p align="center">
  <img src="./src/assets/Feedback-rating.jpg" alt="Feedback-rating" width="800" />
  <img src="./src/assets/Chart.jpg" alt="Chart" width="800" />
</p>

## Stack & technical choices

I used a modern stack with React and Vite for the frontend, and NestJS for the backend. This stack is modern, fast and is something I feel comfortable with and enjoy using.


### Frontend

Most of the frontend is built with React and Vite, using Tailwind CSS for styling. I'm using React's state management hooks to manage the application state.
Hosted on [Vercel](https://vercel.com/)

Stack:
- React 19 + Typescript
- Vite 7
- Tailwind CSS 4 (with `tw-animate-css`)
- Recharts for data visualization
- Shadcn UI ([shadcn/ui](https://github.com/shadcn/ui)) (component library)


### Backend

The initial release was local-only: the browser's IndexedDB stored application data through [Dexie](https://dexie.org/) and custom React hooks. The cloud architecture is now being introduced incrementally through the [Coffyyy backend](https://github.com/Zepyyy/Coffyyy-backend/).

The frontend communicates only with the NestJS API hosted on [Railway](https://railway.app/). NestJS uses Prisma to access the PostgreSQL database hosted on [Supabase](https://supabase.com/), which remains private behind the backend. Frontend code must not use `supabase-js`, Supabase service keys, or the Supabase Data API directly.

Stack:
- NestJS
- Swagger UI ([nestjs/swagger](https://github.com/nestjs/swagger)) (API documentation)
- Prisma ORM ([prisma](https://github.com/prisma/prisma)) (data modeling and database access)
- PostgreSQL (hosted on [Supabase](https://supabase.com/))

## Current State
The app remains local-first and can be used without an account or password. IndexedDB currently powers the app, so clearing browser storage will remove local data until sync is enabled.

Issue #10 Phase 1.5 is complete on backend `dev`: Railway staging commit `c665d917` passes cookie-session, CSRF, pairing, revocation, import-idempotency, expiry, and rate-limit checks. Backend `master` remains separate for production.

The frontend foundation is in place: cookie-session bootstrap, CSRF-aware API requests, global unauthorized handling, React Query adapters, and a local-first sync panel. End-to-end import, remote hydration, data-layer completion, and offline reconciliation remain WIP.

Suggestions in the log forms are generated from previously saved beans and machines.
- Vitest covers the offline outbox/push seams (`npm test`).
- The `History` page and the per-bean detail view (`/beans/:BeanId`) are early scaffolds, not finished screens.
- Home-screen charts are wired to live brew data and are the most developed of the insight views.

## Roadmap
- [x] Fully local IndexedDB implementation
- [x] Landing page with basic navigation
- [x] Dashboard connected to live data, showing charts and recent brews.
- [x] Issue #10 Phase 1: backend contract and security on backend `dev`
- [x] Issue #10 Phase 1.5: Railway staging deployment and verification
- [ ] Issue #10 Phase 2: frontend enable-sync and connect-existing-data flows
- [ ] Issue #10 Phase 3: complete the frontend data-layer boundary (PR #14 is partial groundwork)
- [ ] Issue #10 Phase 4: define offline cache/outbox, conflict, retry, and reconnect behavior
- [ ] Issue #10 Phase 5: verification, Railway deployment, rollout, and cleanup
- [ ] The [/history page](https://coffyyy.quentinstubecki.fr/history/) fully designed and implemented.

The migration remains a work in progress. See [Issue #10](https://github.com/Zepyyy/Coffyyy-frontend/issues/10) for the detailed plan, implementation status, branch workflow, and acceptance criteria.

## Cloud sync model

Cloud sync is optional; local-only use remains the default. A user does not need a traditional account or password to use Coffyyy.

- **Enable sync:** the planned flow backs up and previews local data, imports it through the backend, verifies canonical records, then hydrates Dexie before switching modes. The current foundation does not complete this flow.
- **Connect existing data:** the planned flow pairs through a sync code, confirms replacement of non-empty local data, downloads the workspace, and hydrates Dexie transactionally. The current foundation does not complete this flow.
- **Session security:** authenticated requests use a server-managed `Secure`, `HttpOnly`, `SameSite` cookie session with server-side expiry and revocation. CSRF protection and rate limiting apply to cookie-authenticated mutations.
- **Browser storage:** JWTs, sync codes, and Supabase credentials are never stored in LocalStorage. Dexie remains local storage for local-only use; the synced-workspace cache/outbox and reconciliation contract remain Phase 4 work.

## App Routes

- `/` redirects to `/home`
- `/home`: dashboard with quick actions, brew stats, charts, and recent brews
- `/log`: bean logging form (default logging entry point)
- `/log/brew`: multi-step brew form
- `/log/bean`: bean catalog form
- `/log/machine`: equipment form
- `/library`: searchable bean and machine library
- `/beans/:BeanId`: detail view for a single bean
- `/history`: brew history view (work in progress)
- Legacy paths (`/brew`, `/machines`, `/database`, `/stats`, `/workflows/*`) redirect to their current locations
- Anything unmatched falls through to a catch-all (404) page

## Project Structure

```text
src/
  components/     Feature-grouped UI: home/, library/, log/, history/, ui/ (+ Header nav)
  contexts/       Theme and sync-session contexts
  db/             Dexie database (db.ts) and local-cache CRUD helpers (crud/)
  hooks/          Shared hook types plus current live-query hooks and future API query hooks
  lib/api/        Data-layer adapters for beans, brews, machines, and stats
  pages/          Route components (incl. log/ subroutes)
  providers/      App-level providers (theme, query, sync session)
  types/          Shared TypeScript models (Bean, Brew, Machine)
```

`@/` is aliased to `src/`.

During the migration, components are being separated from persistence. Components should use the data-layer adapters and query/mutation hooks rather than calling Dexie directly. Dexie and its CRUD helpers remain behind the local-cache infrastructure; the synced-workspace cache, outbox, and reconciliation engine are not complete.

## Getting Started

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## Scripts

- `npm run dev` starts the development server.
- `npm run build` type-checks and builds the production bundle.
- `npm run preview` serves the built app locally.
- `npm run lint` runs ESLint.
- `npm run biome` formats `src/` with Biome.

Note: `npm run biome` uses `bunx`, so Bun must be installed even if you use npm for the rest of the project.

## Data Model

The app stores three main records:

- `Beans`: catalog metadata such as brand, origin, process, roast level, and flavor profile
- `Machines`: equipment metadata such as brand, model, type, grind range, and capacity
- `Brews`: shot-level logs including bean, machine, weights, grind size, time, flow, date, and rating
