// Thin fetch wrapper around the todos API. Centralizes the base path and JSON
// handling so components never touch fetch directly.

const BASE = '/todos'

async function toJson(res) {
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`)
  }
  // PATCH may legitimately return an empty body; guard against that.
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// GET /todos -> array of { id, title, done }
export async function listTodos() {
  const res = await fetch(BASE)
  const data = await toJson(res)
  return Array.isArray(data) ? data : []
}

// PATCH /todos/:id with { done: true } -> the updated todo (if returned)
export async function completeTodo(id) {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: true }),
  })
  return toJson(res)
}
