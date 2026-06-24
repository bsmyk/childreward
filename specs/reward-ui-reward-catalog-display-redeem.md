---
title: Reward UI — catalog, redeem-with-stars, parent panel
paths:
  - client/src/pages/Rewards.jsx
  - client/src/pages/ParentPanel.jsx
  - client/src/components/RewardCard.jsx
  - client/src/components/StarBalance.jsx
  - client/src/lib/api.js
---

# Goal

Give the kid-friendly todo app a Reward UI on the existing React + Vite SPA
(`client/`): kids browse a reward catalog and redeem rewards with stars they've
earned, with clear balance feedback; parents get a simple panel to manage the
tasks and rewards that drive the system.

# Acceptance criteria

- **Catalog** — A Rewards page lists all rewards from `GET /rewards` as cards,
  each showing name, icon/emoji, and star cost. Loading and empty states render.
- **Star balance** — The current star balance (`GET /balance`, integer stars)
  is always visible on the Rewards page.
- **Redeem flow** — Each affordable reward shows an enabled "Redeem" button;
  rewards costing more than the current balance are visibly disabled. Clicking
  Redeem calls `POST /redemptions { rewardId }`, and on success the balance
  feedback updates immediately (new balance shown, brief confirmation).
- **Balance feedback on failure** — A redeem that fails (e.g. backend returns
  400 for insufficient stars) shows a friendly inline message and leaves the
  balance unchanged. No crash, no silent failure.
- **Parent panel** — A separate ParentPanel page lists tasks and rewards and
  supports create / edit / delete for each:
  - Tasks via the existing `/todos` CRUD API.
  - Rewards via `/rewards` CRUD (`POST /rewards`, `PATCH /rewards/:id`,
    `DELETE /rewards/:id`).
  Changes made here are reflected on the Rewards page on next load.
- All network calls go through `client/src/lib/api.js`; components hold no raw
  fetch URLs.

# Scope

In scope:
- Frontend only, in the existing `client/` React + Vite SPA.
- Two routed pages (Rewards, ParentPanel), reward/balance components, and the
  API client functions they need.
- Consuming the backend endpoints listed below; assume JSON over the existing
  Express API.

Out of scope (do NOT build here):
- Any backend route, persistence, or star-earning logic — those live in the API
  branch. This spec only consumes them.
- Auth / parent-vs-kid login. The parent panel is just a separate route.
- Styling system overhaul, animations beyond simple confirmation feedback,
  i18n, accessibility audit.

# The change

Assumed backend contract (consumed, not built):
- `GET /rewards` → `[{ id, name, icon, cost }]`
- `POST /rewards` / `PATCH /rewards/:id` / `DELETE /rewards/:id`
- `GET /balance` → `{ stars: number }`
- `POST /redemptions { rewardId }` → `{ balance: number }` on success, `400`
  with an error message when stars are insufficient or the reward is unknown.
- Existing `/todos` CRUD for tasks.

Work:
1. Add API client functions in `client/src/lib/api.js`: `listRewards`,
   `createReward`, `updateReward`, `deleteReward`, `getBalance`,
   `redeemReward(rewardId)`, plus task helpers if not already present.
2. `StarBalance.jsx` — displays current star count; refetch/refresh after a
   redeem.
3. `RewardCard.jsx` — one reward (icon, name, cost, Redeem button); disabled
   when `cost > balance`; emits a redeem action.
4. `Rewards.jsx` — fetches rewards + balance, renders `StarBalance` and a grid
   of `RewardCard`, wires the redeem flow with success and insufficient-stars
   feedback.
5. `ParentPanel.jsx` — tabbed/sectioned CRUD lists for tasks (`/todos`) and
   rewards (`/rewards`) with create/edit/delete forms.
6. Register both pages in the SPA router and add navigation between them.

Keep it minimal and consistent with existing `client/` conventions (component
style, router, and api.js patterns already in the repo).
