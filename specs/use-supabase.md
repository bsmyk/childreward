---
title: Use Supabase — Postgres persistence + Auth (parent/kid login)
paths:
  - package.json
  - .env.example
  - supabase/schema.sql
  - src/lib/supabase.js
  - src/lib/store.js
  - src/middleware/auth.js
  - src/app.js
  - test/store.test.js
  - test/health.test.js
  - client/src/lib/supabase.js
  - client/src/lib/auth.js
  - client/src/lib/api.js
---

# Goal

Move the backend off file-based JSON persistence onto **Supabase Postgres**, and
add **Supabase Auth** so parents and kids log in with role-based access. This
spec establishes the Supabase *foundation* — schema, server client, auth
middleware, and a thin frontend session/login flow — that the existing
todo/reward specs' routes and pages plug into. It does NOT rebuild those routes
or pages; it replaces the persistence substrate and adds the auth gate.

Stack conventions (honor, do not re-litigate): Node.js, plain CommonJS
(`require`/`module.exports`), Express, Jest + Supertest, no build step on the
backend. Client is the existing React + Vite SPA in `client/`.

# Acceptance criteria

**Persistence**
- `@supabase/supabase-js` is a backend dependency in `package.json`.
- `src/lib/supabase.js` exports a singleton server client built from
  `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (env). Missing env throws a clear
  startup error.
- `src/lib/store.js` is reshaped from sync file-JSON into an **async**,
  Supabase-backed data-access layer (collection helpers: list / get / insert /
  update / remove). The file-JSON read/write implementation is removed; the
  `data/` directory is no longer used.
- `supabase/schema.sql` defines tables `profiles`, `todos`, `rewards`,
  `redemptions` and enables Row Level Security on each (server uses the service
  role key; RLS is defense-in-depth).

**Auth**
- `src/middleware/auth.js` exports `requireAuth` and `requireParent`.
  - `requireAuth` reads `Authorization: Bearer <jwt>`, verifies it via Supabase,
    and attaches `req.user` (`{ id, role }` from `profiles`). Missing/invalid
    token → `401` JSON `{ error }`.
  - `requireParent` runs after `requireAuth` and returns `403` JSON `{ error }`
    when `req.user.role !== 'parent'`.
- A user's role is `'parent'` or `'kid'`, stored in `profiles.role`.
- `src/app.js` wires the middleware so it is available to domain routes;
  `GET /health` stays public and unchanged.

**Frontend**
- `client/src/lib/supabase.js` exports a browser Supabase client from
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
- `client/src/lib/auth.js` exposes `signIn(email, password)`, `signOut()`, and
  `getSession()` / current access token, backed by Supabase Auth.
- `client/src/lib/api.js` attaches `Authorization: Bearer <token>` from the
  current Supabase session to every request; unauthenticated calls still surface
  the existing `ApiError` shape.

**Quality / tests**
- `npm test` passes. The old file-round-trip `test/store.test.js` is replaced
  with tests that exercise the new data-access layer against a **mocked**
  Supabase client (no live network in CI). `test/health.test.js` still passes
  unchanged.
- `.env.example` documents all required env vars (backend + client) with
  placeholder values; real secrets are git-ignored.

# Scope

In scope:
- Backend persistence swap: Supabase server client + reshaped `store.js`.
- SQL schema + RLS for the four tables and the `profiles`/role model.
- Backend auth middleware (`requireAuth`, `requireParent`) and JWT verification.
- Minimal frontend Supabase client, login/session helpers, and bearer-token
  wiring in `api.js`.
- `.env.example` and dependency/config updates.

Out of scope (do NOT build here):
- Rebuilding the `/todos`, `/rewards`, `/balance`, `/redemptions` routes or the
  Rewards/ParentPanel pages — those are defined in their own specs and merely
  consume this substrate. Apply `requireAuth`/`requireParent` to them in their
  own change; here only the middleware and data layer are provided.
- Auth methods beyond email + password (no magic links, OAuth, SSO, or kid-PIN
  flows). Kids are Supabase Auth users with role `kid`.
- Self-serve signup UI, password reset, email verification flows.
- Hosting/provisioning the Supabase project, migrations tooling, or seed data
  beyond `schema.sql`.
- Realtime, storage, edge functions.

# The change

**`package.json`** — add `@supabase/supabase-js` to `dependencies`. Update
`description` to reflect Supabase-backed persistence.

**`.env.example`** — document backend (`SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) and client (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) variables. Ensure `.env*` is git-ignored.

**`supabase/schema.sql`** — DDL for:
- `profiles` — `id uuid primary key references auth.users(id)`,
  `role text not null check (role in ('parent','kid'))`, `display_name text`,
  `family_id uuid`, `stars int not null default 0` (kid balance).
- `todos` — `id uuid default gen_random_uuid() primary key`, `title text`,
  `done boolean default false`, owner/`family_id`, timestamps.
- `rewards` — `id`, `name text`, `icon text`, `cost int`, `family_id`.
- `redemptions` — `id`, `reward_id references rewards`, `profile_id references
  profiles`, `created_at timestamptz default now()`.
- `alter table ... enable row level security` on all four.

**`src/lib/supabase.js`** — create and export a single
`createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` instance; throw a clear
error if either env var is absent.

**`src/lib/store.js`** — replace the file-JSON internals with an async
data-access layer over Supabase. Provide thin collection helpers used by domain
routes (e.g. `list(table, filter)`, `getById(table, id)`, `insert(table, row)`,
`update(table, id, changes)`, `remove(table, id)`), each returning parsed rows /
throwing on error. Remove `resolvePath`/`DATA_DIR` and the `data/` dir usage.

**`src/middleware/auth.js`** — `requireAuth` verifies the bearer JWT via the
Supabase client (`auth.getUser(token)`), loads the matching `profiles` row, and
sets `req.user = { id, role, family_id }`; `401` on failure. `requireParent`
gates on `role === 'parent'` with `403` otherwise. Export both.

**`src/app.js`** — import the middleware and make it available for domain routes
(no behavior change to `GET /health`, which stays public). Keep the app factory
export shape intact for Supertest.

**`client/src/lib/supabase.js`** — export a browser client from the `VITE_`
anon-key env vars.

**`client/src/lib/auth.js`** — `signIn` / `signOut` / `getSession` (and a helper
to read the current access token) wrapping Supabase Auth.

**`client/src/lib/api.js`** — in `request(...)`, read the current session token
from `auth.js` and set `Authorization: Bearer <token>` when present; preserve the
existing `ApiError` behavior and all current exported functions.

**Tests** — replace `test/store.test.js` with unit tests that mock the Supabase
client and assert the data-access helpers issue the right queries and surface
errors. Leave `test/health.test.js` green.
