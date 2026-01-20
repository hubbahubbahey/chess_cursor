# Repository Guidelines

## Project Structure & Module Organization

- `src/` holds the React renderer code (`App.tsx`, `main.tsx`), shared utilities in `src/lib/`, Zustand stores in `src/stores/`, and UI in `src/components/`.
- `electron/` contains the main process and IPC bridge (`main.ts`, `preload.ts`) plus the local JSON data store in `database.ts`.
- `index.html` is the Vite entry for the renderer.
- Build outputs land in `dist/`, `dist-electron/`, and packaged artifacts in `release/` (from `electron-builder`).

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server for the renderer.
- `npm run electron:dev` runs the Electron app in dev (renderer served by Vite).
- `npm run build` runs `tsc`, builds the renderer, and packages the app.
- `npm run electron:build` builds the renderer and packages the Electron app.
- `npm run preview` serves the production renderer build locally.

## Coding Style & Naming Conventions

- TypeScript + React (TSX) with Tailwind CSS classes in JSX.
- Indentation: 2 spaces; strings prefer single quotes; no semicolons (match existing files).
- Component files use `PascalCase` and live in `src/components/`. Hooks use `useX` and stores live in `src/stores/`.
- There is no configured formatter or linter; keep changes consistent with the surrounding style.

## Testing Guidelines

- No test framework or `test` script is currently configured.
- If you add tests, introduce a runner (e.g., Vitest or Jest), add an `npm run test` script, and place tests under `src/**/__tests__/` or as `*.test.ts(x)`.

## Commit & Pull Request Guidelines

- No Git history is available in this workspace. Use short, imperative messages and prefer Conventional Commits (e.g., `feat: add opening filters`).
- PRs should include a concise summary, verification steps (commands), and screenshots/GIFs for UI changes. Link related issues when applicable.

## Configuration & Data

- Local data is stored as JSON under Electron user data; see `electron/database.ts` for schema and seed data.
- If you change the data shape or seed content, update the initialization logic and note any data reset impact.
