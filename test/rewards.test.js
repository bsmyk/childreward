'use strict';

const request = require('supertest');

const { makeApp } = require('./helpers');

describe('/rewards CRUD', () => {
  let app;
  let cleanup;

  beforeEach(() => {
    ({ app, cleanup } = makeApp());
  });

  afterEach(() => cleanup());

  it('lists rewards (empty by default)', async () => {
    const res = await request(app).get('/rewards');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates a reward and returns 201 with { id, name, icon, cost }', async () => {
    const res = await request(app)
      .post('/rewards')
      .send({ name: 'Ice cream', icon: '🍦', cost: 50 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Ice cream', icon: '🍦', cost: 50 });
    expect(res.body.id).toBeDefined();
  });

  it('allows cost of 0', async () => {
    const res = await request(app)
      .post('/rewards')
      .send({ name: 'Free hug', icon: '🤗', cost: 0 });
    expect(res.status).toBe(201);
    expect(res.body.cost).toBe(0);
  });

  it('rejects missing name with 400 { error }', async () => {
    const res = await request(app).post('/rewards').send({ icon: 'x', cost: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toEqual(expect.any(String));
  });

  it('rejects negative or non-integer cost with 400', async () => {
    const negative = await request(app)
      .post('/rewards')
      .send({ name: 'x', cost: -1 });
    expect(negative.status).toBe(400);

    const float = await request(app)
      .post('/rewards')
      .send({ name: 'x', cost: 1.5 });
    expect(float.status).toBe(400);

    const nan = await request(app)
      .post('/rewards')
      .send({ name: 'x', cost: 'lots' });
    expect(nan.status).toBe(400);
  });

  it('patches name/icon/cost, 404 when unknown', async () => {
    const created = await request(app)
      .post('/rewards')
      .send({ name: 'Candy', icon: '🍬', cost: 20 });

    const patched = await request(app)
      .patch(`/rewards/${created.body.id}`)
      .send({ cost: 30, name: 'Big candy' });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ name: 'Big candy', cost: 30, icon: '🍬' });

    const bad = await request(app)
      .patch(`/rewards/${created.body.id}`)
      .send({ cost: -5 });
    expect(bad.status).toBe(400);

    const missing = await request(app).patch('/rewards/99999').send({ cost: 1 });
    expect(missing.status).toBe(404);
  });

  it('deletes a reward (204), 404 when unknown', async () => {
    const created = await request(app)
      .post('/rewards')
      .send({ name: 'Candy', icon: '🍬', cost: 20 });

    const del = await request(app).delete(`/rewards/${created.body.id}`);
    expect([200, 204]).toContain(del.status);

    const list = await request(app).get('/rewards');
    expect(list.body).toEqual([]);

    const missing = await request(app).delete('/rewards/99999');
    expect(missing.status).toBe(404);
  });
});
