'use strict';

const fs = require('fs');
const path = require('path');

const express = require('express');

const store = require('./lib/store');
const createLedger = require('./lib/ledger');
const createTodosRouter = require('./routes/todos');
const createRewardsRouter = require('./routes/rewards');
const createEconomyRouter = require('./routes/economy');

// Absolute path to the built SPA. The build is optional: on a fresh checkout or
// during tests `client/dist/` does not exist, and the backend must boot and
// behave exactly as the no-SPA API server.
const DEFAULT_DIST_DIR = path.join(__dirname, '..', 'client', 'dist');

/**
 * Build and configure the Express application.
 *
 * Returns a configured app instance without binding to a port, so tests can
 * import it and drive it via Supertest. The only file that opens a socket is
 * src/server.js.
 *
 * @param {object} [options]
 * @param {string} [options.dataDir] directory for the JSON store files. Defaults
 *   to the store's `data/` dir. Tests pass a temp dir to isolate persistence.
 * @param {string} [options.distDir] override for the built-SPA directory
 *   (defaults to `client/dist/`). Exposed so tests can point at an isolated
 *   build fixture without touching the real directory.
 * @returns {import('express').Express} configured Express app
 */
function createApp({ dataDir = store.DATA_DIR, distDir = DEFAULT_DIST_DIR } = {}) {
  const app = express();

  app.use(express.json());

  // --- API routes (registered FIRST so they always win over the SPA) ---
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const todosFile = path.join(dataDir, 'todos.json');
  const rewardsFile = path.join(dataDir, 'rewards.json');
  const ledgerFile = path.join(dataDir, 'ledger.json');

  const ledger = createLedger(ledgerFile);

  app.use('/todos', createTodosRouter({ file: todosFile, ledger }));
  app.use('/rewards', createRewardsRouter({ file: rewardsFile }));
  app.use('/', createEconomyRouter({ ledger, rewardsFile }));

  // --- Production static serving for the SPA (optional, guarded) ---
  // Only wire this up when a build is actually present. When it is absent the
  // app keeps its plain-API behavior, including Express's JSON-less 404 for
  // unknown routes (relied on by the test suite).
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    // Serve hashed assets / any real file in the build.
    app.use(express.static(distDir));

    // SPA deep-link fallback: any non-API GET that didn't match an API route or
    // a static file returns index.html so client-side routes load the app
    // instead of 404ing. API paths are excluded so unknown API routes keep
    // returning JSON/404 and are never replaced by the SPA shell. (/health is
    // already handled above.)
    app.get('*', (req, res, next) => {
      if (req.path === '/health' || req.path.startsWith('/api/')) {
        return next();
      }
      return res.sendFile(indexHtml);
    });
  }

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
