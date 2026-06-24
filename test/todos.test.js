'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const request = require('supertest');

const store = require('../src/lib/store');
const createApp = require('../src/app');

describe('Todos CRUD API', () => {
  let tmpDir;
  let todosFile;
  let app;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'todos-test-'));
    todosFile = path.join(tmpDir, 'todos.json');
    process.env.TODOS_FILE = todosFile;
    app = createApp();
  });

  afterEach(() => {
    delete process.env.TODOS_FILE;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Create a todo and return the response body. */
  async function create(title = 'Buy milk') {
    const res = await request(app).post('/todos').send({ title });
    expect(res.status).toBe(201);
    return res.body;
  }

  describe('POST /todos', () => {
    it('creates a todo and persists it to disk', async () => {
      const res = await request(app).post('/todos').send({ title: 'Buy milk' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Buy milk', done: false });
      expect(res.body.id).toBeDefined();
      expect(typeof res.body.createdAt).toBe('string');

      // Survives a fresh read from disk.
      const onDisk = store.read(todosFile);
      expect(onDisk).toHaveLength(1);
      expect(onDisk[0].title).toBe('Buy milk');
    });

    it('trims the title', async () => {
      const res = await request(app).post('/todos').send({ title: '  spaced  ' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('spaced');
    });

    it('rejects a missing title with 400', async () => {
      const res = await request(app).post('/todos').send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_title');
      expect(typeof res.body.error.message).toBe('string');
    });

    it('rejects a blank title with 400', async () => {
      const res = await request(app).post('/todos').send({ title: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_title');
    });

    it('rejects a non-string title with 400', async () => {
      const res = await request(app).post('/todos').send({ title: 42 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_title');
    });

    it('does not persist anything when validation fails', async () => {
      await request(app).post('/todos').send({});
      expect(store.read(todosFile, [])).toEqual([]);
    });
  });

  describe('GET /todos', () => {
    it('returns an empty array when none exist', async () => {
      const res = await request(app).get('/todos');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns all todos', async () => {
      await create('one');
      await create('two');

      const res = await request(app).get('/todos');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body.map((t) => t.title)).toEqual(['one', 'two']);
    });
  });

  describe('GET /todos/:id', () => {
    it('returns the matching todo', async () => {
      const created = await create('findme');

      const res = await request(app).get(`/todos/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(created);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).get('/todos/does-not-exist');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    });
  });

  describe('PATCH /todos/:id', () => {
    it('updates the title', async () => {
      const created = await create('old');

      const res = await request(app)
        .patch(`/todos/${created.id}`)
        .send({ title: 'new' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('new');
      expect(res.body.id).toBe(created.id);
    });

    it('updates done', async () => {
      const created = await create();

      const res = await request(app)
        .patch(`/todos/${created.id}`)
        .send({ done: true });
      expect(res.status).toBe(200);
      expect(res.body.done).toBe(true);
    });

    it('persists the update to disk', async () => {
      const created = await create();
      await request(app).patch(`/todos/${created.id}`).send({ done: true });

      const onDisk = store.read(todosFile);
      expect(onDisk[0].done).toBe(true);
    });

    it('returns 400 when no updatable fields are given', async () => {
      const created = await create();
      const res = await request(app).patch(`/todos/${created.id}`).send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('no_fields');
    });

    it('returns 400 for a non-string title', async () => {
      const created = await create();
      const res = await request(app)
        .patch(`/todos/${created.id}`)
        .send({ title: 5 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_title');
    });

    it('returns 400 for a blank title', async () => {
      const created = await create();
      const res = await request(app)
        .patch(`/todos/${created.id}`)
        .send({ title: '  ' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_title');
    });

    it('returns 400 for a non-boolean done', async () => {
      const created = await create();
      const res = await request(app)
        .patch(`/todos/${created.id}`)
        .send({ done: 'yes' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('invalid_done');
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app)
        .patch('/todos/nope')
        .send({ done: true });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    });
  });

  describe('DELETE /todos/:id', () => {
    it('removes the todo and returns 204 with no body', async () => {
      const created = await create();

      const res = await request(app).delete(`/todos/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      const list = await request(app).get('/todos');
      expect(list.body).toEqual([]);
    });

    it('returns 404 for an unknown id', async () => {
      const res = await request(app).delete('/todos/nope');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    });
  });
});
