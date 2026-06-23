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

This project didn't have a backend for the initial release and I used the browser's IndexedDB to store data locally, using Dexie's IndexedDB wrapper, and its custom React hooks.
I'm actively building the backend, porting the database to the cloud, hosted on [Railway](https://railway.app/), using [Supabase](https://supabase.com/) as the database provider.
(-> [Backend](https://github.com/Zepyyy/Coffyyy-backend/))

Stack:
- NestJS
- Swagger UI ([nestjs/swagger](https://github.com/nestjs/swagger)) (API documentation)
- Prisma ORM ([prisma](https://github.com/prisma/prisma)) (data modeling and database access)
- PostgreSQL (hosted on [Supabase](https://supabase.com/))

## Current State
The backend is in active development and will be connected soon. For the moment, IndexedDB powers the app, so clearing browser storage will remove local data.
Suggestions in the log forms are generated from previously saved beans and machines.
- No automated test runner is configured yet.
- The `History` page and the per-bean detail view (`/beans/:BeanId`) are early scaffolds, not finished screens.
- Home-screen charts are wired to live brew data and are the most developed of the insight views.

## Roadmap
- [x] Fully local IndexedDB implementation
- [x] Landing page with basic navigation
- [x] Dashboard connected to live data, showing charts and recent brews.
- [ ] Full backend API integration with cloud-based database
- [ ] The [/history page](https://coffyyy.quentinstubecki.fr/history/) fully designed and implemented.
- [ ] Syncing feature to sync data between devices, without an auth. (Code-based?) <- To be decided

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
  contexts/       Theme context
  db/             Dexie database (db.ts) and CRUD helpers (crud/)
  hooks/          Shared hook types plus api/ live-query hooks backed by Dexie
  lib/api/        Read/query helpers for beans, brews, machines, stats
  pages/          Route components (incl. log/ subroutes)
  providers/      App-level providers (theme, etc.)
  types/          Shared TypeScript models (Bean, Brew, Machine)
```

`@/` is aliased to `src/`.

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
