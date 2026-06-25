import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Verify the new bearer-token wiring: when a Supabase session token exists,
// request() must attach `Authorization: Bearer <token>`; when absent, it must
// omit the header and still surface ApiError on failure.
vi.mock('./auth', () => ({
  getAccessToken: vi.fn(),
}))

import { getAccessToken } from './auth'
import { ApiError, listRewards } from './api'

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  })
}

describe('api bearer-token wiring', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches Authorization when a session token is present', async () => {
    getAccessToken.mockResolvedValue('jwt-123')
    const fetchMock = mockFetch(200, [])
    vi.stubGlobal('fetch', fetchMock)

    await listRewards()

    const [, opts] = fetchMock.mock.calls[0]
    expect(opts.headers['Authorization']).toBe('Bearer jwt-123')
  })

  it('omits Authorization when there is no session', async () => {
    getAccessToken.mockResolvedValue(null)
    const fetchMock = mockFetch(200, [])
    vi.stubGlobal('fetch', fetchMock)

    await listRewards()

    const [, opts] = fetchMock.mock.calls[0]
    expect(opts.headers['Authorization']).toBeUndefined()
  })

  it('still throws ApiError on 401 for unauthenticated calls', async () => {
    getAccessToken.mockResolvedValue(null)
    vi.stubGlobal('fetch', mockFetch(401, { error: 'Missing bearer token' }))

    await expect(listRewards()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Missing bearer token',
    })
    await expect(listRewards()).rejects.toBeInstanceOf(ApiError)
  })
})
