import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import * as api from './api.js'

vi.mock('./api.js', () => ({
  listTodos: vi.fn(),
  completeTodo: vi.fn(),
}))

const sampleTodos = [
  { id: 1, title: 'Brush teeth', done: false },
  { id: 2, title: 'Make bed', done: true },
  { id: 3, title: 'Feed the cat', done: false },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('App', () => {
  it('renders every task and the initial star balance from GET /todos', async () => {
    api.listTodos.mockResolvedValue(sampleTodos)

    render(<App />)

    expect(await screen.findByText('Brush teeth')).toBeInTheDocument()
    expect(screen.getByText('Make bed')).toBeInTheDocument()
    expect(screen.getByText('Feed the cat')).toBeInTheDocument()
    // One task already done -> balance starts at 1.
    expect(screen.getByTestId('star-balance')).toHaveTextContent('1')
  })

  it('shows completed tasks as visually distinct (disabled) and incomplete as tappable', async () => {
    api.listTodos.mockResolvedValue(sampleTodos)
    render(<App />)

    const doneCard = await screen.findByTestId('task-2')
    const openCard = screen.getByTestId('task-1')
    expect(doneCard).toBeDisabled()
    expect(doneCard.className).toMatch(/task-card--done/)
    expect(openCard).toBeEnabled()
  })

  it('completes a task optimistically, plays the star burst, and ticks the balance up', async () => {
    api.listTodos.mockResolvedValue(sampleTodos)
    api.completeTodo.mockResolvedValue(null)
    const user = userEvent.setup()
    render(<App />)

    const card = await screen.findByTestId('task-1')
    await user.click(card)

    // Optimistic flip happens immediately (before/without awaiting network).
    expect(screen.getByTestId('task-1')).toBeDisabled()
    expect(screen.getByTestId('burst-1')).toBeInTheDocument()
    expect(api.completeTodo).toHaveBeenCalledWith(1)
    // Balance ticks from 1 -> 2 live.
    await waitFor(() =>
      expect(screen.getByTestId('star-balance')).toHaveTextContent('2'),
    )
  })

  it('does not re-complete an already-done task or double-count the balance', async () => {
    api.listTodos.mockResolvedValue(sampleTodos)
    const user = userEvent.setup()
    render(<App />)

    const doneCard = await screen.findByTestId('task-2')
    await user.click(doneCard)

    expect(api.completeTodo).not.toHaveBeenCalled()
    expect(screen.getByTestId('star-balance')).toHaveTextContent('1')
  })

  it('rolls back the optimistic update and keeps balance when PATCH fails', async () => {
    api.listTodos.mockResolvedValue(sampleTodos)
    api.completeTodo.mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    render(<App />)

    const card = await screen.findByTestId('task-3')
    await user.click(card)

    // After the failed request settles, the card returns to incomplete.
    await waitFor(() => expect(screen.getByTestId('task-3')).toBeEnabled())
    expect(screen.getByTestId('star-balance')).toHaveTextContent('1')
  })

  it('shows a friendly retry-able message when the initial load fails', async () => {
    api.listTodos.mockRejectedValueOnce(new Error('network'))
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    const retry = screen.getByRole('button', { name: /try again/i })

    // Retry succeeds the second time and renders tasks.
    api.listTodos.mockResolvedValue(sampleTodos)
    await user.click(retry)

    expect(await screen.findByText('Brush teeth')).toBeInTheDocument()
  })
})
