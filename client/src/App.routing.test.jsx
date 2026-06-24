import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'
import * as todoApi from './api.js'
import * as libApi from './lib/api'

// Mock both API clients so the routed pages can mount without real network.
vi.mock('./api.js', () => ({
  listTodos: vi.fn(),
  completeTodo: vi.fn(),
}))

vi.mock('./lib/api', () => ({
  ApiError: class ApiError extends Error {},
  getBalance: vi.fn(),
  listRewards: vi.fn(),
  redeemReward: vi.fn(),
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
  listRedemptions: vi.fn(),
  createReward: vi.fn(),
  updateReward: vi.fn(),
  deleteReward: vi.fn(),
}))

// setup.js restores mocks after each test, so (re)establish resolved values here.
beforeEach(() => {
  window.history.pushState({}, '', '/')
  todoApi.listTodos.mockResolvedValue([])
  todoApi.completeTodo.mockResolvedValue(null)
  libApi.getBalance.mockResolvedValue(7)
  libApi.listRewards.mockResolvedValue([])
  libApi.listTodos.mockResolvedValue([])
  libApi.listRedemptions.mockResolvedValue([])
})

describe('App shell (merged todo + rewards)', () => {
  it('exposes navigation to all three sections', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Rewards' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Parent Panel' })).toBeInTheDocument()
  })

  it('shows the todo view (with star balance) at the default route', async () => {
    render(<App />)
    // The todo StarBalance renders with the count-style testid.
    expect(await screen.findByTestId('star-balance')).toBeInTheDocument()
  })

  it('navigates to the Rewards page, which renders its balance via the stars prop', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: 'Rewards' }))

    // Rewards owns the balance and feeds it through StarBalance as `stars`.
    await waitFor(() =>
      expect(screen.getByTestId('star-count')).toHaveTextContent('7'),
    )
  })

  it('navigates to the Parent Panel page', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('link', { name: 'Parent Panel' }))

    // ParentPanel pulls the task list from the lib api on mount.
    await waitFor(() => expect(libApi.listTodos).toHaveBeenCalled())
  })
})
