'use strict';

const path = require('path');

const request = require('supertest');

const createLedger = require('../src/lib/ledger');
const { makeApp } = require('./helpers');

describe('GET /balance (derived from ledger)', () => {
  let app;
  let dataDir;
  let cleanup;

  beforeEach(() => {
    ({ app, dataDir, cleanup } = makeApp());
  });

  afterEach(() => cleanup());

  it('is 0 with an empty/absent ledger', async () => {
    const res = await request(app).get('/balance');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stars: 0 });
  });

  it('is the sum of all ledger entry deltas', async () => {
    const ledger = createLedger(path.join(dataDir, 'ledger.json'));
    ledger.append({ delta: 10, reason: 'todo_completed' });
    ledger.append({ delta: 5, reason: 'todo_completed' });
    ledger.append({ delta: -7, reason: 'redeem' });

    const res = await request(app).get('/balance');
    expect(res.body).toEqual({ stars: 8 });
  });
});

describe('POST /redemptions', () => {
  let app;
  let dataDir;
  let cleanup;

  beforeEach(() => {
    ({ app, dataDir, cleanup } = makeApp());
  });

  afterEach(() => cleanup());

  // Seed the ledger with a starting balance directly.
  const seedBalance = (stars) => {
    const ledger = createLedger(path.join(dataDir, 'ledger.json'));
    ledger.append({ delta: stars, reason: 'seed' });
  };

  it('redeems an affordable reward, returns { balance } and reduces it', async () => {
    seedBalance(100);
    const reward = await request(app)
      .post('/rewards')
      .send({ name: 'Toy', icon: '🧸', cost: 60 });

    const res = await request(app)
      .post('/redemptions')
      .send({ rewardId: reward.body.id });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ balance: 40 });
    expect((await request(app).get('/balance')).body.stars).toBe(40);
  });

  it('rejects insufficient balance with 400 and leaves the balance untouched', async () => {
    seedBalance(20);
    const reward = await request(app)
      .post('/rewards')
      .send({ name: 'Toy', icon: '🧸', cost: 60 });

    const res = await request(app)
      .post('/redemptions')
      .send({ rewardId: reward.body.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
    // No ledger entry written — balance unchanged.
    expect((await request(app).get('/balance')).body.stars).toBe(20);
  });

  it('returns 404 (or 400) for an unknown rewardId', async () => {
    seedBalance(100);
    const res = await request(app)
      .post('/redemptions')
      .send({ rewardId: 99999 });
    expect([400, 404]).toContain(res.status);
    expect(res.body.error).toEqual(expect.any(String));
    expect((await request(app).get('/balance')).body.stars).toBe(100);
  });

  it('rejects a missing rewardId with 400 { error }', async () => {
    const res = await request(app).post('/redemptions').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

describe('full earn → redeem flow', () => {
  let app;
  let cleanup;

  beforeEach(() => {
    ({ app, cleanup } = makeApp());
  });

  afterEach(() => cleanup());

  it('earns stars by completing todos then spends them on a reward', async () => {
    const t1 = await request(app).post('/todos').send({ title: 'a' });
    const t2 = await request(app).post('/todos').send({ title: 'b' });
    await request(app).patch(`/todos/${t1.body.id}`).send({ completed: true });
    await request(app).patch(`/todos/${t2.body.id}`).send({ completed: true });

    expect((await request(app).get('/balance')).body.stars).toBe(20);

    const reward = await request(app)
      .post('/rewards')
      .send({ name: 'Sticker', icon: '⭐', cost: 15 });
    const redeem = await request(app)
      .post('/redemptions')
      .send({ rewardId: reward.body.id });

    expect(redeem.status).toBe(200);
    expect(redeem.body).toEqual({ balance: 5 });
  });
});
