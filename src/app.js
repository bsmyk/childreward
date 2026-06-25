'use strict';

const path = require('path');

const express = require('express');
const { requireAuth, requireParent } = require('./middleware/auth');

const store = require('./lib/store');
const createLedger = require('./lib/ledger');
const createTodosRouter = require('./routes/todos');
const createRewardsRouter = require('./routes/rewards');
const createEconomyRouter = require('./routes/economy');

/**
 * Build and configure the Express application.
 *
 * Returns a configured app instance without binding to a port, so tests can
 * import it and drive it via Supertest. The only file that opens a socket is
 * src/server.js.
 *
 * The auth middleware (`requireAuth` / `requireParent`) is exposed on
 * `app.locals.auth` so domain routes (defined in their own specs) can mount it.
 * `GET /health` stays public and unauthenticated.
 *
 * @param {object} [options]
 * @param {string} [options.dataDir] directory for the JSON store files. Defaults
 *   to the store's `data/` dir. Tests pass a temp dir to isolate persistence.
 * @returns {import('express').Express} configured Express app
 */
function createApp({ dataDir = store.DATA_DIR } = {}) {
  const app = express();

  app.use(express.json());

  // Make the auth gate available to domain routes without applying it
  // globally — /health and other public routes opt out by simply not using it.
  app.locals.auth = { requireAuth, requireParent };

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

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
