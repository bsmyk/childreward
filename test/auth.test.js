'use strict';

// Unit tests for the auth middleware with a fully mocked Supabase client.
// Names referenced inside the jest.mock factory are `mock`-prefixed to satisfy
// Jest's hoisting guard.

const mockGetUser = jest.fn();
const mockProfile = { result: { data: null, error: null } };

// Chainable profiles query: from('profiles').select(...).eq(...).maybeSingle()
function mockProfileBuilder() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(mockProfile.result),
  };
  return builder;
}

jest.mock('../src/lib/supabase', () => ({
  auth: { getUser: (...args) => mockGetUser(...args) },
  from: () => mockProfileBuilder(),
}));

const { requireAuth, requireParent } = require('../src/middleware/auth');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockProfile.result = { data: null, error: null };
});

describe('requireAuth', () => {
  it('401s when the Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });

  it('401s on a malformed (non-Bearer) header', async () => {
    const req = { headers: { authorization: 'Basic abc' } };
    const res = mockRes();
    await requireAuth(req, res, jest.fn());
    expect(res.statusCode).toBe(401);
  });

  it('401s when Supabase rejects the token', async () => {
    mockGetUser.mockResolvedValue({ data: null, error: { message: 'bad jwt' } });
    const req = { headers: { authorization: 'Bearer tok' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('tok');
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401s when the user has no profile row', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockProfile.result = { data: null, error: null };
    const req = { headers: { authorization: 'Bearer tok' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches req.user and calls next on a valid token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    mockProfile.result = {
      data: { id: 'u1', role: 'parent', family_id: 'fam-1' },
      error: null,
    };
    const req = { headers: { authorization: 'Bearer tok' } };
    const res = mockRes();
    const next = jest.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'u1', role: 'parent', family_id: 'fam-1' });
  });
});

describe('requireParent', () => {
  it('calls next for a parent', () => {
    const req = { user: { id: 'u1', role: 'parent' } };
    const res = mockRes();
    const next = jest.fn();

    requireParent(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('403s for a kid', () => {
    const req = { user: { id: 'u2', role: 'kid' } };
    const res = mockRes();
    const next = jest.fn();

    requireParent(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(next).not.toHaveBeenCalled();
  });

  it('403s when there is no authenticated user', () => {
    const req = {};
    const res = mockRes();
    requireParent(req, res, jest.fn());
    expect(res.statusCode).toBe(403);
  });
});
