# Repository Guidelines

## Project Structure & Module Organization
- `src/main.jsx` boots the React tree and loads router config from `src/routes/AppRoutes.jsx`.
- Top level views live in `src/views/`; align new routes with component file names (e.g. `Home.jsx`).
- Reusable UI and auth widgets go in `src/components/`; keep stateful logic colocated.
- Global auth/session logic sits in `src/contexts/AuthContext.jsx`; extend context providers instead of prop drilling.
- API helpers in `src/api.js` centralize all backend calls and expect `VITE_API_URL` to be defined.

## Build, Test, and Development Commands
- `npm install` — install dependencies; run after pulling new packages.
- `npm run dev` — start the Vite dev server on `http://localhost:5173` with fast refresh.
- `npm run build` — generate the production bundle in `dist/`; run before shipping.
- `npm run preview` — serve the built assets locally to validate production behaviour.
- `npm run lint` — execute ESLint with React Hooks/Refresh plugins; resolve all warnings before pushing.

## Coding Style & Naming Conventions
- Follow ESLint defaults plus repo overrides (no unused vars unless all caps, React Hooks rules enforced).
- Use 2-space indentation, trailing commas where valid, and single quotes in JSX/JS for consistency.
- Name React components and contexts in PascalCase, hooks in camelCase prefixed with `use`, assets in kebab-case.
- Co-locate component styles; prefer inline styles for animated elements as the current codebase demonstrates.

## Testing Guidelines
- No automated suite yet; when adding features, include Vitest/react-testing-library scaffolding under `src/__tests__/`.
- Mirror component file names in test filenames (`ComponentName.test.jsx`) and cover hooks and context edge cases.
- Document any manual QA steps (routes exercised, auth flows, responsive checks) in the PR description.

## Commit & Pull Request Guidelines
- Use short, imperative commit subjects (≤72 chars) and group related changes; include Spanish context if helpful.
- Reference issues or tasks with `#id` in either the commit body or PR when applicable.
- PRs should explain scope, screenshots or recordings for UI changes, updated env requirements, and test evidence (`npm run lint` output).
- Keep PRs focused on a single feature or fix to simplify review.

## Environment & Integration Notes
- Copy `.env` → `.env.local` when customising; ensure `VITE_API_URL` targets the correct backend.
- Never commit secrets; rely on Vite `import.meta.env` for runtime configuration and add new keys to `.env.example`.
- Validate Spotify flows by exercising `LoginPrompt` and `SpotifyCallback` routes; verify refresh token paths via `src/api.js`.
