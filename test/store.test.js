'use strict';

// Unit tests for the Supabase-backed data-access layer. The Supabase client is
// fully mocked — no live network — so we can assert the query shape each helper
// builds and that Supabase errors surface as thrown Errors.
//
// Names referenced inside the jest.mock factory are prefixed with `mock` so
// Jest's hoisting guard allows them.

// A chainable query-builder stub. Every builder method returns `this` so calls
// chain, and the builder is thenable, resolving to the configured result. This
// mirrors how @supabase/supabase-js builders are awaited.
function mockMakeBuilder(result) {
  const calls = [];
  const builder = {
    calls,
    _record(name, args) {
      calls.push({ name, args });
      return builder;
    },
    select(...args) {
      return builder._record('select', args);
    },
    eq(...args) {
      return builder._record('eq', args);
    },
    insert(...args) {
      return builder._record('insert', args);
    },
    update(...args) {
      return builder._record('update', args);
    },
    delete(...args) {
      return builder._record('delete', args);
    },
    single(...args) {
      return builder._record('single', args);
    },
    maybeSingle(...args) {
      return builder._record('maybeSingle', args);
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return builder;
}

// Shared mock state. `from` hands back a per-call builder pre-loaded with the
// next queued result and records which table was queried.
const mockState = { queued: [], fromCalls: [], lastBuilder: null };

jest.mock('../src/lib/supabase', () => ({
  from: (table) => {
    mockState.fromCalls.push(table);
    const result = mockState.queued.length
      ? mockState.queued.shift()
      : { data: null, error: null };
    mockState.lastBuilder = mockMakeBuilder(result);
    return mockState.lastBuilder;
  },
}));

const store = require('../src/lib/store');

function queueResult(result) {
  mockState.queued.push(result);
}

beforeEach(() => {
  mockState.queued = [];
  mockState.fromCalls = [];
  mockState.lastBuilder = null;
});

describe('store.list', () => {
  it('selects all rows from the table and returns the data', async () => {
    const rows = [{ id: '1' }, { id: '2' }];
    queueResult({ data: rows, error: null });

    const result = await store.list('todos');

    expect(mockState.fromCalls).toEqual(['todos']);
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'select', args: ['*'] });
    expect(result).toEqual(rows);
  });

  it('applies equality filters as .eq() calls', async () => {
    queueResult({ data: [], error: null });

    await store.list('todos', { family_id: 'fam-1', done: false });

    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'eq', args: ['family_id', 'fam-1'] });
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'eq', args: ['done', false] });
  });

  it('returns [] when Supabase yields null data', async () => {
    queueResult({ data: null, error: null });
    expect(await store.list('rewards')).toEqual([]);
  });

  it('throws when Supabase returns an error', async () => {
    queueResult({ data: null, error: { message: 'boom' } });
    await expect(store.list('todos')).rejects.toThrow(/list\(todos\) failed: boom/);
  });
});

describe('store.getById', () => {
  it('filters by id and uses maybeSingle', async () => {
    const row = { id: 'x1', title: 'a' };
    queueResult({ data: row, error: null });

    const result = await store.getById('todos', 'x1');

    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'eq', args: ['id', 'x1'] });
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'maybeSingle', args: [] });
    expect(result).toEqual(row);
  });

  it('returns null when no row is found', async () => {
    queueResult({ data: null, error: null });
    expect(await store.getById('todos', 'nope')).toBeNull();
  });

  it('throws on Supabase error', async () => {
    queueResult({ data: null, error: { message: 'bad' } });
    await expect(store.getById('todos', 'x')).rejects.toThrow(/getById\(todos, x\) failed: bad/);
  });
});

describe('store.insert', () => {
  it('inserts the row and returns the persisted record', async () => {
    const row = { title: 'new' };
    const saved = { id: 'g1', title: 'new' };
    queueResult({ data: saved, error: null });

    const result = await store.insert('todos', row);

    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'insert', args: [row] });
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'select', args: [] });
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'single', args: [] });
    expect(result).toEqual(saved);
  });

  it('throws on Supabase error', async () => {
    queueResult({ data: null, error: { message: 'dup' } });
    await expect(store.insert('todos', {})).rejects.toThrow(/insert\(todos\) failed: dup/);
  });
});

describe('store.update', () => {
  it('updates by id and returns the updated record', async () => {
    const changes = { done: true };
    const updated = { id: 'u1', done: true };
    queueResult({ data: updated, error: null });

    const result = await store.update('todos', 'u1', changes);

    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'update', args: [changes] });
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'eq', args: ['id', 'u1'] });
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'single', args: [] });
    expect(result).toEqual(updated);
  });

  it('throws on Supabase error', async () => {
    queueResult({ data: null, error: { message: 'nope' } });
    await expect(store.update('todos', 'u1', {})).rejects.toThrow(/update\(todos, u1\) failed: nope/);
  });
});

describe('store.remove', () => {
  it('deletes by id', async () => {
    queueResult({ data: null, error: null });

    await store.remove('todos', 'd1');

    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'delete', args: [] });
    expect(mockState.lastBuilder.calls).toContainEqual({ name: 'eq', args: ['id', 'd1'] });
  });

  it('throws on Supabase error', async () => {
    queueResult({ data: null, error: { message: 'fk' } });
    await expect(store.remove('todos', 'd1')).rejects.toThrow(/remove\(todos, d1\) failed: fk/);
  });
});
