# ⭐ Kid-friendly Todo Client

A React + Vite single-page app that lets a child see their tasks, tap one to
complete it (with a celebratory star burst), and watch a live **star balance**
tick up. It consumes the existing Express `/todos` API — no backend changes.

## Run

```bash
cd client
npm install
npm run dev      # SPA on http://localhost:5173, proxying /todos -> :3000
```

The dev server proxies `/todos` to the Express backend (default
`http://localhost:3000`; override with `API_TARGET`). Start your backend
alongside it so the app has data.

```bash
npm run build    # static production bundle in dist/
npm run preview  # serve the built bundle
npm test         # run the Vitest suite
```

## How it works

- `api.js` — `listTodos()` (`GET /todos`) and `completeTodo(id)`
  (`PATCH /todos/:id` `{ done: true }`).
- `App.jsx` — owns the todo list; star balance is derived as
  `todos.filter(t => t.done).length`. Completing a task updates state
  optimistically and rolls back on a failed request.
- `StarBalance`, `TaskList`, `TaskItem` — the kid-friendly UI and animations.

Assumed todo shape: `{ id, title, done }`.
