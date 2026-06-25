import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Achievements from './Achievements'
import * as api from '../lib/api'

const BADGES = [
  {
    id: 'first_todo',
    title: 'Getting Started',
    description: 'Complete your first task.',
    unlocked: true,
    unlockedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'ten_todos',
    title: 'On a Roll',
    description: 'Complete ten tasks.',
    unlocked: false,
    unlockedAt: null,
  },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Achievements page', () => {
  it('shows a loading state then the badge shelf', async () => {
    vi.spyOn(api, 'getAchievements').mockResolvedValue(BADGES)
    render(<Achievements />)
    expect(screen.getByText(/loading achievements/i)).toBeInTheDocument()

    await waitFor(() =>
      expect(screen.getByTestId('achievement-shelf')).toBeInTheDocument()
    )
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText('On a Roll')).toBeInTheDocument()
  })

  it('marks locked badges as aria-disabled and unlocked ones as enabled', async () => {
    vi.spyOn(api, 'getAchievements').mockResolvedValue(BADGES)
    render(<Achievements />)

    await waitFor(() =>
      expect(screen.getByTestId('achievement-first_todo')).toBeInTheDocument()
    )
    expect(screen.getByTestId('achievement-first_todo')).toHaveAttribute(
      'aria-disabled',
      'false'
    )
    expect(screen.getByTestId('achievement-ten_todos')).toHaveAttribute(
      'aria-disabled',
      'true'
    )
  })

  it('shows an error message when the request fails', async () => {
    vi.spyOn(api, 'getAchievements').mockRejectedValue(new Error('boom'))
    render(<Achievements />)
    await waitFor(() =>
      expect(screen.getByText(/could not load achievements/i)).toBeInTheDocument()
    )
  })
})
