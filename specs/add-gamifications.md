---
title: Achievements / badges derived from the star ledger
paths:
  - src/routes/achievements.js
  - src/app.js
  - test/achievements.test.js
  - client/src/lib/api.js
  - client/src/components/AchievementShelf.jsx
  - client/src/pages/Achievements.jsx
  - client/src/App.jsx
---

# Goal

Add a lightweight gamification layer — **named achievement badges** that
unlock at milestones — on top of the existing star economy. The whole feature
is *derived* from the append-only ledger (`src/lib/ledger.js`): no new
persistence model, no new mutable counters, no schema change. A new
`GET /achievements` endpoint computes badge state from ledger entries, and a
SPA "badge shelf" renders it.

# Acceptance criteria

- `GET /achievements` returns `200` with a JSON array of the full badge
  catalog (always all badges, locked and unlocked), each entry shaped:
  `{ id, title, description, unlocked, unlockedAt }`.
  - `unlocked` is a boolean.
  - `unlockedAt` is the ISO timestamp (`ts`) of the ledger entry that first
    satisfied the milestone, or `null` when still locked.
- The endpoint reads only `ledger.entries()` — it appends nothing and writes
  nothing. Calling it never mutates the ledger or any store file.
- Badge catalog (fixed, in this order):
  1. `first_todo` — "Getting Started" — unlocked on the first
     `todo_completed` ledger entry.
  2. `ten_todos` — "On a Roll" — unlocked on the 10th `todo_completed` entry
     (`unlockedAt` = the 10th such entry's `ts`).
  3. `hundred_stars` — "Star Collector" — unlocked when **lifetime stars
     earned** (running sum of positive deltas from `todo_completed` entries)
     first reaches `>= 100` (`unlockedAt` = the entry that crossed the
     threshold).
  4. `first_redeem` — "Treat Yourself" — unlocked on the first `redeem`
     ledger entry.
- Lifetime/earned milestones derive from **earn** entries only; redemptions
  (negative deltas) never lower a previously-unlocked earn badge. Once a badge
  is unlocked it stays unlocked.
- With an empty ledger, all badges return `unlocked: false`, `unlockedAt: null`.
- Backend tests cover: empty ledger (all locked), each milestone unlocking at
  its exact boundary (e.g. 9 completions → `ten_todos` locked, 10 →
  unlocked), and that the endpoint does not write to the ledger.
- SPA: a new `/achievements` route renders an `AchievementShelf` showing every
  badge; unlocked badges are visually distinct from locked ones and locked
  badges still show their title/description. A nav link to it is added.
- Existing tests (server `jest`, client `vitest`) continue to pass.

# Scope

In scope:
- New read-only `GET /achievements` route deriving badge state from the ledger.
- A small SPA badge-shelf page + nav entry consuming it.

Out of scope (do NOT build):
- Levels/XP and daily-streak mechanics (separate specs).
- Any new persistence, DB table, or stored badge state — everything is derived.
- Awarding stars for unlocking badges, notifications, or animations.
- Auth changes — mount `/achievements` with the same access posture as the
  existing `/balance` route (no new auth requirement).

# The change

## Backend

- Add `src/routes/achievements.js` exporting `createAchievementsRouter({ ledger })`
  (mirror the factory style of `src/routes/economy.js`). It defines the fixed
  badge catalog and a pure function that folds `ledger.entries()` (ordered by
  `id`) into `{ id, title, description, unlocked, unlockedAt }` per badge, then
  serves `GET /achievements`.
  - Derivation: walk entries once in id order, tracking a `todo_completed`
    count and a running earned-stars sum; record the first `ts` that satisfies
    each milestone.
- Mount it in `src/app.js` alongside the economy router:
  `app.use('/', createAchievementsRouter({ ledger }));` (reuse the same
  `ledger` instance already constructed there).
- Add `test/achievements.test.js` driving the app via Supertest with an
  isolated temp `dataDir`, seeding the ledger through the todos/redemption
  flow (or directly) to hit each boundary.

## Frontend (`client/`)

- `client/src/lib/api.js`: add `getAchievements()` calling `request('/achievements')`.
- `client/src/components/AchievementShelf.jsx`: presentational component taking
  an achievements array and rendering a badge grid; locked badges dimmed/greyed
  (e.g. `aria-disabled`), unlocked badges highlighted with their `unlockedAt`.
- `client/src/pages/Achievements.jsx`: page that loads achievements via the api
  client (loading + error states consistent with `pages/Rewards.jsx`) and
  renders `AchievementShelf`.
- `client/src/App.jsx`: add a `/achievements` route and a `NavLink` to it.
