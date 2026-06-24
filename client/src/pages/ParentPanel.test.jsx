import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ParentPanel from './ParentPanel'
import * as api from '../lib/api'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ParentPanel', () => {
  it('lists tasks and creates a new one via /todos', async () => {
    vi.spyOn(api, 'listTodos')
      .mockResolvedValueOnce([{ id: 't1', title: 'Brush teeth' }])
      .mockResolvedValueOnce([
        { id: 't1', title: 'Brush teeth' },
        { id: 't2', title: 'Make bed' },
      ])
    vi.spyOn(api, 'createTodo').mockResolvedValue({ id: 't2', title: 'Make bed' })

    render(<ParentPanel />)
    await waitFor(() => screen.getByText('Brush teeth'))

    await userEvent.type(screen.getByLabelText(/new task title/i), 'Make bed')
    await userEvent.click(screen.getByRole('button', { name: /add task/i }))

    expect(api.createTodo).toHaveBeenCalledWith({ title: 'Make bed' })
    await waitFor(() => expect(screen.getByText('Make bed')).toBeInTheDocument())
  })

  it('deletes a task', async () => {
    vi.spyOn(api, 'listTodos')
      .mockResolvedValueOnce([{ id: 't1', title: 'Brush teeth' }])
      .mockResolvedValueOnce([])
    vi.spyOn(api, 'deleteTodo').mockResolvedValue({})

    render(<ParentPanel />)
    await waitFor(() => screen.getByTestId('task-t1'))

    await userEvent.click(
      within(screen.getByTestId('task-t1')).getByRole('button', { name: /delete/i }),
    )

    expect(api.deleteTodo).toHaveBeenCalledWith('t1')
    await waitFor(() => expect(screen.getByText(/no tasks yet/i)).toBeInTheDocument())
  })

  it('creates a reward with name/icon/cost via /rewards', async () => {
    vi.spyOn(api, 'listTodos').mockResolvedValue([])
    vi.spyOn(api, 'listRewards')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'r1', name: 'Movie night', icon: '🎬', cost: 20 }])
    vi.spyOn(api, 'createReward').mockResolvedValue({ id: 'r1' })

    render(<ParentPanel />)
    await userEvent.click(screen.getByRole('tab', { name: /rewards/i }))
    await waitFor(() => screen.getByTestId('reward-manager'))

    await userEvent.type(screen.getByLabelText(/new reward name/i), 'Movie night')
    await userEvent.type(screen.getByLabelText(/new reward icon/i), '🎬')
    await userEvent.type(screen.getByLabelText(/new reward cost/i), '20')
    await userEvent.click(screen.getByRole('button', { name: /add reward/i }))

    expect(api.createReward).toHaveBeenCalledWith({ name: 'Movie night', icon: '🎬', cost: 20 })
    await waitFor(() => expect(screen.getByText('Movie night')).toBeInTheDocument())
  })

  it('edits a reward via PATCH', async () => {
    vi.spyOn(api, 'listTodos').mockResolvedValue([])
    vi.spyOn(api, 'listRewards')
      .mockResolvedValueOnce([{ id: 'r1', name: 'Movie night', icon: '🎬', cost: 20 }])
      .mockResolvedValueOnce([{ id: 'r1', name: 'Movie night', icon: '🎬', cost: 15 }])
    vi.spyOn(api, 'updateReward').mockResolvedValue({ id: 'r1' })

    render(<ParentPanel />)
    await userEvent.click(screen.getByRole('tab', { name: /rewards/i }))
    await waitFor(() => screen.getByTestId('reward-row-r1'))

    await userEvent.click(
      within(screen.getByTestId('reward-row-r1')).getByRole('button', { name: /edit/i }),
    )
    const costInput = screen.getByLabelText(/edit reward cost/i)
    await userEvent.clear(costInput)
    await userEvent.type(costInput, '15')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(api.updateReward).toHaveBeenCalledWith('r1', { name: 'Movie night', icon: '🎬', cost: 15 })
  })
})
