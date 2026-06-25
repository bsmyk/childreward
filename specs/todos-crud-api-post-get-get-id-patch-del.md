---
title: Todos CRUD API — file-backed, with centralized 400/404 errors
paths:
  - src/app.js
  - src/routes/todos.js
  - src/lib/store.js
  - src/lib/errors.js
  - test/todos.test.js
---

# Goal

Add a complete Todos REST API on top of the existing Express + Jest scaffold:
the five CRUD routes (`POST /todos`, `GET /todos`, `GET /todos/:id`,
`PATCH /todos/:id`, `DELETE /todos/:id`), persisted to a JSON file via the
existing `src/lib/store.js`. Input validation surfaces a consistent `400`
response and missing resources surface a consistent `404`, both produced by one
centralized error path (not ad-hoc per route).

Stack conventions (honor, do not re-litigate): Node.js, plain CommonJS
(`require`/`module.exports`), Express, Jest + Supertest. No build step, no
TypeScript. Synchronous file persistence via `store.read`/`store.write` is fine.

# Acceptance criteria

- **Create** — `POST /todos` with a valid body returns `201` and the created
  todo `{ id, title, done, createdAt }`. The todo is persisted (survives a
  fresh read from disk).
- **List** — `GET /todos` returns `200` with an array of all todos (`[]` when
  none exist).
- **Read one** — `GET /todos/:id` returns `200` with the matching todo, or `404`
  when no todo has that id.
- **Update** — `PATCH /todos/:id` with a valid partial body (`title` and/or
  `done`) returns `200` with the updated todo; `404` when the id is unknown.
- **Delete** — `DELETE /todos/:id` returns `204` with no body when it removed a
  todo; `404` when the id is unknown. The todo no longer appears in `GET /todos`.
- **Validation (400)** — Invalid input is rejected with `400` and the
  centralized error body before any persistence happens. At minimum:
  - `POST` with missing/blank/non-string `title` → `400`.
  - `PATCH` with no updatable fields, or `title` non-string/blank, or `done`
    non-boolean → `400`.
- **Centralized error shape** — All `400` and `404` responses share one JSON
  shape, e.g. `{ "error": { "code": "<machine_code>", "message": "<human text>" } }`,
  emitted from a single error-handling middleware (routes `throw`/`next(err)`
  rather than hand-rolling each response).
- **Tests** — `test/todos.test.js` covers each route's happy path plus one test
  per error case (validation `400`s and not-found `404`s). `npm test` passes,
  including the existing `/health` and store tests.

# Scope

In scope:
- The five `/todos` routes, mounted on the existing app from `src/app.js`.
- A todos route module and a small validation step for create/update.
- A centralized Express error-handling middleware and a tiny error helper for
  raising typed `400`/`404` errors.
- File persistence of todos through the existing `store` helper.
- Jest + Supertest tests for happy paths and every error case.

Out of scope:
- Auth, pagination, filtering, sorting, partial-response shaping.
- A database engine (persistence stays a single JSON file via `store`).
- Frontend / static serving (the `client/` SPA consumes this API separately).
- Rewards, balance, redemptions, or any non-todo domain.

# The change

**`src/lib/errors.js`** (new) — a tiny helper for typed HTTP errors. Export an
`HttpError` (carrying `status`, `code`, `message`) plus convenience
constructors, e.g. `badRequest(code, message)` → 400 and `notFound(message)` →
404. Routes throw these; the central handler renders them.

**`src/routes/todos.js`** (new) — an `express.Router()` implementing:
- `POST /` — validate body, create `{ id, title, done: false, createdAt }`,
  append via `store`, respond `201`.
- `GET /` — respond `200` with the full array.
- `GET /:id` — find by id or throw `notFound`; respond `200`.
- `PATCH /:id` — validate partial body, find-or-`notFound`, merge `title`/`done`,
  persist, respond `200`.
- `DELETE /:id` — find-or-`notFound`, remove, persist, respond `204` (no body).
- Validation rejects bad input with `badRequest(...)` before any write.
- `id` generation: a stable unique id (e.g. incrementing integer or random
  string) — pick one and keep it consistent; `:id` lookups compare as strings.
- Persistence: read/write a single `todos.json` through `src/lib/store.js`
  (default `data/` location, already git-ignored).

**`src/app.js`** (edit) — keep `GET /health`; mount the todos router at
`/todos`; register the centralized error-handling middleware
`(err, req, res, next)` LAST. The handler maps `HttpError` →
`res.status(err.status).json({ error: { code, message } })`, and any unexpected
error → `500` with the same shape. Unknown routes continue to `404` (Express
default is acceptable, or normalize to the shared shape).

**`test/todos.test.js`** (new) — import the app via Supertest (no live socket).
Cover: create→list→read→update→delete happy paths; `POST`/`PATCH` validation
`400`s; `GET`/`PATCH`/`DELETE` not-found `404`s. Isolate persistence per test
(point the store at a temp file/dir, as `test/store.test.js` does) so runs don't
leak state.
