'use strict';

const request = require('supertest');

const { makeApp } = require('./helpers');

describe('/todos CRUD + earn-on-complete', () => {
  let app;
  let cleanup;

  beforeEach(() => {
    ({ app, cleanup } = makeApp());
  });

  afterEach(() => cleanup());

  it('creates a todo and returns 201 with { id, title, completed:false }', async () => {
    const res = await request(app).post('/todos').send({ title: 'Brush teeth' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Brush teeth', completed: false });
    expect(res.body.id).toBeDefined();
  });

  it('rejects missing/empty title with 400 { error }', async () => {
    const missing = await request(app).post('/todos').send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error).toEqual(expect.any(String));

    const empty = await request(app).post('/todos').send({ title: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toEqual(expect.any(String));
  });

  it('lists todos', async () => {
    await request(app).post('/todos').send({ title: 'a' });
    await request(app).post('/todos').send({ title: 'b' });
    const res = await request(app).get('/todos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty('awarded');
  });

  it('gets a single todo, 404 when unknown', async () => {
    const created = await request(app).post('/todos').send({ title: 'a' });
    const ok = await request(app).get(`/todos/${created.body.id}`);
    expect(ok.status).toBe(200);
    expect(ok.body.id).toBe(created.body.id);

    const missing = await request(app).get('/todos/99999');
    expect(missing.status).toBe(404);
    expect(missing.body.error).toEqual(expect.any(String));
  });

  it('patches title and completed, 404 when unknown', async () => {
    const created = await request(app).post('/todos').send({ title: 'a' });
    const patched = await request(app)
      .patch(`/todos/${created.body.id}`)
      .send({ title: 'renamed' });
    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe('renamed');

    const missing = await request(app).patch('/todos/99999').send({ title: 'x' });
    expect(missing.status).toBe(404);
  });

  it('deletes a todo (204), 404 when unknown', async () => {
    const created = await request(app).post('/todos').send({ title: 'a' });
    const del = await request(app).delete(`/todos/${created.body.id}`);
    expect([200, 204]).toContain(del.status);

    const after = await request(app).get(`/todos/${created.body.id}`);
    expect(after.status).toBe(404);

    const missing = await request(app).delete('/todos/99999');
    expect(missing.status).toBe(404);
  });

  it('awards 10 stars on first false→true completion (via PATCH)', async () => {
    const created = await request(app).post('/todos').send({ title: 'a' });
    expect((await request(app).get('/balance')).body.stars).toBe(0);

    await request(app)
      .patch(`/todos/${created.body.id}`)
      .send({ completed: true });

    expect((await request(app).get('/balance')).body.stars).toBe(10);
  });

  it('does not double-award on re-complete or toggle back and forth', async () => {
    const created = await request(app).post('/todos').send({ title: 'a' });
    const id = created.body.id;

    await request(app).patch(`/todos/${id}`).send({ completed: true });
    await request(app).patch(`/todos/${id}`).send({ completed: true }); // re-complete
    await request(app).patch(`/todos/${id}`).send({ completed: false }); // un-complete
    await request(app).patch(`/todos/${id}`).send({ completed: true }); // re-complete again

    // Earned exactly once; un-completing never removes earned stars.
    expect((await request(app).get('/balance')).body.stars).toBe(10);
  });

  it('awards via the dedicated complete action exactly once', async () => {
    const created = await request(app).post('/todos').send({ title: 'a' });
    const id = created.body.id;

    await request(app).post(`/todos/${id}/complete`);
    await request(app).post(`/todos/${id}/complete`);

    expect((await request(app).get('/balance')).body.stars).toBe(10);
  });
});
