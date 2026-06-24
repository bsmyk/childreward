---
title: Client scaffold — React + Vite SPA in client/ with dev proxy and prod static serving
paths:
  - client/package.json
  - client/vite.config.js
  - client/index.html
  - client/src/main.jsx
  - client/src/App.jsx
  - client/src/api/client.js
  - src/app.js
  - .gitignore
---

# Goal

Stand up the frontend skeleton every future UI feature builds on: a React + Vite
single-page app living in `client/`, wired to the existing Express API two ways —
a **dev proxy** (Vite dev server forwards API calls to Express) and **production
static serving** (Express serves the built SPA on the same origin) — plus a single
**shared API client** module that all UI code uses to talk to the backend.

This is the scaffold only. It proves the wiring end-to-end (the app shell fetches
`GET /health` through the shared client and renders the result). No todo UI, no
domain screens.

Decided conventions (honor, do not re-litigate):
- React + Vite SPA in a `client/` workspace. The build step and node tooling this
  adds are accepted and scoped to `client/` — the backend stays no-build, plain
  CommonJS.
- The SPA and the API are served same-origin in production, so the API client uses
  **relative paths**; the Vite proxy makes those same paths work in dev.

# Acceptance criteria

- `cd client && npm install` succeeds with React + Vite declared as `client/`'s own
  dependencies/devDependencies (isolated from the root `package.json`).
- `cd client && npm run dev` starts the Vite dev server, and requests the app makes
  to API paths are proxied to the Express server at `http://localhost:3000` (no CORS,
  no hardcoded absolute backend URL in app code).
- `cd client && npm run build` produces a static bundle at `client/dist/`
  (`index.html` + hashed assets).
- With a build present, starting the backend (`npm start`) serves the SPA:
  - `GET /` returns the SPA `index.html` (HTTP 200, `text/html`).
  - Client-side routes (unknown non-API GET paths) fall back to `index.html` so deep
    links load the SPA rather than 404.
  - Existing API routes still work and still return JSON — `GET /health` returns
    `200 { "status": "ok" }` and is NOT shadowed by the SPA fallback.
- When no build is present (`client/dist/` absent, e.g. fresh checkout / test runs),
  the backend boots normally and the existing API + Jest suite are unaffected (no
  crash from a missing dist directory).
- A single shared API client module exists under `client/src/api/` and is the only
  place that calls `fetch`; the app shell uses it to load `/health`.
- `client/node_modules/` and `client/dist/` are git-ignored.

# Scope

In scope:
- `client/` Vite + React project: `package.json`, `vite.config.js`, `index.html`,
  entry (`src/main.jsx`), root component (`src/App.jsx`).
- Shared API client module (`client/src/api/client.js`).
- Vite dev-server proxy config pointing at the Express backend.
- Express change to serve `client/dist/` statically with SPA fallback, guarded so it
  is a no-op when the build is absent and never shadows API routes.
- `.gitignore` additions.

Out of scope:
- Any todo/domain UI, routing library, state management, styling system beyond a
  minimal app shell.
- New backend endpoints (the scaffold consumes only the existing `GET /health`).
- Auth, SSR, CI/build orchestration, root-level scripts to build the client.
- TypeScript anywhere (backend stays CommonJS; client uses plain JS/JSX).
- Backend test changes beyond ensuring the static-serving guard doesn't break the
  existing suite.

# The change

**`client/package.json`** — standalone npm project for the SPA. `react` +
`react-dom` as dependencies; `vite` + `@vitejs/plugin-react` as devDependencies.
Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`.
Independent from the root `package.json` (the backend does not depend on it).

**`client/vite.config.js`** — enable the React plugin. Configure
`server.proxy` so the API paths the client uses are forwarded to
`http://localhost:3000` in dev (target the existing backend; `changeOrigin: true`).
Build output goes to the default `client/dist/`. Use a clear, documented path
convention for what gets proxied (e.g. proxy `/health` and reserve a prefix such as
`/api`/the probe routes for future endpoints) so dev and prod resolve the same
relative URLs.

**`client/index.html`** — Vite entry HTML with a `<div id="root">` mount point and a
module `<script>` referencing `src/main.jsx`.

**`client/src/main.jsx`** — React entry: create the root and render `<App />` into
`#root`.

**`client/src/App.jsx`** — minimal app shell that, on mount, calls the shared API
client to fetch `/health` and renders the returned status (a visible "API: ok" type
indicator). Proves the full dev-proxy + API-client path works.

**`client/src/api/client.js`** — the single shared API client. Wrap `fetch` with:
a relative base (same-origin; optionally overridable via a `VITE_API_BASE` env var
defaulting to `''`), JSON request/response handling, and basic non-2xx → thrown
error behavior. Export small helpers (e.g. `get(path)`, and room for
`post`/`patch`/`del` later) plus a named `health()` convenience. All UI code imports
from here; no `fetch` calls live in components.

**`src/app.js`** — after the API routes are registered, add production static
serving for the SPA:
- Resolve `client/dist/` relative to the repo root. If it does NOT exist, skip
  entirely (keep current behavior, including JSON/Express 404s for unknown routes and
  a green Jest run).
- If it exists: serve it via `express.static(distDir)` for asset requests, and add a
  catch-all GET handler that returns `client/dist/index.html` for non-API,
  non-file requests (SPA deep-link fallback).
- Ordering guarantees API routes win: `GET /health` (and future API routes) are
  registered before the static/fallback middleware, so they keep returning JSON and
  are never replaced by `index.html`.

**`.gitignore`** — add `client/node_modules/` and `client/dist/`.
