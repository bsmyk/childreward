'use strict';

const express = require('express');
const { requireAuth, requireParent } = require('./middleware/auth');

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
 * @returns {import('express').Express} configured Express app
 */
function createApp() {
  const app = express();

  app.use(express.json());

  // Make the auth gate available to domain routes without applying it
  // globally — /health and other public routes opt out by simply not using it.
  app.locals.auth = { requireAuth, requireParent };

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
