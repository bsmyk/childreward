import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  createReward,
  getAchievements,
  deleteReward,
  getBalance,
  listRewards,
  redeemReward,
  updateReward,
} from './api'

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  })
}

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('listRewards GETs /rewards and returns the array', async () => {
    const data = [{ id: '1', name: 'Ice cream', icon: '🍦', cost: 5 }]
    const fetchMock = mockFetch(200, data)
    vi.stubGlobal('fetch', fetchMock)

    const rewards = await listRewards()
    expect(rewards).toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith('/rewards', expect.objectContaining({ method: 'GET' }))
  })

  it('getBalance unwraps { stars }', async () => {
    vi.stubGlobal('fetch', mockFetch(200, { stars: 42 }))
    expect(await getBalance()).toBe(42)
  })

  it('redeemReward POSTs /redemptions with the rewardId', async () => {
    const fetchMock = mockFetch(200, { balance: 3 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await redeemReward('r9')
    expect(result).toEqual({ balance: 3 })
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('/redemptions')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body)).toEqual({ rewardId: 'r9' })
  })

  it('throws ApiError with server message on 400', async () => {
    vi.stubGlobal('fetch', mockFetch(400, { error: 'Not enough stars' }))
    await expect(redeemReward('r9')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Not enough stars',
    })
    await expect(redeemReward('r9')).rejects.toBeInstanceOf(ApiError)
  })

  it('createReward / updateReward / deleteReward hit the right routes', async () => {
    const fetchMock = mockFetch(200, { id: 'x' })
    vi.stubGlobal('fetch', fetchMock)

    await createReward({ name: 'Toy', cost: 10 })
    await updateReward('x', { cost: 12 })
    await deleteReward('x')

    expect(fetchMock.mock.calls[0][0]).toBe('/rewards')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(fetchMock.mock.calls[1][0]).toBe('/rewards/x')
    expect(fetchMock.mock.calls[1][1].method).toBe('PATCH')
    expect(fetchMock.mock.calls[2][0]).toBe('/rewards/x')
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE')
  })

  it('getAchievements GETs /achievements and returns the array', async () => {
    const data = [
      { id: 'first_todo', title: 'Getting Started', unlocked: true, unlockedAt: '2026-06-01T00:00:00.000Z' },
    ]
    const fetchMock = mockFetch(200, data)
    vi.stubGlobal('fetch', fetchMock)

    const result = await getAchievements()
    expect(result).toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith('/achievements', expect.objectContaining({ method: 'GET' }))
  })
})
