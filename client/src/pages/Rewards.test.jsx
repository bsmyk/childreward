import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Rewards from './Rewards'
import * as api from '../lib/api'

const REWARDS = [
  { id: 'a', name: 'Ice cream', icon: '🍦', cost: 5 },
  { id: 'b', name: 'New bike', icon: '🚲', cost: 100 },
]

afterEach(() => {
  vi.restoreAllMocks()
})

function stub({ rewards = REWARDS, balance = 10 } = {}) {
  vi.spyOn(api, 'listRewards').mockResolvedValue(rewards)
  vi.spyOn(api, 'getBalance').mockResolvedValue(balance)
}

describe('Rewards page', () => {
  it('shows a loading state then the catalog and balance', async () => {
    stub()
    render(<Rewards />)
    expect(screen.getByText(/loading rewards/i)).toBeInTheDocument()

    await waitFor(() => expect(screen.getByTestId('rewards-grid')).toBeInTheDocument())
    expect(screen.getByText('Ice cream')).toBeInTheDocument()
    expect(screen.getByTestId('star-count')).toHaveTextContent('10')
  })

  it('renders an empty state when there are no rewards', async () => {
    stub({ rewards: [] })
    render(<Rewards />)
    await waitFor(() => expect(screen.getByText(/no rewards yet/i)).toBeInTheDocument())
  })

  it('disables redeem for rewards costing more than the balance', async () => {
    stub({ balance: 10 })
    render(<Rewards />)
    await waitFor(() => screen.getByTestId('reward-b'))

    const pricey = within(screen.getByTestId('reward-b')).getByRole('button')
    expect(pricey).toBeDisabled()
    const affordable = within(screen.getByTestId('reward-a')).getByRole('button')
    expect(affordable).toBeEnabled()
  })

  it('updates balance and confirms on successful redeem', async () => {
    stub({ balance: 10 })
    vi.spyOn(api, 'redeemReward').mockResolvedValue({ balance: 5 })
    render(<Rewards />)
    await waitFor(() => screen.getByTestId('reward-a'))

    await userEvent.click(within(screen.getByTestId('reward-a')).getByRole('button'))

    await waitFor(() => expect(screen.getByTestId('star-count')).toHaveTextContent('5'))
    expect(screen.getByRole('alert')).toHaveTextContent(/redeemed/i)
    expect(api.redeemReward).toHaveBeenCalledWith('a')
  })

  it('shows a friendly message and keeps balance on failed redeem', async () => {
    stub({ balance: 10 })
    vi.spyOn(api, 'redeemReward').mockRejectedValue(
      new api.ApiError('Not enough stars', 400),
    )
    render(<Rewards />)
    await waitFor(() => screen.getByTestId('reward-a'))

    await userEvent.click(within(screen.getByTestId('reward-a')).getByRole('button'))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Not enough stars'))
    // Balance unchanged.
    expect(screen.getByTestId('star-count')).toHaveTextContent('10')
  })
})
