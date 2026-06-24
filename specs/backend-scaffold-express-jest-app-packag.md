---
title: Backend scaffold — Express + Jest app with file-based JSON persistence
paths:
  - package.json
  - src/app.js
  - src/server.js
  - src/lib/store.js
  - test/health.test.js
  - .gitignore
---

# Goal

Stand up the minimal backend skeleton every future feature builds on: a runnable
Express app exposing `GET /health`, a Jest test harness, and a reusable
file-based JSON persistence helper. No business domain yet — just the scaffold.

Stack conventions (honor, do not re-litigate): Node.js, plain CommonJS
(`require`/`module.exports`), Express, Jest + Supertest. No build step, no
TypeScript, no transpiler.

# Acceptance criteria

- `npm install` succeeds with only `express` (dep) and `jest` + `supertest`
  (devDeps) declared.
- `npm start` boots the server on `PORT` (env, default `3000`) and logs the
  listening port.
- `npm test` runs Jest and passes.
- `GET /health` returns HTTP `200` with JSON body `{ "status": "ok" }` and
  `Content-Type: application/json`.
- `test/health.test.js` asserts the above by importing the app (not a live
  socket) via Supertest.
- The store helper persists/loads JSON to a file and round-trips data across
  process restarts; its directory is created on first write if absent.
- Unknown routes return `404` (Express default is acceptable).

# Scope

In scope:
- `package.json` with `start` and `test` scripts and the deps above.
- Express app factory and a thin server entrypoint.
- `GET /health` route.
- A file-based JSON persistence helper (`src/lib/store.js`).
- One Jest test covering `/health`.
- `.gitignore` for `node_modules/` and the runtime data file/dir.

Out of scope:
- Any domain endpoints (todos, docs, etc.).
- Validation, centralized error handling, auth, logging middleware.
- Database engines; persistence is a single JSON file on disk.
- Frontend / static serving.

# The change

**`package.json`**
- `name`, `version`, `description` reflecting an Express JSON API.
- `main`: `src/server.js`.
- Scripts: `"start": "node src/server.js"`, `"test": "jest"`.
- `dependencies`: `express`. `devDependencies`: `jest`, `supertest`.

**`src/app.js`** — export an Express app factory (or configured `app` instance)
so tests can import it without binding a port. Registers `GET /health` →
`res.json({ status: 'ok' })`. `module.exports` the app.

**`src/server.js`** — `require` the app, call `app.listen(process.env.PORT || 3000)`,
log the listening port. This is the only file that opens a socket.

**`src/lib/store.js`** — file-based JSON persistence helper. Minimal surface:
- `read(file)` → parsed JSON, or a sensible empty default (e.g. `[]` or `{}`)
  when the file does not exist yet.
- `write(file, data)` → serialize `data` as JSON to `file`, creating the parent
  directory if needed.
- Default data location under a `data/` dir at repo root (configurable via the
  passed path). Synchronous fs is acceptable for the scaffold.
- `module.exports` the helper functions.

**`test/health.test.js`** — import the app from `src/app.js`, use Supertest to
assert `GET /health` returns `200` and `{ status: 'ok' }`.

**`.gitignore`** — ignore `node_modules/` and the runtime `data/` directory.
