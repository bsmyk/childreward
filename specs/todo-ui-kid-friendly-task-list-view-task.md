---
title: Kid-friendly Todo UI — task list, complete-with-star, live star balance
paths:
  - client/index.html
  - client/package.json
  - client/vite.config.js
  - client/src/main.jsx
  - client/src/App.jsx
  - client/src/api.js
  - client/src/components/TaskList.jsx
  - client/src/components/TaskItem.jsx
  - client/src/components/StarBalance.jsx
  - client/src/styles.css
---

# Goal

A kid-friendly single-page UI that lets a child see their tasks, tap a task to
mark it complete (with a celebratory star animation), and watch a live "star
balance" tick up as tasks get done. The UI is a React + Vite SPA living in a new
`client/` directory and consumes the existing Express `/todos` CRUD API. No
backend changes.

# Acceptance criteria

1. `client/` is a self-contained React + Vite app: `npm install && npm run dev`
   in `client/` starts the SPA; `npm run build` produces a static bundle.
2. On load, the app fetches `GET /todos` and renders every task as a large,
   touch-friendly card showing its title. Completed tasks are visually
   distinct (e.g. checked / dimmed / struck-through).
3. Tapping an incomplete task marks it complete by calling the API
   (`PATCH /todos/:id` with `{ "done": true }`), optimistically flips the card
   to its completed state, and plays a brief celebratory star animation on that
   card.
4. A persistent "star balance" is shown prominently at the top. It equals the
   number of completed tasks and updates live the instant a task is completed
   (no manual refresh). Re-loading the page recomputes the same balance from
   `GET /todos`.
5. Already-completed tasks are not tappable for re-completion and do not award
   extra stars; the balance never double-counts.
6. The visual style is explicitly kid-friendly: big tap targets, rounded shapes,
   bright/high-contrast palette, large legible text, playful star motif.
7. API failures are handled gracefully: a failed `PATCH` rolls back the
   optimistic update and leaves the task incomplete; a failed initial load shows
   a friendly retry-able message rather than a blank screen.
8. In dev, the Vite server proxies API calls to the Express backend (default
   `http://localhost:3000`) so the SPA and API run together without CORS setup.

# Scope

In scope:
- A new `client/` React + Vite SPA and all files listed in front-matter.
- Consuming the existing todos API: list (`GET /todos`) and complete
  (`PATCH /todos/:id`).
- Star balance derived client-side from completed-task count.
- Star celebration animation (CSS/transition based; no heavy animation deps).

Out of scope (do NOT build):
- Any backend / `src/` changes, new endpoints, or persistence changes.
- Creating, editing titles, deleting, or reordering tasks (view + complete only).
- Auth, multi-user, accounts, or per-user star ledgers.
- A server-persisted star balance or rewards/redemption system.
- Routing, state libraries, or component frameworks beyond React itself.

# The change

Create a `client/` directory containing a minimal React + Vite SPA:

- **Tooling** — `client/package.json` (React 18, Vite, `dev`/`build`/`preview`
  scripts), `client/vite.config.js` with the React plugin and a dev `server.proxy`
  entry forwarding `/todos` to the Express backend, and `client/index.html` as
  the Vite entry mounting `#root`.
- **`api.js`** — thin fetch wrapper: `listTodos()` → `GET /todos`,
  `completeTodo(id)` → `PATCH /todos/:id` with `{ done: true }`. Centralizes the
  base path and JSON handling.
- **`App.jsx`** — owns state: the todo array (loaded once via `listTodos`) plus
  derived `starBalance = todos.filter(t => t.done).length`. Handles the complete
  action with optimistic update + rollback on error. Renders `StarBalance` and
  `TaskList`.
- **`StarBalance.jsx`** — prominent header showing the current star count with a
  star motif; animates the count when it increases.
- **`TaskList.jsx` / `TaskItem.jsx`** — render the cards; `TaskItem` exposes the
  tap-to-complete interaction, shows completed styling, and triggers the
  per-card star burst animation on completion.
- **`styles.css`** — kid-friendly visual system (large rounded cards, bright
  palette, big text) and the star-burst keyframe animation.

Assumed todo shape from the API: `{ id, title, done }`. If the real payload
differs, adapt field names in `api.js`/components only.
