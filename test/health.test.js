'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const createApp = require('../src/app');

describe('GET /health', () => {
  let emptyDir;
  let app;

  beforeAll(() => {
    // Isolate this suite from the real client/dist/ build. When a build is
    // present the SPA catch-all would serve index.html (200) for unknown
    // routes, masking the plain-API 404 behavior this suite asserts. Pointing
    // createApp() at an empty dir (no index.html) keeps the static-serving
    // guard off, so 404 behavior holds regardless of whether a build exists.
    emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'health-nodist-'));
    app = createApp({ distDir: emptyDir });
  });

  afterAll(() => {
    if (emptyDir) fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('returns 200 with JSON { status: "ok" }', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/does-not-exist');

    expect(res.status).toBe(404);
  });
});
