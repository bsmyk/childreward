// Central API client. All network calls live here so components hold no raw
// fetch URLs. The base URL can be overridden via the VITE_API_BASE env var;
// it defaults to '' so requests hit the same origin (the Express API) in dev.
import { getAccessToken } from './auth'

const BASE = import.meta.env?.VITE_API_BASE ?? ''

/**
 * Thrown when the API responds with a non-2xx status. Carries the HTTP status
 * and a human-friendly message so callers can show inline feedback.
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const opts = { method, headers: {} }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  // Attach the Supabase session JWT when the user is signed in. Unauthenticated
  // calls simply omit the header and surface the existing ApiError shape on a
  // 401 from the server.
  const token = await getAccessToken()
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, opts)

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }

  return data
}

// --- Rewards ---------------------------------------------------------------

export function listRewards() {
  return request('/rewards')
}

export function createReward(reward) {
  return request('/rewards', { method: 'POST', body: reward })
}

export function updateReward(id, changes) {
  return request(`/rewards/${id}`, { method: 'PATCH', body: changes })
}

export function deleteReward(id) {
  return request(`/rewards/${id}`, { method: 'DELETE' })
}

// --- Balance & redemptions -------------------------------------------------

export async function getBalance() {
  const data = await request('/balance')
  return data?.stars ?? 0
}

export function redeemReward(rewardId) {
  return request('/redemptions', { method: 'POST', body: { rewardId } })
}

// --- Tasks (todos) ---------------------------------------------------------

export function listTodos() {
  return request('/todos')
}

export function createTodo(todo) {
  return request('/todos', { method: 'POST', body: todo })
}

export function updateTodo(id, changes) {
  return request(`/todos/${id}`, { method: 'PATCH', body: changes })
}

export function deleteTodo(id) {
  return request(`/todos/${id}`, { method: 'DELETE' })
}
