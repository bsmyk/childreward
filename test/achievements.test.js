'use strict';

const fs = require('fs');
const path = require('path');

const request = require('supertest');

const createLedger = require('../src/lib/ledger');
const { makeApp } = require('./helpers');

const BADGE_IDS = ['first_todo', 'ten_todos', 'hundred_stars', 'first_redeem'];

describe('GET /achievements (derived from ledger)', () => {
  let app;
  let dataDir;
  let cleanup;

  beforeEach(() => {
    ({ app, dataDir, cleanup } = makeApp());
  });

  afterEach(() => cleanup());

  const ledgerFor = () => createLedger(path.join(dataDir, 'ledger.json'));

  // Append N todo_completed earn entries of `delta` stars each.
  const seedCompletions = (n, delta = 10) => {
    const ledger = ledgerFor();
    for (let i = 0; i < n; i += 1) {
      ledger.append({ delta, reason: 'todo_completed', refId: i + 1 });
    }
    return ledger;
  };

  const byId = (body) =>
    body.reduce((acc, b) => {
      acc[b.id] = b;
      return acc;
    }, {});

  it('returns the full catalog, all locked, with an empty ledger', async () => {
    const res = await request(app).get('/achievements');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.map((b) => b.id)).toEqual(BADGE_IDS);
    for (const badge of res.body) {
      expect(badge).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          unlocked: false,
          unlockedAt: null,
        })
      );
    }
  });

  it('unlocks first_todo on the first completion, stamping its ts', async () => {
    const ledger = seedCompletions(1);
    const firstTs = ledger.entries()[0].ts;

    const res = await request(app).get('/achievements');
    const badges = byId(res.body);
    expect(badges.first_todo.unlocked).toBe(true);
    expect(badges.first_todo.unlockedAt).toBe(firstTs);
  });

  it('keeps ten_todos locked at 9 completions and unlocks it at the 10th', async () => {
    seedCompletions(9, 1); // low delta so hundred_stars stays locked

    let res = await request(app).get('/achievements');
    expect(byId(res.body).ten_todos.unlocked).toBe(false);
    expect(byId(res.body).ten_todos.unlockedAt).toBeNull();

    // The 10th completion crosses the boundary.
    const ledger = ledgerFor();
    const tenth = ledger.append({ delta: 1, reason: 'todo_completed' });

    res = await request(app).get('/achievements');
    const badges = byId(res.body);
    expect(badges.ten_todos.unlocked).toBe(true);
    expect(badges.ten_todos.unlockedAt).toBe(tenth.ts);
  });

  it('keeps hundred_stars locked at 90 earned and unlocks it when earned reaches 100', async () => {
    seedCompletions(9, 10); // 90 earned

    let res = await request(app).get('/achievements');
    expect(byId(res.body).hundred_stars.unlocked).toBe(false);

    const ledger = ledgerFor();
    const crossing = ledger.append({ delta: 10, reason: 'todo_completed' }); // 100

    res = await request(app).get('/achievements');
    const badges = byId(res.body);
    expect(badges.hundred_stars.unlocked).toBe(true);
    expect(badges.hundred_stars.unlockedAt).toBe(crossing.ts);
  });

  it('does not let redemptions lower a previously-unlocked earn badge', async () => {
    seedCompletions(10, 10); // 100 earned, 10 completions
    const ledger = ledgerFor();
    ledger.append({ delta: -50, reason: 'redeem' }); // earned stays 100

    const res = await request(app).get('/achievements');
    const badges = byId(res.body);
    expect(badges.hundred_stars.unlocked).toBe(true);
    expect(badges.ten_todos.unlocked).toBe(true);
    expect(badges.first_redeem.unlocked).toBe(true);
  });

  it('unlocks first_redeem on the first redeem entry', async () => {
    const ledger = seedCompletions(1, 10);
    const redeem = ledger.append({ delta: -5, reason: 'redeem' });

    const res = await request(app).get('/achievements');
    const badges = byId(res.body);
    expect(badges.first_redeem.unlocked).toBe(true);
    expect(badges.first_redeem.unlockedAt).toBe(redeem.ts);
  });

  it('does not write to the ledger when serving the endpoint', async () => {
    seedCompletions(3, 10);
    const ledgerPath = path.join(dataDir, 'ledger.json');
    const before = fs.readFileSync(ledgerPath, 'utf8');

    await request(app).get('/achievements');
    await request(app).get('/achievements');

    const after = fs.readFileSync(ledgerPath, 'utf8');
    expect(after).toBe(before);
  });
});
