---
title: Reward system API — star ledger, derived balance, earn-on-complete, catalog CRUD, redeem
paths:
  - src/app.js
  - src/lib/store.js
  - src/lib/ledger.js
  - src/routes/todos.js
  - src/routes/rewards.js
  - src/routes/economy.js
  - test/todos.test.js
  - test/rewards.test.js
  - test/economy.test.js
---

# Goal

Build the backend reward economy that the existing `client/` React SPA already
consumes. Stars are earned by completing todos and spent by redeeming rewards.
The **star ledger is the single source of truth**: an append-only list of signed
entries. The **balance is derived** (sum of entry deltas), never stored as a
mutable counter. On top of the ledger, expose reward-catalog CRUD and a redeem
endpoint guarded against overspending.

Stack conventions (honor, do not re-litigate): Node.js, plain CommonJS
(`require`/`module.exports`), Express, Jest + Supertest. No build step, no
TypeScript. File-based JSON persistence via the existing `src/lib/store.js`
(default `data/` dir at repo root). App is built by a factory in `src/app.js`
and driven in tests via Supertest without binding a port.

# Acceptance criteria

**Ledger & balance**
- The balance is computed as the sum of all ledger entry `delta` values; there
  is no separately-stored balance field. With an empty/absent ledger the balance
  is `0`.
- `GET /balance` returns `200` with `{ "stars": <integer> }`.

**Todos CRUD + earn-on-complete**
- `POST /todos` with `{ "title": <non-empty string> }` creates a todo
  (`{ id, title, completed: false }`), returns `201`.
- `GET /todos` returns `200` with the array of todos.
- `GET /todos/:id` returns the todo, or `404` if unknown.
- `PATCH /todos/:id` updates `title` and/or `completed`, returns the updated
  todo, `404` if unknown.
- `DELETE /todos/:id` removes the todo, returns `204` (or `200`), `404` if unknown.
- **Earning:** the first time a todo transitions from incomplete → complete
  (`completed` goes `false`→`true`, whether via `PATCH` or a dedicated complete
  action), exactly one positive ledger entry of a fixed configurable amount
  (default **10** stars) is appended. Re-completing an already-complete todo, or
  toggling it back and forth, must NOT double-award (idempotent per todo
  completion). Un-completing does not remove earned stars (ledger is append-only).

**Reward catalog CRUD**
- `GET /rewards` returns `200` with `[{ id, name, icon, cost }]`.
- `POST /rewards` with `{ name, icon, cost }` creates a reward (integer
  `cost >= 0`), returns `201` with the created reward.
- `PATCH /rewards/:id` updates any of `name`/`icon`/`cost`, returns the updated
  reward, `404` if unknown.
- `DELETE /rewards/:id` removes the reward, returns `204` (or `200`), `404` if
  unknown.

**Redeem with insufficient-balance guard**
- `POST /redemptions` with `{ "rewardId": <id> }`:
  - Unknown `rewardId` → `404` (or `400`) with `{ error: <message> }`.
  - `cost > current balance` → `400` with `{ error: <message> }` and **no**
    ledger entry written (balance unchanged).
  - Otherwise appends one negative ledger entry of `-cost` and returns `200`
    with `{ "balance": <new integer balance> }`.

**Validation (consistent shape)**
- Bad input (missing/empty `title`; missing `name` or non-numeric/negative
  `cost`; missing `rewardId`) returns `400` with a JSON `{ error: <message> }`.

**Tests**
- Jest + Supertest cover, at minimum: derived balance from a ledger, earning on
  first completion, no double-award on re-complete, reward CRUD happy paths,
  a successful redeem reducing the balance, and the insufficient-balance 400
  leaving the balance untouched. Tests use a temp data dir / isolated store and
  do not depend on each other's persisted state.

**Contract alignment** — response shapes match what `client/src/lib/api.js`
already expects: `GET /balance`→`{stars}`, `POST /redemptions`→`{balance}`,
rewards as `{id,name,icon,cost}`. Do not change the frontend.

# Scope

In scope:
- A ledger helper (`src/lib/ledger.js`) over `store.js`: `append(entry)`,
  `entries()`, and `balance()` (sum of deltas). Entry shape:
  `{ id, delta, reason, ts, ... }`.
- Express routers for todos, rewards, and the economy endpoints
  (`/balance`, `/redemptions`), wired into the `createApp()` factory.
- Earn-on-complete logic with single-award guard (e.g. a per-todo
  `completed`/`awarded` flag so the ledger entry fires once).
- Input validation returning `{ error }` with `400`/`404`.
- Jest + Supertest tests for the above.

Out of scope (do NOT build here):
- Frontend changes — `client/` already consumes this contract.
- Auth / parent-vs-kid identity; the API is single-tenant.
- Per-todo star values or variable earn rules (fixed configurable default).
- Ledger pagination/history endpoints, transactions, undo of redemptions.
- A database engine; persistence stays single JSON files via `store.js`.
- Centralized error-handling middleware framework (simple per-route `{error}`
  responses are sufficient).

# The change

**`src/lib/ledger.js`** — thin layer over `store.js` reading/writing
`ledger.json`. Append-only `append({ delta, reason, refId })` that assigns an
`id` and `ts`; `entries()` returns all; `balance()` returns the integer sum of
`delta`. This is the only place balance is computed.

**`src/routes/todos.js`** — Express router for `/todos` CRUD. Todo shape
`{ id, title, completed }`. On a completion transition (`false`→`true`), call
`ledger.append({ delta: +EARN_STARS, reason: 'todo_completed', refId: todo.id })`
exactly once; persist a guard on the todo so repeat completes don't re-award.
`EARN_STARS` is a module constant (default `10`), overridable via env if trivial.

**`src/routes/rewards.js`** — Express router for `/rewards` CRUD over
`rewards.json`. Reward shape `{ id, name, icon, cost }` with integer `cost >= 0`.

**`src/routes/economy.js`** — `GET /balance` → `{ stars: ledger.balance() }`;
`POST /redemptions` → look up the reward, guard `cost <= balance`, append a
`-cost` ledger entry (`reason: 'redeem'`, `refId: rewardId`), return
`{ balance }`. Insufficient or unknown reward returns the documented error
without writing to the ledger.

**`src/app.js`** — mount the three routers in `createApp()` after
`express.json()`, keeping the existing `GET /health` route. Unknown routes
continue to 404 (Express default).

**`src/lib/store.js`** — reuse as-is; persist separate files (`todos.json`,
`rewards.json`, `ledger.json`). Allow tests to point the store at a temp dir.

**Tests** (`test/todos.test.js`, `test/rewards.test.js`,
`test/economy.test.js`) — import the app via the factory and drive with
Supertest; isolate persistence per test run.
