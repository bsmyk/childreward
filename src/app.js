'use strict';

const express = require('express');

const todosRouter = require('./routes/todos');
const { HttpError } = require('./lib/errors');

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

  app.use('/todos', todosRouter);

  // Centralized error handler — MUST be registered last. Renders HttpError
  // (and any unexpected error) into the shared shape:
  //   { error: { code, message } }
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) {
      return res
        .status(err.status)
        .json({ error: { code: err.code, message: err.message } });
    }

    // eslint-disable-next-line no-console
    console.error(err);
    return res
      .status(500)
      .json({ error: { code: 'internal_error', message: 'Internal server error' } });
  });

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
