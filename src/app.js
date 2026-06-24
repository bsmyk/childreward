'use strict';

const express = require('express');

/**
 * Build and configure the Express application.
 *
 * Returns a configured app instance without binding to a port, so tests can
 * import it and drive it via Supertest. The only file that opens a socket is
 * src/server.js.
 *
 * @returns {import('express').Express} configured Express app
 */
function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
