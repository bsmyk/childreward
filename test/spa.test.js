'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const createApp = require('../src/app');

// Use an isolated temp dir for the build fixture (via the createApp distDir
// override) so this suite never touches the real client/dist/ and can't race
// other test files that share the filesystem.
let fixtureDir;

describe('SPA static serving (build present)', () => {
  let app;

  beforeAll(() => {
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spa-dist-'));
    fs.writeFileSync(
      path.join(fixtureDir, 'index.html'),
      '<!doctype html><html><body><div id="root"></div></body></html>',
      'utf8'
    );
    fs.writeFileSync(path.join(fixtureDir, 'app.js'), 'console.log(1);', 'utf8');
    app = createApp({ distDir: fixtureDir });
  });

  afterAll(() => {
    if (fixtureDir) fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  it('serves the SPA index.html at GET / (200, text/html)', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('falls back to index.html for unknown non-API deep links', async () => {
    const res = await request(app).get('/some/client/route');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('serves real static assets from the build', async () => {
    const res = await request(app).get('/app.js');

    expect(res.status).toBe(200);
  });

  it('does NOT shadow the API: GET /health still returns JSON', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('does not serve the SPA shell for unknown /api/* routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    // 404 (not 200) proves the SPA shell did not take over this API path.
    expect(res.text || '').not.toContain('id="root"');
  });

  // Merge regression: the reward API routes (mounted at non-/api/ paths such as
  // /rewards and /todos) must keep returning JSON when a build is present. The
  // SPA `app.get('*')` fallback only excludes /health and /api/*, so these paths
  // survive solely because the API routers are registered BEFORE the fallback.
  // This guards the merge of API routes + SPA static serving in src/app.js.
  it('does NOT shadow real API routes: GET /rewards returns JSON', async () => {
    const res = await request(app).get('/rewards');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.text || '').not.toContain('id="root"');
  });
});

describe('SPA static serving (build absent)', () => {
  let emptyDir;
  let app;

  beforeAll(() => {
    // A dir with no index.html stands in for a fresh checkout / no build.
    emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spa-nodist-'));
    app = createApp({ distDir: emptyDir });
  });

  afterAll(() => {
    if (emptyDir) fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('keeps plain-API behavior: /health works, unknown routes 404 (no SPA shell)', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });

    const missing = await request(app).get('/does-not-exist');
    expect(missing.status).toBe(404);
    expect(missing.text || '').not.toContain('id="root"');
  });
});
