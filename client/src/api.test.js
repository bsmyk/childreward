import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listTodos, completeTodo } from './api.js'

function mockFetch(impl) {
  global.fetch = vi.fn(impl)
}

describe('api', () => {
  beforeEach(() => {
    global.fetch = undefined
  })

  it('listTodos GETs /todos and returns the array', async () => {
    const todos = [{ id: 1, title: 'A', done: false }]
    mockFetch(async () => ({ ok: true, text: async () => JSON.stringify(todos) }))

    const result = await listTodos()

    expect(fetch).toHaveBeenCalledWith('/todos')
    expect(result).toEqual(todos)
  })

  it('listTodos returns [] when the payload is not an array', async () => {
    mockFetch(async () => ({ ok: true, text: async () => JSON.stringify(null) }))
    expect(await listTodos()).toEqual([])
  })

  it('completeTodo PATCHes /todos/:id with { done: true }', async () => {
    mockFetch(async () => ({ ok: true, text: async () => '' }))

    await completeTodo(42)

    expect(fetch).toHaveBeenCalledWith('/todos/42', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
  })

  it('throws on a non-ok response', async () => {
    mockFetch(async () => ({ ok: false, status: 500, text: async () => '' }))
    await expect(listTodos()).rejects.toThrow(/failed/i)
  })
})
